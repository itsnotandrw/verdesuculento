/**
 * Detección de choques en la configuración de promociones y cupones.
 *
 * Reglas (solo cuentan los elementos ACTIVOS):
 * Qué BLOQUEA y qué solo AVISA:
 *  - BLOQUEA lo que no tiene sentido ni ventaja: una promoción idéntica a otra (mismo alcance, fechas y descuento) o un
 *    cupón idéntico a otro (mismo alcance, fechas y condiciones). Los códigos y direcciones (slug) repetidos también
 *    se rechazan, en el API.
 *  - AVISA cuando dos promociones se cruzan en fechas y productos pero son distintas: es normal en una tienda (p. ej.
 *    5 % en todo el sitio y 30 % en ciertas categorías); en el sitio gana la de mayor descuento y nunca se suman.
 *    Igual con cupones del mismo alcance y fechas pero condiciones distintas.
 */

import type { Campaign, CampaignScope, PromoConfig, PromoCoupon } from './promotions';

export interface ProductoMin { id: string; category: string; name?: string }

export interface Conflicto {
  /** Clave estable (para distinguir choques nuevos de los que ya existían). */
  clave: string;
  tipo: 'promocion' | 'cupon';
  /** true = no se puede guardar; false = se guarda y se le avisa al admin. */
  bloquea: boolean;
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
      const identica = mismoAlcance(a.scope, b.scope) && a.pct === b.pct && a.kind === b.kind && a.startsAt === b.startsAt && a.endsAt === b.endsAt;
      const gana = a.pct >= b.pct ? a : b;
      out.push({
        clave: `promo:${[a.id, b.id].sort().join('+')}`,
        tipo: 'promocion',
        bloquea: identica,
        mensaje: identica
          ? `Las promociones "${a.name}" y "${b.name}" son idénticas (mismos productos, fechas y descuento). Borra o cambia una.`
          : `Las promociones "${a.name}" (${rangoTexto(a)}) y "${b.name}" (${rangoTexto(b)}) se cruzan en ${n} producto${n === 1 ? '' : 's'}: ahí se aplicará la de mayor descuento (${gana.pct} % de "${gana.name}") y nunca se suman.`,
      });
    }
  }

  const cups = config.coupons.filter((c) => c.active);
  for (let i = 0; i < cups.length; i++) {
    for (let j = i + 1; j < cups.length; j++) {
      const a: PromoCoupon = cups[i], b: PromoCoupon = cups[j];
      if (!fechasSeCruzan(a, b)) continue;
      if (!mismoAlcance(a.target ?? { type: 'todo', ids: [] }, b.target ?? { type: 'todo', ids: [] })) continue;
      const identico = a.pct === b.pct && a.minPurchase === b.minPurchase && (a.maxDiscount ?? 0) === (b.maxDiscount ?? 0) && a.startsAt === b.startsAt && a.endsAt === b.endsAt;
      out.push({
        clave: `cupon:${[a.id, b.id].sort().join('+')}`,
        tipo: 'cupon',
        bloquea: identico,
        mensaje: identico
          ? `Los cupones ${a.code} y ${b.code} son idénticos (mismo alcance, fechas y condiciones). Borra o cambia uno.`
          : `Los cupones ${a.code} y ${b.code} tienen el mismo alcance (${a.scope.toLowerCase()}) y fechas que se cruzan, pero condiciones distintas. Los dos funcionan; revisa que sea lo que quieres.`,
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
