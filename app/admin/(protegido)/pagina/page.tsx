import type { Metadata } from 'next';
import PaginaAdmin from './PaginaAdmin';

export const metadata: Metadata = { title: 'Mi página · Dashboard', robots: { index: false, follow: false } };

export default function AdminPaginaPage() {
  return <PaginaAdmin />;
}
