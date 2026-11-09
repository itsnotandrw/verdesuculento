'use client';

/**
 * Central de promociones — inspirada en la de Mercado Libre, con mejoras:
 *   · Vista rápida: indicadores, tareas y recomendaciones, calendario y productos con su promoción.
 *   · Promociones: campañas de porcentaje, por cantidad, relámpago y de temporada (con alcance a toda la
 *     tienda, categorías o productos), con vista previa del precio final.
 *   · Cupones: cinco tipos, con tope de descuento, límite de usos, fechas y avance de uso.
 *   · Plantillas del calendario comercial de Colombia (Black Friday, Amor y Amistad, Navidad…).
 * Todo se guarda en Redis al instante; el inicio lo refleja en menos de un minuto.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, CalendarDays, ChevronRight, Clock, Copy, Gift, Layers, Pencil, Percent, Plus, Sparkles, Ticket,
  Trash2, X, Zap,
} from 'lucide-react';
import { CATEGORIES, formatCOP } from '@/data/catalog';
import {
  CAMPANA_TIPOS, CUPON_TIPOS, estadoDe, mejorCampana, precioConDescuento, slugify,
  type Campaign, type CampaignScope, type CampanaTipo, type CuponTipo, type PromoConfig, type PromoCoupon,
} from '@/lib/promotions';
import { toast } from '@/components/admin/toast';
import type { Product } from '@/types';

type Tab = 'vista' | 'promociones' | 'cupones';
const DIA = 86400000;

const aLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const aIso = (v: string) => (v ? new Date(v).toISOString() : undefined);
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const fcorta = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—');
const ICONO: Record<CampanaTipo, React.ElementType> = { porcentaje: Percent, cantidad: Layers, relampago: Zap, temporada: Gift };
const ESTADO_TONO = { activa: 'ok', programada: 'info', finalizada: '', pausada: 'warn' } as const;
const ESTADO_TXT = { activa: 'Activa', programada: 'Programada', finalizada: 'Finalizada', pausada: 'Pausada' } as const;

// Calendario comercial de Colombia: plantillas para crear una campaña ya con fechas y nombre.
const PLANTILLAS: { nombre: string; badge: string; desde: string; hasta: string; pct: number; nota: string }[] = [
  { nombre: 'Cyber Monday', badge: 'Cyber Monday', desde: '2026-11-30T00:00', hasta: '2026-12-02T23:59', pct: 25, nota: 'Ofertas online de fin de mes.' },
  { nombre: 'Navidad', badge: 'Navidad', desde: '2026-12-01T00:00', hasta: '2026-12-24T23:59', pct: 15, nota: 'Plantas y kits para regalar.' },
  { nombre: 'Año nuevo', badge: 'Año nuevo', desde: '2026-12-26T00:00', hasta: '2026-12-31T23:59', pct: 20, nota: 'Cierra el año con descuentos.' },
  { nombre: 'Día de la Madre', badge: 'Día de la Madre', desde: '2027-05-03T00:00', hasta: '2027-05-09T23:59', pct: 20, nota: 'Segundo domingo de mayo.' },
  { nombre: 'Día del Padre', badge: 'Día del Padre', desde: '2027-06-14T00:00', hasta: '2027-06-20T23:59', pct: 15, nota: 'Tercer domingo de junio.' },
  { nombre: 'Amor y Amistad', badge: 'Amor y Amistad', desde: '2027-09-13T00:00', hasta: '2027-09-19T23:59', pct: 15, nota: 'Tercer fin de semana de septiembre.' },
];

function nuevaCampana(kind: CampanaTipo, extra: Partial<Campaign> = {}): Campaign {
  const ahora = new Date();
  const fin = new Date(ahora.getTime() + (kind === 'relampago' ? DIA : 7 * DIA));
  return {
    id: uid('camp'), name: '', kind, active: true, pct: kind === 'relampago' ? 20 : 10,
    startsAt: ahora.toISOString(), endsAt: fin.toISOString(),
    minQty: kind === 'cantidad' ? 2 : undefined, stockLimit: undefined,
    scope: { type: 'todo', ids: [] }, ...extra,
  };
}
function nuevoCupon(kind: CuponTipo = 'general'): PromoCoupon {
  const fin = new Date(Date.now() + 14 * DIA);
  return { id: uid('cupon'), kind, code: '', scope: 'En productos seleccionados', pct: 10, minPurchase: 80000, maxDiscount: 20000, usageLimit: undefined, used: 0, active: true, startsAt: new Date().toISOString(), endsAt: fin.toISOString(), slug: '', target: { type: 'todo', ids: [] } };
}

export default function PromoCenter() {
  const router = useRouter();
  const sp = useSearchParams();
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editable, setEditable] = useState(true);
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'vista');
  const [chooser, setChooser] = useState(false);
  const [campForm, setCampForm] = useState<Campaign | null>(null);
  const [cuponForm, setCuponForm] = useState<PromoCoupon | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'activa' | 'programada' | 'pausada' | 'finalizada'>('todas');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/admin/promociones', { cache: 'no-store' }), fetch('/api/admin/products', { cache: 'no-store' })]);
    if (a.status === 401) return router.push('/admin/login?next=/admin/promociones');
    const da = await a.json();
    setConfig(da.config); setEditable(Boolean(da.editable));
    if (b.ok) setProducts((await b.json()).products ?? []);
  }, [router]);
  useEffect(() => { cargar().catch(() => toast('No se pudo cargar', 'bad')); }, [cargar]);

  // Entradas desde otras pantallas: ?crear=1&productos=a,b  |  ?crear=cupon
  const abrioDesdeUrl = useMemo(() => ({ crear: sp.get('crear'), productos: (sp.get('productos') ?? '').split(',').filter(Boolean) }), [sp]);
  useEffect(() => {
    if (!config) return;
    if (abrioDesdeUrl.crear === 'cupon') { setTab('cupones'); setCuponForm(nuevoCupon()); }
    else if (abrioDesdeUrl.crear) setChooser(true);
    // solo al cargar la config por primera vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config === null]);

  const guardar = async (next: PromoConfig, mensaje: string) => {
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/promociones', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo guardar.');
      setConfig(d.config); toast(mensaje);
      return true;
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar', 'bad'); return false; } finally { setGuardando(false); }
  };

  const ahora = new Date();
  const visibles = useMemo(() => products.filter((p) => p.activo !== false), [products]);

  if (!config) return (<><div className="adm-skel" style={{ height: 40, width: 320, marginBottom: 16 }} /><div className="adm-skel" style={{ height: 90, marginBottom: 16 }} /><div className="adm-skel" style={{ height: 320 }} /></>);

  const camps = config.campaigns;
  const activas = camps.filter((c) => estadoDe(c, ahora) === 'activa');
  const cuponesAct = config.coupons.filter((c) => estadoDe(c, ahora) === 'activa');
  const conPromo = visibles.filter((p) => mejorCampana(camps, p, ahora));
  const sinPromo = visibles.length - conPromo.length;
  const hayRelampago = activas.some((c) => c.kind === 'relampago');
  const porVencer = [...camps, ...config.coupons].filter((x) => estadoDe(x, ahora) === 'activa' && x.endsAt && new Date(x.endsAt).getTime() - ahora.getTime() < 3 * DIA);

  // ── Guardado de formularios
  const guardarCampana = async (c: Campaign) => {
    if (!c.name.trim()) return toast('Ponle un nombre a la promoción', 'bad');
    if (c.scope.type !== 'todo' && c.scope.ids.length === 0) return toast('Elige al menos un producto o categoría', 'bad');
    if (c.startsAt && c.endsAt && new Date(c.endsAt) <= new Date(c.startsAt)) return toast('La fecha de fin debe ser posterior al inicio', 'bad');
    const existe = camps.some((x) => x.id === c.id);
    const conSlug = { ...c, slug: slugify(c.slug || c.badge || c.name) };
    const ok = await guardar({ ...config, campaigns: existe ? camps.map((x) => (x.id === c.id ? conSlug : x)) : [conSlug, ...camps] }, existe ? 'Promoción actualizada' : 'Promoción creada');
    if (ok) setCampForm(null);
  };
  const guardarCupon = async (c: PromoCoupon) => {
    if (!c.code.trim()) return toast('Escribe o genera un código', 'bad');
    if (c.target && c.target.type !== 'todo' && c.target.ids.length === 0) return toast('Elige los productos o categorías del catálogo exclusivo', 'bad');
    const existe = config.coupons.some((x) => x.id === c.id);
    const conSlug = { ...c, slug: slugify(c.slug || c.code) };
    const ok = await guardar({ ...config, coupons: existe ? config.coupons.map((x) => (x.id === c.id ? conSlug : x)) : [conSlug, ...config.coupons] }, existe ? 'Cupón actualizado' : 'Cupón creado');
    if (ok) setCuponForm(null);
  };

  const elegirTipo = (kind: CampanaTipo) => {
    setChooser(false);
    const ids = abrioDesdeUrl.productos;
    setCampForm(nuevaCampana(kind, ids.length ? { scope: { type: 'productos', ids } } : {}));
  };
  const desdePlantilla = (t: (typeof PLANTILLAS)[number]) => setCampForm(nuevaCampana('temporada', { name: t.nombre, badge: t.badge, pct: t.pct, startsAt: aIso(t.desde), endsAt: aIso(t.hasta) }));

  const listaCamps = camps.filter((c) => filtro === 'todas' || estadoDe(c, ahora) === filtro);
  const alcanceTxt = (c: Campaign) => c.scope.type === 'todo' ? 'Toda la tienda' : c.scope.type === 'categorias' ? `${c.scope.ids.length} categoría(s)` : `${c.scope.ids.length} producto(s)`;

  // Calendario de los próximos 7 días
  const dias = Array.from({ length: 7 }, (_, i) => new Date(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime() + i * DIA));
  const enDia = (d: Date) => camps.filter((c) => c.active && c.startsAt && c.endsAt && new Date(c.startsAt) < new Date(d.getTime() + DIA) && new Date(c.endsAt) >= d);

  return (
    <>
      <div className="adm-pagehead">
        <div>
          <h1 className="adm-title">Promociones</h1>
          <p className="adm-desc">Descuentos, ofertas relámpago, campañas de temporada y cupones para vender más.</p>
        </div>
        <button className="adm-btn" onClick={() => setChooser(true)} disabled={!editable}><Plus size={16} />Crear promoción</button>
      </div>

      {!editable && <div className="adm-alert" style={{ marginBottom: 16 }}><AlertTriangle size={18} /><span><b>Solo lectura.</b> Falta configurar Redis (REDIS_URL).</span></div>}

      <div className="adm-seg" role="tablist" style={{ marginBottom: 16 }}>
        {([['vista', 'Vista rápida'], ['promociones', 'Promociones'], ['cupones', 'Cupones']] as [Tab, string][]).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      {/* ───────── VISTA RÁPIDA ───────── */}
      {tab === 'vista' && (
        <>
          <div className="adm-kpis" style={{ marginBottom: 16 }}>
            <div className="adm-kpi"><small>Promociones activas</small><b>{activas.length}</b></div>
            <div className="adm-kpi"><small>Cupones activos</small><b>{cuponesAct.length}</b></div>
            <div className="adm-kpi"><small>Productos con descuento</small><b>{conPromo.length}</b><span className="adm-hint" style={{ marginLeft: 8 }}>de {visibles.length}</span></div>
            <div className="adm-kpi"><small>Cobertura</small><b>{visibles.length ? Math.round((conPromo.length / visibles.length) * 100) : 0}%</b></div>
          </div>

          <div className="adm-grid adm-g-main">
            <section className="adm-card">
              <div style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}><h2 className="adm-h2">Tareas y recomendaciones</h2><Sparkles size={16} style={{ color: 'var(--a-accent)' }} /></div>
              <div className="adm-tasks">
                <button className="adm-task" onClick={() => setChooser(true)}>
                  <em className={sinPromo ? 'warn' : ''}>Mejora tu exposición</em>
                  <p><b>{sinPromo}</b> productos sin descuento</p><small>Crea un descuento por porcentaje para destacarlos.</small>
                </button>
                <button className="adm-task" onClick={() => setCampForm(nuevaCampana('relampago', { name: 'Relámpago' }))}>
                  <em className={hayRelampago ? '' : 'warn'}>Oferta relámpago</em>
                  <p>{hayRelampago ? 'Tienes una oferta relámpago activa' : 'Súmate a las ofertas relámpago'}</p><small>Descuento por tiempo limitado, con cuenta regresiva.</small>
                </button>
                <button className="adm-task" onClick={() => { setTab('cupones'); setCuponForm(nuevoCupon('carrito')); }}>
                  <em>Cupones</em>
                  <p>Cupón para carritos abandonados</p><small>Recupera ventas que se quedaron a medias.</small>
                </button>
                {porVencer.length > 0 && (
                  <button className="adm-task" onClick={() => setTab('promociones')}>
                    <em className="bad">Por vencer</em>
                    <p><b>{porVencer.length}</b> vencen en menos de 3 días</p><small>Renueva o crea la siguiente.</small>
                  </button>
                )}
              </div>
            </section>

            <section className="adm-card">
              <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={18} /><h2 className="adm-h2">Calendario</h2></div>
              <div className="adm-cal">
                {dias.map((d, i) => {
                  const cs = enDia(d);
                  return (
                    <div key={i} className={`adm-cal-d${i === 0 ? ' today' : ''}`}>
                      {d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}<b>{d.getDate()}</b>
                      {cs.slice(0, 2).map((c) => <i key={c.id} className={c.kind === 'relampago' ? 'f' : c.kind === 'temporada' ? 't' : ''} title={c.name} />)}
                    </div>
                  );
                })}
              </div>
              <div className="adm-cal-list">
                {activas.slice(0, 3).map((c) => <div key={c.id} className={`adm-cal-item${c.kind === 'relampago' ? ' f' : ''}`}>{c.name}<small>hasta {fcorta(c.endsAt)}</small></div>)}
                {activas.length === 0 && <p className="adm-hint">No hay campañas activas esta semana.</p>}
              </div>
            </section>
          </div>

          <section className="adm-card" style={{ marginTop: 16 }}>
            <div style={{ padding: '18px 20px 6px' }}><h2 className="adm-h2">Plantillas del calendario comercial</h2><p className="adm-hint">Fechas clave en Colombia. Crea la campaña con un clic y ajusta lo que quieras.</p></div>
            <div className="adm-tasks">
              {PLANTILLAS.map((t) => {
                const ya = camps.some((c) => c.name === t.nombre);
                return (
                  <button key={t.nombre} className="adm-task" disabled={ya || !editable} onClick={() => desdePlantilla(t)} style={ya ? { opacity: .55 } : undefined}>
                    <em>{fcorta(aIso(t.desde))} – {fcorta(aIso(t.hasta))}</em>
                    <p><b>{t.nombre}</b></p><small>{t.nota} {ya ? '(ya creada)' : `Sugerido: ${t.pct}% OFF.`}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="adm-card" style={{ marginTop: 16 }}>
            <div className="adm-row" style={{ padding: '18px 20px 10px', justifyContent: 'space-between' }}><h2 className="adm-h2">Tus productos y su promoción</h2><Link href="/admin/catalogo" className="adm-link">Ver todas las publicaciones <ChevronRight size={14} /></Link></div>
            <div className="adm-tablewrap">
              <table className="adm-table" style={{ minWidth: 700 }}>
                <thead><tr><th>Publicación</th><th>Promoción</th><th>Descuento</th><th>Precio final</th><th>Recomendación</th></tr></thead>
                <tbody>
                  {visibles.slice(0, 8).map((p) => {
                    const c = mejorCampana(camps, p, ahora);
                    return (
                      <tr key={p.id}>
                        <td><div className="adm-prod">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="adm-thumb" src={p.images[0] ?? '/logo-icon.png'} alt="" loading="lazy" /><div><b>{p.name}</b><small>#{p.id}</small></div></div></td>
                        <td>{c ? <><span className="adm-badge purple">{c.badge ?? CAMPANA_TIPOS[c.kind].label}</span><br /><small className="adm-hint">{fcorta(c.startsAt)} – {fcorta(c.endsAt)}</small></> : <span className="adm-hint">Sin promoción</span>}</td>
                        <td>{c ? <span className="adm-money">{c.pct}%</span> : '—'}</td>
                        <td>{c ? <><span className="adm-money">{formatCOP(precioConDescuento(p.price, c.pct))}</span><br /><span className="adm-strike">{formatCOP(p.price)}</span></> : <span className="adm-money">{formatCOP(p.price)}</span>}</td>
                        <td>{c ? <span className="adm-badge ok">{c.pct >= 10 ? 'Descuento atractivo' : 'Puedes subirlo'}</span> : <Link className="adm-link" href={`/admin/promociones?crear=1&productos=${p.id}`}>Crear descuento</Link>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ───────── PROMOCIONES ───────── */}
      {tab === 'promociones' && (
        <section className="adm-card">
          <div className="adm-row" style={{ padding: 16, justifyContent: 'space-between' }}>
            <div className="adm-chips">
              {(['todas', 'activa', 'programada', 'pausada', 'finalizada'] as const).map((f) => (
                <button key={f} className={`adm-chip${filtro === f ? ' on' : ''}`} onClick={() => setFiltro(f)}>{f === 'todas' ? 'Todas' : ESTADO_TXT[f] + 's'.replace('s', f.endsWith('a') ? 's' : 's')} <span style={{ opacity: .6 }}>{f === 'todas' ? camps.length : camps.filter((c) => estadoDe(c, ahora) === f).length}</span></button>
              ))}
            </div>
          </div>
          <div className="adm-tablewrap">
            <table className="adm-table" style={{ minWidth: 820 }}>
              <thead><tr><th>Promoción</th><th>Tipo</th><th>Alcance</th><th>Descuento</th><th>Vigencia</th><th>Estado</th><th style={{ width: 130 }} /></tr></thead>
              <tbody>
                {listaCamps.map((c) => {
                  const e = estadoDe(c, ahora); const Ico = ICONO[c.kind];
                  return (
                    <tr key={c.id}>
                      <td><b>{c.name}</b>{c.badge && <><br /><small className="adm-hint">Etiqueta: {c.badge}</small></>}</td>
                      <td><span className="adm-row" style={{ gap: 6 }}><Ico size={15} />{CAMPANA_TIPOS[c.kind].label}</span>{c.kind === 'cantidad' && <small className="adm-hint">desde {c.minQty} uds.</small>}{c.kind === 'relampago' && c.stockLimit ? <small className="adm-hint"> · {c.stockLimit} uds.</small> : null}</td>
                      <td>{alcanceTxt(c)}</td>
                      <td><span className="adm-money">{c.pct}%</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fcorta(c.startsAt)} – {fcorta(c.endsAt)}</td>
                      <td>
                        <label className="adm-row" style={{ gap: 8 }}>
                          <span className="adm-switch"><input type="checkbox" checked={c.active} disabled={!editable || guardando} onChange={() => guardar({ ...config, campaigns: camps.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)) }, c.active ? 'Promoción pausada' : 'Promoción activada')} /><i /></span>
                          <span className={`adm-badge ${ESTADO_TONO[e]}`}>{ESTADO_TXT[e]}</span>
                        </label>
                      </td>
                      <td>
                        <div className="adm-row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                          <button className="adm-x" title="Editar" onClick={() => setCampForm(c)}><Pencil size={16} /></button>
                          <button className="adm-x" title="Duplicar" onClick={() => setCampForm({ ...c, id: uid('camp'), name: `${c.name} copia`.slice(0, 25) })}><Copy size={16} /></button>
                          <button className="adm-x" title="Borrar" onClick={() => confirm(`¿Borrar "${c.name}"?`) && guardar({ ...config, campaigns: camps.filter((x) => x.id !== c.id) }, 'Promoción borrada')}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {listaCamps.length === 0 && (
            <div className="adm-empty"><Percent size={40} /><b>No hay promociones aquí</b><span>Crea tu primer descuento y empieza a vender más.</span><button className="adm-btn" onClick={() => setChooser(true)}><Plus size={16} />Crear promoción</button></div>
          )}
        </section>
      )}

      {/* ───────── CUPONES ───────── */}
      {tab === 'cupones' && (
        <>
          <div className="adm-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="adm-hint">Hoy el botón &quot;Copiar&quot; del inicio solo copia el código: el carrito aplicará los cupones en la siguiente fase.</p>
            <button className="adm-btn" onClick={() => setCuponForm(nuevoCupon())} disabled={!editable}><Plus size={16} />Crear cupón</button>
          </div>
          <div className="adm-grid adm-g3">
            {config.coupons.map((c) => {
              const e = estadoDe(c, ahora);
              const uso = c.usageLimit ? Math.min(100, ((c.used ?? 0) / c.usageLimit) * 100) : 0;
              return (
                <article key={c.id} className="adm-card pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                  <div className="adm-row" style={{ justifyContent: 'space-between' }}>
                    <span className="adm-hint" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 11 }}>{fcorta(c.startsAt)} – {fcorta(c.endsAt)}</span>
                    <span className={`adm-badge ${ESTADO_TONO[e]}`}>{ESTADO_TXT[e]}</span>
                  </div>
                  <div><b style={{ fontSize: 16 }}>{CUPON_TIPOS[c.kind ?? 'general'].label}</b><br /><span className="adm-hint">{c.scope}</span></div>
                  <div className="adm-row" style={{ gap: 10 }}>
                    <span className="adm-money" style={{ fontSize: 26 }}>{c.pct}% OFF</span>
                    <code style={{ border: '1.5px dashed var(--a-accent)', color: 'var(--a-accent)', padding: '3px 10px', borderRadius: 6, fontWeight: 700, letterSpacing: '.08em' }}>{c.code}</code>
                  </div>
                  <small className="adm-hint">Valor mín. {formatCOP(c.minPurchase)}{c.maxDiscount ? ` | Dto. máx. ${formatCOP(c.maxDiscount)}` : ''}</small>
                  {c.usageLimit ? (
                    <div><div style={{ height: 6, borderRadius: 3, background: 'var(--a-line)', overflow: 'hidden' }}><div style={{ width: `${uso}%`, height: '100%', background: 'var(--a-accent)' }} /></div><small className="adm-hint">{c.used ?? 0} de {c.usageLimit} usos</small></div>
                  ) : <small className="adm-hint">{c.used ?? 0} usos · sin límite</small>}
                  <div className="adm-row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <label className="adm-row" style={{ gap: 8 }}>
                      <span className="adm-switch"><input type="checkbox" checked={c.active} disabled={!editable || guardando} onChange={() => guardar({ ...config, coupons: config.coupons.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)) }, c.active ? 'Cupón pausado' : 'Cupón activado')} /><i /></span>
                      <span style={{ fontSize: 13 }}>{c.active ? 'Activo' : 'Pausado'}</span>
                    </label>
                    <div className="adm-row" style={{ gap: 2 }}>
                      <button className="adm-x" title="Editar" onClick={() => setCuponForm(c)}><Pencil size={16} /></button>
                      <button className="adm-x" title="Borrar" onClick={() => confirm(`¿Borrar el cupón ${c.code}?`) && guardar({ ...config, coupons: config.coupons.filter((x) => x.id !== c.id) }, 'Cupón borrado')}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {config.coupons.length === 0 && <div className="adm-card"><div className="adm-empty"><Ticket size={40} /><b>Aún no tienes cupones</b><span>Crea uno para fidelizar o recuperar carritos.</span></div></div>}
        </>
      )}

      {/* ───────── Selector de tipo ───────── */}
      {chooser && (
        <div className="adm-modalbg" onMouseDown={(e) => e.target === e.currentTarget && setChooser(false)}>
          <div className="adm-modal wide" role="dialog" aria-label="Crear promoción">
            <div className="adm-modal-h"><h2 className="adm-h2">Crear promoción</h2><button className="adm-x" onClick={() => setChooser(false)} aria-label="Cerrar"><X size={18} /></button></div>
            <div className="adm-types">
              {(Object.keys(CAMPANA_TIPOS) as CampanaTipo[]).map((k) => {
                const Ico = ICONO[k];
                return (
                  <button key={k} className="adm-type" onClick={() => elegirTipo(k)}>
                    <span className="adm-type-ico"><Ico size={22} /></span>
                    <span><b>{CAMPANA_TIPOS[k].label}{k === 'relampago' && <span className="adm-badge info adm-new">Nuevo</span>}</b><small>{CAMPANA_TIPOS[k].desc}</small></span>
                    <ChevronRight size={20} className="adm-chev" />
                  </button>
                );
              })}
              <button className="adm-type" onClick={() => { setChooser(false); setTab('cupones'); setCuponForm(nuevoCupon()); }}>
                <span className="adm-type-ico"><Ticket size={22} /></span>
                <span><b>Cupón</b><small>General, carritos abandonados, recompra, seguidores o nuevos clientes.</small></span>
                <ChevronRight size={20} className="adm-chev" />
              </button>
            </div>
          </div>
        </div>
      )}

      {campForm && <CampanaForm key={campForm.id} inicial={campForm} existe={camps.some((x) => x.id === campForm.id)} products={visibles} guardando={guardando} onClose={() => setCampForm(null)} onSave={guardarCampana} />}
      {cuponForm && <CuponForm key={cuponForm.id} inicial={cuponForm} existe={config.coupons.some((x) => x.id === cuponForm.id)} products={visibles} guardando={guardando} onClose={() => setCuponForm(null)} onSave={guardarCupon} />}
    </>
  );
}

/* ───────────────────────── Formulario de campaña ───────────────────────── */
function CampanaForm({ inicial, existe, products, guardando, onClose, onSave }: { inicial: Campaign; existe: boolean; products: Product[]; guardando: boolean; onClose: () => void; onSave: (c: Campaign) => void }) {
  const [c, setC] = useState<Campaign>(inicial);
  const set = (patch: Partial<Campaign>) => setC((x) => ({ ...x, ...patch }));
  const muestra = c.scope.type === 'productos' ? products.find((p) => c.scope.ids.includes(p.id)) : c.scope.type === 'categorias' ? products.find((p) => c.scope.ids.includes(p.category)) : products[0];
  const dur = (h: number) => { const a = new Date(); set({ startsAt: a.toISOString(), endsAt: new Date(a.getTime() + h * 3600000).toISOString() }); };
  const Ico = ICONO[c.kind];

  return (
    <div className="adm-modalbg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal wide" role="dialog" aria-label={existe ? 'Editar promoción' : 'Nueva promoción'}>
        <div className="adm-modal-h">
          <div className="adm-row" style={{ gap: 10 }}><span className="adm-type-ico" style={{ width: 38, height: 38 }}><Ico size={18} /></span><div><h2 className="adm-h2">{existe ? 'Editar' : 'Crear'}: {CAMPANA_TIPOS[c.kind].label}</h2><small className="adm-hint">{CAMPANA_TIPOS[c.kind].desc}</small></div></div>
          <button className="adm-x" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="adm-modal-b">
          <div className="adm-field"><label htmlFor="pc-nombre">¿Cuál será el nombre de tu promoción?</label><input id="pc-nombre" className="adm-input" maxLength={25} placeholder="Por ej.: Oferta Verano" value={c.name} onChange={(e) => set({ name: e.target.value })} autoFocus /><span className="adm-hint">Solo para ti; tus compradores no lo verán. <span style={{ float: 'right' }}>{c.name.length} / 25</span></span></div>

          <div className="adm-grid adm-g2">
            <div className="adm-field"><label htmlFor="pc-pct">Descuento ({c.pct}%)</label><input id="pc-pct" type="range" min={1} max={70} value={c.pct} onChange={(e) => set({ pct: Number(e.target.value) })} style={{ accentColor: 'var(--a-accent)' }} /><input className="adm-input" type="number" min={1} max={90} value={c.pct} onChange={(e) => set({ pct: Number(e.target.value) })} /></div>
            {c.kind === 'cantidad' && <div className="adm-field"><label htmlFor="pc-qty">Desde cuántas unidades</label><input id="pc-qty" className="adm-input" type="number" min={2} value={c.minQty ?? 2} onChange={(e) => set({ minQty: Number(e.target.value) })} /><span className="adm-hint">El descuento aplica al comprar esta cantidad o más.</span></div>}
            {c.kind === 'relampago' && <div className="adm-field"><label htmlFor="pc-stock">Unidades con la oferta (opcional)</label><input id="pc-stock" className="adm-input" type="number" min={1} placeholder="Sin límite" value={c.stockLimit ?? ''} onChange={(e) => set({ stockLimit: e.target.value ? Number(e.target.value) : undefined })} /><span className="adm-hint">Cuando se agoten, la oferta termina.</span></div>}
            {c.kind === 'temporada' && <div className="adm-field"><label htmlFor="pc-badge">Etiqueta pública</label><input id="pc-badge" className="adm-input" maxLength={30} placeholder="Black Friday" value={c.badge ?? ''} onChange={(e) => set({ badge: e.target.value })} /><span className="adm-hint">Se ve en la tarjeta del producto.</span></div>}
          </div>

          <ScopePicker label="¿A qué productos aplica?" scope={c.scope} onChange={(scope) => set({ scope })} products={products} />

          <div className="adm-field"><label htmlFor="pc-slug">Dirección de su catálogo exclusivo</label><div className="adm-row" style={{ flexWrap: 'nowrap', gap: 6 }}><span className="adm-hint">/ofertas/</span><input id="pc-slug" className="adm-input" placeholder={slugify(c.badge || c.name) || 'black-friday'} value={c.slug ?? ''} onChange={(e) => set({ slug: slugify(e.target.value) })} /></div><span className="adm-hint">Los clientes ven estos productos en una página propia y aparece en el menú Catálogo.</span></div>

          <div className="adm-field">
            <span className="adm-label">¿Cuánto durará tu promoción?</span>
            {c.kind === 'relampago' && <div className="adm-chips" style={{ marginBottom: 6 }}>{[2, 6, 12, 24, 48].map((h) => <button key={h} type="button" className="adm-chip" onClick={() => dur(h)}><Clock size={13} />{h} h</button>)}</div>}
            <div className="adm-grid adm-g2">
              <div className="adm-field"><label htmlFor="pc-ini">Inicio</label><input id="pc-ini" type="datetime-local" className="adm-input" value={aLocal(c.startsAt)} onChange={(e) => set({ startsAt: aIso(e.target.value) })} /></div>
              <div className="adm-field"><label htmlFor="pc-fin">Fin (inclusive)</label><input id="pc-fin" type="datetime-local" className="adm-input" value={aLocal(c.endsAt)} onChange={(e) => set({ endsAt: aIso(e.target.value) })} /></div>
            </div>
          </div>

          {muestra && (
            <div className="adm-preview">
              <span className="adm-label">Así se verá</span>
              <div className="adm-prod" style={{ marginTop: 10, alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="adm-thumb" src={muestra.images[0] ?? '/logo-icon.png'} alt="" />
                <div><b>{muestra.name}</b><span className="adm-row" style={{ gap: 8, marginTop: 4 }}><span className="adm-money" style={{ fontSize: 18 }}>{formatCOP(precioConDescuento(muestra.price, c.pct))}</span><span className="adm-strike">{formatCOP(muestra.price)}</span><span className="adm-badge purple">{c.pct}% OFF</span></span>{c.kind === 'cantidad' && <small>Comprando {c.minQty ?? 2} o más.</small>}</div>
              </div>
            </div>
          )}

          <label className="adm-row" style={{ gap: 10 }}><span className="adm-switch"><input type="checkbox" checked={c.active} onChange={(e) => set({ active: e.target.checked })} /><i /></span>Activar al guardar</label>
        </div>
        <div className="adm-modal-f"><button className="adm-btn line" onClick={onClose}>Cancelar</button><button className="adm-btn" disabled={guardando} onClick={() => onSave(c)}>{guardando ? 'Guardando…' : existe ? 'Guardar cambios' : 'Crear promoción'}</button></div>
      </div>
    </div>
  );
}

/* ───────────────────────── Formulario de cupón ───────────────────────── */
function CuponForm({ inicial, existe, products, guardando, onClose, onSave }: { inicial: PromoCoupon; existe: boolean; products: Product[]; guardando: boolean; onClose: () => void; onSave: (c: PromoCoupon) => void }) {
  const [c, setC] = useState<PromoCoupon>(inicial);
  const set = (patch: Partial<PromoCoupon>) => setC((x) => ({ ...x, ...patch }));
  const generar = () => set({ code: `${(c.kind ?? 'general').slice(0, 4).toUpperCase()}${c.pct}${Math.random().toString(36).slice(2, 5).toUpperCase()}` });
  const ejemplo = 200000;
  const desc = Math.min(Math.round(ejemplo * c.pct / 100), c.maxDiscount || Infinity);

  return (
    <div className="adm-modalbg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal wide" role="dialog" aria-label={existe ? 'Editar cupón' : 'Nuevo cupón'}>
        <div className="adm-modal-h"><h2 className="adm-h2">{existe ? 'Editar cupón' : 'Crear cupón'}</h2><button className="adm-x" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
        <div className="adm-modal-b">
          <div className="adm-field"><span className="adm-label">Tipo de cupón</span>
            <div className="adm-chips">{(Object.keys(CUPON_TIPOS) as CuponTipo[]).map((k) => <button key={k} type="button" title={CUPON_TIPOS[k].desc} className={`adm-chip${(c.kind ?? 'general') === k ? ' on' : ''}`} onClick={() => set({ kind: k })}>{CUPON_TIPOS[k].label}</button>)}</div>
            <span className="adm-hint">{CUPON_TIPOS[c.kind ?? 'general'].desc}</span>
          </div>
          <div className="adm-grid adm-g2">
            <div className="adm-field"><label htmlFor="cp-code">Código</label><div className="adm-row" style={{ flexWrap: 'nowrap' }}><input id="cp-code" className="adm-input" value={c.code} maxLength={30} placeholder="BIENVENIDO10" onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} /><button type="button" className="adm-btn line sm" onClick={generar}>Generar</button></div></div>
            <div className="adm-field"><label htmlFor="cp-scope">¿Dónde aplica? (texto para el cliente)</label><input id="cp-scope" className="adm-input" maxLength={80} value={c.scope} onChange={(e) => set({ scope: e.target.value })} /></div>
            <div className="adm-field"><label htmlFor="cp-pct">Descuento (%)</label><input id="cp-pct" className="adm-input" type="number" min={1} max={100} value={c.pct} onChange={(e) => set({ pct: Number(e.target.value) })} /></div>
            <div className="adm-field"><label htmlFor="cp-min">Compra mínima ($)</label><input id="cp-min" className="adm-input" type="number" min={0} step={1000} value={c.minPurchase} onChange={(e) => set({ minPurchase: Number(e.target.value) })} /></div>
            <div className="adm-field"><label htmlFor="cp-max">Descuento máximo ($, opcional)</label><input id="cp-max" className="adm-input" type="number" min={0} step={1000} placeholder="Sin tope" value={c.maxDiscount ?? ''} onChange={(e) => set({ maxDiscount: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div className="adm-field"><label htmlFor="cp-lim">Límite de usos (opcional)</label><input id="cp-lim" className="adm-input" type="number" min={1} placeholder="Sin límite" value={c.usageLimit ?? ''} onChange={(e) => set({ usageLimit: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div className="adm-field"><label htmlFor="cp-ini">Inicio</label><input id="cp-ini" type="datetime-local" className="adm-input" value={aLocal(c.startsAt)} onChange={(e) => set({ startsAt: aIso(e.target.value) })} /></div>
            <div className="adm-field"><label htmlFor="cp-fin">Fin</label><input id="cp-fin" type="datetime-local" className="adm-input" value={aLocal(c.endsAt)} onChange={(e) => set({ endsAt: aIso(e.target.value) })} /></div>
          </div>
          <ScopePicker label="Catálogo exclusivo del cupón: ¿qué productos incluye?" scope={c.target ?? { type: 'todo', ids: [] }} onChange={(target) => set({ target })} products={products} />
          <div className="adm-field"><label htmlFor="cp-slug">Dirección del catálogo</label><div className="adm-row" style={{ flexWrap: 'nowrap', gap: 6 }}><span className="adm-hint">/ofertas/</span><input id="cp-slug" className="adm-input" placeholder={slugify(c.code) || 'bienvenida'} value={c.slug ?? ''} onChange={(e) => set({ slug: slugify(e.target.value) })} /></div><span className="adm-hint">Al tocar el cupón en el inicio, el cliente llega a esta página con solo esos productos.</span></div>
          <div className="adm-preview">
            <span className="adm-label">Ejemplo</span>
            <p style={{ marginTop: 6 }}>En una compra de <b>{formatCOP(ejemplo)}</b> con <code>{c.code || 'TUCODIGO'}</code> el cliente se ahorra <b>{formatCOP(ejemplo >= c.minPurchase ? desc : 0)}</b>{ejemplo < c.minPurchase ? ' (no alcanza la compra mínima)' : ''}.</p>
          </div>
          <label className="adm-row" style={{ gap: 10 }}><span className="adm-switch"><input type="checkbox" checked={c.active} onChange={(e) => set({ active: e.target.checked })} /><i /></span>Activo al guardar</label>
        </div>
        <div className="adm-modal-f"><button className="adm-btn line" onClick={onClose}>Cancelar</button><button className="adm-btn" disabled={guardando} onClick={() => onSave(c)}>{guardando ? 'Guardando…' : existe ? 'Guardar cambios' : 'Crear cupón'}</button></div>
      </div>
    </div>
  );
}

/* ───────────────────────── Selector de alcance (toda la tienda / categorías / productos) ───────────────────────── */
function ScopePicker({ label, scope, onChange, products }: { label: string; scope: CampaignScope; onChange: (s: CampaignScope) => void; products: Product[] }) {
  const [q, setQ] = useState('');
  const toggleId = (id: string) => onChange({ ...scope, ids: scope.ids.includes(id) ? scope.ids.filter((x) => x !== id) : [...scope.ids, id] });
  const lista = products.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q)).slice(0, 40);
  return (
    <div className="adm-field">
      <span className="adm-label">{label}</span>
      <div className="adm-seg" style={{ width: 'fit-content' }}>
        {([['todo', 'Toda la tienda'], ['categorias', 'Categorías'], ['productos', 'Productos']] as const).map(([t, l]) => (
          <button key={t} type="button" className={scope.type === t ? 'on' : ''} onClick={() => onChange({ type: t, ids: t === scope.type ? scope.ids : [] })}>{l}</button>
        ))}
      </div>
      {scope.type === 'categorias' && (
        <div className="adm-chips" style={{ marginTop: 6 }}>
          {CATEGORIES.map((cat) => <button key={cat.id} type="button" className={`adm-chip${scope.ids.includes(cat.id) ? ' on' : ''}`} onClick={() => toggleId(cat.id)}>{cat.name}</button>)}
        </div>
      )}
      {scope.type === 'productos' && (
        <div style={{ marginTop: 6 }}>
          <input className="adm-input" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--a-line)', borderRadius: 8, marginTop: 8 }}>
            {lista.map((p) => (
              <label key={p.id} className="adm-row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--a-line)', gap: 10 }}>
                <input type="checkbox" checked={scope.ids.includes(p.id)} onChange={() => toggleId(p.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="adm-thumb" style={{ width: 34, height: 34 }} src={p.images[0] ?? '/logo-icon.png'} alt="" loading="lazy" />
                <span style={{ flex: 1, minWidth: 0 }}>{p.name}</span><span className="adm-money">{formatCOP(p.price)}</span>
              </label>
            ))}
          </div>
          <span className="adm-hint">{scope.ids.length} seleccionado(s)</span>
        </div>
      )}
    </div>
  );
}
