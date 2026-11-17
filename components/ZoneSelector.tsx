'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { CATEGORIES, CATEGORY_PHOTOS } from '@/data/catalog';
import MapaEmbed from '@/components/MapaEmbed';
import { precalentarMapas, urlAbrirMapa } from '@/lib/mapas';
import { useCategoryCounts } from '@/context/CategoryCountsContext';
import { MUNICIPIOS, PISO_INFO, ZONA_KEY, cargarMunicipios, claveZona, masCercano, pisoDe, type Municipio } from '@/data/zonas';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_MSNM = 3000;
const PASOS = ['Tu municipio', 'Tu clima', 'Tus plantas'] as const;

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

/** Tarjeta bento con brillo que sigue al cursor (estilo Magic Bento). */
function Tile({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <div
      className={`bt ${cls}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
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
  const [todos, setTodos] = useState<Municipio[]>(MUNICIPIOS);
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState({ top: 72, right: 16 });
  const [geo, setGeo] = useState<{ estado: 'idle' | 'buscando' | 'error'; msg?: string }>({ estado: 'idle' });
  const [nota, setNota] = useState<string | null>(null);
  const [paso, setPaso] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [sat, setSat] = useState(false);
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
      if (saved) {
        const encontrar = (lista: Municipio[]) => lista.find((m) => claveZona(m) === saved) ?? lista.find((m) => m.name === saved) ?? null;
        const rapido = encontrar(MUNICIPIOS);
        if (rapido) setSel(rapido);
        else cargarMunicipios().then((lista) => { setTodos(lista); setSel(encontrar(lista)); });
      }
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
    cargarMunicipios().then(setTodos);
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
    if (!n) return MUNICIPIOS.slice(0, 8);
    return todos
      .filter((m) => norm(m.name).includes(n) || norm(m.dept).includes(n))
      .sort((a, b) => Number(norm(b.name).startsWith(n)) - Number(norm(a.name).startsWith(n)))
      .slice(0, 8);
  }, [q, todos]);

  useEffect(() => setActivo(0), [q]);

  const guardar = (m: Municipio | null) => {
    try {
      if (m) localStorage.setItem(ZONA_KEY, claveZona(m));
      else localStorage.removeItem(ZONA_KEY);
    } catch { /* sin storage */ }
  };
  const irA = (n: number) => { setDir(n >= paso ? 1 : -1); setPaso(Math.max(0, Math.min(PASOS.length - 1, n))); };
  const choose = (m: Municipio) => {
    setSel(m);
    setDir(1);
    setPaso(1);
    setQ('');
    setNota(null);
    setGeo({ estado: 'idle' });
    guardar(m);
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clear = () => {
    setSel(null);
    setDir(-1);
    setPaso(0);
    setNota(null);
    guardar(null);
    setTimeout(() => input.current?.focus({ preventScroll: true }), 30);
  };

  const usarUbicacion = () => {
    if (!('geolocation' in navigator)) return setGeo({ estado: 'error', msg: 'Tu navegador no permite ubicación.' });
    setGeo({ estado: 'buscando' });
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lista = await cargarMunicipios();
        setTodos(lista);
        const { municipio, km } = masCercano(p.coords.latitude, p.coords.longitude, lista);
        choose(municipio);
        setNota(km > 60 ? `Es el municipio más cercano (a unos ${Math.round(km)} km).` : 'Detectado con tu ubicación.');
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
      <button ref={chip} type="button" className="zone-chip" onClick={() => { if (!open) { setDir(1); setPaso(sel ? 1 : 0); } setOpen((o) => !o); }} onPointerEnter={precalentarMapas} aria-expanded={open} aria-haspopup="dialog" aria-label="Zona de cultivo">
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
          <div className="zone-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={pop} className="zone-pop" role="dialog" aria-label="Zona de cultivo">
            <div className="zone-grip" aria-hidden="true" />
            <div className="zone-head">
              <div>
                <div className="zone-title">¿Dónde vas a sembrar?</div>
                <p className="zone-sub">En Colombia el clima de cultivo depende de la altitud. Sigue los pasos y te mostramos qué plantas se dan mejor en tu zona.</p>
              </div>
              <button type="button" className="zone-x" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <ol className="zs" aria-label="Pasos">
              {PASOS.map((p, i) => (
                <li key={p} className={`zs-i${i === paso ? ' on' : ''}${i < paso ? ' done' : ''}`}>
                  <button type="button" className="zs-dot" disabled={i > 0 && !sel} onClick={() => irA(i)} aria-current={i === paso ? 'step' : undefined}>
                    {i < paso ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                    ) : i + 1}
                  </button>
                  <span className="zs-lbl">{p}</span>
                  {i < PASOS.length - 1 && <span className="zs-line"><i /></span>}
                </li>
              ))}
            </ol>

            <div className="zone-scroll" ref={scroller}>
              <div className="zp" key={paso} data-dir={dir}>
                {paso === 0 && (
                  <div className="zp-find">
                    <button type="button" className="zone-geo" onClick={usarUbicacion} disabled={geo.estado === 'buscando'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" />
                      </svg>
                      {geo.estado === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
                    </button>
                    {geo.estado === 'error' && <p className="zone-err" role="status">{geo.msg}</p>}
                    <div className="zone-o"><span>o busca tu municipio</span></div>
                    <div className="zone-search">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                      <input
                        ref={input}
                        className="zone-input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={onKeyInput}
                        placeholder="Busca tu municipio o departamento"
                        aria-label="Buscar municipio"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="zone-lista"
                        aria-activedescendant={results[activo] ? `zone-op-${activo}` : undefined}
                      />
                      {q && <button type="button" className="zone-clearq" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Borrar búsqueda">×</button>}
                    </div>
                    <ul className="zone-list" id="zone-lista" role="listbox">
                      {results.map((m, i) => (
                        <li key={claveZona(m)} role="presentation">
                          <button
                            type="button"
                            id={`zone-op-${i}`}
                            role="option"
                            aria-selected={sel ? claveZona(sel) === claveZona(m) : false}
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
                  </div>
                )}

                {paso === 1 && sel && info && (
                  <div className="bento bento-clima">
                    <Tile cls="b-clima">
                      <div className="b-k">Tu clima de cultivo</div>
                      <div className="zone-badge" data-piso={piso}>{info.label}</div>
                      <div className="zone-meta"><b>{sel.name}</b> · {sel.dept}</div>
                      <div className="zone-scale" aria-hidden="true">
                        <div className="zone-scale-bar" />
                        <div className="zone-scale-dot" style={{ left: `${Math.min(100, (sel.msnm / MAX_MSNM) * 100)}%` }} />
                        <div className="zone-scale-lbl"><span>Cálido</span><span>Templado</span><span>Frío</span></div>
                      </div>
                    </Tile>
                    <Tile cls="b-alt">
                      <div className="b-k">Altitud aprox.</div>
                      <div className="b-big">{sel.msnm.toLocaleString('es-CO')}<small> msnm</small></div>
                      <div className="b-sm">{info.rango}</div>
                    </Tile>
                    <Tile cls="b-que">
                      <div className="b-k">Qué se da aquí</div>
                      <p className="zone-blurb">{info.blurb}</p>
                      {nota && <p className="zone-nota">{nota}</p>}
                    </Tile>
                    <Tile cls="b-mapa">
                      <div className="b-mapa-box">
                        <MapaEmbed consulta={`${sel.lat},${sel.lng}`} zoom={sat ? 11 : 10} satelite={sat} titulo={`Mapa de ${sel.name}`} />
                        <div className="b-mapa-bar">
                          <span>{sel.name}</span>
                          <div>
                            <button type="button" onClick={() => setSat((v) => !v)}>{sat ? 'Mapa' : 'Satélite'}</button>
                            <a href={urlAbrirMapa(`${sel.lat},${sel.lng}`)} target="_blank" rel="noopener noreferrer">Abrir</a>
                          </div>
                        </div>
                      </div>
                    </Tile>
                  </div>
                )}

                {paso === 2 && sel && info && (
                  <div className={`bento bento-plantas n-${Math.min(info.categorias.length, 4)}`}>
                    {info.categorias.map((id, i) => {
                      const c = CATEGORIES.find((x) => x.id === id);
                      if (!c) return null;
                      const n = counts[id] ?? c.count;
                      return (
                        <Tile key={id} cls={`b-cat${i === 0 ? ' b-cat-main' : ''}`}>
                          <Link href={`/catalogo/${id}`} onClick={() => setOpen(false)} className="b-cat-link">
                            <span className="b-cat-foto" style={{ backgroundImage: CATEGORY_PHOTOS[id] ? `url(${CATEGORY_PHOTOS[id]})` : undefined }} />
                            <span className="b-cat-sombra" />
                            {i === 0 && <span className="b-cat-tag">Lo mejor para tu zona</span>}
                            <span className="b-cat-nombre">{c.name}</span>
                            <span className="b-cat-n">{n} productos →</span>
                          </Link>
                        </Tile>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="zone-foot">
              <button type="button" className="zone-back" onClick={() => irA(paso - 1)} disabled={paso === 0}>← Atrás</button>
              {paso === 0 && <span className="zone-foot-hint">{sel ? `Zona actual: ${sel.name}` : 'Elige un municipio para continuar'}</span>}
              {paso === 0 && sel && <button type="button" className="btn btn-primary btn-sm" onClick={() => irA(1)}>Siguiente <span className="btn-arrow">→</span></button>}
              {paso === 1 && <button type="button" className="btn btn-primary btn-sm" onClick={() => irA(2)}>Ver mis plantas <span className="btn-arrow">→</span></button>}
              {paso === 2 && info && (
                <>
                  <button type="button" className="zone-clear" onClick={clear}>Cambiar zona</button>
                  <Link href={`/catalogo/${info.categorias[0]}`} className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                    Ir al catálogo <span className="btn-arrow">→</span>
                  </Link>
                </>
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

        .zone-backdrop{display:block;position:fixed;inset:0;z-index:299;background:rgba(5,10,7,.62);backdrop-filter:blur(3px);animation:zonefade .25s ease both}
        /* Ventana centrada tipo asistente: ancha en PC para el tablero bento */
        .zone-pop{position:fixed;top:50%;left:50%;translate:-50% -50%;width:min(880px,calc(100vw - 32px));max-height:min(720px,calc(100dvh - 32px));
          z-index:300;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;
          background:var(--bg-elev);color:var(--fg);border:1px solid var(--border-strong);box-shadow:0 40px 120px rgba(0,0,0,.55);font-family:var(--font-ui);
          animation:zonepop .38s var(--ease-out) both}
        @keyframes zonepop{from{opacity:0;scale:.95;translate:-50% -46%}to{opacity:1;scale:1;translate:-50% -50%}}
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
          .zone-pop{top:auto;left:0;right:0;bottom:0;translate:0 0;width:auto;max-height:90dvh;border-radius:22px 22px 0 0;animation:zonesheet .32s var(--ease-out) both}
          .zone-grip{display:block;width:44px;height:4px;border-radius:99px;background:var(--border-strong);margin:10px auto 0;flex:none}
          .zone-scroll{padding-bottom:calc(14px + env(safe-area-inset-bottom))}
          .bento-clima{grid-template-columns:1fr !important;grid-template-areas:'clima' 'alt' 'que' 'mapa' !important}
          .b-mapa-box{min-height:220px}
          .b-cat-tag{top:10px;left:10px;font-size:8.5px;padding:3px 8px;letter-spacing:.06em;max-width:calc(100% - 20px);line-height:1.2}
          .b-cat-nombre{font-size:20px}
          .zone-chip{min-width:40px;min-height:40px;justify-content:center}
        }
        @keyframes zonefade{from{opacity:0}to{opacity:1}}
        @keyframes zonesheet{from{translate:0 100%}to{translate:0 0}}
        @media (prefers-reduced-motion:reduce){.zone-pop,.zone-result,.zone-backdrop,.zp{animation:none}.zone-scale-dot,.zs-line i{transition:none}}

        /* --- Stepper --- */
        .zs{list-style:none;margin:0;padding:6px 22px 14px;display:flex;align-items:center;flex:none}
        .zs-i{display:flex;align-items:center;gap:10px;flex:none}
        .zs-i:not(:last-child){flex:1}
        .zs-dot{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font:600 13px var(--font-ui);cursor:pointer;color:var(--fg-dim);background:var(--bg);border:1.5px solid var(--border-strong);transition:background .3s ease,color .3s ease,border-color .3s ease,scale .3s var(--ease-out)}
        .zs-dot:disabled{cursor:not-allowed;opacity:.55}
        .zs-i.on .zs-dot{border-color:var(--accent);color:var(--accent);scale:1.1;box-shadow:0 0 0 4px color-mix(in oklab,var(--accent) 20%,transparent)}
        .zs-i.done .zs-dot{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
        .zs-lbl{font-size:12.5px;font-weight:500;color:var(--fg-dim);white-space:nowrap}
        .zs-i.on .zs-lbl,.zs-i.done .zs-lbl{color:var(--fg)}
        .zs-line{flex:1;height:2px;margin:0 12px;border-radius:99px;background:var(--border-strong);overflow:hidden;min-width:18px}
        .zs-line i{display:block;height:100%;width:0;background:var(--accent);transition:width .5s var(--ease-out)}
        .zs-i.done .zs-line i{width:100%}

        .zone-scroll{padding:4px 22px 6px}
        .zp{animation:zpin .4s var(--ease-out) both}
        .zp[data-dir='-1']{animation-name:zpback}
        @keyframes zpin{from{opacity:0;translate:28px 0}to{opacity:1;translate:0 0}}
        @keyframes zpback{from{opacity:0;translate:-28px 0}to{opacity:1;translate:0 0}}
        .zp-find{display:grid;gap:10px;max-width:560px;margin:0 auto}
        .zone-o{display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-mute)}
        .zone-o::before,.zone-o::after{content:'';flex:1;height:1px;background:var(--border)}

        .zone-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;border-top:1px solid var(--border);flex:none;background:var(--bg-elev)}
        .zone-back{background:none;border:0;padding:6px 4px;font:inherit;font-size:13px;color:var(--fg-dim);cursor:pointer}
        .zone-back:hover:not(:disabled){color:var(--fg)}
        .zone-back:disabled{opacity:.35;cursor:default}
        .zone-foot-hint{flex:1;font-size:12.5px;color:var(--fg-dim);text-align:center}

        /* --- Bento (tarjetas con brillo que sigue al cursor) --- */
        .bento{display:grid;gap:12px}
        .bt{position:relative;overflow:hidden;isolation:isolate;border-radius:16px;padding:16px;background:var(--bg);border:1px solid var(--border);transition:transform .35s var(--ease-out),border-color .3s ease}
        .bt::before{content:'';position:absolute;inset:0;z-index:-1;opacity:0;transition:opacity .3s ease;pointer-events:none;
          background:radial-gradient(320px circle at var(--mx,50%) var(--my,50%),color-mix(in oklab,var(--accent) 20%,transparent),transparent 65%)}
        .bt::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;opacity:0;transition:opacity .3s ease;pointer-events:none;
          background:radial-gradient(200px circle at var(--mx,50%) var(--my,50%),var(--accent),transparent 70%);
          -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
        .bt:hover{transform:translateY(-2px)}
        .bt:hover::before,.bt:hover::after{opacity:1}
        .b-k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-mute);margin-bottom:10px}

        .bento-clima{grid-template-columns:1.15fr 1fr;grid-template-areas:'clima mapa' 'alt mapa' 'que mapa'}
        .b-clima{grid-area:clima}.b-alt{grid-area:alt}.b-que{grid-area:que}.b-mapa{grid-area:mapa;padding:0}
        .b-clima .zone-meta{margin-top:8px}
        .b-big{font-family:var(--font-display);font-size:44px;line-height:1;letter-spacing:-.02em}
        .b-big small{font-family:var(--font-ui);font-size:14px;color:var(--fg-dim);letter-spacing:0}
        .b-sm{font-size:12px;color:var(--fg-dim);margin-top:6px}
        .b-que .zone-blurb{margin:0}
        .b-mapa-box{position:relative;height:100%;min-height:300px}
        .b-mapa-bar{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px 6px 12px;border-radius:10px;
          background:color-mix(in oklab,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border:1px solid var(--border);font-size:12.5px;font-weight:600}
        .b-mapa-bar span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .b-mapa-bar div{display:flex;gap:6px;flex:none}
        .b-mapa-bar button,.b-mapa-bar a{border:1px solid var(--border-strong);background:transparent;color:var(--fg);border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:500;cursor:pointer;text-decoration:none}
        .b-mapa-bar button:hover,.b-mapa-bar a:hover{background:var(--fg);color:var(--bg)}

        .bento-plantas{grid-template-columns:repeat(3,1fr);grid-auto-rows:200px}
        .b-cat{padding:0;border:0}
        .bento-plantas.n-1{grid-template-columns:minmax(0,340px)}
        .bento-plantas.n-2{grid-template-columns:1fr 1fr}
        .b-cat-link{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:16px;color:#f4efe4;text-decoration:none;border-radius:inherit}
        .b-cat-foto{position:absolute;inset:0;z-index:-2;background-size:cover;background-position:center 40%;transition:transform .6s var(--ease-out)}
        .b-cat:hover .b-cat-foto{transform:scale(1.08)}
        .b-cat-sombra{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,14,10,.1) 25%,rgba(8,14,10,.82))}
        .b-cat-tag{position:absolute;top:14px;left:14px;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--accent);color:var(--accent-fg)}
        .b-cat-nombre{font-family:var(--font-display);font-size:24px;line-height:1.05}
        .b-cat-n{font-family:var(--font-mono);font-size:11px;opacity:.85}
        @media (max-width:720px){.bento-plantas{grid-template-columns:1fr 1fr;grid-auto-rows:130px}.zs-lbl{display:none}.zs-i.on .zs-lbl{display:inline}}
      `}</style>
    </div>
  );
}
