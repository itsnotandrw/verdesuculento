'use client';

// Campañas vigentes (las que el admin dejó activas), para mostrar el precio rebajado en todo el sitio.
// Es solo para mostrar: el servidor vuelve a calcular el precio al cobrar (lib/promo-servidor.ts).
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { precioProducto, type PrecioProducto } from '@/lib/promo-precios';
import type { Campaign } from '@/lib/promotions';

type ProductoBase = { id: string; category: string; price: number };

interface PromoValue {
  precio: (producto: ProductoBase, qty?: number) => PrecioProducto;
}

const PromoContext = createContext<PromoValue>({
  precio: (p) => ({ unit: p.price, list: p.price, pct: 0 }),
});

export function PromoProvider({ campanas, children }: { campanas: Campaign[]; children: ReactNode }) {
  const precio = useCallback((p: ProductoBase, qty = 1) => precioProducto(p, qty, campanas), [campanas]);
  const value = useMemo(() => ({ precio }), [precio]);
  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  return useContext(PromoContext);
}
