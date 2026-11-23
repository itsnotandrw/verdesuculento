/**
 * Clima de cada planta, una sola fuente para toda la tienda (filtros del catálogo, etiquetas de las tarjetas,
 * recomendaciones por zona de cultivo, categorías, ficha del producto).
 *
 * El ÚNICO dato que se guarda es la altitud recomendada de la publicación (msnm, mínimo y máximo). Todo lo demás
 * se calcula de ahí: en Colombia el clima lo define la altitud (piso térmico). La tienda maneja dos grupos:
 * «cálido» (menos de 1.000 msnm) y «frío a templado» (desde 1.000 msnm). Una planta puede ser de uno o de los dos.
 * Solo las publicaciones antiguas, que todavía no tienen altitud, usan un valor por defecto de su categoría.
 */

import type { Clima, Product } from '@/types';

export type { Clima };

export interface RangoAltitud { min: number; max: number }

export const ALTITUD_MAX = 3200;
export const ALTITUD_PASO = 50;
/** Frontera entre «cálido» y «frío a templado». */
export const ALTITUD_FRONTERA = 1000;

export const CLIMA_LABEL: Record<Clima, string> = { calido: 'Clima cálido', frio: 'Clima frío a templado' };
export const CLIMA_CORTO: Record<Clima, string> = { calido: 'Cálido', frio: 'Frío a templado' };

const POR_CATEGORIA: Record<string, Clima[]> = {
  'frutales-calido': ['calido'],
  'frutales-exoticos': ['calido'],
  'frutales-frio': ['frio'],
  berries: ['frio'],
  citricos: ['calido', 'frio'],
};

type ConClima = Pick<Product, 'category' | 'altitud'>;

export const climasDeAltitud = (a: RangoAltitud): Clima[] => {
  const out: Clima[] = [];
  if (a.min < ALTITUD_FRONTERA) out.push('calido');
  if (a.max >= ALTITUD_FRONTERA) out.push('frio');
  return out;
};

/** Grupo de clima de un municipio según su altitud (menos de 1.000 msnm = cálido; el resto, frío a templado). */
export const climaDeMsnm = (msnm: number): Clima => (msnm < ALTITUD_FRONTERA ? 'calido' : 'frio');

/** Climas de la planta: salen de su altitud; sin altitud (publicación antigua), de su categoría. */
export function climasDe(p: ConClima): Clima[] {
  if (p.altitud) return climasDeAltitud(p.altitud);
  return POR_CATEGORIA[p.category] ?? [];
}

/** ¿Esta planta se da a esa altitud? Con altitud se compara el rango exacto; sin ella, por grupo de clima. */
export function aptoParaMsnm(p: ConClima, msnm: number): boolean {
  if (p.altitud) return msnm >= p.altitud.min && msnm <= p.altitud.max;
  return climasDe(p).includes(climaDeMsnm(msnm));
}

const fmt = (n: number) => n.toLocaleString('es-CO');

/** Texto del clima para la ficha técnica: «Clima cálido y frío a templado · 0 a 2.500 msnm». */
export function textoClima(a: RangoAltitud): string {
  return `${climasDeAltitud(a).map((c) => CLIMA_LABEL[c]).join(' y ')} · ${fmt(a.min)} a ${fmt(a.max)} msnm`;
}

/** Altitud con la que arranca el formulario de una publicación antigua (hay que confirmarla a mano). */
export function altitudSugerida(p: ConClima): RangoAltitud {
  const c = climasDe(p);
  if (c.includes('calido') && c.includes('frio')) return { min: 0, max: 2500 };
  if (c.includes('calido')) return { min: 0, max: 950 };
  if (c.includes('frio')) return { min: 1000, max: 2500 };
  return { min: 1000, max: 2000 };
}
