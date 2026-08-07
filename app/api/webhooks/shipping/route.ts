/**
 * POST /api/webhooks/shipping — eventos de la transportadora.
 *
 * Mismas reglas que el webhook de pagos: firma validada por el adaptador,
 * idempotencia por `eventId` en el orquestador, y respuesta 200 salvo fallo
 * interno real.
 *
 * Este es el que mantiene viva la página de seguimiento: sin él, el cliente
 * termina preguntando por WhatsApp dónde va su pedido.
 */

import { cabeceras, ok } from '@/lib/api';
import { onShippingWebhook } from '@/lib/orders/orchestrator';
import { shippingProvider } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const crudo = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(crudo);
  } catch {
    console.error('[webhook/shipping] cuerpo no es JSON. Descartado.');
    return ok({ received: true, processed: false, reason: 'json inválido' });
  }

  const evento = shippingProvider().parseWebhook(payload, cabeceras(request));

  if (!evento) {
    return ok({ received: true, processed: false, reason: 'firma inválida o evento ignorado' });
  }

  try {
    const resultado = await onShippingWebhook(evento);
    return ok({ received: true, processed: resultado.procesado, reason: resultado.motivo });
  } catch (error) {
    console.error('[webhook/shipping] fallo al procesar un evento válido:', error);
    return ok({ received: true, processed: false, reason: 'error interno' }, 500);
  }
}

export async function GET() {
  return ok({ status: 'listo', provider: shippingProvider().id });
}
