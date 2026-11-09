import type { Metadata } from 'next';
import LookEditor from './LookEditor';

export const metadata: Metadata = { title: 'Imágenes interactivas · Dashboard', robots: { index: false, follow: false } };

export default function AdminImagenesPage() {
  return <LookEditor />;
}
