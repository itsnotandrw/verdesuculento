/**
 * Índice mínimo de productos visibles para el buscador del sitio (lupa del menú).
 * Devuelve lo justo (id, nombre, categoría, precios, imagen) para filtrar en el navegador.
 *
 * SIN caché a propósito: los precios y las promociones salen del admin y el buscador debe mostrar siempre lo
 * mismo que el catálogo. El precio con promoción (`unit`) lo calcula el servidor con las campañas vigentes.
 */

import { NextResponse } from 'next/server';
import { CATEGORIES } from '@/data/catalog';
import { getAllProducts } from '@/lib/catalog/store';
import { campanasVigentes } from '@/lib/promo-servidor';
import { precioProducto } from '@/lib/promo-precios';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [productos, campanas] = await Promise.all([getAllProducts(), campanasVigentes()]);
  const nombreCategoria = new Map<string, string>(CATEGORIES.map((c) => [c.id, c.name]));
  const items = productos.map((p) => {
    const precio = precioProducto(p, 1, campanas);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      categoryName: nombreCategoria.get(p.category) ?? '',
      tagline: p.tagline ?? '',
      price: p.price,
      unit: precio.unit,
      pct: precio.pct,
      image: p.images[0] ?? null,
    };
  });
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
