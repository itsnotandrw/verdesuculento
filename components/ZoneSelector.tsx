'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { CATEGORIES } from '@/data/catalog';
import { useCategoryCounts } from '@/context/CategoryCountsContext';
import { MUNICIPIOS, PISO_INFO, ZONA_KEY, masCercano, pisoDe, type Municipio } from '@/data/zonas';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_MSNM = 3000;

/** Resalta en negrilla la parte del texto que coincide con la búsqueda. */
function Resaltado({ texto, q }: { texto: string; q: string }) {
  const n = norm(q.trim());
  const i = n ? norm(texto).indexOf(n) : -1;
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, i + n.length)}</mark>
      {texto.slice(i + n.length)}
    </>
  );
}

// "Zona de cultivo": el cliente elige su municipio (o usa su ubicación) y le decimos su piso térmico
// y qué categorías le funcionan. Se recuerda en el navegador. La ubicación se procesa SOLO en el
// navegador (no se envía a ningún servidor).
export default function ZoneSelector() {
  const counts = useCategoryCounts();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Municipio | null>(null);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState({ top: 72, right: 16 });
  const [geo, setGeo] = useState<{ estado: 'idle' | 'buscando' | 'error'; msg?: string }>({ estado: 'idle' });
  const [nota, setNota] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ZONA_KEY);
      if (saved) setSel(MUNICIPIOS.find((m) => m.name === saved) ?? null);
    } catch { /* sin storage */ }
  }, []);

  // El panel es fixed y se ancla al botón: nunca se sale de la pantalla (laptop, tablet o celular).
  const medir = useCallback(() => {
    const r = chip.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: Math.round(r.bottom + 10), right: Math.max(12, Math.round(window.innerWidth - r.right)) });
  }, []);

  useEffect(() => {
    if (!open) return;
    medir();
    const onDown = (e: PointerEvent) => { const t = e.target as Node;
      if (!wrap.current?.contains(t) && !pop.current?.contains(t)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); chip.current?.focus(); } };
    window.addEventListener('resize', medir);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    const movil = window.matchMedia('(max-width: 720px)').matches;
    if (movil) document.body.classList.add('scroll-locked');
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', medir);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('scroll-locked');
    };
  }, [open, medir]);

  const results = useMemo(() => {
    const n = norm(q.trim());
    const list = n ? MUNICIPIOS.filter((m) => norm(m.name).includes(n) || norm(m.dept).includes(n)) : MUNICIPIOS;
    return list.slice(0, 8);
  }, [q]);

  useEffect(() => setActivo(0), [q]);

  const guardar = (m: Municipio | null) => {
    try {
      if (m) localStorage.setItem(ZONA_KEY, m.name);
      else localStorage.removeItem(ZONA_KEY);
    } catch { /* sin storage */ }
  };
  const choose = (m: Municipio) => {
    setSel(m);
    setQ('');
    setNota(null);
    setGeo({ estado: 'idle' });
    guardar(m);
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clear = () => {
    setSel(null);
    setNota(null);
    guardar(null);
    setTimeout(() => input.current?.focus({ preventScroll: true }), 30);
  };

  const usarUbicacion = () => {
    if (!('geolocation' in navigator)) return setGeo({ estado: 'error', msg: 'Tu navegador no permite ubicación.' });
    setGeo({ estado: 'buscando' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { municipio, km } = masCercano(p.coords.latitude, p.coords.longitude);
        choose(municipio);
        setNota(km > 60 ? `Es el municipio de la lista más cercano (a unos ${Math.round(km)} km).` : 'Detectado con tu ubicación.');
      },
      (e) =>
        setGeo({
          estado: 'error',
          msg: e.code === 1 ? 'No diste permiso de ubicación. Puedes buscar tu municipio abajo.' : 'No pudimos obtener tu ubicación. Busca tu municipio abajo.',
        }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  const onKeyInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[activo]) { e.preventDefault(); choose(results[activo]); }
  };

  const piso = sel ? pisoDe(sel.msnm) : null;
  const info = piso ? PISO_INFO[piso] : null;

  return (
    <div className="zone" ref={wrap}>
      <button ref={chip} type="button" className="zone-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog" aria-label="Zona de cultivo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <span className="zone-chip-text">
          <small>Zona de cultivo</small>
          <b>{sel ? `${sel.name} · ${info!.label.replace('Clima ', '')}` : 'Elige tu municipio'}</b>
        </span>
      </button>

      {/* Portal al body: la barra de navegación usa backdrop-filter y eso volvería "fixed" relativo a ella (rompía la hoja en celular) */}
      {open && montado && createPortal(
        <>
          <div className="zone-backdrop" aria-hidden="true" />
          <div ref={pop} className="zone-pop" role="dialog" aria-label="Zona de cultivo" style={{ ['--zt' as string]: `${pos.top}px`, ['--zr' as string]: `${pos.right}px` }}>
            <div className="zone-grip" aria-hidden="true" />
            <div className="zone-head">
              <div>
                <div className="zone-title">¿Dónde vas a sembrar?</div>
                <p className="zone-sub">En Colombia el clima de cultivo depende de la altitud. Dinos tu municipio y te mostramos qué plantas se dan mejor.</p>
              </div>
              <button type="button" className="zone-x" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <div className="zone-scroll" ref={scroller}>
              {sel && info && (
                <div className="zone-result">
                  <div className="zone-result-top">
                    <div className="zone-badge" data-piso={piso}>{info.label}</div>
                    <div className="zone-meta"><b>{sel.name}</b> · {sel.msnm.toLocaleString('es-CO')} msnm aprox.</div>
                  </div>
                  <div className="zone-scale" aria-hidden="true">
                    <div className="zone-scale-bar" />
                    <div className="zone-scale-dot" style={{ left: `${Math.min(100, (sel.msnm / MAX_MSNM) * 100)}%` }} />
                    <div className="zone-scale-lbl"><span>Cálido</span><span>Templado</span><span>Frío</span></div>
                  </div>
                  <p className="zone-blurb">{info.blurb} <span>({info.rango})</span></p>
                  {nota && <p className="zone-nota">{nota}</p>}
                  <div className="zone-cats">
                    {info.categorias.map((id) => {
                      const c = CATEGORIES.find((x) => x.id === id);
                      if (!c) return null;
                      const n = counts[id] ?? c.count;
                      return (
                        <Link key={id} href={`/catalogo/${id}`} onClick={() => setOpen(false)}>
                          <span>{c.name}</span>
                          <em>{n}</em>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="zone-actions">
                    <Link href={`/catalogo/${info.categorias[0]}`} className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                      Ver plantas para mi zona <span className="btn-arrow">→</span>
                    </Link>
                    <button type="button" className="zone-clear" onClick={clear}>Cambiar zona</button>
                  </div>
                </div>
              )}
              <button type="button" className="zone-geo" onClick={usarUbicacion} disabled={geo.estado === 'buscando'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" />
                </svg>
                {geo.estado === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
              </button>
              {geo.estado === 'error' && <p className="zone-err" role="status">{geo.msg}</p>}

              <div className="zone-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  ref={input}
                  className="zone-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyInput}
                  placeholder={sel ? 'Cambiar de municipio…' : 'Busca tu municipio o departamento'}
                  aria-label="Buscar municipio"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="zone-lista"
                  aria-activedescendant={results[activo] ? `zone-op-${activo}` : undefined}
                />
                {q && <button type="button" className="zone-clearq" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Borrar búsqueda">×</button>}
              </div>

              {(!sel || q) && (
              <ul className="zone-list" id="zone-lista" role="listbox">
                {results.map((m, i) => (
                  <li key={m.name} role="presentation">
                    <button
                      type="button"
                      id={`zone-op-${i}`}
                      role="option"
                      aria-selected={sel?.name === m.name}
                      className={`${sel?.name === m.name ? 'on' : ''}${i === activo ? ' hi' : ''}`}
                      onMouseEnter={() => setActivo(i)}
                      onClick={() => choose(m)}
                    >
                      <span><Resaltado texto={m.name} q={q} /></span>
                      <small>{m.dept} · {m.msnm.toLocaleString('es-CO')} msnm</small>
                    </button>
                  </li>
                ))}
                {results.length === 0 && <li className="zone-empty">No encontramos ese municipio. Escríbenos por WhatsApp y te ayudamos.</li>}
              </ul>
              )}

            </div>
          </div>
        </>,
        document.body,
      )}

      <style>{`
        .zone{position:relative}
        .zone-chip{display:flex;align-items:center;gap:8px;padding:6px 14px 6px 10px;border-radius:999px;cursor:pointer;color:var(--fg);
          background:var(--bg-elev);border:1px solid var(--border-strong);font-family:var(--font-ui);transition:border-color .2s ease,background .2s ease}
        .zone-chip:hover{border-color:var(--accent)}
        .zone-chip svg{color:var(--accent);flex:none}
        .zone-chip-text{display:grid;text-align:left;line-height:1.15}
        .zone-chip-text small{font-size:10px;color:var(--fg-dim)}
        .zone-chip-text b{font-size:12.5px;font-weight:500;white-space:nowrap}

        .zone-backdrop{display:none}
        /* Panel fijo anclado al botón: ancho y alto se ajustan a la pantalla, el contenido hace scroll por dentro */
        .zone-pop{position:fixed;top:var(--zt);right:var(--zr);width:min(400px,calc(100vw - 24px));max-height:calc(100dvh - var(--zt) - 12px);
          z-index:300;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;
          background:var(--bg-elev);color:var(--fg);border:1px solid var(--border-strong);box-shadow:0 28px 80px rgba(0,0,0,.5);font-family:var(--font-ui);
          animation:zonein .28s var(--ease-out) both;transform-origin:top right}
        @keyframes zonein{from{opacity:0;scale:.94;translate:0 -8px}to{opacity:1;scale:1;translate:0 0}}
        .zone-grip{display:none}
        .zone-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 18px 10px;flex:none}
        .zone-title{font-family:var(--font-display);font-size:26px;line-height:1;margin-bottom:6px}
        .zone-sub{font-size:12.5px;line-height:1.45;color:var(--fg-dim);margin:0}
        .zone-x{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--border-strong);background:none;color:var(--fg);font-size:18px;line-height:1;cursor:pointer;transition:border-color .2s ease,rotate .3s var(--ease-out)}
        .zone-x:hover{border-color:var(--accent);rotate:90deg}
        .zone-scroll{overflow-y:auto;overscroll-behavior:contain;padding:4px 18px 18px;display:grid;gap:10px;align-content:start;min-height:0}

        .zone-geo{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px 12px;border-radius:12px;cursor:pointer;font:inherit;font-size:13.5px;font-weight:500;
          color:var(--accent);background:color-mix(in oklab, var(--accent) 10%, transparent);border:1px solid color-mix(in oklab, var(--accent) 35%, transparent);transition:background .2s ease}
        .zone-geo:hover:not(:disabled){background:color-mix(in oklab, var(--accent) 18%, transparent)}
        .zone-geo:disabled{opacity:.7;cursor:progress}
        .zone-err{margin:0;font-size:12px;color:#d9731f}
        .zone-search{position:relative;display:flex;align-items:center}
        .zone-search svg{position:absolute;left:12px;color:var(--fg-dim);pointer-events:none}
        .zone-input{width:100%;padding:11px 36px 11px 36px;border-radius:12px;border:1px solid var(--border-strong);background:var(--bg);color:var(--fg);font:inherit;font-size:14px}
        .zone-input:focus{outline:2px solid var(--accent);outline-offset:1px}
        .zone-clearq{position:absolute;right:8px;width:24px;height:24px;border-radius:50%;border:0;background:var(--bg-elev-2);color:var(--fg-dim);cursor:pointer;line-height:1}
        .zone-list{list-style:none;margin:0;padding:0;display:grid;gap:2px}
        .zone-list button{width:100%;display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 10px;border-radius:10px;border:0;background:none;color:inherit;font:inherit;font-size:13.5px;cursor:pointer;text-align:left}
        .zone-list button.hi{background:var(--bg-elev-2)}
        .zone-list button.on{box-shadow:inset 3px 0 0 var(--accent)}
        .zone-list mark{background:none;color:var(--accent);font-weight:700}
        .zone-list small{font-size:11px;color:var(--fg-dim);text-align:right}
        .zone-empty{font-size:12.5px;color:var(--fg-dim);padding:8px 10px}

        .zone-result{padding:14px;border-radius:14px;background:var(--bg);border:1px solid var(--border);animation:zonein .3s var(--ease-out) both}
        .zone-result-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}
        .zone-badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;color:#fff;background:var(--accent)}
        .zone-badge[data-piso=calido]{background:#d9731f}
        .zone-badge[data-piso=frio]{background:#2f7fb8}
        .zone-meta{font-size:12px;color:var(--fg-dim)}
        .zone-meta b{color:var(--fg);font-weight:600}
        .zone-scale{position:relative;margin:16px 4px 4px}
        .zone-scale-bar{height:6px;border-radius:99px;background:linear-gradient(90deg,#d9731f 0%,#d9731f 33%,var(--accent) 33%,var(--accent) 67%,#2f7fb8 67%,#2f7fb8 100%);opacity:.9}
        .zone-scale-dot{position:absolute;top:-5px;width:16px;height:16px;border-radius:50%;background:var(--fg);border:3px solid var(--bg);box-shadow:0 2px 8px rgba(0,0,0,.4);translate:-50% 0;transition:left .5s var(--ease-out)}
        .zone-scale-lbl{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--fg-mute);letter-spacing:.06em;text-transform:uppercase}
        .zone-blurb{font-size:13px;line-height:1.45;margin:10px 0}
        .zone-blurb span{color:var(--fg-dim);font-size:12px}
        .zone-nota{font-size:12px;color:var(--fg-dim);margin:0 0 10px}
        .zone-cats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
        .zone-cats a{display:inline-flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:999px;font-size:12.5px;text-decoration:none;color:var(--fg);border:1px solid var(--border-strong);transition:border-color .2s ease,color .2s ease}
        .zone-cats a em{font-style:normal;font-size:11px;padding:1px 7px;border-radius:99px;background:var(--bg-elev-2);color:var(--fg-dim)}
        .zone-cats a:hover{border-color:var(--accent);color:var(--accent)}
        .zone-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .zone-clear{background:none;border:0;padding:0;font-size:12px;color:var(--fg-dim);text-decoration:underline;cursor:pointer}

        @media (max-width:1100px){.zone-chip-text small{display:none}.zone-chip-text b{max-width:130px;overflow:hidden;text-overflow:ellipsis}}
        /* Celular: hoja inferior con fondo atenuado */
        @media (max-width:720px){
          .zone-chip{padding:7px 10px}.zone-chip-text{display:none}
          .zone-backdrop{display:block;position:fixed;inset:0;z-index:299;background:rgba(0,0,0,.55);animation:zonefade .25s ease both}
          .zone-pop{top:auto;right:0;left:0;bottom:0;width:auto;max-height:86dvh;border-radius:22px 22px 0 0;transform-origin:bottom center;animation:zonesheet .32s var(--ease-out) both}
          .zone-grip{display:block;width:44px;height:4px;border-radius:99px;background:var(--border-strong);margin:10px auto 0;flex:none}
          .zone-scroll{padding-bottom:calc(18px + env(safe-area-inset-bottom))}
        }
        @keyframes zonefade{from{opacity:0}to{opacity:1}}
        @keyframes zonesheet{from{translate:0 100%}to{translate:0 0}}
        @media (prefers-reduced-motion:reduce){.zone-pop,.zone-result,.zone-backdrop{animation:none}.zone-scale-dot{transition:none}}
      `}</style>
    </div>
  );
}
