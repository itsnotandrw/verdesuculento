/**
 * GET /api/orders/[reference] — estado público del pedido.
 *
 * La referencia es un código aleatorio de 6 caracteres, así que actúa como
 * llave de acceso. Se devuelve la vista pública, que deja fuera el correo, el
 * teléfono y la dirección exacta: con una referencia adivinada nadie debería
 * poder cosechar datos personales.
 */

import { fallo, ok } from '@/lib/api';
import { orders } from '@/lib/orders/store';
import { etiquetaEnvio, etiquetaEstado, toPublicOrder } from '@/lib/orders/types';
import { paymentProvider } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { reference: string } }
) {
  try {
    const pedido = await orders.byReference(params.reference);
    if (!pedido) return ok({ found: false }, 404);

    return ok({
      found: true,
      order: toPublicOrder(pedido),
      statusLabel: etiquetaEstado(pedido.status),
      shipmentLabel: etiquetaEnvio(pedido.shipment?.status ?? 'not_created'),
      /** El checkout usa esto para saber si mostrar el botón "ya transferí". */
      requiresManualVerification: paymentProvider().requiresManualVerification,
    });
  } catch (error) {
    return fallo(error, 'GET /api/orders/[reference]');
  }
}
