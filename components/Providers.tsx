'use client';

import { CartProvider } from '@/context/CartContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <QuickViewProvider>
        {children}
      </QuickViewProvider>
    </CartProvider>
  );
}
