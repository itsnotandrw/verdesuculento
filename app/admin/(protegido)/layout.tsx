/**
 * Layout de las páginas del panel (todo lo que vive bajo este route group
 * `(protegido)`; el paréntesis no aparece en la URL).
 *
 * La barrera REAL sigue en cada route handler de /api/admin/* (`autorizarAdmin`).
 * Con ADMIN_DEV_OPEN=1 (solo desarrollo) el panel abre sin login para revisar lo visual.
 */

import { redirect } from 'next/navigation';
import { sesionActual } from '@/lib/admin/session';
import { env } from '@/lib/env';
import { orders } from '@/lib/orders/store';
import { getPromoConfig } from '@/lib/promotions-store';
import { estadoDe } from '@/lib/promotions';
import AdminShell, { type Aviso } from '@/components/admin/AdminShell';
import '../admin.css';

export const dynamic = 'force-dynamic';

export default async function AdminProtegidoLayout({ children }: { children: React.ReactNode }) {
  if (!env.adminOpen && !sesionActual()) redirect('/admin/login');

  let pendientesVentas = 0;
  const avisos: Aviso[] = [];
  try {
    const [lista, promos] = await Promise.all([orders.list({ limite: 300 }), getPromoConfig()]);
    const porVerificar = lista.filter((o) => o.status === 'payment_in_review').length;
    const porEnviar = lista.filter((o) => o.status === 'paid').length;
    pendientesVentas = porVerificar + porEnviar;
    if (porVerificar) avisos.push({ label: `${porVerificar} pago(s) por verificar`, href: '/admin/pedidos' });
    if (porEnviar) avisos.push({ label: `${porEnviar} pedido(s) pagados por enviar`, href: '/admin/pedidos' });
    const ahora = new Date();
    const porVencer = [...promos.coupons, ...promos.campaigns].filter((x) => estadoDe(x, ahora) === 'activa' && x.endsAt && new Date(x.endsAt).getTime() - ahora.getTime() < 3 * 86400000).length;
    if (porVencer) avisos.push({ label: `${porVencer} promoción(es) o cupón(es) vencen en menos de 3 días`, href: '/admin/promociones' });
  } catch { /* el panel abre aunque Redis no responda */ }

  return <AdminShell avisos={avisos} pendientesVentas={pendientesVentas}>{children}</AdminShell>;
}
