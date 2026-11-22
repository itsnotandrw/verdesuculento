/** GET /api/admin/errores — últimos errores del servidor (los registra instrumentation.ts). Solo admin. */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    if (!redis) return ok({ errores: [] });
    const filas = await redis.lrange('verde:errores', 0, 49);
    return ok({ errores: filas.map((f) => { try { return JSON.parse(f); } catch { return { mensaje: f }; } }) });
  } catch (error) {
    return fallo(error, 'GET /api/admin/errores');
  }
}
