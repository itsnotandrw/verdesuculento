/**
 * Métricas — ventas de la tienda (pedidos pagados) y desempeño histórico de las publicaciones.
 * Tráfico propio de la tienda (sin cookies ni datos personales), ventas y desempeño de las publicaciones.
 */

import type { Metadata } from 'next';
import { formatCOP } from '@/data/catalog';
import { CATEGORIES } from '@/data/catalog';
import { RATINGS } from '@/data/ratings';
import { getAllProducts } from '@/lib/catalog/store';
import { orders } from '@/lib/orders/store';
import { fechaBogota, leerTrafico, sumarPorPrefijo } from '@/lib/trafico';

export const metadata: Metadata = { title: 'Métricas · Dashboard', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
const DIA = 86400000;

export default async function MetricasPage() {
  const [lista, productos, trafico] = await Promise.all([orders.list({ limite: 1000 }), getAllProducts(true), leerTrafico(30)]);
  const pagados = lista.filter((o) => o.payment.status === 'approved' && !o.esPrueba);
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

  // ---- tráfico
  const hayTrafico = trafico.some((d) => d.pv > 0);
  const sesiones = trafico.reduce((a, d) => a + d.ses, 0);
  const paginas = trafico.reduce((a, d) => a + d.pv, 0);
  const unicos = trafico.reduce((a, d) => a + d.unicos, 0);
  const hoyT = trafico.find((d) => d.fecha === fechaBogota());
  const maxPv = Math.max(1, ...trafico.map((d) => d.pv));
  const rutas = sumarPorPrefijo(trafico, 'p:');
  const vistasProducto = rutas.filter((r) => r.nombre.startsWith('/producto/')).reduce((a, r) => a + r.n, 0);
  const vistasCheckout = rutas.find((r) => r.nombre === '/checkout')?.n ?? 0;
  const alCarrito = trafico.reduce((a, d) => a + (d.campos['ev:carrito'] ?? 0), 0);
  const nombreDe = new Map(productos.map((p) => [p.id, p.name]));
  const masVistos = rutas.filter((r) => r.nombre.startsWith('/producto/')).slice(0, 8).map((r) => ({ nombre: nombreDe.get(r.nombre.replace('/producto/', '')) ?? r.nombre, n: r.n }));
  const paginasTop = rutas.filter((r) => !r.nombre.startsWith('/producto/')).slice(0, 8);
  // Datos anteriores a la separación: el dominio publicitario cuenta como Google Ads y el propio dominio como directo.
  const porFuente = new Map<string, number>();
  for (const f of sumarPorPrefijo(trafico, 'r:')) {
    const nombre = /doubleclick\.net|googleadservices|googlesyndication/.test(f.nombre) ? 'Google Ads' : /(^|\.)viveroverdesuculento\.co$/.test(f.nombre) ? 'Directo' : f.nombre;
    porFuente.set(nombre, (porFuente.get(nombre) ?? 0) + f.n);
  }
  const fuentes = [...porFuente].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  const dispositivos = sumarPorPrefijo(trafico, 'd:');
  const etiquetaDisp: Record<string, string> = { movil: 'Celular', escritorio: 'Computador', tablet: 'Tableta' };
  const conversion = sesiones ? Math.round((rango.length / sesiones) * 1000) / 10 : 0;
  const embudo = [
    { t: 'Visitas', n: sesiones },
    { t: 'Vieron un producto', n: vistasProducto },
    { t: 'Añadieron al carrito', n: alCarrito },
    { t: 'Entraron al pago', n: vistasCheckout },
    { t: 'Pagaron', n: rango.length },
  ];
  const maxE = Math.max(1, ...embudo.map((e) => e.n));
  const barra = (n: number, tope: number, color = 'var(--a-accent)') => (
    <div style={{ height: 8, borderRadius: 4, background: 'var(--a-line)', overflow: 'hidden', marginTop: 4 }}><div style={{ width: `${Math.min(100, (n / Math.max(1, tope)) * 100)}%`, height: '100%', background: color }} /></div>
  );
  const filasTop = (filas: { nombre: string; n: number }[], color?: string) => {
    const tope = Math.max(1, ...filas.map((f) => f.n));
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {filas.length === 0 && <p className="adm-hint">Todavía sin datos.</p>}
        {filas.map((f) => (
          <div key={f.nombre} style={{ minWidth: 0 }}>
            <div className="adm-row" style={{ justifyContent: 'space-between', fontSize: 13, flexWrap: 'nowrap' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{f.nombre}</span><b>{f.n.toLocaleString('es-CO')}</b>
            </div>
            {barra(f.n, tope, color)}
          </div>
        ))}
      </div>
    );
  };

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

      <h2 className="adm-h2" style={{ marginBottom: 10 }}>Tráfico · últimos 30 días</h2>
      <div className="adm-kpis" style={{ marginBottom: 16 }}>
        <div className="adm-kpi"><small>Visitas</small><b>{sesiones.toLocaleString('es-CO')}</b></div>
        <div className="adm-kpi"><small>Visitantes únicos (aprox.)</small><b>{unicos.toLocaleString('es-CO')}</b></div>
        <div className="adm-kpi"><small>Páginas vistas</small><b>{paginas.toLocaleString('es-CO')}</b></div>
        <div className="adm-kpi"><small>Hoy · visitantes</small><b>{(hoyT?.unicos ?? 0).toLocaleString('es-CO')}</b></div>
        <div className="adm-kpi"><small>Conversión (pedidos / visitas)</small><b>{conversion}%</b></div>
      </div>

      <section className="adm-card pad" style={{ marginBottom: 16 }}>
        <h2 className="adm-h2">Visitas por día</h2>
        <div className="adm-chart" style={{ gap: 4 }} role="img" aria-label="Páginas vistas por día">
          {trafico.map((d) => <div key={d.fecha} title={`${d.fecha}: ${d.pv} páginas vistas · ${d.unicos} visitantes`}><div className={`adm-bar${d.pv ? '' : ' zero'}`} style={{ height: `${Math.max(4, (d.pv / maxPv) * 120)}px`, maxWidth: 18, background: d.pv ? 'var(--a-info)' : undefined }} /></div>)}
        </div>
        {!hayTrafico && <p className="adm-hint" style={{ marginTop: 10 }}>El conteo de visitas empieza desde que se publicó esta versión: los datos aparecen conforme entra gente al sitio.</p>}
        <p className="adm-hint" style={{ marginTop: 8 }}>Se cuenta sin cookies y sin guardar IP ni datos personales. «Únicos» suma los visitantes de cada día: quien vuelve otro día cuenta de nuevo. No incluye al panel de administración ni a robots.</p>
      </section>

      <div className="adm-grid adm-g2" style={{ marginBottom: 16 }}>
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Del interés a la compra</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {embudo.map((e, i) => (
              <div key={e.t}>
                <div className="adm-row" style={{ justifyContent: 'space-between', fontSize: 13, flexWrap: 'nowrap' }}>
                  <span>{e.t}</span><b>{e.n.toLocaleString('es-CO')}{i > 0 && embudo[i - 1].n > 0 ? <small style={{ color: 'var(--a-mute)', fontWeight: 400 }}> · {Math.round((e.n / embudo[i - 1].n) * 100)}% del paso anterior</small> : null}</b>
                </div>
                {barra(e.n, maxE, i === embudo.length - 1 ? 'var(--a-accent)' : 'var(--a-info)')}
              </div>
            ))}
          </div>
          <p className="adm-hint" style={{ marginTop: 10 }}>Son conteos de acciones, no de personas: una visita puede ver varios productos.</p>
        </section>
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>De dónde llegan</h2>
          {filasTop(fuentes, 'var(--a-info)')}
          <p className="adm-hint" style={{ marginTop: 8 }}>«Google Ads» se distingue desde la actualización del 27 de noviembre; lo anterior pudo quedar como Directo o Google.</p>
          <h2 className="adm-h2" style={{ margin: '20px 0 12px' }}>Con qué entran</h2>
          {filasTop(dispositivos.map((d) => ({ nombre: etiquetaDisp[d.nombre] ?? d.nombre, n: d.n })), 'var(--a-accent)')}
        </section>
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Publicaciones más vistas</h2>
          {filasTop(masVistos)}
        </section>
        <section className="adm-card pad">
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Páginas más visitadas</h2>
          {filasTop(paginasTop.map((r) => ({ nombre: r.nombre === '/' ? 'Inicio' : r.nombre, n: r.n })), 'var(--a-info)')}
        </section>
      </div>

      <h2 className="adm-h2" style={{ marginBottom: 10 }}>Ventas · últimos 30 días</h2>
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
              <div key={p.id} style={{ minWidth: 0 }}>
                <div className="adm-row" style={{ justifyContent: 'space-between', fontSize: 13, flexWrap: 'nowrap' }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.name}</span><b>{vendidos}</b></div>
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
