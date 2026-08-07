/**
 * GET /api/shipping/track/[tracking] — estado de una guía.
 *
 * La fuente de verdad es nuestra base de datos, que alimentan los webhooks. Se
 * consulta a la transportadora solo como respaldo, cuando el pedido todavía no
 * tiene eventos registrados: así una caída del agregador no deja al cliente
 * sin poder ver su envío.
 */

import { fallo, ok } from '@/lib/api';
import { orders } from '@/lib/orders/store';
import { etiquetaEnvio } from '@/lib/orders/types';
import { shippingProvider } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { tracking: string } }
) {
  try {
    const pedido = await orders.byTrackingNumber(params.tracking);

    if (!pedido || !pedido.shipment) {
      return ok({ found: false, events: [] }, 404);
    }

    let events = pedido.tracking;

    if (events.length <= 1) {
      try {
        const remotos = await shippingProvider().track(params.tracking);
        if (remotos.length > events.length) events = remotos;
      } catch (error) {
        console.warn('[track] no se pudo consultar a la transportadora:', error);
      }
    }

    return ok({
      found: true,
      trackingNumber: pedido.shipment.trackingNumber,
      carrier: pedido.shipment.carrier,
      status: pedido.shipment.status,
      statusLabel: etiquetaEnvio(pedido.shipment.status),
      reference: pedido.reference,
      events: [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    });
  } catch (error) {
    return fallo(error, 'GET /api/shipping/track');
  }
}
