'use client';

/**
 * Mi página — el inicio de la tienda: banners del carrusel (subir imagen, enlace, fechas, interruptor)
 * y la regla de reemplazo del hero. Los cupones y campañas se gestionan en Promociones.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ExternalLink, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { estadoDe, type PromoConfig, type Promotion } from '@/lib/promotions';
import { toast } from '@/components/admin/toast';

const aLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const aIso = (v: string) => (v ? new Date(v).toISOString() : undefined);
const TONO = { activa: 'ok', programada: 'info', finalizada: '', pausada: 'warn' } as const;
const TXT = { activa: 'Activo', programada: 'Programado', finalizada: 'Finalizado', pausada: 'Pausado' } as const;

export default function PaginaAdmin() {
  const router = useRouter();
  const [config, setConfig] = useState<PromoConfig | null>(null);
  const [editable, setEditable] = useState(true);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch('/api/admin/promociones', { cache: 'no-store' });
    if (r.status === 401) return router.push('/admin/login?next=/admin/pagina');
    const d = await r.json();
    setConfig(d.config); setEditable(Boolean(d.editable));
  }, [router]);
  useEffect(() => { cargar().catch(() => toast('No se pudo cargar', 'bad')); }, [cargar]);

  if (!config) return <div className="adm-skel" style={{ height: 360 }} />;

  const banners = config.promotions;
  const set = (i: number, patch: Partial<Promotion>) => { setConfig({ ...config, promotions: banners.map((b, k) => (k === i ? { ...b, ...patch } : b)) }); setSucio(true); };
  const ahora = new Date();
  const activos = banners.filter((b) => estadoDe(b, ahora) === 'activa').length;

  const subir = async (i: number, file: File) => {
    setSubiendo(banners[i].id);
    try {
      const form = new FormData(); form.append('file', file);
      const r = await fetch('/api/admin/media', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo subir la imagen.');
      set(i, { image: d.url }); toast('Imagen subida');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al subir', 'bad'); } finally { setSubiendo(null); }
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await fetch('/api/admin/promociones', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'No se pudo guardar.');
      setConfig(d.config); setSucio(false); toast('Cambios guardados. El inicio se actualiza en menos de un minuto.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar', 'bad'); } finally { setGuardando(false); }
  };

  return (
    <>
      <div className="adm-pagehead">
        <div>
          <h1 className="adm-title">Mi página</h1>
          <p className="adm-desc">Los banners que ven tus clientes apenas entran a la tienda.</p>
        </div>
        <div className="adm-row">
          <Link href="/" target="_blank" className="adm-btn line"><ExternalLink size={16} />Ver el inicio</Link>
          <button className="adm-btn" disabled={!sucio || guardando || !editable} onClick={guardar}>{guardando ? 'Guardando…' : sucio ? 'Guardar cambios' : 'Sin cambios'}</button>
        </div>
      </div>

      {!editable && <div className="adm-alert" style={{ marginBottom: 16 }}><AlertTriangle size={18} /><span><b>Solo lectura.</b> Falta configurar Redis (REDIS_URL).</span></div>}

      <section className="adm-card pad" style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`adm-badge ${activos ? 'ok' : ''}`}>{activos ? `${activos} banner(es) activos` : 'Sin banners activos'}</span>
        <span style={{ color: 'var(--a-mute)' }}>{activos ? 'El inicio muestra el carrusel de promociones y oculta el hero normal (imagen y texto principal).' : 'El inicio muestra el hero normal. Activa un banner para reemplazarlo.'}</span>
      </section>

      <div className="adm-grid">
        {banners.map((b, i) => {
          const e = estadoDe(b, ahora);
          return (
            <article key={b.id} className="adm-card pad" style={{ display: 'grid', gap: 14 }}>
              <div className="adm-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt="" style={{ width: 300, maxWidth: '100%', aspectRatio: '1600 / 528', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--a-line)', background: 'var(--a-card-2)' }} />
                <div style={{ flex: 1, minWidth: 260, display: 'grid', gap: 10 }}>
                  <div className="adm-row" style={{ justifyContent: 'space-between' }}><span className={`adm-badge ${TONO[e]}`}>{TXT[e]}</span>
                    <label className="adm-row" style={{ gap: 8 }}><span className="adm-switch"><input type="checkbox" checked={b.active} onChange={(ev) => set(i, { active: ev.target.checked })} /><i /></span>Activo</label></div>
                  <input className="adm-input" value={b.name} onChange={(ev) => set(i, { name: ev.target.value })} placeholder="Nombre interno" aria-label="Nombre interno" />
                  <input className="adm-input" value={b.href} onChange={(ev) => set(i, { href: ev.target.value })} placeholder="Enlace del clic (/catalogo)" aria-label="Enlace" />
                  <input className="adm-input" value={b.alt} onChange={(ev) => set(i, { alt: ev.target.value })} placeholder="Texto alternativo (accesibilidad)" aria-label="Texto alternativo" />
                </div>
              </div>
              <div className="adm-row">
                <label className="adm-btn line sm"><ImagePlus size={15} />{subiendo === b.id ? 'Subiendo…' : 'Subir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(ev) => ev.target.files?.[0] && subir(i, ev.target.files[0])} /></label>
                <input className="adm-input" style={{ flex: 1, minWidth: 220 }} value={b.image} onChange={(ev) => set(i, { image: ev.target.value })} placeholder="o ruta / URL de la imagen" aria-label="Imagen" />
              </div>
              <div className="adm-row">
                <label className="adm-row" style={{ gap: 8 }}>Desde<input type="datetime-local" className="adm-input" style={{ width: 'auto' }} value={aLocal(b.startsAt)} onChange={(ev) => set(i, { startsAt: aIso(ev.target.value) })} /></label>
                <label className="adm-row" style={{ gap: 8 }}>Hasta<input type="datetime-local" className="adm-input" style={{ width: 'auto' }} value={aLocal(b.endsAt)} onChange={(ev) => set(i, { endsAt: aIso(ev.target.value) })} /></label>
                <button className="adm-btn danger sm" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`¿Quitar "${b.name}"?`)) { setConfig({ ...config, promotions: banners.filter((_, k) => k !== i) }); setSucio(true); } }}><Trash2 size={15} />Quitar</button>
              </div>
            </article>
          );
        })}
        {banners.length === 0 && <div className="adm-card"><div className="adm-empty"><ImagePlus size={40} /><b>No hay banners</b><span>Agrega uno para reemplazar el hero principal.</span></div></div>}
      </div>

      <button className="adm-btn line" style={{ marginTop: 14 }} onClick={() => { setConfig({ ...config, promotions: [...banners, { id: `banner-${Math.random().toString(36).slice(2, 8)}`, name: 'Nuevo banner', image: '/promos/black-friday-30.jpeg', alt: 'Promoción', href: '/catalogo', active: false }] }); setSucio(true); }}><Plus size={16} />Agregar banner</button>
      <p className="adm-hint" style={{ marginTop: 12 }}>Tamaño recomendado: 3200 × 1056 px (proporción 3:1) en JPG o WebP. Los cupones y las campañas se gestionan en <Link className="adm-link" href="/admin/promociones">Promociones</Link>.</p>
    </>
  );
}
