import type { Metadata } from 'next';
import AdminOrders from './AdminOrders';

export const metadata: Metadata = {
  title: 'Pedidos · Panel',
  robots: { index: false, follow: false },
};

export default function AdminPedidosPage() {
  return <AdminOrders />;
}
