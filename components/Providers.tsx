'use client';

import { CartProvider } from '@/context/CartContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import { SearchProvider } from '@/context/SearchContext';
import { PromoProvider } from '@/context/PromoContext';
import type { Campaign } from '@/lib/promotions';
import type { ReactNode } from 'react';

export default function Providers({ children, campanas }: { children: ReactNode; campanas: Campaign[] }) {
  return (
    <PromoProvider campanas={campanas}>
      <CartProvider>
        <QuickViewProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </QuickViewProvider>
      </CartProvider>
    </PromoProvider>
  );
}
