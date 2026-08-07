/**
 * POST /api/webhooks/payments — eventos de la pasarela.
 *
 * Es el endpoint más sensible del sistema: lo que entra por aquí decide si se
 * despacha mercancía. Tres reglas que no se relajan:
 *
 *   1. **La firma se valida siempre.** El adaptador devuelve `null` si el
 *      checksum no cuadra, y `null` significa descartar, nunca aceptar.
 *   2. **Se lee el cuerpo crudo**, no el JSON reserializado: cualquier cambio
 *      de orden o formato al reserializar rompería la firma.
 *   3. **Siempre se responde 200.** Las pasarelas reintentan ante un error, y
 *      un evento inválido reintentado mil veces no se vuelve válido. Lo que
 *      pasó queda en el log y en la respuesta, no en el código de estado.
 *
 * Con `breb-manual` activo este endpoint no recibe nada: el adaptador descarta
 * todo. Queda listo para el día que se conecte Wompi.
 */

import { cabeceras, ok } from '@/lib/api';
import { onPaymentWebhook } from '@/lib/orders/orchestrator';
import { paymentProvider } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const crudo = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(crudo);
  } catch {
    console.error('[webhook/payments] cuerpo no es JSON. Descartado.');
    return ok({ received: true, processed: false, reason: 'json inválido' });
  }

  const evento = paymentProvider().parseWebhook(payload, cabeceras(request), crudo);

  if (!evento) {
    // Ya quedó registrado en el log del adaptador con el motivo exacto.
    return ok({ received: true, processed: false, reason: 'firma inválida o evento ignorado' });
  }

  try {
    const resultado = await onPaymentWebhook(evento);
    return ok({ received: true, processed: resultado.procesado, reason: resultado.motivo });
  } catch (error) {
    // El evento era legítimo pero algo falló al procesarlo. Aquí sí conviene
    // devolver error para que la pasarela reintente.
    console.error('[webhook/payments] fallo al procesar un evento válido:', error);
    return ok({ received: true, processed: false, reason: 'error interno' }, 500);
  }
}

/** Algunas pasarelas verifican que la URL exista antes de guardarla. */
export async function GET() {
  return ok({ status: 'listo', provider: paymentProvider().id });
}
