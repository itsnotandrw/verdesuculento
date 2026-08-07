/**
 * POST /api/admin/orders/[id] — acciones del operador sobre un pedido.
 *
 * `aprobar` es la acción crítica: es el momento en que un humano dice "vi el
 * dinero en la cuenta" y el sistema genera la guía. El nombre de quien aprueba
 * queda en el pedido, porque cuando algo se despacha sin haberse pagado hay
 * que poder reconstruir qué pasó.
 *
 * Acciones: aprobar | rechazar | reintentar-pago | reintentar-guia | conciliar
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import {
  aprobarPago,
  conciliarRecaudo,
  crearGuia,
  rechazarPago,
  reintentarPago,
} from '@/lib/orders/orchestrator';
import { orders } from '@/lib/orders/store';
import { etiquetaEstado } from '@/lib/orders/types';

export const dynamic = 'force-dynamic';

const ACCIONES = ['aprobar', 'rechazar', 'reintentar-pago', 'reintentar-guia', 'conciliar'] as const;
type Accion = (typeof ACCIONES)[number];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const noAutorizado = autorizarAdmin(request);
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
    }

    if (!resultado) return fail('No se pudo aplicar la acción.', 409);

    return ok({
      id: resultado.id,
      reference: resultado.reference,
      status: resultado.status,
      statusLabel: etiquetaEstado(resultado.status),
      pagoEstado: resultado.payment.status,
      envio: resultado.shipment
        ? { trackingNumber: resultado.shipment.trackingNumber, carrier: resultado.shipment.carrier }
        : null,
      timeline: resultado.timeline,
    });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/orders/[id]');
  }
}
