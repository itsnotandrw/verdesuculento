/**
 * Promociones para el servidor: lee la configuración guardada en el admin y arma los cálculos que cobran.
 * SOLO SERVIDOR.
 */

import { getPromoConfig, savePromoConfig } from '@/lib/promotions-store';
import { aplicarCupon, precioProducto, type ResultadoCupon } from '@/lib/promo-precios';
import { vigente, type Campaign } from '@/lib/promotions';
import { getProductById } from '@/lib/catalog/store';

/** Campañas que están vigentes ahora (activas y dentro de sus fechas). */
export async function campanasVigentes(ahora = new Date()): Promise<Campaign[]> {
  return (await getPromoConfig()).campaigns.filter((c) => vigente(c, ahora));
}

export interface LineaCarrito {
  productId: string;
  qty: number;
}

export interface CalculoCarrito {
  lineas: Array<{ productId: string; category: string; qty: number; list: number; unit: number; pct: number }>;
  /** Suma a precio de lista. */
  subtotalLista: number;
  /** Suma ya con campañas. */
  subtotal: number;
  /** Lo que bajaron las campañas. */
  descuentoCampanas: number;
  cupon?: ResultadoCupon;
}

/** Calcula el carrito con el catálogo, las campañas y (si se envía) el cupón, todo del servidor. */
export async function calcularCarrito(lineas: LineaCarrito[], codigoCupon?: string): Promise<CalculoCarrito> {
  const config = await getPromoConfig();
  const ahora = new Date();
  const campanas = config.campaigns.filter((c) => vigente(c, ahora));

  const detalle: CalculoCarrito['lineas'] = [];
  for (const l of lineas) {
    const producto = await getProductById(l.productId);
    if (!producto) throw new Error(`El producto ${l.productId} ya no está disponible.`);
    const qty = Math.max(1, Math.min(99, Math.floor(l.qty)));
    const precio = precioProducto(producto, qty, campanas, ahora);
    detalle.push({ productId: producto.id, category: producto.category, qty, list: precio.list, unit: precio.unit, pct: precio.pct });
  }

  const subtotalLista = detalle.reduce((s, l) => s + l.list * l.qty, 0);
  const subtotal = detalle.reduce((s, l) => s + l.unit * l.qty, 0);
  const cupon = codigoCupon?.trim()
    ? aplicarCupon(codigoCupon, detalle.map((l) => ({ id: l.productId, category: l.category, unit: l.unit, qty: l.qty, enPromocion: l.pct > 0 })), config.coupons, ahora)
    : undefined;

  return { lineas: detalle, subtotalLista, subtotal, descuentoCampanas: subtotalLista - subtotal, cupon };
}

/** Suma un uso al cupón (al crear el pedido). Si falla, el pedido igual se conserva. */
export async function registrarUsoCupon(couponId: string): Promise<void> {
  try {
    const config = await getPromoConfig();
    const cupon = config.coupons.find((c) => c.id === couponId);
    if (!cupon) return;
    cupon.used = (cupon.used ?? 0) + 1;
    await savePromoConfig(config);
  } catch (error) {
    console.error('[cupones] no se pudo registrar el uso del cupón', couponId, error instanceof Error ? error.message : error);
  }
}
