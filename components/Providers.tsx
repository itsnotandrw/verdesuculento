'use client';

import { CartProvider } from '@/context/CartContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import { SearchProvider } from '@/context/SearchContext';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <QuickViewProvider>
        <SearchProvider>
          {children}
        </SearchProvider>
      </QuickViewProvider>
    </CartProvider>
  );
}
