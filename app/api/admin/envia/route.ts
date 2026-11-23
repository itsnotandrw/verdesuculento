/**
 * /api/admin/envia — herramientas de administración de la integración con Envía. Solo panel (sesión de admin).
 *
 *   GET  ?accion=estado                                → ambiente, transportadoras activas, origen, webhook
 *   GET  ?accion=probar&departamento=&ciudad=          → cotiza con TODAS las transportadoras de Envía en Colombia
 *   GET  ?accion=webhooks                              → webhooks registrados en la cuenta de Envía
 *   POST {accion:'registrar-webhook'}                  → registra el webhook de seguimiento hacia este sitio
 *
 * Nunca devuelve la llave de Envía ni el secreto del webhook: solo si están configurados.
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import { env } from '@/lib/env';
import { baseUrl } from '@/lib/seo';
import { CONTACTO } from '@/data/contacto';
import { diagnosticoTransportadoras, listarWebhooksEnvia, registrarWebhookEnvia } from '@/lib/shipping/providers/envia';
import { DestinoNoResueltoError } from '@/lib/shipping/types';

export const dynamic = 'force-dynamic';

const enProduccion = () => !/api-test|test\./i.test(env.shipping.envia.baseUrl);

export async function GET(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const url = new URL(request.url);
    const accion = url.searchParams.get('accion') ?? 'estado';

    if (accion === 'estado') {
      return ok({
        proveedorActivo: env.shipping.provider,
        enviaConfigurado: Boolean(env.shipping.envia.token),
        ambiente: enProduccion() ? 'produccion' : 'pruebas',
        transportadoras: (env.shipping.envia.carriers || 'tcc,interRapidisimo,serviEntrega,coordinadora').split(',').map((c) => c.trim()).filter(Boolean),
        origen: { ciudad: env.shipping.origin.ciudad, departamento: env.shipping.origin.departamento, direccion: env.shipping.origin.direccion },
        // La dirección que viaja en las guías debe ser la misma que el negocio publica: si difieren, el panel avisa.
        direccionPublicada: CONTACTO.sedes[0].direccion.split(',')[0],
        contraEntrega: env.shipping.codEnabled,
        webhookSecretConfigurado: Boolean(env.shipping.envia.webhookSecret),
        urlWebhook: `${baseUrl()}/api/webhooks/shipping`,
      });
    }

    if (!env.shipping.envia.token) return fail('Envía no está configurado (falta ENVIA_TOKEN).', 503);

    if (accion === 'probar') {
      const departamento = texto(url.searchParams.get('departamento'), 'el departamento', { max: 80 });
      const ciudad = texto(url.searchParams.get('ciudad'), 'la ciudad', { max: 80 });
      return ok({ ambiente: enProduccion() ? 'produccion' : 'pruebas', resultados: await diagnosticoTransportadoras({ departamento, ciudad }) });
    }

    if (accion === 'webhooks') return ok({ webhooks: await listarWebhooksEnvia() });

    return fail('Acción no válida.', 422);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    if (error instanceof DestinoNoResueltoError) return fail(error.message, 422);
    return fallo(error, 'GET /api/admin/envia');
  }
}

export async function POST(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await cuerpo(request);
    if (body.accion !== 'registrar-webhook') return fail('Acción no válida.', 422);
    if (!env.shipping.envia.token) return fail('Envía no está configurado (falta ENVIA_TOKEN).', 503);
    // Siempre hacia ESTE sitio: la URL no se acepta del navegador (no se puede apuntar el webhook a otro lado).
    const resultado = await registrarWebhookEnvia(`${baseUrl()}/api/webhooks/shipping`);
    return ok({ registrado: true, resultado });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/envia');
  }
}
