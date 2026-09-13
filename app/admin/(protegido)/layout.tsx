/**
 * Layout de las páginas admin que requieren sesión (todo lo que vive bajo
 * este route group `(protegido)` — el paréntesis no aparece en la URL, así
 * que /admin/pedidos sigue siendo /admin/pedidos).
 *
 * El chequeo acá es la parte de UX: entrar a /admin/pedidos sin sesión
 * redirige a /admin/login antes de mandar nada al navegador, en vez de
 * mostrar la página y que falle después. La barrera REAL sigue viviendo en
 * cada route handler de /api/admin/* (`autorizarAdmin`, ver lib/api.ts) —
 * un layout es un gate de conveniencia, nunca el único guardián. Mismo
 * principio que ya aplica el middleware de auth en el proyecto de
 * referencia: el filtrado en la capa de UI es cosmético, la verificación
 * server-side en cada mutación es la que de verdad importa.
 */

import { redirect } from 'next/navigation';
import { sesionActual } from '@/lib/admin/session';
import AdminNav from './AdminNav';

export default function AdminProtegidoLayout({ children }: { children: React.ReactNode }) {
  if (!sesionActual()) redirect('/admin/login');
  return (
    <div className="page-section" style={{ paddingTop: 100 }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
