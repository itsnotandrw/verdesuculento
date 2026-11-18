'use client';

// Campañas vigentes (las que el admin dejó activas), para mostrar el precio rebajado en todo el sitio.
// Es solo para mostrar: el servidor vuelve a calcular el precio al cobrar (lib/promo-servidor.ts).
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { precioProducto, type PrecioProducto } from '@/lib/promo-precios';
import { aplicaScope, type Campaign, type CuponPublico } from '@/lib/promotions';

type ProductoBase = { id: string; category: string; price: number };

interface PromoValue {
  precio: (producto: ProductoBase, qty?: number) => PrecioProducto;
  /** Mejor cupón vigente que aplica a este producto (solo si el producto no está ya en promoción: no se suman). */
  cuponDe: (producto: ProductoBase) => CuponPublico | null;
}

const PromoContext = createContext<PromoValue>({
  precio: (p) => ({ unit: p.price, list: p.price, pct: 0 }),
  cuponDe: () => null,
});

export function PromoProvider({ campanas, cupones = [], children }: { campanas: Campaign[]; cupones?: CuponPublico[]; children: ReactNode }) {
  const precio = useCallback((p: ProductoBase, qty = 1) => precioProducto(p, qty, campanas), [campanas]);
  const cuponDe = useCallback((p: ProductoBase) => {
    if (precioProducto(p, 1, campanas).pct > 0) return null;
    let mejor: CuponPublico | null = null;
    for (const c of cupones) if (aplicaScope(c.target, p) && (!mejor || c.pct > mejor.pct)) mejor = c;
    return mejor;
  }, [campanas, cupones]);
  const value = useMemo(() => ({ precio, cuponDe }), [precio, cuponDe]);
  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo() {
  return useContext(PromoContext);
}
