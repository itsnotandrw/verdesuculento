/**
 * Detección de choques en la configuración de promociones y cupones.
 *
 * Reglas (solo cuentan los elementos ACTIVOS):
 *  - Dos promociones (campañas) se cruzan si coinciden en fechas Y en productos: el comprador vería dos
 *    precios rebajados posibles para lo mismo. No se permite guardar.
 *  - Dos cupones se cruzan si tienen el mismo alcance (todo el sitio, o las mismas categorías/productos)
 *    Y coinciden en fechas: serían redundantes y confundirían a quien los reparte. Cupones con alcances
 *    distintos conviven sin problema (en una compra solo vale uno).
 *  - Códigos y direcciones (slug) repetidos ya los rechaza el API aparte.
 */

import type { Campaign, CampaignScope, PromoConfig, PromoCoupon } from './promotions';

export interface ProductoMin { id: string; category: string; name?: string }

export interface Conflicto {
  /** Clave estable (para distinguir choques nuevos de los que ya existían). */
  clave: string;
  tipo: 'promocion' | 'cupon';
  mensaje: string;
}

const t = (iso?: string, porDefecto = 0) => (iso ? new Date(iso).getTime() : porDefecto);

function fechasSeCruzan(a: { startsAt?: string; endsAt?: string }, b: { startsAt?: string; endsAt?: string }) {
  const aIni = t(a.startsAt, -Infinity), aFin = t(a.endsAt, Infinity);
  const bIni = t(b.startsAt, -Infinity), bFin = t(b.endsAt, Infinity);
  return aIni <= bFin && bIni <= aFin;
}

function productosDe(scope: CampaignScope, productos: ProductoMin[]): Set<string> {
  if (scope.type === 'todo') return new Set(productos.map((p) => p.id));
  if (scope.type === 'productos') return new Set(scope.ids);
  const cats = new Set(scope.ids);
  return new Set(productos.filter((p) => cats.has(p.category)).map((p) => p.id));
}

function alcancesSeCruzan(a: CampaignScope, b: CampaignScope, productos: ProductoMin[]): number {
  if (a.type === 'todo' && b.type === 'todo') return productos.length || 1;
  const pa = productosDe(a, productos);
  const pb = productosDe(b, productos);
  let n = 0;
  pa.forEach((id) => { if (pb.has(id)) n++; });
  // Alcances de productos que aún no están en el catálogo cargado: se comparan por id/categoría directamente.
  if (n === 0 && a.type === b.type && a.type !== 'todo') n = a.ids.filter((id) => b.ids.includes(id)).length;
  return n;
}

function mismoAlcance(a: CampaignScope, b: CampaignScope) {
  if (a.type !== b.type) return false;
  if (a.type === 'todo') return true;
  const sa = [...a.ids].sort().join('|');
  const sb = [...b.ids].sort().join('|');
  return sa === sb;
}

const rangoTexto = (c: { startsAt?: string; endsAt?: string }) => {
  const f = (iso?: string) => new Date(iso as string).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
  if (!c.startsAt && !c.endsAt) return 'sin fechas (siempre activa)';
  return `${c.startsAt ? `desde el ${f(c.startsAt)}` : 'desde ya'} ${c.endsAt ? `hasta el ${f(c.endsAt)}` : 'sin fecha de fin'}`;
};

export function detectarConflictos(config: Pick<PromoConfig, 'campaigns' | 'coupons'>, productos: ProductoMin[]): Conflicto[] {
  const out: Conflicto[] = [];

  const camps = config.campaigns.filter((c) => c.active);
  for (let i = 0; i < camps.length; i++) {
    for (let j = i + 1; j < camps.length; j++) {
      const a: Campaign = camps[i], b: Campaign = camps[j];
      if (!fechasSeCruzan(a, b)) continue;
      const n = alcancesSeCruzan(a.scope, b.scope, productos);
      if (n <= 0) continue;
      out.push({
        clave: `promo:${[a.id, b.id].sort().join('+')}`,
        tipo: 'promocion',
        mensaje: `Las promociones "${a.name}" (${rangoTexto(a)}) y "${b.name}" (${rangoTexto(b)}) se cruzan en ${n} producto${n === 1 ? '' : 's'}. Cambia las fechas, el alcance o pausa una de las dos.`,
      });
    }
  }

  const cups = config.coupons.filter((c) => c.active);
  for (let i = 0; i < cups.length; i++) {
    for (let j = i + 1; j < cups.length; j++) {
      const a: PromoCoupon = cups[i], b: PromoCoupon = cups[j];
      if (!fechasSeCruzan(a, b)) continue;
      if (!mismoAlcance(a.target ?? { type: 'todo', ids: [] }, b.target ?? { type: 'todo', ids: [] })) continue;
      out.push({
        clave: `cupon:${[a.id, b.id].sort().join('+')}`,
        tipo: 'cupon',
        mensaje: `Los cupones ${a.code} y ${b.code} tienen el mismo alcance (${a.scope.toLowerCase()}) y fechas que se cruzan. Cambia las fechas, el alcance o pausa uno de los dos.`,
      });
    }
  }

  return out;
}

/** Choques que aparecen con el cambio (no estaban antes de guardar). Los previos no bloquean otras ediciones. */
export function conflictosNuevos(antes: Conflicto[], despues: Conflicto[]): { nuevos: Conflicto[]; previos: Conflicto[] } {
  const claves = new Set(antes.map((c) => c.clave));
  return { nuevos: despues.filter((c) => !claves.has(c.clave)), previos: despues.filter((c) => claves.has(c.clave)) };
}
