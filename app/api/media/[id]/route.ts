/** GET /api/media/<id>[?w=640|1600] — sirve una imagen subida desde el admin (guardada en Redis), en el tamaño pedido. */

import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!redis || !/^[a-f0-9]{18}$/.test(params.id)) return new Response('No encontrado', { status: 404 });

  const crudo = await redis.get(`verde:media:${params.id}`);
  if (!crudo) return new Response('No encontrado', { status: 404 });

  const { type, data, small } = JSON.parse(crudo) as { type: string; data: string; small?: string };
  const pideChica = new URL(request.url).searchParams.get('w') === '640' && small;
  return new Response(Buffer.from(pideChica ? (small as string) : data, 'base64'), {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
  });
}
