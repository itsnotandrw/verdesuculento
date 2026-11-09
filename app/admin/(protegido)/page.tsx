/**
 * Resumen del panel (/admin): como el "Resumen" del Dashboard —
 * franja de indicadores, pendientes por área, ventas de la semana, calendario de campañas y estado del sistema.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarDays, ChevronRight, Percent, ShoppingBag, Tags } from 'lucide-react';
import { formatCOP } from '@/data/catalog';
import { getAllProducts } from '@/lib/catalog/store';
import { almacenamiento, orders } from '@/lib/orders/store';
import { getPromoConfig } from '@/lib/promotions-store';
import { estadoDe } from '@/lib/promotions';
import { mlConfigurado } from '@/lib/ml-sync';
import { redisConfigurado, redisDisponible } from '@/lib/redis';

export const metadata: Metadata = { title: 'Resumen · Dashboard', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const DIA_MS = 86400000;
const corto = (d: Date) => d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
const fechaCorta = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '');

export default async function AdminResumenPage() {
  const [lista, productos, promos, redisOk] = await Promise.all([
    orders.list({ limite: 500 }),
    getAllProducts(true),
    getPromoConfig(),
    redisDisponible(),
  ]);
  const ahora = new Date();
  const hoy0 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicio = new Date(hoy0.getTime() - 6 * DIA_MS);
  const inicioPrev = new Date(inicio.getTime() - 7 * DIA_MS);
  const pagados = lista.filter((o) => o.payment.status === 'approved');
  const enRango = (o: { createdAt: string }, a: Date, b: Date) => { const t = new Date(o.createdAt).getTime(); return t >= a.getTime() && t < b.getTime(); };
  const sem = pagados.filter((o) => enRango(o, inicio, new Date(hoy0.getTime() + DIA_MS)));
  const prev = pagados.filter((o) => enRango(o, inicioPrev, inicio));
  const ventas = sem.reduce((s, o) => s + o.total, 0);
  const ventasPrev = prev.reduce((s, o) => s + o.total, 0);
  const delta = ventasPrev > 0 ? Math.round(((ventas - ventasPrev) / ventasPrev) * 100) : null;
  const porDia = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio.getTime() + i * DIA_MS);
    const total = sem.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0);
    return { etiqueta: corto(d), total };
  });
  const max = Math.max(1, ...porDia.map((d) => d.total));

  const porVerificar = lista.filter((o) => o.status === 'payment_in_review').length;
  const porEnviar = lista.filter((o) => o.status === 'paid').length;
  const enCamino = lista.filter((o) => o.status === 'shipped').length;
  const esperando = lista.filter((o) => o.status === 'awaiting_payment').length;

  const visibles = productos.filter((p) => p.activo !== false).length;
  const ocultos = productos.length - visibles;
  const campActivas = promos.campaigns.filter((c) => estadoDe(c, ahora) === 'activa');
  const cuponesActivos = promos.coupons.filter((c) => estadoDe(c, ahora) === 'activa');
  const bannersActivos = promos.promotions.filter((p) => estadoDe(p, ahora) === 'activa');
  const proximas = [...promos.campaigns, ...promos.coupons.map((c) => ({ ...c, name: `Cupón ${c.code}`, kind: 'cupon' as const }))]
    .filter((x) => { const e = estadoDe(x, ahora); return e === 'activa' || e === 'programada'; })
    .sort((a, b) => new Date(a.endsAt ?? '2100-01-01').getTime() - new Date(b.endsAt ?? '2100-01-01').getTime())
    .slice(0, 5);
  const alm = almacenamiento();

  return (
    <>
      <div className="adm-pagehead">
        <div>
          <h1 className="adm-title">Resumen</h1>
          <p className="adm-desc">Lo importante de tu tienda en una sola pantalla.</p>
        </div>
        <Link href="/admin/promociones?crear=1" className="adm-btn"><Percent size={16} />Crear promoción</Link>
      </div>

      {campActivas.length === 0 && (
        <Link href="/admin/promociones?crear=1" className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', marginBottom: 16, background: 'var(--a-head)', color: '#fdfbf3', border: 0 }}>
          <Percent size={34} />
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 17, display: 'block' }}>Aprovecha la próxima campaña</b>
            <span style={{ opacity: .9 }}>No tienes campañas activas. Crea un descuento o una oferta relámpago y atrae más compradores.</span>
          </div>
          <span className="adm-btn sm" style={{ background: '#fdfbf3', color: '#14201a' }}>Crear ahora</span>
        </Link>
      )}

      <div className="adm-kpis" style={{ marginBottom: 16 }}>
        <div className="adm-kpi"><small>Publicaciones visibles</small><b>{visibles}</b><span style={{ color: 'var(--a-mute)', fontSize: 12.5, marginLeft: 8 }}>{ocultos} ocultas</span></div>
        <div className="adm-kpi">
          <small>Ventas brutas · 7 días</small><b>{formatCOP(ventas)}</b>
          {delta !== null && <span className={`adm-delta${delta < 0 ? ' bad' : ''}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}
        </div>
        <div className="adm-kpi"><small>Pedidos por atender</small><b>{porVerificar + porEnviar}</b></div>
        <div className="adm-kpi"><small>Promociones activas</small><b>{campActivas.length + cuponesActivos.length + bannersActivos.length}</b></div>
      </div>

      <div className="adm-grid adm-g-main">
        <div className="adm-grid">
          <section className="adm-card">
            <div className="adm-pagehead" style={{ margin: 0, padding: '18px 20px 6px' }}><h2 className="adm-h2">Pendientes</h2></div>
            <div className="adm-tasks">
              <Link href="/admin/pedidos" className="adm-task"><em className={porVerificar ? 'bad' : ''}>Ventas</em><p><b>{porVerificar}</b> pagos por verificar</p><small>Revisa el abono y apruébalo.</small></Link>
              <Link href="/admin/pedidos" className="adm-task"><em className={porEnviar ? 'warn' : ''}>Ventas</em><p><b>{porEnviar}</b> pagados por enviar</p><small>Genera la guía y despacha.</small></Link>
              <Link href="/admin/pedidos" className="adm-task"><em>Ventas</em><p><b>{enCamino}</b> en camino · <b>{esperando}</b> esperando pago</p><small>Seguimiento de envíos.</small></Link>
              <Link href="/admin/catalogo" className="adm-task"><em className={ocultos ? 'warn' : ''}>Publicaciones</em><p><b>{ocultos}</b> ocultas (pausadas o sin stock)</p><small>Sincroniza con Mercado Libre.</small></Link>
            </div>
          </section>

          <section className="adm-card pad">
            <h2 className="adm-h2" style={{ marginBottom: 4 }}>Ventas de los últimos 7 días</h2>
            <p className="adm-hint">Pedidos con pago aprobado.</p>
            <div className="adm-chart" role="img" aria-label="Ventas por día">
              {porDia.map((d, i) => (
                <div key={i}>
                  <small style={{ fontSize: 10.5, color: 'var(--a-mute)' }}>{d.total ? formatCOP(d.total) : ''}</small>
                  <div className={`adm-bar${d.total ? '' : ' zero'}`} style={{ height: `${Math.max(4, (d.total / max) * 100)}px` }} />
                  <small style={{ color: 'var(--a-mute)', fontSize: 12 }}>{d.etiqueta}</small>
                </div>
              ))}
            </div>
            {sem.length === 0 && <p className="adm-hint" style={{ marginTop: 12 }}>Aún no hay ventas pagadas en este período. Cuando entren pedidos, aparecerán aquí.</p>}
          </section>
        </div>

        <div className="adm-grid">
          <section className="adm-card">
            <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="adm-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={18} />Calendario de campañas</h2>
              <Link href="/admin/promociones" className="adm-link">Ver todo</Link>
            </div>
            <div className="adm-cal-list">
              {proximas.map((x) => (
                <div key={x.id} className={`adm-cal-item${x.kind === 'relampago' ? ' f' : x.kind === 'cupon' ? ' ok' : ''}`}>
                  <Percent size={14} />{x.name}
                  <small>{estadoDe(x, ahora) === 'programada' ? `desde ${fechaCorta(x.startsAt)}` : x.endsAt ? `hasta ${fechaCorta(x.endsAt)}` : 'sin fin'}</small>
                </div>
              ))}
              {proximas.length === 0 && <p className="adm-hint">No hay campañas ni cupones vigentes o programados.</p>}
            </div>
          </section>

          <section className="adm-card pad">
            <h2 className="adm-h2" style={{ marginBottom: 12 }}>Tu página</h2>
            <div className="adm-row" style={{ justifyContent: 'space-between' }}>
              <span>Banners en el inicio</span><span className={`adm-badge ${bannersActivos.length ? 'ok' : ''}`}>{bannersActivos.length} activos</span>
            </div>
            <div className="adm-row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <span>Cupones visibles</span><span className={`adm-badge ${cuponesActivos.length ? 'ok' : ''}`}>{cuponesActivos.length} activos</span>
            </div>
            <Link href="/admin/pagina" className="adm-link" style={{ marginTop: 14 }}>Editar mi página <ChevronRight size={14} /></Link>
          </section>

          <section className="adm-card pad">
            <h2 className="adm-h2" style={{ marginBottom: 12 }}>Sistema</h2>
            <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
              <div className="adm-row" style={{ justifyContent: 'space-between' }}><span>Redis</span><span className={`adm-badge ${redisOk ? 'ok' : 'bad'}`}>{redisConfigurado() ? (redisOk ? 'conectado' : 'sin conexión') : 'sin configurar'}</span></div>
              <div className="adm-row" style={{ justifyContent: 'space-between' }}><span>Pedidos</span><span className="adm-badge">{alm.id}</span></div>
              <div className="adm-row" style={{ justifyContent: 'space-between' }}><span>Mercado Libre</span><span className={`adm-badge ${mlConfigurado() ? 'ok' : 'warn'}`}>{mlConfigurado() ? 'credenciales' : 'sin credenciales'}</span></div>
            </div>
            {!alm.apto && <div className="adm-alert" style={{ marginTop: 12 }}><AlertTriangle size={18} /><span>{alm.motivo}</span></div>}
          </section>
        </div>
      </div>

      <div className="adm-row" style={{ marginTop: 22, gap: 16, color: 'var(--a-mute)', fontSize: 13 }}>
        <Link href="/admin/catalogo" className="adm-link"><Tags size={14} />Publicaciones<ArrowRight size={13} /></Link>
        <Link href="/admin/pedidos" className="adm-link"><ShoppingBag size={14} />Ventas<ArrowRight size={13} /></Link>
      </div>
    </>
  );
}
