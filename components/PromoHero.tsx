'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { slugify, type Promotion, type PromoCoupon } from '@/lib/promotions';
import { formatCOP } from '@/data/catalog';

const AUTOPLAY_MS = 6000;
const EASE = [0.16, 1, 0.3, 1] as const;

// Composición: una cinta grande en bucle con TODAS las promociones (solo texto
// corriendo) y, debajo, la imagen a todo lo ancho, sin bordes ni franjas.
// Al entrar (o volver) a inicio el componente se monta de nuevo y repite la entrada.
export default function PromoHero({ promotions, coupons = [] }: { promotions: Promotion[]; coupons?: PromoCoupon[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = promotions.length;

  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => go(i + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [i, n, paused, go]);

  return (
    <section className="promo-hero" aria-roledescription="carrusel" aria-label="Promociones">
      {coupons.length > 0 && (
        <motion.div
          className="promo-band"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
        >
          <h2 className="promo-band-title">¡Aprovecha estos <strong>descuentos imperdibles!</strong></h2>
          <div className="promo-band-cards">
            {coupons.map((c) => (
              <Link href={`/ofertas/${c.slug || slugify(c.code)}`} className="promo-coupon-card" key={c.id}>
                <div className="pcc-info">
                  <span className="pcc-scope">{c.scope}</span>
                  <span className="pcc-pct">{c.pct}% OFF</span>
                  <span className="pcc-min">Compra mínima {formatCOP(c.minPurchase)}</span>
                </div>
                <span className="pcc-btn"><span>Ver ofertas →</span></span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        className="promo-stage"
        initial={{ clipPath: 'inset(0% 50% 0% 50%)', opacity: 0 }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
        transition={{ duration: 1.3, ease: EASE, delay: 0.35 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={(e) => {
          const s = touchX.current;
          touchX.current = null;
          setPaused(false);
          if (s == null) return;
          const dx = e.changedTouches[0].clientX - s;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        {promotions.map((p, idx) => (
          <div key={p.id} className={`promo-slide${idx === i ? ' on' : ''}`} aria-hidden={idx !== i}>
            <Link href={p.href} className="promo-link" tabIndex={idx === i ? 0 : -1}>
            <motion.div
              className="promo-zoom"
              initial={{ scale: 1.18 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2, ease: EASE, delay: 0.35 }}
            >
              <Image src={p.image} alt={p.alt} fill priority={idx === 0} quality={92} sizes="100vw" style={{ objectFit: 'cover' }} />
            </motion.div>
            </Link>
          </div>
        ))}
        <span className="promo-shine" aria-hidden="true" />
        {n > 1 && (
          <>
            <button type="button" className="promo-arrow prev" aria-label="Promoción anterior" onClick={() => go(i - 1)}>‹</button>
            <button type="button" className="promo-arrow next" aria-label="Promoción siguiente" onClick={() => go(i + 1)}>›</button>
            <div className="promo-dots">
              {promotions.map((p, idx) => (
                <button key={p.id} type="button" aria-label={`Ir a la promoción ${idx + 1}`} aria-current={idx === i} className={idx === i ? 'on' : ''} onClick={() => go(idx)} />
              ))}
            </div>
          </>
        )}
      </motion.div>

      <style>{`
        .promo-hero{--nav:75px;--band:104px;--ar:3.0303;position:relative;padding-top:var(--nav);background:var(--bg)}
        .promo-stage{position:relative;width:100%;height:calc(100vw / var(--ar));min-height:0;overflow:hidden;background:#0b110d}
        .promo-shine{position:absolute;inset:0;z-index:3;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);translate:-120% 0;animation:promoshine 1.5s .9s var(--ease-out) 1 both}
        @keyframes promoshine{to{translate:120% 0}}
        .promo-band{position:relative;z-index:4;display:flex;align-items:center;gap:clamp(16px,3vw,48px);padding:14px 0 14px clamp(16px,2.1vw,32px);min-height:var(--band);
          background:linear-gradient(105deg,color-mix(in oklab,var(--accent) 42%,#04110a),var(--accent) 70%,color-mix(in oklab,var(--accent) 80%,#fff));color:#fff;border-bottom:1px solid rgba(255,255,255,.18)}
        .promo-band-title{font-family:var(--font-display);font-weight:400;font-size:clamp(22px,2.6vw,38px);line-height:1.05;text-transform:uppercase;letter-spacing:.01em;flex:none;max-width:420px}
        @media (max-width:1500px){
          .promo-band{gap:20px;padding-left:clamp(16px,2.1vw,32px);padding-right:0}
          .promo-band-title{font-size:clamp(20px,2.1vw,30px);max-width:300px}
          .promo-band-cards{gap:10px}
          .pcc-info{padding:8px 12px}
          .pcc-pct{font-size:24px}
          .pcc-scope{font-size:11px}
          .pcc-btn{min-width:78px;padding:0 12px;font-size:13px}
        }
        .promo-band-title strong{font-weight:400;font-style:italic;display:block}
        .promo-band-cards{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;padding:2px 0}
        .promo-band-cards .promo-coupon-card:first-child{margin-left:auto}
        .promo-band-cards .promo-coupon-card:last-child{margin-right:auto}
        .promo-band-cards::-webkit-scrollbar{display:none}
        .promo-coupon-card{flex:none;display:flex;align-items:stretch;border-radius:10px;overflow:hidden;background:var(--bg-elev);color:var(--fg);border:1px solid var(--border-strong);box-shadow:0 6px 20px rgba(0,0,0,.25);transition:translate .25s var(--ease-out)}
        .promo-coupon-card:hover{translate:0 -3px}
        .pcc-info{display:grid;gap:2px;padding:9px 16px;font-family:var(--font-ui)}
        .pcc-scope{font-size:12px;color:var(--fg-dim)}
        .pcc-pct{font-family:var(--font-display);font-size:28px;line-height:1;color:var(--accent)}
        .pcc-min{font-size:11px;color:var(--fg-mute)}
        .pcc-btn{border:0;cursor:pointer;display:grid;place-content:center;gap:2px;padding:0 18px;min-width:96px;white-space:nowrap;background:var(--accent);color:var(--accent-fg);font-family:var(--font-ui);font-weight:600;font-size:14px;transition:background .2s ease}
        .pcc-btn small{font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;font-weight:500;opacity:.85}
        .promo-coupon-card:hover .pcc-btn{background:color-mix(in oklab,var(--accent) 55%,#000);color:#fff}
                .promo-slide{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .8s ease}
        .promo-slide.on{opacity:1;pointer-events:auto}
        .promo-bg{position:absolute;inset:-8%;filter:blur(34px) saturate(1.25) brightness(.85)}
        .promo-link{position:absolute;inset:0;display:block}
        .promo-zoom{position:absolute;inset:0}
        .promo-arrow{position:absolute;top:50%;translate:0 -50%;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.35);cursor:pointer;z-index:4;
          background:rgba(13,19,15,.45);color:#fff;font-size:28px;line-height:1;display:grid;place-items:center;
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease,scale .25s var(--ease-out),background .25s ease}
        .promo-stage:hover .promo-arrow,.promo-arrow:focus-visible{opacity:1}
        .promo-arrow:hover{scale:1.1;background:rgba(13,19,15,.7)}
        .promo-arrow.prev{left:clamp(12px,2vw,28px)}.promo-arrow.next{right:clamp(12px,2vw,28px)}
        .promo-dots{position:absolute;left:0;right:0;bottom:16px;display:flex;justify-content:center;gap:8px;z-index:4}
        .promo-dots button{width:8px;height:8px;border-radius:99px;border:0;padding:0;cursor:pointer;background:rgba(255,255,255,.55);transition:width .3s var(--ease-out),background .3s ease}
        .promo-dots button.on{width:28px;background:#fff}
        @media (max-width:760px){
          .promo-hero{--nav:67px;--band:0px}
          
          .promo-stage{height:calc(100vw / var(--ar));min-height:0}
          .promo-arrow{display:none}
          .promo-dots{bottom:8px}
          .promo-band{flex-direction:column;align-items:flex-start;gap:10px;padding:12px 14px}
          .promo-band-cards{width:100%;justify-content:flex-start}
        }
        @media (prefers-reduced-motion:reduce){.promo-slide{transition:none}.promo-shine{display:none}}
      `}</style>
    </section>
  );
}
