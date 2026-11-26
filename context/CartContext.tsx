'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CartItem, Product, ProductColor } from '@/types';
import { usePromo } from '@/context/PromoContext';
import type { PrecioProducto } from '@/lib/promo-precios';
import { trackEvento } from '@/components/Trafico';
import { estaAgotado } from '@/hooks/useAgotados';

interface AddOptions {
  color?: ProductColor;
  size?: string;
  qty?: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  /** Suma de las líneas con las campañas vigentes (antes del cupón). */
  subtotal: number;
  /** Suma a precio de lista, sin promociones. */
  listSubtotal: number;
  /** Precio de una línea del carrito (con campañas). */
  linePrice: (item: CartItem) => PrecioProducto;
  /** Código de cupón escrito por el cliente (se valida contra el servidor). */
  couponCode: string;
  setCouponCode: (codigo: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  shipping: { dept: string; city: string; cost: number; days: string } | null;
  setShipping: (s: CartContextValue['shipping']) => void;
  add: (product: Product, opts?: AddOptions) => void;
  updateQty: (variantKey: string, delta: number) => void;
  remove: (variantKey: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// El carrito se guarda en el navegador del cliente para que no se pierda al recargar o volver otro día.
const CLAVE = 'verde-carrito';
const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;

function leerGuardado(crudo: string | null): { items: CartItem[]; cupon: string } | null {
  if (!crudo) return null;
  try {
    const d = JSON.parse(crudo) as { items?: unknown; cupon?: unknown; t?: number };
    if (!Array.isArray(d.items) || !d.t || Date.now() - d.t > VIGENCIA_MS) return null;
    // Solo líneas completas: un dato viejo o dañado no puede romper la tienda.
    const items = (d.items as CartItem[]).filter(
      (i) => i && typeof i.variantKey === 'string' && Number.isInteger(i.qty) && i.qty > 0 && i.color &&
        i.product && typeof i.product.id === 'string' && typeof i.product.price === 'number' && Array.isArray(i.product.images)
    );
    return { items, cupon: typeof d.cupon === 'string' ? d.cupon : '' };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [shipping, setShipping] = useState<CartContextValue['shipping']>(null);
  const [couponCode, setCouponCode] = useState('');
  const { precio } = usePromo();
  const linePrice = useCallback((item: CartItem) => precio(item.product, item.qty), [precio]);

  // Se lee después de montar (el servidor no conoce el carrito) y solo entonces se empieza a guardar.
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    const aplicar = (crudo: string | null) => {
      const g = leerGuardado(crudo);
      setItems(g?.items ?? []);
      setCouponCode(g?.cupon ?? '');
    };
    try { aplicar(localStorage.getItem(CLAVE)); } catch { /* sin almacenamiento: carrito solo en memoria */ }
    setCargado(true);
    // Otra pestaña cambió el carrito.
    const otraPestana = (e: StorageEvent) => { if (e.key === CLAVE) aplicar(e.newValue); };
    window.addEventListener('storage', otraPestana);
    return () => window.removeEventListener('storage', otraPestana);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    try {
      if (items.length === 0 && !couponCode) { localStorage.removeItem(CLAVE); return; }
      const previo = leerGuardado(localStorage.getItem(CLAVE));
      // Sin cambios no se reescribe (así dos pestañas no se contestan entre sí).
      if (previo && previo.cupon === couponCode && JSON.stringify(previo.items) === JSON.stringify(items)) return;
      localStorage.setItem(CLAVE, JSON.stringify({ items, cupon: couponCode, t: Date.now() }));
    } catch { /* almacenamiento lleno o bloqueado */ }
  }, [items, couponCode, cargado]);

  const add = useCallback((product: Product, opts: AddOptions = {}) => {
    if (estaAgotado(product.id)) return; // agotado: no se agrega
    trackEvento('carrito');
    const color = opts.color ?? product.colors[0];
    const size = opts.size ?? product.sizes[0];
    const variantKey = `${product.id}-${color.hex}-${size}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.variantKey === variantKey);
      if (existing) {
        return prev.map((i) =>
          i.variantKey === variantKey ? { ...i, qty: i.qty + (opts.qty ?? 1) } : i
        );
      }
      return [...prev, { variantKey, product, color, size, qty: opts.qty ?? 1 }];
    });
    setOpen(true);
  }, []);

  const updateQty = useCallback((variantKey: string, delta: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.variantKey !== variantKey) return [i];
        const newQty = i.qty + delta;
        return newQty <= 0 ? [] : [{ ...i, qty: newQty }];
      })
    );
  }, []);

  const remove = useCallback((variantKey: string) => {
    setItems((prev) => prev.filter((i) => i.variantKey !== variantKey));
  }, []);

  // Se borra del navegador al instante: tras comprar se salta a la pasarela y no puede quedar el carrito viejo.
  const clear = useCallback(() => { setItems([]); setCouponCode(''); try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } }, []);

  // Mantiene los precios del carrito iguales a los del admin: al cambiar los productos y al abrir el carrito.
  const ids = Array.from(new Set(items.map((i) => i.product.id))).sort().join(',');
  useEffect(() => {
    if (!ids) return;
    let vivo = true;
    fetch(`/api/carrito/sync?ids=${encodeURIComponent(ids)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { items: Array<{ id: string; name: string; price: number; category: string }> } | null) => {
        if (!vivo || !j) return;
        const actual = new Map(j.items.map((p) => [p.id, p]));
        setItems((prev) => {
          let cambio = false;
          const next = prev.map((i) => {
            const p = actual.get(i.product.id);
            if (!p || (p.price === i.product.price && p.name === i.product.name && p.category === i.product.category)) return i;
            cambio = true;
            return { ...i, product: { ...i.product, price: p.price, name: p.name, category: p.category } };
          });
          return cambio ? next : prev;
        });
      })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [ids, open]);

  const subtotal = items.reduce((s, i) => s + precio(i.product, i.qty).unit * i.qty, 0);
  const listSubtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, listSubtotal, linePrice, couponCode, setCouponCode, open, setOpen, shipping, setShipping, add, updateQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
