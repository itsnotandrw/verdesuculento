'use client';

import { CartProvider } from '@/context/CartContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import { SearchProvider } from '@/context/SearchContext';
import { PromoProvider } from '@/context/PromoContext';
import type { Campaign, CuponPublico } from '@/lib/promotions';
import type { ReactNode } from 'react';

export default function Providers({ children, campanas, cupones }: { children: ReactNode; campanas: Campaign[]; cupones: CuponPublico[] }) {
  return (
    <PromoProvider campanas={campanas} cupones={cupones}>
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
