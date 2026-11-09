/**
 * Métricas — ventas de la tienda (pedidos pagados) y desempeño histórico de las publicaciones.
 * Visitas y conversión llegan cuando se conecte analítica; hoy se muestra lo que sí se puede medir.
 */

import type { Metadata } from 'next';
import { formatCOP } from '@/data/catalog';
import { CATEGORIES } from '@/data/catalog';
import { RATINGS } from '@/data/ratings';
import { getAllProducts } from '@/lib/catalog/store';
import { orders } from '@/lib/orders/store';

export const metadata: Metadata = { title: 'Métricas · Dashboard', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const DIA = 86400000;

export default async function MetricasPage() {
  const [lista, productos] = await Promise.all([orders.list({ limite: 1000 }), getAllProducts(true)]);
  const pagados = lista.filter((o) => o.payment.status === 'approved');
  const hoy0 = new Date(new Date().setHours(0, 0, 0, 0));
  const inicio = new Date(hoy0.getTime() - 29 * DIA);
  const rango = pagados.filter((o) => new Date(o.createdAt) >= inicio);
  const ventas = rango.reduce((s, o) => s + o.total, 0);
  const ticket = rango.length ? Math.round(ventas / rango.length) : 0;
  const unidades = rango.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty, 0), 0);
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(inicio.getTime() + i * DIA);
    return { d, total: rango.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0) };
  });
  const max = Math.max(1, ...dias.map((x) => x.total));

  const hist = productos
    .map((p) => ({ p, vendidos: RATINGS[p.id]?.soldCount ?? 0, rating: RATINGS[p.id]?.rating ?? null }))
    .sort((a, b) => b.vendidos - a.vendidos);
  const top = hist.slice(0, 8);
  const maxV = Math.max(1, ...top.map((t) => t.vendidos));
  const porCat = CATEGORIES.map((c) => ({ c, v: hist.filter((h) => h.p.category === c.id).reduce((s, h) => s + h.vendidos, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const totalV = porCat.reduce((s, x) => s + x.v, 0) || 1;

  return (
    <>
      <div className="adm-pagehead"><div><h1 className="adm-title">Métricas</h1><p className="adm-desc">Cómo le va a tu tienda propia y qué productos son los favoritos.</p></div></div>

      <div className="adm-kpis" style={{ marginBottom: 16 }}>
        <div className="adm-kpi"><small>Ventas brutas · 30 días</small><b>{formatCOP(ventas)}</b></div>
        <div className="adm-kpi"><small>Pedidos pagados</small><b>{rango.length}</b></div>
        <div className="adm-kpi"><small>Ticket promedio</small><b>{formatCOP(ticket)}</b></div>
        <div className="adm-kpi"><small>Unidades vendidas</small><b>{unidades}</b></div>
      </div>

      <section className="adm-card pad" style={{ marginBottom: 16 }}>
        <h2 className="adm-h2">Ventas por día · últimos 30 días</h2>
        <div className="adm-chart" style={{ gap: 4 }} role="img" aria-label="Ventas por día">
          {dias.map((x, i) => <div key={i} title={`${x.d.toLocaleDateString('es-CO')}: ${formatCOP(x.total)}`}><div className={`adm-bar${x.total ? '' : ' zero'}`} style={{ height: `${Math.max(4, (x.total / max) * 120)}px`, maxWidth: 18 }} /></div>)}
        </div>
        {rango.length === 0 && <p className="adm-hint" style={{ marginTop: 10 }}>Todavía no hay pedidos pagados en la tienda propia. Visitas y conversión se mostrarán cuando se conecte la analítica del sitio.</p>}
      </section>

      <div className="adm-grid adm-g2">
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Productos más vendidos (histórico)</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {top.map(({ p, vendidos }) => (
              <div key={p.id}>
                <div className="adm-row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.name}</span><b>{vendidos}</b></div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--a-line)', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${(vendidos / maxV) * 100}%`, height: '100%', background: 'var(--a-accent)' }} /></div>
              </div>
            ))}
          </div>
          <p className="adm-hint" style={{ marginTop: 12 }}>Unidades vendidas acumuladas, según los datos de Mercado Libre.</p>
        </section>
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Ventas históricas por categoría</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {porCat.map(({ c, v }) => (
              <div key={c.id}>
                <div className="adm-row" style={{ justifyContent: 'space-between', fontSize: 13 }}><span>{c.name}</span><b>{Math.round((v / totalV) * 100)}%</b></div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--a-line)', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${(v / totalV) * 100}%`, height: '100%', background: 'var(--a-info)' }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
