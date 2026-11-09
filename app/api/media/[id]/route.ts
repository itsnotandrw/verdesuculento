/** GET /api/media/<id> — sirve una imagen subida desde el admin (guardada en Redis). */

import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!redis || !/^[a-f0-9]{18}$/.test(params.id)) return new Response('No encontrado', { status: 404 });

  const crudo = await redis.get(`verde:media:${params.id}`);
  if (!crudo) return new Response('No encontrado', { status: 404 });

  const { type, data } = JSON.parse(crudo) as { type: string; data: string };
  return new Response(Buffer.from(data, 'base64'), {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable' },
  });
}
