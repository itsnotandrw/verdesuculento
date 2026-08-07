/**
 * Dinero en COP.
 *
 * Regla del proyecto: internamente todo se maneja en **pesos enteros**. Las
 * pasarelas (Wompi y compañía) trabajan en centavos, así que la conversión
 * ocurre únicamente en el borde del adaptador, nunca en la lógica de negocio.
 * El peso colombiano no usa decimales en la práctica, pero la API los exige.
 */

export const CURRENCY = 'COP' as const;

/** 45.000 COP → 4500000 (lo que espera `amount_in_cents`). */
export function toCents(pesos: number): number {
  return Math.round(pesos * 100);
}

/** 4500000 → 45.000 COP. */
export function fromCents(cents: number): number {
  return Math.round(cents / 100);
}

/** Formato de moneda para servidor y cliente (mismo output que data/catalog.ts). */
export function formatCOP(n: number): string {
  return `$${n.toLocaleString('es-CO')}`;
}

/**
 * Redondea a la centena más cercana. Las transportadoras devuelven tarifas con
 * decimales y mostrar "$14.237" en un checkout se ve a producto sin terminar.
 */
export function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}
