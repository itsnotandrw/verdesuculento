'use client';

import { createContext, useContext } from 'react';

// Conteo REAL de productos visibles por categoría (lo calcula el servidor en
// app/layout.tsx), para que el menú no muestre números desactualizados cuando
// el admin oculta productos.
const CategoryCountsContext = createContext<Record<string, number>>({});

export function CategoryCountsProvider({ counts, children }: { counts: Record<string, number>; children: React.ReactNode }) {
  return <CategoryCountsContext.Provider value={counts}>{children}</CategoryCountsContext.Provider>;
}

/** Cantidad de productos visibles de una categoría (si no hay dato, usa `fallback`). */
export function useCategoryCount(id: string, fallback = 0): number {
  const counts = useContext(CategoryCountsContext);
  return counts[id] ?? fallback;
}

/** Mapa completo de conteos por categoría. */
export function useCategoryCounts(): Record<string, number> {
  return useContext(CategoryCountsContext);
}
