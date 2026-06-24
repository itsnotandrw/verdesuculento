import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductById } from '@/data/catalog';
import ProductContent from './ProductContent';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductById(params.id);
  if (!product) return {};
  return {
    title: `${product.name} — VERDE.`,
    description: product.description,
  };
}

export default function ProductPage({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) notFound();
  return <ProductContent product={product} />;
}
