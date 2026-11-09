// Promociones, campañas y cupones — tipos, valores por defecto y utilidades puras.
// Apto para el navegador (sin Redis). El almacén del servidor vive en
// lib/promotions-store.ts y es lo que edita el admin (/admin/promociones).
//
// Tres piezas:
//  - Banners del inicio (`promotions`): carrusel a pantalla completa. Con ≥1 vigente se oculta el hero normal.
//  - Campañas (`campaigns`): descuentos por porcentaje, por cantidad, ofertas relámpago y de temporada,
//    aplicables a toda la tienda, a categorías o a productos puntuales.
//  - Cupones (`coupons`): franja superior del inicio; el botón copia el código (el carrito aún no los aplica).

import type { Product } from '@/types';

export interface Promotion {
  id: string;
  /** Nombre interno (solo se ve en el admin). */
  name: string;
  /** Imagen del banner (proporción ~3:1, p. ej. 1600x528). Ruta local o /api/media/<id>. */
  image: string;
  alt: string;
  /** A dónde lleva el clic en el banner. */
  href: string;
  /** Apagar sin borrar. */
  active: boolean;
  /** ISO opcional. Fuera de rango = no se muestra. */
  startsAt?: string;
  endsAt?: string;
}

export type CuponTipo = 'general' | 'carrito' | 'recompra' | 'seguidores' | 'nuevos';

export interface PromoCoupon {
  id: string;
  scope: string; // "En productos seleccionados"
  pct: number;
  minPurchase: number;
  code: string;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  /** Tipo de cupón (por defecto 'general'). */
  kind?: CuponTipo;
  /** Tope del descuento en pesos (como el "Dto. máx." de Mercado Libre). */
  maxDiscount?: number;
  /** Usos totales permitidos (vacío = sin límite). */
  usageLimit?: number;
  /** Usos registrados. */
  used?: number;
  /** Dirección de su catálogo exclusivo: /ofertas/<slug> (por defecto, el código en minúsculas). */
  slug?: string;
  /** Productos que entran en el catálogo exclusivo del cupón. */
  target?: CampaignScope;
}

export const CUPON_TIPOS: Record<CuponTipo, { label: string; desc: string }> = {
  general: { label: 'Cupón general', desc: 'Para cualquier comprador de la tienda.' },
  carrito: { label: 'Carritos abandonados', desc: 'Convierte carritos sin pagar en ventas.' },
  recompra: { label: 'Recompra', desc: 'Para quienes compraron en los últimos 120 días.' },
  seguidores: { label: 'Para seguidores', desc: 'Fideliza a quienes ya te siguen.' },
  nuevos: { label: 'Nuevos clientes', desc: 'Para la primera compra.' },
};

export type CampanaTipo = 'porcentaje' | 'cantidad' | 'relampago' | 'temporada';

export interface CampaignScope {
  type: 'todo' | 'categorias' | 'productos';
  ids: string[];
}

export interface Campaign {
  id: string;
  /** Nombre interno (el comprador no lo ve). */
  name: string;
  kind: CampanaTipo;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  /** Porcentaje de descuento (1–90). */
  pct: number;
  /** Solo 'cantidad': unidades mínimas para aplicar el descuento. */
  minQty?: number;
  /** Solo 'relampago': unidades disponibles con la oferta (vacío = sin límite). */
  stockLimit?: number;
  scope: CampaignScope;
  /** Etiqueta pública corta (p. ej. "Black Friday"). */
  badge?: string;
  /** Dirección de su catálogo exclusivo: /ofertas/<slug> (por defecto, el nombre). */
  slug?: string;
}

export const CAMPANA_TIPOS: Record<CampanaTipo, { label: string; desc: string }> = {
  porcentaje: { label: 'Descuento por porcentaje', desc: 'Un % menos en el precio de los productos que elijas.' },
  cantidad: { label: 'Descuento por cantidad', desc: 'Descuento al comprar 2 o más unidades.' },
  relampago: { label: 'Oferta relámpago', desc: 'Descuento por tiempo limitado, con cuenta regresiva.' },
  temporada: { label: 'Campaña de temporada', desc: 'Black Friday, Día de la Madre… con etiqueta propia.' },
};

