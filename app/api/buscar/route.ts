/**
 * Índice mínimo de productos visibles para el buscador del sitio (lupa del menú).
 * Devuelve lo justo (id, nombre, categoría, precio, imagen) para filtrar en el navegador.
 */

import { NextResponse } from 'next/server';
import { CATEGORIES } from '@/data/catalog';
import { getAllProducts } from '@/lib/catalog/store';

export const revalidate = 60;

export async function GET() {
  const productos = await getAllProducts();
  const nombreCategoria = new Map<string, string>(CATEGORIES.map((c) => [c.id, c.name]));
  const items = productos.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryName: nombreCategoria.get(p.category) ?? '',
    tagline: p.tagline ?? '',
    price: p.price,
    image: p.images[0] ?? null,
  }));
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
