/**
 * POST /api/admin/media — sube una imagen (multipart, campo "file") y la guarda
 * en Redis. Devuelve { url: "/api/media/<id>" } para usarla en un banner.
 * Se guarda en Redis (no en disco) para que sobreviva a los redeploys.
 */

import { randomBytes } from 'crypto';
import { autorizarAdmin, fail, fallo, ok } from '@/lib/api';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!redis) return fail('Subir imágenes requiere REDIS_URL.', 503);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('Falta el archivo.', 422);
    if (!TIPOS.has(file.type)) return fail('Solo se aceptan JPG, PNG o WebP.', 422);
    if (file.size > MAX_BYTES) return fail('La imagen pesa más de 6 MB.', 422);

    const id = randomBytes(9).toString('hex');
    const data = Buffer.from(await file.arrayBuffer()).toString('base64');
    await redis.set(`verde:media:${id}`, JSON.stringify({ type: file.type, data }));
    return ok({ url: `/api/media/${id}` }, 201);
  } catch (error) {
    return fallo(error, 'POST /api/admin/media');
  }
}
