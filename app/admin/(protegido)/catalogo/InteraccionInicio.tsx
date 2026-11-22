'use client';

/**
 * Interacción de una publicación en las "imágenes interactivas" del inicio ("Elige tu frutal por clima").
 *
 * Al editar un producto se elige en cuál(es) imagen(es) aparece su punto "+": clima cálido, clima frío o los dos.
 * Con el deslizable de ALTURA se sube o baja el punto sobre la foto (y con el lateral, se mueve de lado a lado),
 * viendo en vivo cómo queda. Al guardar el producto, el punto se crea, se mueve o se quita en la imagen.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Look, PromoConfig } from '@/lib/promotions';
import { urlImagen } from '@/lib/image-loader';

export interface PuntoElegido { x: number; y: number }
/** lookId → posición del punto, o `null` si el producto NO aparece en esa imagen. */
export type SeleccionPuntos = Record<string, PuntoElegido | null>;

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const entre = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/** Aplica la selección a la configuración guardada del sitio. Devuelve cuántas imágenes cambiaron. */
export async function aplicarInteraccion(productId: string, seleccion: SeleccionPuntos): Promise<number> {
  const r = await fetch('/api/admin/promociones', { cache: 'no-store' });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? 'No se pudo leer las imágenes interactivas.');
  const config = d.config as PromoConfig;
  let cambios = 0;
  const looks = config.looks.map((l: Look) => {
    if (!(l.id in seleccion)) return l;
    const destino = seleccion[l.id];
    const actuales = l.spots.filter((s) => s.productId === productId);
    const otros = l.spots.filter((s) => s.productId !== productId);
    if (!destino) {
      if (actuales.length) cambios++;
      return { ...l, spots: otros };
    }
    const previo = actuales[0];
    if (previo && previo.x === destino.x && previo.y === destino.y && actuales.length === 1) return l;
    cambios++;
    return { ...l, spots: [...otros, { id: previo?.id ?? uid('punto'), x: destino.x, y: destino.y, productId }] };
  });
  if (!cambios) return 0;
  const g = await fetch('/api/admin/promociones', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...config, looks }) });
  const dg = await g.json();
  if (!g.ok) throw new Error(dg.error ?? 'No se pudo guardar la interacción del inicio.');
  return cambios;
}

export default function InteraccionInicio({
  productId,
  nombre,
  imagen,
  onCambio,
}: {
  productId: string;
  nombre: string;
  imagen?: string;
  /** Se llama cada vez que el administrador cambia algo: la selección actual completa. */
  onCambio: (seleccion: SeleccionPuntos) => void;
}) {
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [editable, setEditable] = useState(true);
  const [sel, setSel] = useState<SeleccionPuntos>({});

  useEffect(() => {
    let vivo = true;
    fetch('/api/admin/promociones', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        const ls: Look[] = d.config?.looks ?? [];
        setLooks(ls);
        setEditable(Boolean(d.editable));
        const inicial: SeleccionPuntos = {};
        for (const l of ls) {
          const s = productId ? l.spots.find((p) => p.productId === productId) : undefined;
          inicial[l.id] = s ? { x: s.x, y: s.y } : null;
        }
        setSel(inicial);
      })
      .catch(() => vivo && setLooks([]));
    return () => { vivo = false; };
    // Solo al abrir el formulario: después manda lo que el administrador vaya cambiando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = useCallback((siguiente: SeleccionPuntos) => { setSel(siguiente); onCambio(siguiente); }, [onCambio]);

  if (!looks) return <div className="adm-skel" style={{ height: 80 }} />;
  if (!looks.length) return <p className="adm-hint">Aún no hay imágenes interactivas. Créalas en el menú «Imágenes interactivas».</p>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <div className="checkout-label" style={{ marginBottom: 4 }}>Interacción en el inicio · «Elige tu frutal por clima»</div>
        <p style={{ fontSize: 12.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
          Marca el clima de esta planta (uno o los dos). Aparecerá un punto «+» sobre la foto del clima elegido; con el deslizable de altura lo subes o lo bajas.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {looks.map((l) => (
          <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: editable ? 'pointer' : 'not-allowed', padding: '8px 14px', border: `1px solid ${sel[l.id] ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 999 }}>
            <input
              type="checkbox"
              disabled={!editable}
              checked={Boolean(sel[l.id])}
              onChange={(e) => cambiar({ ...sel, [l.id]: e.target.checked ? sel[l.id] ?? { x: 50, y: 50 } : null })}
            />
            {l.tab}
          </label>
        ))}
        {looks.length > 1 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!editable}
            onClick={() => cambiar(Object.fromEntries(looks.map((l) => [l.id, sel[l.id] ?? { x: 50, y: 50 }])))}
          >
            Los dos climas
          </button>
        )}
      </div>

      {looks.filter((l) => sel[l.id]).map((l) => {
        const p = sel[l.id]!;
        const altura = entre(100 - p.y); // arriba = más alto
        return (
          <div key={l.id} style={{ display: 'grid', gap: 10, padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
            <div className="checkout-label">{l.tab}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 14, alignItems: 'stretch' }}>
              {/* Deslizable de ALTURA (vertical): arriba = el punto sube en la foto */}
              <div style={{ display: 'grid', justifyItems: 'center', gap: 6, gridTemplateRows: 'auto 1fr auto' }}>
                <span style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>Alto</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={altura}
                  disabled={!editable}
                  aria-label={`Altura del punto en ${l.tab}`}
                  onChange={(e) => cambiar({ ...sel, [l.id]: { ...p, y: 100 - Number(e.target.value) } })}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100%', minHeight: 170, width: 28, accentColor: 'var(--accent)' }}
                />
                <span className="mono" style={{ fontSize: 11.5 }}>{altura}%</span>
              </div>

              <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlImagen(l.src, 768)} alt={l.alt} style={{ display: 'block', width: '100%', height: 'auto' }} />
                  <span
                    aria-hidden="true"
                    title={nombre || 'Esta planta'}
                    style={{
                      position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: 36, height: 36, margin: '-18px 0 0 -18px', borderRadius: '50%',
                      border: '2px solid #fff', boxShadow: '0 0 0 4px rgba(47,191,116,.55), 0 2px 10px rgba(0,0,0,.5)',
                      background: imagen ? `center/cover url(${urlImagen(imagen, 96)})` : 'var(--accent)', transition: 'top .08s, left .08s',
                    }}
                  />
                </div>
                {/* Posición lateral */}
                <label style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 10, alignItems: 'center', fontSize: 11.5, color: 'var(--fg-mute)' }}>
                  Lado
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={entre(p.x)}
                    disabled={!editable}
                    aria-label={`Posición lateral del punto en ${l.tab}`}
                    onChange={(e) => cambiar({ ...sel, [l.id]: { ...p, x: Number(e.target.value) } })}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="mono">{entre(p.x)}%</span>
                </label>
              </div>
            </div>
          </div>
        );
      })}
      {!editable && <p className="adm-hint">Solo lectura: falta configurar Redis (REDIS_URL).</p>}
    </div>
  );
}
