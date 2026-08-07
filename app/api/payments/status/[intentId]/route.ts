/**
 * GET /api/payments/status/[intentId] — respaldo del webhook.
 *
 * Ningún método de pago da resultado síncrono y PSE puede tardar minutos en
 * confirmar. Esta ruta permite hacer polling desde la pantalla de pago sin
 * depender de que el webhook haya llegado.
 *
 * Si la pasarela dice `approved` y nuestra base todavía no, se aprueba aquí
 * mismo: el webhook pudo perderse y el cliente no tiene por qué esperar.
 */

import { fail, fallo, ok } from '@/lib/api';
import { aprobarPago } from '@/lib/orders/orchestrator';
import { orders } from '@/lib/orders/store';
import { etiquetaEstado } from '@/lib/orders/types';
import { paymentProvider } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { intentId: string } }
) {
  try {
    // El intento se busca por referencia de pago o por id de transacción: en el
    // flujo manual son lo mismo, en el de pasarela no.
    let pedido = await orders.byPaymentReference(params.intentId);

    if (!pedido) {
      const todos = await orders.list();
      pedido = todos.find((o) => o.payment.intentId === params.intentId) ?? null;
    }

    if (!pedido) return fail('Intento de pago no encontrado.', 404);

    const proveedor = paymentProvider();
    let estado = pedido.payment.status;

    if (!proveedor.requiresManualVerification && estado === 'pending' && pedido.payment.intentId) {
      try {
        const remoto = await proveedor.getStatus(pedido.payment.intentId);
        if (remoto === 'approved') {
          const actualizado = await aprobarPago(pedido.id, 'webhook');
          estado = actualizado?.payment.status ?? 'approved';
        } else {
          estado = remoto;
        }
      } catch (error) {
        console.warn('[payments/status] no se pudo consultar la pasarela:', error);
      }
    }

    return ok({
      reference: pedido.reference,
      paymentReference: pedido.payment.reference,
      status: estado,
      orderStatus: pedido.status,
      statusLabel: etiquetaEstado(pedido.status),
      total: pedido.total,
      expiresAt: pedido.expiresAt,
    });
  } catch (error) {
    return fallo(error, 'GET /api/payments/status');
  }
}
