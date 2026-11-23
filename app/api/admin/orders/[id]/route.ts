/**
 * POST /api/admin/orders/[id] — acciones del operador sobre un pedido.
 *
 * `aprobar` es la acción crítica: es el momento en que un humano dice "vi el
 * dinero en la cuenta" y el sistema genera la guía. El nombre de quien aprueba
 * queda en el pedido, porque cuando algo se despacha sin haberse pagado hay
 * que poder reconstruir qué pasó.
 *
 * Acciones: aprobar | rechazar | reintentar-pago | reintentar-guia | conciliar | anular-guia | agendar-recogida
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import {
  agendarRecogida,
  anularGuia,
  OrderError,
  aprobarPago,
  conciliarRecaudo,
  crearGuia,
  marcarRecogido,
  rechazarPago,
  reintentarPago,
} from '@/lib/orders/orchestrator';
import { orders, registrar } from '@/lib/orders/store';
import { etiquetaEstadoPedido } from '@/lib/orders/types';
import { CancelNotSupportedError } from '@/lib/shipping/types';

export const dynamic = 'force-dynamic';

const ACCIONES = ['aprobar', 'rechazar', 'reintentar-pago', 'reintentar-guia', 'conciliar', 'marcar-recogido', 'resolver-alerta', 'anular-guia', 'agendar-recogida'] as const;
type Accion = (typeof ACCIONES)[number];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await cuerpo(request);
    const accion = texto(body.accion, 'la acción', { max: 30 }) as Accion;

    if (!ACCIONES.includes(accion)) {
      return fail(`Acción no válida. Opciones: ${ACCIONES.join(', ')}.`, 422);
    }

    const pedido = await orders.byId(params.id);
    if (!pedido) return fail('Pedido no encontrado.', 404);

    const quien = texto(body.quien, 'quién', { max: 60, requerido: false }) || 'operador';
    let resultado;

    switch (accion) {
      case 'aprobar':
        // Doble confirmación explícita: quien aprueba tiene que declarar que
        // vio el abono, no solo que le llegó un pantallazo.
        if (body.confirmoAbono !== true) {
          return fail(
            'Falta confirmar que el abono está reflejado en la cuenta (confirmoAbono: true).',
            422
          );
        }
        resultado = await aprobarPago(pedido.id, 'admin', quien);
        break;

      case 'rechazar':
        resultado = await rechazarPago(
          pedido.id,
          'admin',
          texto(body.motivo, 'el motivo', { max: 300, requerido: false }) || 'Rechazado por el operador.'
        );
        break;

      case 'reintentar-pago':
        resultado = await reintentarPago(pedido.id);
        break;

      case 'reintentar-guia':
        // Para el caso en que el pago se aprobó pero la transportadora falló.
        if (pedido.payment.status !== 'approved') {
          return fail('No se puede generar la guía de un pedido sin pago aprobado.', 409);
        }
        resultado = await crearGuia(pedido.id, pedido.payment.method === 'COD' ? pedido.total : undefined);
        break;

      case 'conciliar':
        resultado = await conciliarRecaudo(pedido.id, quien);
        break;

      case 'resolver-alerta':
        // Una persona ya revisó el aviso (pago anulado, monto distinto…): se quita de la lista de pendientes.
        resultado = await orders.update(pedido.id, (order) => {
          if (!order.alerta) return order;
          registrar(order, { type: 'alerta_resuelta', actor: 'admin', message: `${quien} revisó la alerta: ${order.alerta}` });
          order.alerta = undefined;
          return order;
        });
        break;

      case 'anular-guia':
        // Acción con efecto en dinero y en la transportadora: se exige confirmación explícita, como en «aprobar».
        if (body.confirmo !== true) return fail('Falta confirmar la anulación de la guía (confirmo: true).', 422);
        resultado = await anularGuia(pedido.id, quien);
        break;

      case 'agendar-recogida': {
        // Tiene tarifa: se exige confirmación explícita. Agrupa todos los paquetes pendientes de la misma transportadora.
        if (body.confirmo !== true) return fail('Falta confirmar el cobro de la recogida (confirmo: true).', 422);
        const fecha = texto(body.fecha, 'la fecha', { max: 10 });
        const desde = Number(body.desde ?? 9);
        const hasta = Number(body.hasta ?? 17);
        if (!Number.isInteger(desde) || !Number.isInteger(hasta)) return fail('La franja de recogida no es válida.', 422);
        const recogida = await agendarRecogida(pedido.id, quien, { fecha, desde, hasta });
        resultado = recogida.order;
        break;
      }

      case 'marcar-recogido':
        if (pedido.shipment?.provider !== 'pickup') {
          return fail('Este pedido no es de recoger en tienda.', 409);
        }
        resultado = await marcarRecogido(pedido.id, quien);
        break;
    }

    if (!resultado) return fail('No se pudo aplicar la acción.', 409);

    return ok({
      id: resultado.id,
      reference: resultado.reference,
      status: resultado.status,
      statusLabel: etiquetaEstadoPedido(resultado),
      pagoEstado: resultado.payment.status,
      envio: resultado.shipment
        ? { trackingNumber: resultado.shipment.trackingNumber, carrier: resultado.shipment.carrier }
        : null,
      timeline: resultado.timeline,
    });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    // Errores de negocio con mensaje para la persona que opera el panel (guía ya recogida, transportadora que no anula…).
    if (error instanceof OrderError) return fail(error.message, 409);
    if (error instanceof CancelNotSupportedError) return fail(error.message, 409);
    return fallo(error, 'POST /api/admin/orders/[id]');
  }
}
