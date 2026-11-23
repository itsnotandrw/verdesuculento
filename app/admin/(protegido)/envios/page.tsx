import type { Metadata } from 'next';
import EnviosAdmin from './EnviosAdmin';

export const metadata: Metadata = {
  title: 'Envíos · Panel',
  robots: { index: false, follow: false },
};

export default function AdminEnviosPage() {
  return <EnviosAdmin />;
}
