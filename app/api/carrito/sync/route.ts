/**
 * GET /api/carrito/sync?ids=a,b,c — precio y nombre ACTUALES de los productos del carrito.
 * Sirve para que el carrito del navegador no muestre precios viejos si el admin los cambió. El cobro nunca depende
 * de esto: el servidor recalcula todo al crear el pedido.
 */

import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/catalog/store';
import { limitarPeticion } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const excedido = await limitarPeticion(request, 'carrito');
  if (excedido) return excedido;
  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))
    .slice(0, 40);
  const items: Array<{ id: string; name: string; price: number; category: string; activo: boolean }> = [];
  for (const id of new Set(ids)) {
    const p = await getProductById(id);
    if (p) items.push({ id: p.id, name: p.name, price: p.price, category: p.category, activo: p.activo !== false });
  }
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
