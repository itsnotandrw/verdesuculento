/**
 * POST /api/admin/media — sube una imagen (multipart, campo "file") y la guarda en Redis.
 * Devuelve { url: "/api/media/<id>" } para usarla en un banner o un producto.
 *
 * La imagen se valida de verdad (que sea una imagen, no solo que lo diga el nombre), se corrige su orientación, se
 * convierte a WebP y se guarda en dos tamaños (640 y 1600 px): una foto de 6 MB del celular queda en ~100 KB y las
 * miniaturas no descargan la grande. Se guarda en Redis (no en disco) para que sobreviva a los redeploys.
 */

import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { autorizarAdmin, fail, fallo, ok } from '@/lib/api';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const TIPOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!redis) return fail('Subir imágenes requiere REDIS_URL.', 503);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return fail('Falta el archivo.', 422);
    if (!TIPOS.has(file.type)) return fail('Solo se aceptan JPG, PNG o WebP.', 422);
    if (file.size > MAX_BYTES) return fail('La imagen pesa más de 12 MB.', 422);

    const original = Buffer.from(await file.arrayBuffer());
    let grande: Buffer;
    let chica: Buffer;
    try {
      const base = sharp(original, { limitInputPixels: 40_000_000 }).rotate();
      [grande, chica] = await Promise.all([
        base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
        base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer(),
      ]);
    } catch {
      return fail('El archivo no es una imagen válida.', 422);
    }

    const id = randomBytes(9).toString('hex');
    await redis.set(`verde:media:${id}`, JSON.stringify({ type: 'image/webp', data: grande.toString('base64'), small: chica.toString('base64') }));
    return ok({ url: `/api/media/${id}` }, 201);
  } catch (error) {
    return fallo(error, 'POST /api/admin/media');
  }
}
