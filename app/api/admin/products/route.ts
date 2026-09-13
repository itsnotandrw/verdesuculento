/**
 * GET /api/admin/products — catálogo completo (activos e inactivos) para el admin.
 * POST /api/admin/products — crea un producto nuevo.
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok } from '@/lib/api';
import { catalogoEditable, getAllProducts, upsertProduct } from '@/lib/catalog/store';
import { parseProducto } from '@/lib/catalog/validar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    const products = await getAllProducts(true);
    return ok({ products, editable: catalogoEditable() });
  } catch (error) {
    return fallo(error, 'GET /api/admin/products');
  }
}

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!catalogoEditable()) {
      return fail('El catálogo es de solo lectura: falta configurar Redis (KV_REST_API_URL/TOKEN).', 503);
    }

    const body = await cuerpo(request);
    const producto = parseProducto(body);

    const existentes = await getAllProducts(true);
    if (existentes.some((p) => p.id === producto.id)) {
      return fail(`Ya existe un producto con el id "${producto.id}".`, 409);
    }

    await upsertProduct(producto);
    return ok({ product: producto }, 201);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/products');
  }
}
