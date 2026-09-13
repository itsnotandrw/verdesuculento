import type { Metadata } from 'next';
import CatalogAdmin from './CatalogAdmin';

export const metadata: Metadata = {
  title: 'Catálogo · Panel',
  robots: { index: false, follow: false },
};

export default function AdminCatalogoPage() {
  return <CatalogAdmin />;
}
