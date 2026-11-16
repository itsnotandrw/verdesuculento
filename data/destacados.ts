/**
 * Productos destacados del inicio: uno por categoría, el más vendido de cada una.
 *
 * Criterio (2026-11-16): las 4 categorías de frutales con más unidades vendidas en Mercado Libre
 * (sold_quantity) y, dentro de cada una, el producto con más ventas. Para actualizarlo, cambiar los ids
 * (el orden es el orden en que se muestran). Si un producto se oculta, se omite sin romper el inicio.
 */
export const DESTACADOS_IDS: readonly string[] = [
  'MCO2178557170', // Berries: Plantas Arándano Blueberry (520 vendidos)
  'MCO1634999953', // Frutales exóticos de clima cálido: Fruta Milagrosa (166)
  'MCO1662851471', // Frutales de clima frío a templado: Planta de Café Supremo (66)
  'MCO1634880323', // Frutales de clima cálido: Guayaba Manzana (100)
];
