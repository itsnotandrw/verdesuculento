/**
 * POST /api/interno/refrescar — renueva todas las páginas en caché. Solo lo llama el propio servidor al arrancar
 * (header x-refresco con una firma que solo conoce el servidor). Tras un despliegue evita servir las páginas que se
 * generaron durante el build con los datos de ejemplo.
 */

import { timingSafeEqual } from 'crypto';
import { fail, ok } from '@/lib/api';
import { firmaRefresco } from '@/lib/refrescar-arranque';
import { refrescarSitio } from '@/lib/refrescar';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const esperada = firmaRefresco();
  const recibida = request.headers.get('x-refresco') ?? '';
  if (!esperada || recibida.length !== esperada.length || !timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada))) {
    return fail('No autorizado.', 401);
  }
  refrescarSitio();
  return ok({ refrescado: true });
}
