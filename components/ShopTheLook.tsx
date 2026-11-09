'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/data/catalog';
import GooeyNav from '@/components/GooeyNav';
import type { Look, LookSpot } from '@/lib/promotions';
import type { Product } from '@/types';

// Imágenes interactivas tipo "genially": foto con puntos "+" que abren la tarjeta de un producto.
// Se editan en el admin (Imágenes interactivas): se pueden arrastrar los puntos y elegir el producto de cada uno.

interface Resolved {
  id: string;
  x: number;
  y: number;
  name: string;
  price: number;
  image: string;
  href: string;
  external: boolean;
}

function resolve(spots: LookSpot[], products: Product[]): Resolved[] {
  const out: Resolved[] = [];
  for (const s of spots) {
    const p = products.find((q) => q.id === s.productId);
    if (p) out.push({ id: s.id, x: s.x, y: s.y, name: p.name, price: p.price, image: p.images[0], href: `/producto/${p.id}`, external: false });
    else if (s.fallback) out.push({ id: s.id, x: s.x, y: s.y, ...s.fallback, external: true });
  }
  return out;
}

function HotspotBanner({ banner, products }: { banner: Look; products: Product[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const spots = resolve(banner.spots, products);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.25 },
    );
    io.observe(el);
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest('.stl-card, .stl-dot, .stl-sheet')) setActive(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!spots.length) return null;
  const current = spots.find((x) => x.id === active) ?? null;

  return (
    <div className="stl-banner">
      <h3 className="stl-title">{banner.title}</h3>
      <div className="stl-scroll">
      <div ref={wrap} className={`stl${seen ? ' seen' : ''}${active ? ' has-open' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.src} alt={`${banner.alt}: toca los puntos para ver los productos`} loading="lazy" className="stl-img" />
        {spots.map((s, i) => {
          const open = active === s.id;
          const flipX = s.x > 55;
          const flipY = s.y > 55;
          const cardPos = { [flipX ? 'right' : 'left']: 20, [flipY ? 'bottom' : 'top']: 20 };
          const origin = `${flipY ? 'bottom' : 'top'} ${flipX ? 'right' : 'left'}`;
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.name} width={72} height={72} />
              <span className="stl-info">
                <span className="stl-name">{s.name}</span>
                <span className="stl-price">{formatCOP(s.price)}</span>
                <span className="stl-cta">Ver producto →</span>
              </span>
            </>
          );
          return (
            <div
              key={s.id}
              className={`stl-spot${open ? ' open' : ''}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, ['--i' as string]: i }}
            >
              <button
                type="button"
                className="stl-dot"
                aria-label={`${open ? 'Cerrar' : 'Ver'} ${s.name}`}
                aria-expanded={open}
                onClick={(e) => {
                  setActive(open ? null : s.id);
                  if (!open) e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
              >
                <span className="stl-ring" aria-hidden="true" />
                <span className="stl-ico" aria-hidden="true"><i /><i /></span>
              </button>
              {open && (
                s.external ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="stl-card" style={{ ...cardPos, transformOrigin: origin }}>{body}</a>
                ) : (
                  <Link href={s.href} className="stl-card" style={{ ...cardPos, transformOrigin: origin }}>{body}</Link>
                )
              )}
            </div>
          );
        })}
      </div>
      </div>
      {current && (
        current.external ? (
          <a key={current.id} href={current.href} target="_blank" rel="noopener noreferrer" className="stl-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image} alt={current.name} width={64} height={64} />
            <span className="stl-info"><span className="stl-name">{current.name}</span><span className="stl-price">{formatCOP(current.price)}</span><span className="stl-cta">Ver producto →</span></span>
          </a>
        ) : (
          <Link key={current.id} href={current.href} className="stl-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image} alt={current.name} width={64} height={64} />
            <span className="stl-info"><span className="stl-name">{current.name}</span><span className="stl-price">{formatCOP(current.price)}</span><span className="stl-cta">Ver producto →</span></span>
          </Link>
        )
      )}
      <p className="stl-hint" aria-hidden="true">Desliza la imagen y toca los puntos →</p>
    </div>
  );
}

