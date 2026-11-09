/**
 * POST /api/admin/ml-sync — sincroniza precios y disponibilidad con Mercado Libre.
 * Cuerpo: { "aplicar": false } solo informa las diferencias; { "aplicar": true } las guarda.
 */

import { autorizarAdmin, cuerpo, fail, fallo, ok } from '@/lib/api';
import { catalogoEditable } from '@/lib/catalog/store';
import { mlConfigurado, sincronizarConML } from '@/lib/ml-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!mlConfigurado()) return fail('Faltan ML_APP_ID y ML_CLIENT_SECRET en el servidor.', 503);
    const body = await cuerpo(request);
    const aplicar = body.aplicar === true;
    if (aplicar && !catalogoEditable()) return fail('El catálogo es de solo lectura: falta configurar REDIS_URL.', 503);
    return ok(await sincronizarConML(aplicar));
  } catch (error) {
    return fallo(error, 'POST /api/admin/ml-sync');
  }
}
