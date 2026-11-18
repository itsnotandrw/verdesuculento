/**
 * POST /api/payments/wompi/confirmar — el cliente volvió de Wompi con el id de su transacción.
 *
 * No se confía en nada del navegador: el id solo sirve para PREGUNTARLE a Wompi (con la llave privada) qué pasó.
 * El pago se da por bueno únicamente si, según Wompi, la transacción está APROBADA, su referencia es la del pedido
 * y el monto cobrado es EXACTAMENTE el total del pedido. Es idempotente y hace lo mismo que el webhook, así que
 * da igual cuál llegue primero (o que lleguen los dos).
 */

import { fail, fallo, ok, texto, cuerpo, ValidationError } from '@/lib/api';
import { aprobarPago, rechazarPago } from '@/lib/orders/orchestrator';
import { orders } from '@/lib/orders/store';
import { ipDe, limitarCheckout } from '@/lib/ratelimit';
import { consultarTransaccion, wompiProvider } from '@/lib/payments/providers/wompi';
import { toCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!(await limitarCheckout(ipDe(request)))) return fail('Demasiados intentos. Espera un minuto.', 429);
    if (!wompiProvider.isConfigured()) return fail('Wompi no está configurado.', 503);

    const body = await cuerpo(request);
    const referencia = texto(body.reference, 'la referencia del pedido', { max: 60 });
    const transactionId = texto(body.transactionId, 'el id de la transacción', { max: 60 });

    const pedido = await orders.byReference(referencia);
    if (!pedido || pedido.payment.method !== 'WOMPI') return fail('Pedido no encontrado.', 404);

    // Idempotencia: si ya está pagado no hay nada más que hacer (el webhook pudo llegar antes).
    if (pedido.payment.status === 'approved') return ok({ status: 'approved' });

    let tx: Awaited<ReturnType<typeof consultarTransaccion>>;
    try {
      tx = await consultarTransaccion(transactionId);
    } catch {
      return fail('No pudimos verificar esa transacción con Wompi.', 400);
    }

    // Anti-intercambio: la transacción tiene que ser de ESTE pedido y por el monto exacto.
    if (tx.reference !== pedido.payment.reference) {
      console.error('[wompi/confirmar] referencia no coincide:', tx.reference, '!=', pedido.payment.reference);
      return fail('La transacción no corresponde a este pedido.', 400);
    }
    if (tx.amountInCents !== toCents(pedido.total)) {
      console.error('[wompi/confirmar] monto no coincide:', tx.amountInCents, '!=', toCents(pedido.total));
      return fail('El monto de la transacción no coincide con el pedido.', 400);
    }

    if (tx.status === 'approved') {
      const actualizado = await aprobarPago(pedido.id, 'webhook');
      return ok({ status: actualizado?.payment.status ?? 'approved' });
    }
    if (tx.status === 'declined') {
      await rechazarPago(pedido.id, 'webhook', 'La pasarela rechazó el pago.');
      return ok({ status: 'declined' });
    }
    return ok({ status: 'pending' }); // PSE/Nequi en proceso: el webhook lo resolverá
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/payments/wompi/confirmar');
  }
}