export default function ShopTheLook({ products, looks }: { products: Product[]; looks: Look[] }) {
  const [tab, setTab] = useState(0);
  if (looks.length === 0) return null;
  const actual = looks[Math.min(tab, looks.length - 1)];
  return (
    <section style={{ padding: 'clamp(16px, 2vw, 28px) 0' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>EXPLORA LA IMAGEN</div>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5.5vw, 72px)', marginBottom: 20, letterSpacing: '-0.02em' }}>
          Elige tu frutal <em style={{ color: 'var(--accent)' }}>por clima.</em>
        </h2>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          {looks.length > 1 ? <GooeyNav key={looks.map((l) => l.id).join('|')} items={looks.map((l) => ({ label: l.tab }))} onChange={setTab} /> : null}
        </div>
        <HotspotBanner key={actual.id} banner={actual} products={products} />
      </div>
      <style>{`
        .stl-banner{animation:stlbanner .55s var(--ease-out) both}
        @keyframes stlbanner{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .stl-title{font-family:var(--font-display);font-weight:400;font-size:clamp(24px,3vw,38px);letter-spacing:-0.015em;line-height:1.05;margin:0 0 14px;text-align:center}
        .stl-scroll{border-radius:var(--radius-lg)}
        .stl-sheet{display:none}
        .stl-hint{display:none;margin:10px 0 0;font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-dim)}
        .stl{position:relative;border-radius:var(--radius-lg)}
        @media (max-width:760px){
          .stl-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain}
          .stl-scroll::-webkit-scrollbar{display:none}
          .stl{width:820px}
          .stl-hint{display:block}
          .stl .stl-card{display:none}
          .stl-sheet{display:flex;gap:12px;align-items:center;margin-top:12px;padding:12px;background:var(--bg-elev);color:var(--fg);
            border:1px solid var(--border-strong);border-radius:14px;text-decoration:none;font-family:var(--font-ui);animation:stlsheet .3s var(--ease-out) both}
          .stl-sheet img{width:64px;height:64px;object-fit:cover;border-radius:10px;flex:none;background:var(--bg-elev-2)}
          .stl-sheet .stl-info{display:grid;gap:4px;min-width:0}
          .stl-sheet .stl-name{font-size:14px;font-weight:500;line-height:1.25}
          .stl-sheet .stl-price{font-family:var(--font-display);font-size:24px;line-height:1;color:var(--accent)}
          .stl-sheet .stl-cta{font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-dim)}
        }
        .stl-img{display:block;width:100%;height:auto;aspect-ratio:1792/592;border-radius:inherit;
          opacity:0;transform:scale(1.03);transition:opacity .8s ease,transform 1.2s var(--ease-out)}
        .stl.seen .stl-img{opacity:1;transform:none}
        /* Cada punto es una caja de 0x0 en la coordenada; el botón se centra con margen negativo
           (sin transform) para que escalar/hover nunca pelee con la posición. */
        .stl-spot{position:absolute;width:0;height:0;z-index:2}
        .stl-spot.open{z-index:10}
        .stl-dot{position:absolute;left:-16px;top:-16px;width:32px;height:32px;padding:0;border-radius:50%;
          border:2px solid #fff;background:rgba(13,19,15,.6);color:#fff;cursor:pointer;display:grid;place-items:center;
          backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
          opacity:0;scale:.2;transition:opacity .4s ease,scale .5s var(--ease-out),background .25s ease,box-shadow .25s ease;
          transition-delay:calc(.45s + var(--i)*.12s),calc(.45s + var(--i)*.12s),0s,0s}
        .stl.seen .stl-dot{opacity:1;scale:1}
        .stl.seen .stl-dot:hover{scale:1.14;transition-delay:0s}
        .stl.has-open .stl-spot:not(.open) .stl-dot{opacity:.5;transition-delay:0s}
        .stl-dot:focus-visible{outline:3px solid #fff;outline-offset:3px}
        .stl-ring{position:absolute;inset:-2px;border-radius:50%;border:2px solid rgba(255,255,255,.85);pointer-events:none;animation:stlring 2.4s ease-out infinite}
        .stl-spot:nth-of-type(2n) .stl-ring{animation-delay:.8s}
        .stl-spot.open .stl-ring{animation:none;opacity:0}
        .stl-ico{position:absolute;inset:0;transition:rotate .35s var(--ease-out)}
        .stl-ico i{position:absolute;left:50%;top:50%;width:12px;height:2px;margin:-1px 0 0 -6px;border-radius:2px;background:#fff}
        .stl-ico i:last-child{rotate:90deg}
        .stl-spot.open .stl-dot{background:var(--accent);border-color:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.25)}
        .stl-spot.open .stl-ico{rotate:45deg}
        @keyframes stlring{0%{transform:scale(1);opacity:.9}100%{transform:scale(2.1);opacity:0}}
        /* Tarjeta: solo opacidad + escala (propiedad scale), con origen en el punto. */
        .stl-card{position:absolute;width:min(300px,68vw);display:flex;gap:14px;align-items:center;padding:12px;
          background:var(--bg-elev);color:var(--fg);border:1px solid var(--border-strong);border-radius:14px;
          box-shadow:0 18px 50px rgba(0,0,0,.45);text-decoration:none;font-family:var(--font-ui);
          animation:stlcard .32s var(--ease-out) both;will-change:opacity,scale}
        .stl-card img{width:76px;height:76px;object-fit:cover;border-radius:10px;flex:none;background:var(--bg-elev-2)}
        .stl-info{display:grid;gap:4px;min-width:0}
        .stl-name{font-size:14px;font-weight:500;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .stl-price{font-family:var(--font-display);font-size:24px;line-height:1;color:var(--accent)}
        .stl-cta{font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-dim);transition:color .2s ease,translate .25s ease}
        .stl-card:hover .stl-cta{color:var(--accent);translate:4px 0}
        @keyframes stlsheet{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}
        @keyframes stlcard{from{opacity:0;scale:.82}to{opacity:1;scale:1}}
        @media (prefers-reduced-motion:reduce){
          .stl-banner,.stl-card,.stl-ring{animation:none}
          .stl-img,.stl-dot{transition:none;opacity:1;scale:1;transform:none}
        }
      `}</style>
    </section>
  );
}
