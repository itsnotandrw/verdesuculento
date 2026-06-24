import type { Metadata } from 'next';
import CatalogContent from './CatalogContent';

export const metadata: Metadata = {
  title: 'Catálogo — VERDE.',
  description: 'Explora nuestro catálogo de frutales, ornamentales, suculentas e insumos agrícolas. Envíos a toda Colombia con garantía de plantas vivas.',
};

export default function CatalogPage() {
  return <CatalogContent />;
}
