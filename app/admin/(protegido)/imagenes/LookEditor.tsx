'use client';

/**
 * Imágenes interactivas — editor visual: se sube la imagen, se colocan los puntos "+" haciendo clic
 * (botón "Agregar punto"), se ARRASTRAN con el mouse hasta el lugar justo y se elige el producto de cada uno.
 * Es la imagen que ven los clientes en "Elige tu frutal por clima".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ExternalLink, ImagePlus, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { formatCOP } from '@/data/catalog';
import type { Look, LookSpot, PromoConfig } from '@/lib/promotions';
import { toast } from '@/components/admin/toast';
import type { Product } from '@/types';

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

export default function LookEditor() {
  const router = useRouter();
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [editable, setEditable] = useState(true);
  const [lookId, setLookId] = useState<string | null>(null);
  const [spotId, setSpotId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const arrastre = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/admin/promociones', { cache: 'no-store' }), fetch('/api/admin/products', { cache: 'no-store' })]);
    if (a.status === 401) return router.push('/admin/login?next=/admin/imagenes');
    const da = await a.json();
    setConfig(da.config); setEditable(Boolean(da.editable));
    setLookId((id) => id ?? da.config?.looks?.[0]?.id ?? null);
    if (b.ok) setProducts((await b.json()).products ?? []);
  }, [router]);
  useEffect(() => { cargar().catch(() => toast('No se pudo cargar', 'bad')); }, [cargar]);

  const look = config?.looks.find((l) => l.id === lookId) ?? null;
  const spot = look?.spots.find((s) => s.id === spotId) ?? null;
  const porId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  if (!config) return <div className="adm-skel" style={{ height: 420 }} />;

  const setLook = (patch: Partial<Look>) => { setConfig({ ...config, looks: config.looks.map((l) => (l.id === lookId ? { ...l, ...patch } : l)) }); setSucio(true); };
  const setSpot = (id: string, patch: Partial<LookSpot>) => look && setLook({ spots: look.spots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const posicion = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  };

  const onBoxDown = (e: React.PointerEvent) => {
    if (!agregando || !look || e.target !== box.current && (e.target as HTMLElement).tagName !== 'IMG') return;
    const { x, y } = posicion(e);
    const s: LookSpot = { id: uid('sp'), x, y, productId: '' };
    setLook({ spots: [...look.spots, s] });
    setSpotId(s.id); setAgregando(false);
  };

  const onSpotDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    arrastre.current = id; setSpotId(id);
  };
  const onSpotMove = (e: React.PointerEvent, id: string) => {
    if (arrastre.current !== id) return;
    const { x, y } = posicion(e);
    setSpot(id, { x, y });
  };
  const onSpotUp = (e: React.PointerEvent) => { arrastre.current = null; (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); };

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const form = new FormData(); form.append('file', file);
      const r = await fetch('/api/admin/media', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo subir la imagen.');
      setLook({ src: d.url }); toast('Imagen subida');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al subir', 'bad'); } finally { setSubiendo(false); }
  };

  const nuevaImagen = () => {
    const l: Look = { id: uid('look'), tab: 'Nueva imagen', title: '¡Título de la imagen!', alt: 'Imagen interactiva', src: '/promos/black-friday-30.jpeg', active: false, spots: [] };
    setConfig({ ...config, looks: [...config.looks, l] }); setLookId(l.id); setSpotId(null); setSucio(true);
  };
  const quitarImagen = () => {
    if (!look || !confirm(`¿Quitar "${look.tab}"?`)) return;
    const resto = config.looks.filter((l) => l.id !== look.id);
    setConfig({ ...config, looks: resto }); setLookId(resto[0]?.id ?? null); setSpotId(null); setSucio(true);
  };
  const quitarPunto = (id: string) => { if (look) { setLook({ spots: look.spots.filter((s) => s.id !== id) }); setSpotId(null); } };

  const guardar = async () => {
    const sin = config.looks.find((l) => l.spots.some((s) => !s.productId));
    if (sin) { setLookId(sin.id); return toast('Hay puntos sin producto: elige uno para cada punto naranja', 'bad'); }
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/promociones', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo guardar.');
      setConfig(d.config); setSucio(false); toast('Guardado. El inicio se actualiza en menos de un minuto.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar', 'bad'); } finally { setGuardando(false); }
  };

  const lista = products.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q)).slice(0, 30);

  return (
    <>
      <div className="adm-pagehead">
        <div>
          <h1 className="adm-title">Imágenes interactivas</h1>
          <p className="adm-desc">Pon puntos sobre la foto, arrástralos al lugar justo y elige el producto de cada uno. Así se arma &quot;Elige tu frutal por clima&quot; en el inicio.</p>
        </div>
        <div className="adm-row">
          <Link href="/" target="_blank" className="adm-btn line"><ExternalLink size={16} />Ver el inicio</Link>
          <button className="adm-btn" disabled={!sucio || guardando || !editable} onClick={guardar}>{guardando ? 'Guardando…' : sucio ? 'Guardar cambios' : 'Sin cambios'}</button>
        </div>
      </div>

      {!editable && <div className="adm-alert" style={{ marginBottom: 16 }}><AlertTriangle size={18} /><span><b>Solo lectura.</b> Falta configurar Redis (REDIS_URL).</span></div>}

      <div className="adm-row" style={{ marginBottom: 14 }}>
        <div className="adm-seg" role="tablist">
          {config.looks.map((l) => <button key={l.id} role="tab" aria-selected={l.id === lookId} className={l.id === lookId ? 'on' : ''} onClick={() => { setLookId(l.id); setSpotId(null); setAgregando(false); }}>{l.tab}</button>)}
        </div>
        <button className="adm-btn line sm" onClick={nuevaImagen}><Plus size={15} />Nueva imagen</button>
      </div>

      {!look && <div className="adm-card"><div className="adm-empty"><MousePointerClick size={40} /><b>No hay imágenes</b><span>Crea una para empezar a colocar puntos.</span><button className="adm-btn" onClick={nuevaImagen}><Plus size={16} />Nueva imagen</button></div></div>}

      {look && (
        <div className="adm-grid adm-g-main">
          <section className="adm-card pad" style={{ display: 'grid', gap: 14 }}>
            <div className="adm-row" style={{ justifyContent: 'space-between' }}>
              <button className={`adm-btn sm ${agregando ? '' : 'ghost'}`} onClick={() => setAgregando((a) => !a)}><Plus size={15} />{agregando ? 'Haz clic sobre la imagen…' : 'Agregar punto'}</button>
              <span className="adm-hint">{look.spots.length} punto(s) · arrastra para mover</span>
            </div>
            <div ref={box} className={`adm-look${agregando ? ' adding' : ''}`} onPointerDown={onBoxDown}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={look.src} alt={look.alt} draggable={false} />
              {look.spots.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`adm-spot${s.id === spotId ? ' sel' : ''}${s.productId ? '' : ' empty'}`}
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                  onPointerDown={(e) => onSpotDown(e, s.id)}
                  onPointerMove={(e) => onSpotMove(e, s.id)}
                  onPointerUp={onSpotUp}
                  aria-label={`Punto ${i + 1}${s.productId ? `: ${porId.get(s.productId)?.name ?? s.productId}` : ' sin producto'}`}
                  title={s.productId ? porId.get(s.productId)?.name ?? s.productId : 'Sin producto'}
                >
                  <i /><i /><b>{i + 1}</b>
                </button>
              ))}
            </div>
            <p className="adm-hint">Los puntos naranja pulsan porque aún no tienen producto. Haz clic en un punto para asignarle uno.</p>

            <div className="adm-grid adm-g2">
              <div className="adm-field"><label htmlFor="lk-tab">Texto de la pestaña</label><input id="lk-tab" className="adm-input" maxLength={40} value={look.tab} onChange={(e) => setLook({ tab: e.target.value })} /></div>
              <div className="adm-field"><label htmlFor="lk-title">Título sobre la imagen</label><input id="lk-title" className="adm-input" maxLength={120} value={look.title} onChange={(e) => setLook({ title: e.target.value })} /></div>
            </div>
            <div className="adm-row">
              <label className="adm-btn line sm"><ImagePlus size={15} />{subiendo ? 'Subiendo…' : 'Subir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} /></label>
              <input className="adm-input" style={{ flex: 1, minWidth: 220 }} value={look.src} onChange={(e) => setLook({ src: e.target.value })} aria-label="Ruta o URL de la imagen" />
            </div>
            <div className="adm-field"><label htmlFor="lk-alt">Texto alternativo (accesibilidad)</label><input id="lk-alt" className="adm-input" value={look.alt} onChange={(e) => setLook({ alt: e.target.value })} /></div>
            <div className="adm-row" style={{ justifyContent: 'space-between' }}>
              <label className="adm-row" style={{ gap: 10 }}><span className="adm-switch"><input type="checkbox" checked={look.active} onChange={(e) => setLook({ active: e.target.checked })} /><i /></span>Visible en el inicio</label>
              <button className="adm-btn danger sm" onClick={quitarImagen}><Trash2 size={15} />Quitar imagen</button>
            </div>
          </section>

          <aside className="adm-grid" style={{ alignContent: 'start' }}>
            <section className="adm-card pad" style={{ display: 'grid', gap: 10 }}>
              <h2 className="adm-h2">Puntos</h2>
              {look.spots.map((s, i) => {
                const p = porId.get(s.productId);
                return (
                  <button key={s.id} className={`adm-spotrow${s.id === spotId ? ' sel' : ''}`} onClick={() => setSpotId(s.id)}>
                    <span className="n">{i + 1}</span>
                    {p ? (<>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="adm-thumb" style={{ width: 34, height: 34 }} src={p.images[0] ?? '/logo-icon.png'} alt="" /><span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{p.name}<br /><b className="adm-money">{formatCOP(p.price)}</b></span></>) : <span style={{ flex: 1, color: 'var(--a-warn)' }}>{s.fallback ? `${s.fallback.name} (externo)` : 'Elige un producto'}</span>}
                  </button>
                );
              })}
              {look.spots.length === 0 && <p className="adm-hint">Aún no hay puntos. Pulsa &quot;Agregar punto&quot; y haz clic sobre la imagen.</p>}
            </section>

            {spot && (
              <section className="adm-card pad" style={{ display: 'grid', gap: 10 }}>
                <div className="adm-row" style={{ justifyContent: 'space-between' }}><h2 className="adm-h2">Producto del punto {look.spots.findIndex((s) => s.id === spot.id) + 1}</h2><button className="adm-btn danger sm" onClick={() => quitarPunto(spot.id)}><Trash2 size={14} />Quitar</button></div>
                <input className="adm-input" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--a-line)', borderRadius: 8 }}>
                  {lista.map((p) => (
                    <button key={p.id} className="adm-row" style={{ gap: 10, padding: '8px 12px', width: '100%', border: 0, borderBottom: '1px solid var(--a-line)', background: spot.productId === p.id ? 'var(--a-accent-soft)' : 'transparent', textAlign: 'left', flexWrap: 'nowrap' }} onClick={() => setSpot(spot.id, { productId: p.id, fallback: undefined })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="adm-thumb" style={{ width: 34, height: 34 }} src={p.images[0] ?? '/logo-icon.png'} alt="" loading="lazy" />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{p.name}</span><span className="adm-money" style={{ fontSize: 12.5 }}>{formatCOP(p.price)}</span>
                    </button>
                  ))}
                </div>
                <div className="adm-row" style={{ gap: 10 }}>
                  <label className="adm-field" style={{ flex: 1 }}><span className="adm-hint">X (%)</span><input className="adm-input" type="number" min={0} max={100} step={0.1} value={spot.x} onChange={(e) => setSpot(spot.id, { x: clamp(Number(e.target.value)) })} /></label>
                  <label className="adm-field" style={{ flex: 1 }}><span className="adm-hint">Y (%)</span><input className="adm-input" type="number" min={0} max={100} step={0.1} value={spot.y} onChange={(e) => setSpot(spot.id, { y: clamp(Number(e.target.value)) })} /></label>
                </div>
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
