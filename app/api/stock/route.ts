/** GET /api/stock — ids de productos agotados (inventario en 0). Público: no expone cantidades. */
import { NextResponse } from 'next/server';
import { listarAgotados } from '@/lib/inventario';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ agotados: await listarAgotados() }, { headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60' } });
  } catch {
    return NextResponse.json({ agotados: [] });
  }
}
