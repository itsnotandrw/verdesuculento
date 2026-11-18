/**
 * POST /api/cupon — valida un cupón contra el carrito y dice cuánto descuenta.
 *
 * Es solo para mostrarle el ahorro al cliente antes de pagar. El descuento que se cobra lo vuelve a calcular el
 * servidor al crear el pedido (lib/orders/orchestrator.ts), así que un valor manipulado aquí no cambia el cobro.
 * Cuerpo: { code: string, lines: [{ productId, qty }] }
 */

import { cuerpo, fail, fallo, lineasCarrito, ok, texto, ValidationError, limitarPeticion } from '@/lib/api';
import { calcularCarrito } from '@/lib/promo-servidor';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const excedido = await limitarPeticion(request, 'cupon');
  if (excedido) return excedido;

  try {
    const body = await cuerpo(request);
    const code = texto(body.code, 'el cupón', { max: 40, requerido: false });
    const lineas = lineasCarrito(body.lines);

    const calculo = await calcularCarrito(lineas.map((l) => ({ productId: l.productId, qty: l.qty })), code);
    if (!calculo.cupon) return ok({ valido: false, motivo: 'Escribe el código del cupón.' });
    if (!calculo.cupon.ok) return ok({ valido: false, motivo: calculo.cupon.motivo });

    const { coupon, descuento } = calculo.cupon;
    return ok({ valido: true, code: coupon.code, pct: coupon.pct, scope: coupon.scope, descuento, subtotal: calculo.subtotal });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    if (error instanceof Error && /ya no está disponible/.test(error.message)) return fail(error.message, 400);
    return fallo(error, 'POST /api/cupon');
  }
}
