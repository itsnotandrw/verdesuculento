/**
 * POST /api/admin/expirar — cierra los pedidos cuyo pago nunca llegó.
 *
 * Pensado para correr desde un cron (Vercel Cron, GitHub Actions o el
 * programador del servidor) una o dos veces al día:
 *
 *   curl -X POST https://<dominio>/api/admin/expirar \
 *        -H "Authorization: Bearer $ADMIN_API_TOKEN"
 *
 * Antes de expirar cada pedido consulta el estado real en la pasarela: matar
 * un pedido que sí se pagó es mucho peor que dejarlo abierto unas horas de más.
 */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { expirarPendientes } from '@/lib/orders/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const resultado = await expirarPendientes();
    return ok({ ...resultado, corridoEn: new Date().toISOString() });
  } catch (error) {
    return fallo(error, 'POST /api/admin/expirar');
  }
}
