/**
 * GET /api/admin/promociones — banners, campañas y cupones guardados.
 * PUT /api/admin/promociones — reemplaza la configuración completa.
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import { getPromoConfig, promosEditables, savePromoConfig } from '@/lib/promotions-store';
import { slugify, type Campaign, type CampaignScope, type CampanaTipo, type CuponTipo, type Look, type PromoConfig, type PromoCoupon, type Promotion } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

const KINDS_CAMP: CampanaTipo[] = ['porcentaje', 'cantidad', 'relampago', 'temporada'];
const KINDS_CUPON: CuponTipo[] = ['general', 'carrito', 'recompra', 'seguidores', 'nuevos'];

type Raw = Record<string, unknown>;

function fecha(valor: unknown, campo: string): string | undefined {
  if (valor == null || valor === '') return undefined;
  const s = String(valor);
  if (Number.isNaN(new Date(s).getTime())) throw new ValidationError(`${campo} no es una fecha válida.`);
  return new Date(s).toISOString();
}

function rutaImagen(valor: unknown): string {
  const s = texto(valor, 'la imagen', { max: 500 });
  if (!/^(\/[A-Za-z0-9_\-./]+|https:\/\/[^\s]+)$/.test(s)) {
    throw new ValidationError('La imagen debe ser una ruta del sitio (/promos/x.jpg, /api/media/...) o una URL https.');
  }
  return s;
}

function destino(valor: unknown): string {
  const s = texto(valor, 'el enlace', { max: 300 });
  if (!/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(s)) throw new ValidationError('El enlace debe empezar por / o https://.');
  return s;
}

function numero(valor: unknown, campo: string, min: number, max: number): number {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${campo} debe estar entre ${min} y ${max}.`);
  return n;
}

function opcional(valor: unknown, campo: string, min: number, max: number): number | undefined {
  if (valor == null || valor === '') return undefined;
  return Math.round(numero(valor, campo, min, max));
}

function parseScope(raw: unknown, etiqueta: string, obligatorio: boolean): CampaignScope {
  const sc = (raw ?? {}) as Raw;
  const type = String(sc.type ?? 'todo');
  if (!['todo', 'categorias', 'productos'].includes(type)) throw new ValidationError(`Alcance de ${etiqueta} no válido.`);
  const ids = Array.isArray(sc.ids) ? (sc.ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 500) : [];
  if (obligatorio && type !== 'todo' && ids.length === 0) throw new ValidationError(`${etiqueta} necesita al menos un producto o categoría.`);
  return { type: type as CampaignScope['type'], ids: type === 'todo' ? [] : ids };
}

function slug(valor: unknown, respaldo: string): string {
  const s = slugify(typeof valor === 'string' && valor.trim() ? valor : respaldo);
  if (!s) throw new ValidationError('El nombre de la dirección (slug) no es válido.');
  return s;
}

function parseLooks(raw: Raw[]): Look[] {
  if (raw.length > 12) throw new ValidationError('Demasiadas imágenes interactivas.');
  return raw.map((l, i) => {
    const spots = Array.isArray(l.spots) ? (l.spots as Raw[]) : [];
    if (spots.length > 40) throw new ValidationError('Demasiados puntos en una imagen.');
    return {
      id: texto(l.id, `el id de la imagen ${i + 1}`, { max: 60 }),
      tab: texto(l.tab, `el texto de la pestaña ${i + 1}`, { max: 40 }),
      title: texto(l.title, `el título de la imagen ${i + 1}`, { max: 120 }),
      alt: texto(l.alt, 'el texto alternativo', { max: 300 }),
      src: rutaImagen(l.src),
      active: l.active === true,
      spots: spots.map((p, k) => {
        const fb = p.fallback as Raw | undefined;
        return {
          id: texto(p.id, `el id del punto ${k + 1}`, { max: 60 }),
          x: Math.round(numero(p.x, 'La posición X', 0, 100) * 10) / 10,
          y: Math.round(numero(p.y, 'La posición Y', 0, 100) * 10) / 10,
          productId: texto(p.productId, `el producto del punto ${k + 1}`, { max: 60 }),
          fallback: fb && typeof fb === 'object'
            ? { name: texto(fb.name, 'el nombre', { max: 160 }), price: Math.round(numero(fb.price, 'El precio', 0, 100_000_000)), image: rutaImagen(fb.image), href: destino(fb.href) }
            : undefined,
        };
      }),
    };
  });
}

function parseConfig(body: Raw): PromoConfig {
  const rawL = Array.isArray(body.looks) ? (body.looks as Raw[]) : [];
  const rawP = Array.isArray(body.promotions) ? (body.promotions as Raw[]) : [];
  const rawA = Array.isArray(body.campaigns) ? (body.campaigns as Raw[]) : [];
  const rawC = Array.isArray(body.coupons) ? (body.coupons as Raw[]) : [];
  if (rawP.length > 30 || rawA.length > 100 || rawC.length > 100) throw new ValidationError('Demasiados elementos.');

  const promotions: Promotion[] = rawP.map((p, i) => ({
    id: texto(p.id, `el id del banner ${i + 1}`, { max: 60 }),
    name: texto(p.name, `el nombre del banner ${i + 1}`, { max: 80 }),
    image: rutaImagen(p.image),
    alt: texto(p.alt, 'el texto alternativo', { max: 300 }),
    href: destino(p.href),
    active: p.active === true,
    startsAt: fecha(p.startsAt, 'La fecha de inicio'),
    endsAt: fecha(p.endsAt, 'La fecha de fin'),
  }));

  const campaigns: Campaign[] = rawA.map((c, i) => {
    const kind = String(c.kind) as CampanaTipo;
    if (!KINDS_CAMP.includes(kind)) throw new ValidationError(`Tipo de campaña ${i + 1} no válido.`);
    const scope = parseScope(c.scope, `La campaña "${String(c.name)}"`, true);
    return {
      id: texto(c.id, `el id de la campaña ${i + 1}`, { max: 60 }),
      name: texto(c.name, `el nombre de la campaña ${i + 1}`, { max: 25 }),
      kind,
      active: c.active === true,
      startsAt: fecha(c.startsAt, 'La fecha de inicio'),
      endsAt: fecha(c.endsAt, 'La fecha de fin'),
      pct: Math.round(numero(c.pct, `El porcentaje de la campaña ${i + 1}`, 1, 90)),
      minQty: kind === 'cantidad' ? opcional(c.minQty, 'La cantidad mínima', 2, 100) ?? 2 : undefined,
      stockLimit: kind === 'relampago' ? opcional(c.stockLimit, 'El límite de unidades', 1, 100000) : undefined,
      scope,
      slug: slug(c.slug, typeof c.badge === 'string' && c.badge.trim() ? c.badge : String(c.name)),
      badge: typeof c.badge === 'string' && c.badge.trim() ? c.badge.trim().slice(0, 30) : undefined,
    };
  });

  const coupons: PromoCoupon[] = rawC.map((c, i) => {
    const code = texto(c.code, `el código del cupón ${i + 1}`, { max: 30 }).toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(code)) throw new ValidationError('Los códigos solo llevan letras, números, guion y guion bajo.');
    const kind = (KINDS_CUPON.includes(c.kind as CuponTipo) ? c.kind : 'general') as CuponTipo;
    return {
      id: texto(c.id, `el id del cupón ${i + 1}`, { max: 60 }),
      scope: texto(c.scope, `el alcance del cupón ${i + 1}`, { max: 80 }),
      pct: Math.round(numero(c.pct, `El porcentaje del cupón ${i + 1}`, 1, 100)),
      minPurchase: Math.round(numero(c.minPurchase, `La compra mínima del cupón ${i + 1}`, 0, 100_000_000)),
      code,
      active: c.active === true,
      startsAt: fecha(c.startsAt, 'La fecha de inicio'),
      endsAt: fecha(c.endsAt, 'La fecha de fin'),
      kind,
      maxDiscount: opcional(c.maxDiscount, 'El tope del descuento', 0, 100_000_000),
      usageLimit: opcional(c.usageLimit, 'El límite de usos', 1, 10_000_000),
      used: opcional(c.used, 'Los usos', 0, 10_000_000) ?? 0,
      slug: slug(c.slug, code),
      target: parseScope(c.target, `El cupón ${code}`, true),
    };
  });

  const codes = coupons.map((c) => c.code);
  if (new Set(codes).size !== codes.length) throw new ValidationError('Hay códigos de cupón repetidos.');

  const slugs = [...campaigns.map((c) => c.slug), ...coupons.map((c) => c.slug)];
  if (new Set(slugs).size !== slugs.length) throw new ValidationError('Hay direcciones de catálogo (slug) repetidas entre promociones y cupones.');

  return { promotions, campaigns, coupons, looks: parseLooks(rawL) };
}

export async function GET(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    return ok({ config: await getPromoConfig(), editable: promosEditables() });
  } catch (error) {
    return fallo(error, 'GET /api/admin/promociones');
  }
}

export async function PUT(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    if (!promosEditables()) return fail('Las promociones son de solo lectura: falta configurar REDIS_URL.', 503);
    const config = parseConfig(await cuerpo(request));
    await savePromoConfig(config);
    return ok({ config });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'PUT /api/admin/promociones');
  }
}
