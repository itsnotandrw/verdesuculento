/**
 * PATCH /api/admin/products/[id] — reemplaza un producto existente.
 * DELETE /api/admin/products/[id] — lo borra (real, no soft-delete — ver
 * comentario en lib/catalog/store.ts sobre por qué eso es seguro: los
 * pedidos ya creados no dependen del catálogo).
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok } from '@/lib/api';
import { catalogoEditable, deleteProduct, getProductById, upsertProduct } from '@/lib/catalog/store';
import { parseProducto } from '@/lib/catalog/validar';
import { fijarStock, leerStock } from '@/lib/inventario';

export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!catalogoEditable()) {
      return fail('El catálogo es de solo lectura: falta configurar Redis (REDIS_URL).', 503);
    }

    const existente = await getProductById(params.id);
    if (!existente) return fail('Ese producto no existe.', 404);

    const body = await cuerpo(request, 600_000);
    const producto = parseProducto(body, params.id);
    const stock = leerStock(body.stock);
    await upsertProduct(producto);
    if (stock !== undefined) await fijarStock(producto.id, stock);
    return ok({ product: producto });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'PATCH /api/admin/products/[id]');
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!catalogoEditable()) {
      return fail('El catálogo es de solo lectura: falta configurar Redis (REDIS_URL).', 503);
    }

    const existente = await getProductById(params.id);
    if (!existente) return fail('Ese producto no existe.', 404);

    await deleteProduct(params.id);
    await fijarStock(params.id, null);
    return ok({ ok: true });
  } catch (error) {
    return fallo(error, 'DELETE /api/admin/products/[id]');
  }
}
