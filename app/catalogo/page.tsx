import type { Metadata } from 'next';
import { getAllProducts } from '@/lib/catalog/store';
import CatalogContent from './CatalogContent';

export const metadata: Metadata = {
  title: 'Catálogo — Vivero Verde Suculento',
  description: 'Explora nuestro catálogo de frutales, ornamentales, suculentas e insumos agrícolas. Envíos a toda Colombia con garantía de plantas vivas.',
};

// El catálogo ahora puede venir de Redis y editarse desde el admin — sin
// esto, Next serviría una foto estática tomada en el build y un cambio de
// precio no se vería hasta el próximo deploy. 60s es suficiente para que se
// sienta "en vivo" sin perder el beneficio de cachear (no es un dato que
// cambie segundo a segundo).
export const revalidate = 60;

export default async function CatalogPage() {
  const products = await getAllProducts();
  return <CatalogContent products={products} />;
}
