import type { Metadata } from 'next';
import CuentaAdmin from './CuentaAdmin';

export const metadata: Metadata = {
  title: 'Cuenta · Panel',
  robots: { index: false, follow: false },
};

export default function AdminCuentaPage() {
  return <CuentaAdmin />;
}
