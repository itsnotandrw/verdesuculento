/**
 * GET /api/admin/orders — bandeja de pedidos del panel.
 *
 * El orden importa para operar: primero los que esperan que alguien mire el
 * extracto, porque cada minuto ahí es un despacho que no sale.
 */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { almacenamiento, orders } from '@/lib/orders/store';
import { etiquetaEnvio, etiquetaEstado, type Order } from '@/lib/orders/types';
import { paymentProvider } from '@/lib/payments';
import { shippingProvider } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

/** Los que necesitan acción humana van arriba. */
const PRIORIDAD: Record<string, number> = {
  payment_in_review: 0,
  paid: 1,
  awaiting_payment: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
  expired: 6,
};

function resumen(order: Order) {
  return {
    id: order.id,
    reference: order.reference,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    status: order.status,
    statusLabel: etiquetaEstado(order.status),
    cliente: `${order.customer.nombre} ${order.customer.apellido}`,
    email: order.customer.email,
    telefono: order.customer.telefono,
    destino: `${order.address.ciudad}, ${order.address.departamento}`,
    direccion: [order.address.direccion, order.address.barrio].filter(Boolean).join(', '),
    total: order.total,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    metodo: order.payment.method,
    pagoEstado: order.payment.status,
    pagoReferencia: order.payment.reference,
    declaradoEn: order.payment.declaredAt,
    aprobadoEn: order.payment.approvedAt,
    verificadoPor: order.payment.verifiedBy,
    nota: order.payment.notes,
    envio: order.shipment
      ? {
          carrier: order.shipment.carrier,
          service: order.shipment.service,
          trackingNumber: order.shipment.trackingNumber,
          status: order.shipment.status,
          statusLabel: etiquetaEnvio(order.shipment.status),
          codAmount: order.shipment.codAmount,
          codSettledAt: order.shipment.codSettledAt,
          labelUrl: order.shipment.labelUrl,
          cost: order.shipment.cost,
          // Solo se manda si de verdad difiere de lo cotizado — evita que el
          // panel muestre un número "distinto" cuando en realidad coincide.
          actualCost:
            order.shipment.actualCost != null && order.shipment.actualCost !== order.shipment.cost
              ? order.shipment.actualCost
              : undefined,
        }
      : null,
    lineas: order.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      color: l.color,
      size: l.size,
    })),
    timeline: order.timeline,
  };
}

export async function GET(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const url = new URL(request.url);
    const filtro = url.searchParams.get('status');
    const limite = Number(url.searchParams.get('limit')) || 200;

    let lista = await orders.list({ limite });
    if (filtro) lista = lista.filter((o) => o.status === filtro);

    lista.sort(
      (a, b) =>
        (PRIORIDAD[a.status] ?? 9) - (PRIORIDAD[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt)
    );

    const porVerificar = lista.filter((o) => o.status === 'payment_in_review').length;
    const pagadosSinGuia = lista.filter((o) => o.payment.status === 'approved' && !o.shipment).length;
    const recaudosPendientes = lista.filter(
      (o) => o.payment.method === 'COD' && o.shipment?.status === 'delivered' && !o.shipment.codSettledAt
    ).length;

    return ok({
      resumen: { total: lista.length, porVerificar, pagadosSinGuia, recaudosPendientes },
      // Diagnóstico: si el almacenamiento no es apto, el checkout está
      // rechazando pedidos y el operador tiene que enterarse aquí, no por un
      // cliente molesto.
      sistema: {
        almacenamiento: almacenamiento(),
        pagos: paymentProvider().id,
        envios: shippingProvider().id,
      },
      orders: lista.map(resumen),
    });
  } catch (error) {
    return fallo(error, 'GET /api/admin/orders');
  }
}
