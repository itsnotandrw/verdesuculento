import type { Metadata } from 'next';
import ProductForm from '../ProductForm';

export const metadata: Metadata = {
  title: 'Nuevo producto · Panel',
  robots: { index: false, follow: false },
};

export default function NuevoProductoPage() {
  return <ProductForm modo="crear" />;
}
