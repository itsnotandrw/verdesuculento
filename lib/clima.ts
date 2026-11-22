/**
 * Clima de cada planta, una sola fuente para toda la tienda (filtros del catálogo, etiquetas de las tarjetas,
 * recomendaciones por zona de cultivo, imágenes interactivas del inicio).
 *
 * En Colombia el clima lo define la altitud (piso térmico). La tienda maneja dos grupos: «cálido» y «frío a templado».
 * Una planta puede ser de uno o de los dos. Orden de prioridad para saberlo:
 *   1. lo que el administrador marcó en la publicación (`climas`);
 *   2. si no, lo que sale de su altitud recomendada (`altitud`);
 *   3. si no, el valor por defecto de su categoría.
 */

import type { Clima, Product } from '@/types';

export type { Clima };

export const CLIMA_LABEL: Record<Clima, string> = { calido: 'Clima cálido', frio: 'Clima frío a templado' };
export const CLIMA_CORTO: Record<Clima, string> = { calido: 'Cálido', frio: 'Frío a templado' };

const POR_CATEGORIA: Record<string, Clima[]> = {
  'frutales-calido': ['calido'],
  'frutales-exoticos': ['calido'],
  'frutales-frio': ['frio'],
  berries: ['frio'],
  citricos: ['calido', 'frio'],
};

type ConClima = Pick<Product, 'category' | 'climas' | 'altitud'>;

export const climasDeAltitud = (a: NonNullable<Product['altitud']>): Clima[] => {
  const out: Clima[] = [];
  if (a.min < 1000) out.push('calido');
  if (a.max >= 1000) out.push('frio');
  return out;
};

/** Grupo de clima de un municipio según su altitud (menos de 1.000 msnm = cálido; el resto, frío a templado). */
export const climaDeMsnm = (msnm: number): Clima => (msnm < 1000 ? 'calido' : 'frio');

export function climasDe(p: ConClima): Clima[] {
  if (p.climas?.length) return p.climas;
  if (p.altitud) return climasDeAltitud(p.altitud);
  return POR_CATEGORIA[p.category] ?? [];
}

/** ¿Esta planta se da a esa altitud? Con altitud recomendada se compara el rango exacto; si no, por grupo de clima. */
export function aptoParaMsnm(p: ConClima, msnm: number): boolean {
  if (p.altitud) return msnm >= p.altitud.min && msnm <= p.altitud.max;
  return climasDe(p).includes(climaDeMsnm(msnm));
}
