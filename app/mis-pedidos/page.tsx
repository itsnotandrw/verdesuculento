import type { Metadata } from 'next';
import MisPedidos from './MisPedidos';

export const metadata: Metadata = {
  title: 'Mis pedidos · VERDE.',
  description: 'Busca tus pedidos con tu correo.',
  robots: { index: false, follow: false },
};

export default function MisPedidosPage() {
  return <MisPedidos />;
}
