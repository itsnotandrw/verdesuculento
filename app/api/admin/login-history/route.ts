/** GET /api/admin/login-history — últimos accesos al panel (éxito y fallidos). */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { obtenerAccesos } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const accesos = await obtenerAccesos();
    return ok({ accesos });
  } catch (error) {
    return fallo(error, 'GET /api/admin/login-history');
  }
}