/** Un punto "+" sobre una imagen interactiva (posición en % de la imagen). */
export interface LookSpot {
  id: string;
  x: number;
  y: number;
  /** Producto del catálogo que abre el punto. */
  productId: string;
  /** Solo para productos que aún no están en el catálogo local. */
  fallback?: { name: string; price: number; image: string; href: string };
}

/** Imagen interactiva ("Elige tu frutal por clima"): foto con puntos que abren la ficha de un producto. */
export interface Look {
  id: string;
  /** Texto de la pestaña (p. ej. "Clima cálido"). */
  tab: string;
  /** Título que se ve sobre la imagen. */
  title: string;
  alt: string;
  src: string;
  active: boolean;
  spots: LookSpot[];
}

export interface PromoConfig {
  promotions: Promotion[];
  campaigns: Campaign[];
  coupons: PromoCoupon[];
  looks: Look[];
}

/** Valores iniciales (GENÉRICOS, pre-lanzamiento). Se siembran en Redis la primera vez. */
export const DEFAULT_PROMO_CONFIG: PromoConfig = {
  promotions: [
    {
      id: 'black-friday-2026',
      name: 'Black Friday 2026',
      image: '/promos/black-friday-30.jpeg',
      alt: 'Black Friday en Vivero Verde Suculento: hasta 30% de descuento en frutales, cítricos, cactos y suculentas.',
      href: '/ofertas/black-friday',
      active: true,
      endsAt: '2026-11-28T04:59:59Z', // fin del 27 nov, hora Colombia
    },
  ],
  campaigns: [
    {
      id: 'camp-bf-2026',
      name: 'Black Friday 2026',
      kind: 'temporada',
      active: true,
      startsAt: '2026-11-24T05:00:00Z',
      endsAt: '2026-11-28T04:59:59Z',
      pct: 30,
      scope: { type: 'categorias', ids: ['berries', 'citricos', 'frutales-calido', 'frutales-exoticos', 'frutales-frio', 'suculentas'] },
      badge: 'Black Friday',
      slug: 'black-friday',
    },
  ],
  coupons: [
    { id: 'c-bienvenida', scope: 'En productos seleccionados', pct: 10, minPurchase: 80000, code: 'BIENVENIDO10', active: true, kind: 'nuevos', maxDiscount: 18000, used: 0, slug: 'bienvenida', target: { type: 'categorias', ids: ['berries', 'suculentas', 'agroinsumos'] } },
    { id: 'c-frutales', scope: 'En frutales y cítricos', pct: 15, minPurchase: 150000, code: 'FRUTAL15', active: true, kind: 'general', maxDiscount: 40000, used: 0, slug: 'frutales', target: { type: 'categorias', ids: ['frutales-calido', 'frutales-exoticos', 'frutales-frio', 'citricos'] } },
    { id: 'c-bf', scope: 'Black Friday · todo el sitio', pct: 30, minPurchase: 200000, code: 'BLACK30', active: true, kind: 'general', maxDiscount: 80000, used: 0, slug: 'black30', target: { type: 'categorias', ids: ['berries', 'citricos', 'frutales-calido', 'frutales-exoticos', 'frutales-frio', 'suculentas'] } },
  ],
  looks: [
    {
      id: 'look-calido',
      tab: 'Clima cálido',
      title: '¡Frutales clima cálido a tu alcance!',
      alt: 'Mesa con frutales y frutas de clima cálido',
      src: 'https://http2.mlstatic.com/D_NQ_NP_739284-MLA118561388906_102026-OO.webp',
      active: true,
      spots: [
        { id: 'sp-1', x: 19.3, y: 55, productId: 'MCO1769279063' },
        { id: 'sp-2', x: 17, y: 73, productId: 'MCO3080004834' },
        { id: 'sp-3', x: 89.1, y: 89.4, productId: 'MCO1634999953' },
      ],
    },
    {
      id: 'look-frio',
      tab: 'Clima frío a templado',
      title: '¡Los frutales de clima frío a templado que necesitaba tu jardín!',
      alt: 'Huerto con frutales de clima frío a templado',
      src: 'https://http2.mlstatic.com/D_NQ_NP_887244-MLA120233594081_102026-OO.webp',
      active: true,
      spots: [
        { id: 'sp-4', x: 7.4, y: 88.6, productId: 'MCO2802568626' },
        { id: 'sp-5', x: 28, y: 69.4, productId: 'MCO2000837271' },
        { id: 'sp-6', x: 65.3, y: 63.2, productId: 'MCO3950868448' },
        { id: 'sp-7', x: 87.7, y: 80.4, productId: 'MCO1996920737' },
      ],
    },
  ],
};

