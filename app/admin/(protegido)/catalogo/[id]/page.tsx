import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/catalog/store';
import ProductForm from '../ProductForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editar producto · Panel',
  robots: { index: false, follow: false },
};

interface Props {
  params: { id: string };
}

export default async function EditarProductoPage({ params }: Props) {
  const producto = await getProductById(params.id);
  if (!producto) notFound();
  return <ProductForm modo="editar" inicial={producto} />;
}
