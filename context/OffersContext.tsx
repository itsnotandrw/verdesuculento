'use client';

import { createContext, useContext } from 'react';

/** Una oferta o cupón con catálogo exclusivo (/ofertas/<slug>) para listarla en el menú. */
export interface OfferLink {
  slug: string;
  label: string;
  pct: number;
  kind: 'cupon' | 'campana';
}

const OffersContext = createContext<OfferLink[]>([]);

export function OffersProvider({ offers, children }: { offers: OfferLink[]; children: React.ReactNode }) {
  return <OffersContext.Provider value={offers}>{children}</OffersContext.Provider>;
}

export function useOffers(): OfferLink[] {
  return useContext(OffersContext);
}
