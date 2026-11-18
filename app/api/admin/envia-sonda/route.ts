/**
 * TEMPORAL — GET /api/admin/envia-sonda?dep=Antioquia&ciudad=Medellín&monto=70000
 * Solo admin. Cotiza con y sin recaudo contra Envia y devuelve la respuesta recortada. No genera guías ni cobra.
 * Se elimina al terminar de integrar el contra entrega.
 */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { sondaRecaudo } from '@/lib/shipping/providers/envia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    const url = new URL(request.url);
    const departamento = url.searchParams.get('dep') ?? 'Cundinamarca';
    const ciudad = url.searchParams.get('ciudad') ?? 'Bogotá';
    const monto = Math.min(5_000_000, Math.max(10_000, Number(url.searchParams.get('monto')) || 70_000));
    return ok(await sondaRecaudo({ departamento, ciudad }, monto));
  } catch (error) {
    return fallo(error, 'GET /api/admin/envia-sonda');
  }
}
