/**
 * GET /api/admin/respaldo — descarga una copia (JSON) del catálogo, las promociones y los pedidos.
 * Para guardar una copia propia aparte de la de Redis. Solo admin; no incluye contraseñas ni llaves.
 */

import { autorizarAdmin, fallo } from '@/lib/api';
import { getAllProducts } from '@/lib/catalog/store';
import { getPromoConfig } from '@/lib/promotions-store';
import { orders } from '@/lib/orders/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    const [productos, promociones, pedidos] = await Promise.all([getAllProducts(true), getPromoConfig(), orders.list({ limite: 5000 })]);
    const cuerpo = JSON.stringify({ generado: new Date().toISOString(), productos, promociones, pedidos }, null, 1);
    const fecha = new Date().toISOString().slice(0, 10);
    return new Response(cuerpo, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="respaldo-verde-suculento-${fecha}.json"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return fallo(error, 'GET /api/admin/respaldo');
  }
}
