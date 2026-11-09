import type { Metadata } from 'next';
import { Suspense } from 'react';
import PromoCenter from './PromoCenter';

export const metadata: Metadata = {
  title: 'Promociones · Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminPromocionesPage() {
  return (
    <Suspense fallback={null}>
      <PromoCenter />
    </Suspense>
  );
}
