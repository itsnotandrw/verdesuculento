/**
 * Cálculo de precios con promociones. Funciones PURAS: se usan igual en el navegador (para mostrar el precio) y en el
 * servidor (para cobrar). El servidor es siempre la fuente de verdad: lo que el navegador calcula es solo informativo.
 *
 * Reglas:
 *  - Campañas (porcentaje, relámpago, temporada y por cantidad) bajan el precio del producto. Si varias aplican, gana
 *    la de mayor descuento (no se suman). "Por cantidad" solo aplica si la línea llega a las unidades mínimas.
 *  - Las promociones y los cupones son cosas aparte y NO se acumulan: en una compra vale solo uno. Si el carrito tiene
 *    algún producto con precio promocional, el cupón no aplica.
 *  - El cupón se escribe en el carrito y descuenta solo en los productos de su selección, respetando compra mínima,
 *    tope de descuento y límite de usos.
 */

import { aplicaA, aplicaScope, estadoDe, precioConDescuento, vigente, type Campaign, type PromoCoupon } from '@/lib/promotions';

type ProductoBase = { id: string; category: string; price: number };

export interface PrecioProducto {
  /** Precio unitario final. */
  unit: number;
  /** Precio de lista (sin promoción). */
  list: number;
  /** Porcentaje de descuento aplicado (0 si no hay). */
  pct: number;
  campaignId?: string;
  /** Texto corto de la campaña (p. ej. "Black Friday"). */
  etiqueta?: string;
}

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/** Precio de un producto para una cantidad dada, con las campañas que estén vigentes. */
export function precioProducto(p: ProductoBase, qty: number, campanas: Campaign[], ahora = new Date()): PrecioProducto {
  let mejor: Campaign | null = null;
  for (const c of campanas) {
    if (!vigente(c, ahora) || !aplicaA(c, p)) continue;
    if (c.kind === 'cantidad' && qty < (c.minQty ?? 2)) continue;
    if (!mejor || c.pct > mejor.pct) mejor = c;
  }
  if (!mejor || mejor.pct <= 0) return { unit: p.price, list: p.price, pct: 0 };
  return { unit: precioConDescuento(p.price, mejor.pct), list: p.price, pct: mejor.pct, campaignId: mejor.id, etiqueta: mejor.badge || mejor.name };
}

export interface LineaParaCupon {
  id: string;
  category: string;
  /** Precio unitario ya con campañas. */
  unit: number;
  qty: number;
  /** ¿Esta línea tiene precio promocional? (si alguna lo tiene, el cupón no aplica). */
  enPromocion: boolean;
}

export type ResultadoCupon =
  | { ok: true; coupon: PromoCoupon; descuento: number; base: number }
  | { ok: false; motivo: string };

/** Valida un cupón contra el carrito y calcula cuánto descuenta. */
export function aplicarCupon(codigo: string, lineas: LineaParaCupon[], cupones: PromoCoupon[], ahora = new Date()): ResultadoCupon {
  const code = codigo.trim().toUpperCase();
  if (!code) return { ok: false, motivo: 'Escribe el código del cupón.' };

  const c = cupones.find((x) => x.code.toUpperCase() === code);
  if (!c) return { ok: false, motivo: 'Ese cupón no existe. Revisa que el código esté bien escrito.' };

  const estado = estadoDe(c, ahora);
  if (estado === 'pausada') return { ok: false, motivo: 'Este cupón no está activo.' };
  if (estado === 'programada') return { ok: false, motivo: 'Este cupón todavía no está vigente.' };
  if (estado === 'finalizada') return { ok: false, motivo: 'Este cupón ya venció.' };
  if (c.usageLimit != null && (c.used ?? 0) >= c.usageLimit) return { ok: false, motivo: 'Este cupón ya alcanzó su límite de usos.' };

  if (lineas.some((l) => l.enPromocion)) {
    return { ok: false, motivo: 'Los cupones no se suman a las promociones: en tu carrito hay productos con precio promocional. En una compra vale la promoción o el cupón, no los dos.' };
  }

  const ambito = c.scope.charAt(0).toLowerCase() + c.scope.slice(1);
  const elegibles = lineas.filter((l) => aplicaScope(c.target, { id: l.id, category: l.category }));
  if (elegibles.length === 0) return { ok: false, motivo: `Este cupón aplica ${ambito}, y en tu carrito no hay productos de esa selección.` };

  const base = elegibles.reduce((s, l) => s + l.unit * l.qty, 0);
  if (base < c.minPurchase) {
    return { ok: false, motivo: `Este cupón pide una compra mínima de ${cop(c.minPurchase)} ${ambito}. Te faltan ${cop(c.minPurchase - base)}.` };
  }

  let descuento = Math.round((base * c.pct) / 100 / 10) * 10;
  if (c.maxDiscount && descuento > c.maxDiscount) descuento = c.maxDiscount;
  return { ok: true, coupon: c, descuento, base };
}
