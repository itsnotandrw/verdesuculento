/**
 * POST /api/orders/[reference]/declarar-pago
 *
 * El cliente avisa que ya transfirió. **Esto no confirma el pago**: deja el
 * pedido en `in_review` para que aparezca en la bandeja del panel. Lo único
 * que aprueba un pago es que el operador vea el abono en la cuenta.
 *
 * Deliberadamente no se acepta ningún archivo adjunto. Un comprobante se edita
 * en dos minutos, y tenerlo empuja a aprobar mirando la imagen en vez del
 * extracto — que es exactamente el error que hunde a este flujo.
 */

import { ValidationError, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import { declararPago } from '@/lib/orders/orchestrator';
import { etiquetaEstado, toPublicOrder } from '@/lib/orders/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { reference: string } }
) {
  try {
    const body = await cuerpo(request).catch(() => ({}) as Record<string, unknown>);
    const nota = texto(body.nota, 'la nota', { max: 300, requerido: false });

    const pedido = await declararPago(params.reference, nota || undefined);
    if (!pedido) return fail('Pedido no encontrado.', 404);

    return ok({
      order: toPublicOrder(pedido),
      statusLabel: etiquetaEstado(pedido.status),
    });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/orders/[reference]/declarar-pago');
  }
}
