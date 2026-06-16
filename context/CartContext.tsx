'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { CartItem, Product, ProductColor } from '@/types';

interface AddOptions {
  color?: ProductColor;
  size?: string;
  qty?: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [shipping, setShipping] = useState<CartContextValue['shipping']>(null);

  const add = useCallback((product: Product, opts: AddOptions = {}) => {
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

  const clear = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, open, setOpen, shipping, setShipping, add, updateQty, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