export const slugify = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function aplicaScope(scope: CampaignScope | undefined, p: Pick<Product, 'id' | 'category'>): boolean {
  if (!scope || scope.type === 'todo') return true;
  if (scope.type === 'categorias') return scope.ids.includes(p.category);
  return scope.ids.includes(p.id);
}

/** Catálogo exclusivo de una oferta: lo que alimenta /ofertas/<slug> y el menú. */
export interface Oferta {
  slug: string;
  kind: 'cupon' | 'campana';
  title: string;
  pct: number;
  code?: string;
  minPurchase?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  scope: CampaignScope;
  badge?: string;
}

export function ofertasDe(config: Pick<PromoConfig, 'coupons' | 'campaigns'>, now = new Date()): Oferta[] {
  const out: Oferta[] = [];
  for (const c of config.coupons) {
    if (!vigente(c, now)) continue;
    out.push({ slug: c.slug || slugify(c.code), kind: 'cupon', title: c.scope, pct: c.pct, code: c.code, minPurchase: c.minPurchase, maxDiscount: c.maxDiscount, startsAt: c.startsAt, endsAt: c.endsAt, scope: c.target ?? { type: 'todo', ids: [] } });
  }
  for (const c of config.campaigns) {
    if (!vigente(c, now) || c.kind === 'cantidad') continue;
    out.push({ slug: c.slug || slugify(c.badge || c.name), kind: 'campana', title: c.badge || c.name, pct: c.pct, startsAt: c.startsAt, endsAt: c.endsAt, scope: c.scope, badge: c.badge });
  }
  return out;
}

/** ¿Está vigente según interruptor y fechas? */
export function vigente(item: { active: boolean; startsAt?: string; endsAt?: string }, now = new Date()): boolean {
  if (!item.active) return false;
  if (item.startsAt && now < new Date(item.startsAt)) return false;
  if (item.endsAt && now > new Date(item.endsAt)) return false;
  return true;
}

export type EstadoVigencia = 'activa' | 'programada' | 'finalizada' | 'pausada';

export function estadoDe(item: { active: boolean; startsAt?: string; endsAt?: string }, now = new Date()): EstadoVigencia {
  if (!item.active) return 'pausada';
  if (item.startsAt && now < new Date(item.startsAt)) return 'programada';
  if (item.endsAt && now > new Date(item.endsAt)) return 'finalizada';
  return 'activa';
}

/** ¿La campaña alcanza a este producto? */
export function aplicaA(c: Campaign, p: Pick<Product, 'id' | 'category'>): boolean {
  if (c.scope.type === 'todo') return true;
  if (c.scope.type === 'categorias') return c.scope.ids.includes(p.category);
  return c.scope.ids.includes(p.id);
}

/** Mejor campaña vigente de porcentaje/relámpago/temporada para un producto (la de mayor descuento). */
export function mejorCampana(campaigns: Campaign[], p: Pick<Product, 'id' | 'category'>, now = new Date()): Campaign | null {
  let mejor: Campaign | null = null;
  for (const c of campaigns) {
    if (c.kind === 'cantidad' || !vigente(c, now) || !aplicaA(c, p)) continue;
    if (!mejor || c.pct > mejor.pct) mejor = c;
  }
  return mejor;
}

export function precioConDescuento(price: number, pct: number): number {
  return Math.round((price * (1 - pct / 100)) / 10) * 10;
}

/**
 * Etiqueta "HASTA X% OFF" en las tarjetas de producto, por categoría.
 * SOLO VISUAL y de ejemplo: no cambia el precio del carrito ni del checkout.
 */
export const PROMO_DISCOUNT_BY_CATEGORY: Record<string, number> = {
  berries: 30,
  citricos: 20,
  'frutales-calido': 30,
  'frutales-exoticos': 25,
  'frutales-frio': 30,
  suculentas: 20,
};
