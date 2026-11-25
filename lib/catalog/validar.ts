/**
 * Valida el cuerpo de una request de admin como un Product completo.
 * SOLO SERVIDOR — compartido entre POST /api/admin/products y
 * PATCH /api/admin/products/[id] para no repetir las mismas reglas dos veces.
 */

import { ValidationError, entero, texto } from '@/lib/api';
import { CATEGORIES } from '@/data/catalog';
import { sinAltitud, textoClima } from '@/lib/clima';
import type { Product, ProductSpecs } from '@/types';

function textoArray(valor: unknown, campo: string, max: number): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .map((v) => v.slice(0, max));
}

export function parseProducto(body: Record<string, unknown>, idExistente?: string): Product {
  const id = idExistente ?? texto(body.id, 'el id', { max: 40 });
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError('El id solo puede tener letras, números, guiones y guion bajo.');
  }

  const categoria = texto(body.category, 'la categoría', { max: 40 });
  if (!CATEGORIES.some((c) => c.id === categoria)) {
    throw new ValidationError(`Categoría "${categoria}" no existe.`);
  }

  const colorsRaw = Array.isArray(body.colors) ? body.colors : [];
  const colors = colorsRaw
    .map((c) => {
      const obj = c as Record<string, unknown>;
      const name = typeof obj?.name === 'string' ? obj.name.trim().slice(0, 60) : '';
      const hex = typeof obj?.hex === 'string' ? obj.hex.trim().slice(0, 20) : '';
      return name && hex ? { name, hex } : null;
    })
    .filter((c): c is { name: string; hex: string } => c !== null);
  if (colors.length === 0) {
    throw new ValidationError('Necesita al menos una variedad (nombre y color).');
  }

  const sizes = textoArray(body.sizes, 'la presentación', 60);
  if (sizes.length === 0) {
    throw new ValidationError('Necesita al menos una presentación.');
  }

  const images = textoArray(body.images, 'la imagen', 300);

  const specsBody = (body.specs ?? {}) as Record<string, unknown>;
  const specs: ProductSpecs = {
    clima: texto(specsBody.clima, 'el clima', { max: 160, requerido: false }),
    sol: texto(specsBody.sol, 'la exposición solar', { max: 160, requerido: false }),
    riego: texto(specsBody.riego, 'el riego', { max: 160, requerido: false }),
    produccion: texto(specsBody.produccion, 'la producción', { max: 160, requerido: false }),
    altura: texto(specsBody.altura, 'la altura', { max: 160, requerido: false }),
    dificultad: texto(specsBody.dificultad, 'la dificultad', { max: 60, requerido: false }),
  };

  let logistica: Product['logistica'];
  const lg = body.logistica as Record<string, unknown> | undefined;
  if (lg && typeof lg === 'object' && [lg.weightGrams, lg.lengthCm, lg.widthCm, lg.heightCm].some((v) => v != null && v !== '')) {
    logistica = {
      weightGrams: entero(lg.weightGrams, 'el peso (gramos)', 1, 100_000),
      lengthCm: entero(lg.lengthCm, 'el largo (cm)', 1, 300),
      widthCm: entero(lg.widthCm, 'el ancho (cm)', 1, 300),
      heightCm: entero(lg.heightCm, 'el alto (cm)', 1, 300),
    };
  }

  // La altitud recomendada es OBLIGATORIA para las plantas (único dato de clima, manda en todo el sitio). Los agroinsumos
  // no la llevan: se recomiendan siempre como complemento.
  let altitud: Product['altitud'];
  if (sinAltitud(categoria)) {
    specs.clima = 'Todos los climas';
  } else {
    const al = body.altitud as Record<string, unknown> | null | undefined;
    if (!al || typeof al !== 'object' || al.min == null || al.max == null || al.min === '' || al.max === '') {
      throw new ValidationError('Define la altitud recomendada (msnm) de la planta: es obligatoria y manda en el clima de todo el sitio.');
    }
    const altMin = entero(al.min, 'la altitud mínima (msnm)', 0, 5000);
    const altMax = entero(al.max, 'la altitud máxima (msnm)', 0, 5000);
    if (altMin > altMax) throw new ValidationError('La altitud mínima no puede ser mayor que la máxima.');
    altitud = { min: altMin, max: altMax };
    specs.clima = textoClima(altitud);
  }

  const badge = texto(body.badge, 'la insignia', { max: 40, requerido: false });
  const accent = texto(body.accent, 'el acento', { max: 40, requerido: false });

  return {
    id,
    name: texto(body.name, 'el nombre', { max: 160 }),
    category: categoria,
    price: entero(body.price, 'el precio', 0, 50_000_000),
    tagline: texto(body.tagline, 'el eslogan', { max: 160, requerido: false }),
    description: texto(body.description, 'la descripción', { max: 8000, requerido: false }),
    colors,
    sizes,
    badge: badge || undefined,
    accent: accent || undefined,
    specs,
    images,
    activo: body.activo !== false,
    ...(logistica ? { logistica } : {}),
    ...(altitud ? { altitud } : {}),
  };
}
