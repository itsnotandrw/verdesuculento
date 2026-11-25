/**
 * GET /api/zona/plantas?msnm=2565 — plantas recomendadas para una altitud (zona de cultivo del cliente).
 * Público y de solo lectura: primero van las que tienen altitud recomendada que incluye esa zona, después las que
 * coinciden por clima. Devuelve lo mínimo para mostrar una lista (nunca el catálogo completo).
 */

import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/catalog/store';
import { aptoParaMsnm } from '@/lib/clima';
import { ipDe, limitar } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await limitar('zona-plantas', ipDe(request)))) {
    return NextResponse.json({ error: 'Demasiadas consultas. Espera un momento.' }, { status: 429 });
  }
  const msnm = Number(new URL(request.url).searchParams.get('msnm'));
  if (!Number.isFinite(msnm) || msnm < 0 || msnm > 5000) {
    return NextResponse.json({ error: 'Altitud no válida.' }, { status: 400 });
  }

  const productos = await getAllProducts();
  const aptos = productos.filter((p) => aptoParaMsnm(p, msnm));
  // Las que declaran una altitud exacta que incluye la zona van primero.
  aptos.sort((a, b) => Number(Boolean(b.altitud)) - Number(Boolean(a.altitud)));

  return NextResponse.json(
    { msnm, total: aptos.length, plantas: aptos.slice(0, 400).map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.images[0] ?? null, category: p.category, resumen: p.description.replace(/\s+/g, ' ').trim().slice(0, 170), exacta: Boolean(p.altitud) })) },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
