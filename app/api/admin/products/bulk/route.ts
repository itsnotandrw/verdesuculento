/**
 * POST /api/admin/products/bulk — acciones masivas sobre el catálogo.
 * Cuerpo: { "ids": string[], "accion": "ocultar" | "mostrar" | "precio-pct", "valor"?: number }
 *   - ocultar / mostrar: cambia `activo`.
 *   - precio-pct: ajusta el precio en un porcentaje (p. ej. 10 sube 10%, -5 baja 5%).
 */

import { ValidationError, autorizarAdmin, cuerpo, fail, fallo, ok } from '@/lib/api';
import { catalogoEditable, getAllProducts, upsertProduct } from '@/lib/catalog/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;

  try {
    if (!catalogoEditable()) return fail('El catálogo es de solo lectura: falta configurar REDIS_URL.', 503);

    const body = await cuerpo(request);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : [];
    if (ids.length === 0 || ids.length > 500) throw new ValidationError('Selecciona entre 1 y 500 productos.');
    const accion = body.accion;
    if (accion !== 'ocultar' && accion !== 'mostrar' && accion !== 'precio-pct') {
      throw new ValidationError('Acción no válida.');
    }
    const pct = Number(body.valor);
    if (accion === 'precio-pct' && (!Number.isFinite(pct) || pct < -90 || pct > 300 || pct === 0)) {
      throw new ValidationError('El porcentaje debe estar entre -90 y 300 (y no ser 0).');
    }

    const todos = await getAllProducts(true);
    const set = new Set(ids);
    let cambiados = 0;
    for (const p of todos) {
      if (!set.has(p.id)) continue;
      const siguiente = { ...p };
      if (accion === 'ocultar') siguiente.activo = false;
      else if (accion === 'mostrar') delete siguiente.activo;
      else siguiente.price = Math.max(100, Math.round((p.price * (1 + pct / 100)) / 10) * 10);
      await upsertProduct(siguiente);
      cambiados++;
    }
    return ok({ cambiados });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/products/bulk');
  }
}
