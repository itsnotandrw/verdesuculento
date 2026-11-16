'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';

export interface EstadoCupon {
  cargando: boolean;
  /** undefined = no hay cupón escrito. */
  valido?: boolean;
  motivo?: string;
  descuento: number;
  code?: string;
  pct?: number;
  scope?: string;
}

/**
 * Valida contra el servidor el cupón escrito en el carrito y devuelve cuánto descuenta.
 * Se vuelve a validar solo cuando cambia el carrito (la compra mínima y los productos elegibles dependen de él).
 */
export function useCupon(): EstadoCupon {
  const { items, couponCode } = useCart();
  const [estado, setEstado] = useState<EstadoCupon>({ cargando: false, descuento: 0 });

  useEffect(() => {
    if (!couponCode.trim() || items.length === 0) {
      setEstado({ cargando: false, descuento: 0 });
      return;
    }
    const control = new AbortController();
    setEstado((e) => ({ ...e, cargando: true }));
    const t = setTimeout(() => {
      fetch('/api/cupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, lines: items.map((i) => ({ productId: i.product.id, qty: i.qty })) }),
        signal: control.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.valido) setEstado({ cargando: false, valido: true, descuento: d.descuento, code: d.code, pct: d.pct, scope: d.scope });
          else setEstado({ cargando: false, valido: false, descuento: 0, motivo: d.motivo ?? d.error ?? 'No pudimos validar el cupón.' });
        })
        .catch((e) => { if (e?.name !== 'AbortError') setEstado({ cargando: false, valido: false, descuento: 0, motivo: 'No pudimos validar el cupón. Intenta de nuevo.' }); });
    }, 350);
    return () => { clearTimeout(t); control.abort(); };
  }, [couponCode, items]);

  return estado;
}
