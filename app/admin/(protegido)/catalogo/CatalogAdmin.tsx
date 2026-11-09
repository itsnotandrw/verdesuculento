'use client';

/**
 * Publicaciones — equivalente a "Gestión de publicaciones" del Centro de vendedores:
 * pestañas por estado, búsqueda y filtros, selección múltiple con acciones masivas,
 * tabla con precio y promoción vigente, calidad, estado (interruptor) y menú por fila.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Eye, MoreVertical, PackageOpen, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { CATEGORIES, formatCOP } from '@/data/catalog';
import { RATINGS } from '@/data/ratings';
import { mejorCampana, precioConDescuento, type Campaign } from '@/lib/promotions';
import { toast } from '@/components/admin/toast';
import type { Product } from '@/types';

interface CambioML { id: string; name: string; price?: { antes: number; despues: number }; activo?: { antes: boolean; despues: boolean } }
interface ResultadoSync { consultados: number; cambios: CambioML[]; revisar: { id: string; name: string; antes: number; despues: number }[]; aplicado: boolean }

const PAGE = 15;
type Tab = 'todas' | 'visibles' | 'ocultas' | 'promo' | 'sinpromo';

function calidad(p: Product): number {
  const fotos = Math.min(p.images.length, 4) / 4 * 40;
  const desc = Math.min(1, p.description.length / 400) * 30;
  const tag = p.tagline ? 10 : 0;
  const specs = Object.values(p.specs ?? {}).filter(Boolean).length / 6 * 20;
  return Math.round(fotos + desc + tag + specs);
}

export default function CatalogAdmin() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editable, setEditable] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [orden, setOrden] = useState('recientes');
  const [pagina, setPagina] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pct, setPct] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [sync, setSync] = useState<ResultadoSync | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [a, b] = await Promise.all([
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/promociones', { cache: 'no-store' }),
      ]);
      if (a.status === 401) return router.push('/admin/login?next=/admin/catalogo');
      const da = await a.json();
      if (!a.ok) throw new Error(da.error ?? 'No se pudo cargar el catálogo.');
      setProducts(da.products ?? []);
      setEditable(Boolean(da.editable));
      if (b.ok) setCampaigns((await b.json()).config?.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setCargando(false);
    }
  }, [router]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPagina(1); }, [tab, busqueda, categoria, orden]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const promoDe = useCallback((p: Product) => mejorCampana(campaigns, p), [campaigns]);

  const conteo = useMemo(() => ({
    todas: products.length,
    visibles: products.filter((p) => p.activo !== false).length,
    ocultas: products.filter((p) => p.activo === false).length,
    promo: products.filter((p) => promoDe(p)).length,
    sinpromo: products.filter((p) => !promoDe(p)).length,
  }), [products, promoDe]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = products.filter((p) => {
      if (tab === 'visibles' && p.activo === false) return false;
      if (tab === 'ocultas' && p.activo !== false) return false;
      if (tab === 'promo' && !promoDe(p)) return false;
      if (tab === 'sinpromo' && promoDe(p)) return false;
      if (categoria !== 'todas' && p.category !== categoria) return false;
      return !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
    const ord = [...lista];
    if (orden === 'precio-asc') ord.sort((a, b) => a.price - b.price);
    else if (orden === 'precio-desc') ord.sort((a, b) => b.price - a.price);
    else if (orden === 'nombre') ord.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else if (orden === 'vendidos') ord.sort((a, b) => (RATINGS[b.id]?.soldCount ?? 0) - (RATINGS[a.id]?.soldCount ?? 0));
    return ord;
  }, [products, tab, busqueda, categoria, orden, promoDe]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const vista = filtrados.slice((pagina - 1) * PAGE, pagina * PAGE);
  const todosMarcados = vista.length > 0 && vista.every((p) => sel.has(p.id));
  const nombreCat = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.status === 401) { router.push('/admin/login?next=/admin/catalogo'); throw new Error('Sesión vencida.'); }
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? 'No se pudo completar la acción.');
    return d;
  };

  const masiva = async (ids: string[], accion: 'ocultar' | 'mostrar' | 'precio-pct', valor?: number) => {
    if (!ids.length) return;
    setOcupado('bulk');
    try {
      const d = await post('/api/admin/products/bulk', { ids, accion, valor });
      toast(`${d.cambiados} publicación(es) actualizadas`);
      setSel(new Set()); setPct('');
      await cargar();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error', 'bad'); } finally { setOcupado(null); }
  };

  const sincronizar = async (aplicar: boolean) => {
    setOcupado('sync');
    try {
      const d: ResultadoSync = await post('/api/admin/ml-sync', { aplicar });
      setSync(d);
      if (aplicar) { toast(`Sincronizado: ${d.cambios.length} cambio(s) aplicados`); await cargar(); }
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al sincronizar', 'bad'); } finally { setOcupado(null); }
  };

  const borrar = async (p: Product) => {
    if (!confirm(`¿Borrar "${p.name}" del catálogo? Esto no se puede deshacer.`)) return;
    setOcupado(p.id);
    try {
      const r = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo borrar.');
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast('Publicación borrada');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error', 'bad'); } finally { setOcupado(null); }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'todas', label: 'Todas' }, { id: 'visibles', label: 'Visibles' }, { id: 'ocultas', label: 'Ocultas' },
    { id: 'promo', label: 'Con promoción' }, { id: 'sinpromo', label: 'Sin promoción' },
  ];

  return (
    <>
      <div className="adm-pagehead">
        <div>
          <h1 className="adm-title">Publicaciones</h1>
          <p className="adm-desc">Administra tus productos: precios, visibilidad, promociones y calidad de cada publicación.</p>
        </div>
        <div className="adm-row">
          <button className="adm-btn ghost" disabled={ocupado === 'sync'} onClick={() => sincronizar(false)}><RefreshCw size={16} />{ocupado === 'sync' ? 'Consultando…' : 'Revisar Mercado Libre'}</button>
          <Link href="/admin/catalogo/nuevo" className="adm-btn"><Plus size={16} />Nuevo producto</Link>
        </div>
      </div>

      {!editable && (
        <div className="adm-alert" style={{ marginBottom: 16 }}><AlertTriangle size={18} /><span><b>Solo lectura.</b> Falta configurar Redis (REDIS_URL): los cambios no se pueden guardar.</span></div>
      )}

      {sync && (
        <section className="adm-card pad" style={{ marginBottom: 16 }}>
          <div className="adm-row" style={{ justifyContent: 'space-between' }}>
            <b>Mercado Libre: {sync.consultados} consultadas · {sync.cambios.length} con cambios</b>
            <div className="adm-row">
              {!sync.aplicado && sync.cambios.length > 0 && <button className="adm-btn sm" disabled={ocupado === 'sync' || !editable} onClick={() => sincronizar(true)}>Aplicar {sync.cambios.length} cambio(s)</button>}
              <button className="adm-btn sm line" onClick={() => setSync(null)}>Cerrar</button>
            </div>
          </div>
          {sync.cambios.length === 0 && sync.revisar.length === 0 && <p className="adm-hint" style={{ marginTop: 8 }}>Todo está al día con Mercado Libre.</p>}
          <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4, fontSize: 13, maxHeight: 200, overflowY: 'auto' }}>
            {sync.cambios.map((c) => (
              <li key={c.id}><span style={{ color: 'var(--a-mute)' }}>{c.id}</span> {c.name}
                {c.price && <> — {formatCOP(c.price.antes)} → <b>{formatCOP(c.price.despues)}</b></>}
                {c.activo && <> — {c.activo.despues ? 'se vuelve a mostrar' : 'se oculta (pausado o sin stock en ML)'}</>}</li>
            ))}
            {sync.revisar.map((r) => <li key={r.id} style={{ color: 'var(--a-warn)' }}>⚠ {r.name}: {formatCOP(r.antes)} → {formatCOP(r.despues)} (salto sospechoso, no se aplica)</li>)}
          </ul>
        </section>
      )}

      <section className="adm-card">
        <div style={{ padding: '14px 16px 0' }}>
          <div className="adm-seg" role="tablist" style={{ flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label} <span style={{ opacity: .6 }}>{conteo[t.id]}</span></button>
            ))}
          </div>
        </div>
        <div className="adm-row" style={{ padding: 16 }}>
          <input className="adm-input" style={{ maxWidth: 340 }} placeholder="Buscar por título o código…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select className="adm-select" style={{ maxWidth: 230 }} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
            <option value="todas">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="adm-select" style={{ maxWidth: 200 }} value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
            <option value="recientes">Orden del catálogo</option>
            <option value="vendidos">Más vendidos</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A–Z</option>
          </select>
          <span className="adm-hint" style={{ marginLeft: 'auto' }}>{filtrados.length} publicaciones</span>
        </div>

        <div className="adm-bulk" style={{ borderTop: '1px solid var(--a-line)' }}>
          <label className="adm-row" style={{ gap: 8 }}><input type="checkbox" checked={todosMarcados} onChange={() => setSel(todosMarcados ? new Set() : new Set(vista.map((p) => p.id)))} />{sel.size ? `${sel.size} seleccionadas` : 'Seleccionar publicaciones'}</label>
          <span className="adm-spacer" />
          <div className="adm-row" style={{ opacity: sel.size ? 1 : .45, pointerEvents: sel.size ? 'auto' : 'none' }}>
            <button className="adm-btn sm line" disabled={!editable || ocupado === 'bulk'} onClick={() => masiva([...sel], 'ocultar')}>Pausar</button>
            <button className="adm-btn sm line" disabled={!editable || ocupado === 'bulk'} onClick={() => masiva([...sel], 'mostrar')}>Reactivar</button>
            <input className="adm-input" style={{ width: 96, height: 32 }} inputMode="decimal" placeholder="% precio" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Ajuste de precio en porcentaje" />
            <button className="adm-btn sm line" disabled={!editable || !pct || ocupado === 'bulk'} onClick={() => masiva([...sel], 'precio-pct', Number(pct))}>Ajustar precio</button>
            <Link className="adm-btn sm" href={`/admin/promociones?crear=1&productos=${[...sel].join(',')}`}>Crear promoción</Link>
          </div>
        </div>

        {error && <p style={{ padding: 16, color: 'var(--a-bad)' }}>{error}</p>}

        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th style={{ width: 36 }} /><th>Publicación</th><th>Precio</th><th>Promoción</th><th>Métricas</th><th>Calidad</th><th>Estado</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>
              {cargando && Array.from({ length: 5 }, (_, i) => (
                <tr key={i}><td colSpan={8}><div className="adm-skel" style={{ height: 54 }} /></td></tr>
              ))}
              {!cargando && vista.map((p) => {
                const c = promoDe(p);
                const final = c ? precioConDescuento(p.price, c.pct) : null;
                const r = RATINGS[p.id];
                const q = calidad(p);
                return (
                  <tr key={p.id} className={sel.has(p.id) ? 'sel' : ''} style={{ opacity: p.activo === false ? .6 : 1 }}>
                    <td><input type="checkbox" checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} aria-label={`Seleccionar ${p.name}`} /></td>
                    <td>
                      <div className="adm-prod">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="adm-thumb" src={p.images[0] ?? '/logo-icon.png'} alt="" loading="lazy" />
                        <div><b>{p.name}</b><small>#{p.id}</small><small>{nombreCat(p.category)}</small></div>
                      </div>
                    </td>
                    <td>
                      {final ? (<><span className="adm-money">{formatCOP(final)}</span><br /><span className="adm-strike">{formatCOP(p.price)}</span></>) : <span className="adm-money">{formatCOP(p.price)}</span>}
                    </td>
                    <td>
                      {c ? (<><span className="adm-badge purple">{c.badge ?? 'Promoción'}</span><br /><small style={{ color: 'var(--a-mute)' }}>{c.pct}% · {c.name}</small></>) : (
                        <Link className="adm-link" href={`/admin/promociones?crear=1&productos=${p.id}`}>Crear descuento</Link>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {r ? (<>
                        <div>{r.soldCount ?? 0} vendidos</div>
                        <small style={{ color: 'var(--a-mute)' }}>{r.rating ? `★ ${r.rating} (${r.reviewCount})` : 'Sin reseñas'}</small>
                      </>) : <small style={{ color: 'var(--a-faint)' }}>—</small>}
                    </td>
                    <td>
                      <div className="adm-ring" style={{ ['--p' as string]: q }} title={`Calidad ${q}/100`}><span>{q}</span></div>
                    </td>
                    <td>
                      <label className="adm-row" style={{ gap: 8 }}>
                        <span className="adm-switch">
                          <input type="checkbox" checked={p.activo !== false} disabled={!editable || ocupado === p.id} onChange={() => masiva([p.id], p.activo === false ? 'mostrar' : 'ocultar')} aria-label={p.activo === false ? 'Reactivar' : 'Pausar'} />
                          <i />
                        </span>
                        <span className={`adm-badge ${p.activo === false ? 'bad' : 'ok'}`}>{p.activo === false ? 'Pausada' : 'Activa'}</span>
                      </label>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <button className="adm-x" aria-label="Más opciones" onClick={(e) => { e.stopPropagation(); setMenu(menu === p.id ? null : p.id); }}><MoreVertical size={18} /></button>
                      {menu === p.id && (
                        <div className="adm-menu" style={{ minWidth: 190 }} onClick={(e) => e.stopPropagation()}>
                          <Link href={`/admin/catalogo/${p.id}`}><Pencil size={15} />Editar</Link>
                          <Link href={`/producto/${p.id}`} target="_blank"><Eye size={15} />Ver en la tienda</Link>
                          <hr />
                          <button onClick={() => { setMenu(null); borrar(p); }} style={{ color: 'var(--a-bad)' }}><Trash2 size={15} />Borrar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!cargando && filtrados.length === 0 && (
          <div className="adm-empty"><PackageOpen size={40} /><b>Ninguna publicación coincide</b><span>Prueba con otra búsqueda o cambia los filtros.</span></div>
        )}

        {paginas > 1 && (
          <div className="adm-pager">
            <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>‹</button>
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => <button key={n} className={n === pagina ? 'on' : ''} onClick={() => setPagina(n)}>{n}</button>)}
            <button disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>›</button>
          </div>
        )}
      </section>
    </>
  );
}
