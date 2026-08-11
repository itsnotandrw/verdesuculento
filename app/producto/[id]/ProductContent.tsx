'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CATALOG, CATEGORIES, getProductById, getRelatedProducts, getCrossSellProducts, formatCOP } from '@/data/catalog';
import { SOCIAL_PROOF, SELLER_STATS } from '@/data/socialProof';
import { useCart } from '@/context/CartContext';
import ProductShape from '@/components/ProductShape';
import ImageCarousel from '@/components/ImageCarousel';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';
import ProductReviews from '@/components/ProductReviews';
import ProductFAQ from '@/components/ProductFAQ';
import SellerTrust from '@/components/SellerTrust';
import SellerReputation from '@/components/SellerReputation';
import SoldCount from '@/components/SoldCount';
import type { Product, ProductColor } from '@/types';

export default function ProductContent({ product }: { product: Product }) {
  const { add } = useCart();
  const [activeColor, setActiveColor] = useState<ProductColor>(product.colors[0]);
  const [activeSize, setActiveSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'reputacion' | 'opiniones' | 'preguntas'>('opiniones');
  const ctaRef = useRef<HTMLButtonElement>(null);

  const related = getRelatedProducts(product, 3);
  const crossSell = getCrossSellProducts(product);
  const category = CATEGORIES.find((c) => c.id === product.category);
  const specs = product.specs;
  const social = SOCIAL_PROOF[product.id];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (ctaRef.current) observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, []);

  // Igual patrón que QuickView: Escape cierra, y el fondo no scrollea
  // mientras el panel de historia está abierto.
  useEffect(() => {
    if (!storyOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStoryOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('scroll-locked');
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('scroll-locked');
    };
  }, [storyOpen]);

  const handleAdd = () => add(product, { color: activeColor, size: activeSize, qty });

  // Mismo patrón que en ProductCard: reinicia la animación a mano con un
  // reflow forzado, para que clicks repetidos siempre muestren el pulso.
  const pulse = (btn: HTMLElement) => {
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');
  };

  return (
    <div className="page-section" style={{ paddingTop: 100 }}>
      <div className="container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: 40, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/catalogo" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Catálogo</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          {category && (
            <>
              <Link href={`/catalogo/${product.category}`} style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                {category.name}
              </Link>
              <span style={{ color: 'var(--fg-mute)' }}>/</span>
            </>
          )}
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{product.name}</span>
        </nav>

        {/* Main PDP grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, marginBottom: 100 }} className="pdp-grid">
          {/* Image */}
          <div style={{
            position: 'sticky' as const, top: 100, height: 'fit-content',
            aspectRatio: '4/5',
            background: 'radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--accent) 15%, transparent), transparent 60%), var(--bg-elev)',
            borderRadius: 'var(--radius-lg)',
            display: 'grid', placeItems: 'center',
            overflow: 'hidden',
          }}>
            {product.images.length > 0 ? (
              <ImageCarousel images={product.images} alt={product.name} thumbnails priority />
            ) : (
              <ProductShape product={{ ...product, colors: [activeColor] }} />
            )}
            {product.badge && (
              <div className="product-badge" style={{ zIndex: 3 }}>{product.badge}</div>
            )}
            <div style={{ position: 'absolute', top: 20, right: 20, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-dim)', letterSpacing: '0.1em', zIndex: 3, background: 'color-mix(in oklab, var(--bg) 75%, transparent)', padding: '3px 8px', borderRadius: 999 }}>
              {product.id.toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{category?.name}</div>
            <h1 className="display" style={{ fontSize: 'clamp(44px, 5vw, 80px)', marginBottom: 8, letterSpacing: '-0.025em' }}>{product.name}</h1>
            {social && (social.rating != null || social.soldCount > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {social.rating != null && (
                  <a
                    href="#pdp-tabs"
                    onClick={() => setActiveTab('opiniones')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                  >
                    <StarRating rating={social.rating} size={15} />
                    <span className="mono" style={{ fontSize: 13, color: 'var(--fg-dim)' }}>
                      {social.rating.toFixed(1)} · {social.reviewCount} {social.reviewCount === 1 ? 'calificación' : 'calificaciones'}
                    </span>
                  </a>
                )}
                {social.rating != null && social.soldCount > 0 && (
                  <span style={{ color: 'var(--border-strong)' }} aria-hidden>·</span>
                )}
                <SoldCount count={social.soldCount} size={13} />
              </div>
            )}
            <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--fg-dim)', marginBottom: 20 }}>{product.tagline}</p>

            {/* Descripción acotada con scroll propio: el texto que trae el
                scraping de ML es largo y antes se comía casi toda la pantalla
                antes de llegar a la compra. Ahora es una caja chica, y lo que
                importa (precio, presentación, cantidad, comprar) va debajo,
                siempre visible sin bajar. */}
            <div className="desc-box">
              <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, fontSize: 15, whiteSpace: 'pre-line' }}>{product.description}</p>
            </div>

            {/* Buy box: todo lo necesario para decidir y comprar, agrupado
                en una sola caja con peso visual propio en vez de quedar
                disuelto en el resto de la página. */}
            <div className="buy-box">
              <div className="mono" style={{ fontSize: 30, marginBottom: 24, letterSpacing: '-0.02em' }}>{formatCOP(product.price)}</div>

              {/* Variety selector */}
              {product.colors.length > 1 && (
                <div style={{ marginBottom: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 12 }}>
                    Variedad:{' '}
                    <span style={{ color: 'var(--fg)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-ui)' }}>{activeColor.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {product.colors.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setActiveColor(c)}
                        className={`swatch ${activeColor.hex === c.hex ? 'active' : ''}`}
                        style={{ width: 36, height: 36, background: c.hex, padding: 3, backgroundClip: 'content-box' }}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Presentation / size selector */}
              <div style={{ marginBottom: 24 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Presentación</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.sizes.map((s) => (
                    <button key={s} onClick={() => setActiveSize(s)} className={`chip ${activeSize === s ? 'active' : ''}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: 28 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Cantidad</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-strong)', borderRadius: 999, padding: '6px 6px' }}>
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Reducir cantidad"
                    style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 18 }}
                  >−</button>
                  <span className="mono" style={{ minWidth: 32, textAlign: 'center', fontSize: 16 }}>{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Aumentar cantidad"
                    style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 18 }}
                  >+</button>
                </div>
              </div>

              {/* Main CTA */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button ref={ctaRef} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 200 }} onClick={(e) => { handleAdd(); pulse(e.currentTarget); }}>
                  Añadir al carrito — {formatCOP(product.price * qty)} <span className="btn-arrow">→</span>
                </button>
                <Link href="/checkout" className="btn btn-ghost" style={{ justifyContent: 'center' }}>Comprar ya</Link>
              </div>

              <SellerTrust seller={SELLER_STATS} onNavigate={() => setActiveTab('reputacion')} />
            </div>

            {/* Trust signals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36, padding: '24px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              {([
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22V12"/><path d="M12 12c0 0 4-3.5 8-3.5 0 3.5-4 3.5-8 3.5"/><path d="M12 12c0 0-4-3.5-8-3.5 0 3.5 4 3.5 8 3.5"/><path d="M12 7a5 5 0 0 1 5 5"/></svg>, label: 'Planta viva garantizada', sub: 'Reposición sin preguntas' },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>, label: 'Envío a Colombia', sub: '2 — 5 días hábiles' },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M9 3h10a2 2 0 0 1 2 2v4"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 15l2 2 4-4"/></svg>, label: 'Genética certificada', sub: 'Inspección agronómica' },
                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>, label: 'Asesoría gratis', sub: 'Primeros 6 meses' },
              ] as { icon: JSX.Element; label: string; sub: string }[]).map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Spec table */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>Ficha técnica agronómica</div>
              <div className="spec-grid">
                {(
                  [
                    ['Clima', specs.clima],
                    ['Exposición solar', specs.sol],
                    ['Riego', specs.riego],
                    ['Producción', specs.produccion],
                    ['Altura adulta', specs.altura],
                    ['Dificultad', specs.dificultad],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div className="spec-row" key={k}>
                    <span className="spec-label">{k}</span>
                    <span className="spec-value">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reputación / opiniones / preguntas en pestañas: antes eran tres
            secciones apiladas de punta a punta que obligaban a bajar mucho
            para llegar a las reseñas o las preguntas. Comparten un solo
            bloque y el usuario elige qué mirar. */}
        <section id="pdp-tabs" style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid var(--border)' }}>
          <div className="pdp-tabs-nav" role="tablist" aria-label="Información del producto">
            <button
              role="tab"
              aria-selected={activeTab === 'reputacion'}
              className={`pdp-tab ${activeTab === 'reputacion' ? 'active' : ''}`}
              onClick={() => setActiveTab('reputacion')}
            >
              Reputación
            </button>
            {social && social.rating != null && (
              <button
                role="tab"
                aria-selected={activeTab === 'opiniones'}
                className={`pdp-tab ${activeTab === 'opiniones' ? 'active' : ''}`}
                onClick={() => setActiveTab('opiniones')}
              >
                Opiniones{social.reviewCount ? ` (${social.reviewCount})` : ''}
              </button>
            )}
            {social && social.qna.length > 0 && (
              <button
                role="tab"
                aria-selected={activeTab === 'preguntas'}
                className={`pdp-tab ${activeTab === 'preguntas' ? 'active' : ''}`}
                onClick={() => setActiveTab('preguntas')}
              >
                Preguntas ({social.qna.length})
              </button>
            )}
          </div>
          <div className="pdp-tab-panel">
            {activeTab === 'reputacion' && <SellerReputation seller={SELLER_STATS} />}
            {activeTab === 'opiniones' && social && <ProductReviews data={social} />}
            {activeTab === 'preguntas' && social && <ProductFAQ items={social.qna} />}
          </div>
        </section>

        {/* Cross-sell */}
        {crossSell.length > 0 && (
          <section style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid var(--border)' }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>COMPLEMENTA TU COMPRA</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginBottom: 40 }}>
              También necesitas<em style={{ color: 'var(--accent)' }}>.</em>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {crossSell.map((p) => <ProductCard key={p.id} product={p} compact />)}
            </div>
          </section>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <section style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>MÁS EN {category?.name.toUpperCase()}</div>
                <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
                  También te puede <em style={{ color: 'var(--accent)' }}>gustar.</em>
                </h2>
              </div>
              <Link href={`/catalogo/${product.category}`} className="btn btn-ghost">
                Ver todos <span className="btn-arrow">→</span>
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Add-to-Cart (mobile) */}
      <div className={`sticky-atc ${stickyVisible ? 'visible' : ''}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{formatCOP(product.price)}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={(e) => { handleAdd(); pulse(e.currentTarget); }}>
          Añadir <span className="btn-arrow">→</span>
        </button>
      </div>

      {/* Pestaña flotante "Historia": la historia del cultivo dejó de ocupar
          espacio en la página principal — ahora vive en un panel que se
          desliza desde la derecha, anclado a un botón siempre visible. */}
      <button
        className="story-tab"
        onClick={() => setStoryOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={storyOpen}
      >
        Historia
      </button>

      <div
        className={`story-drawer-overlay ${storyOpen ? 'open' : ''}`}
        onClick={() => setStoryOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Historia del cultivo"
        aria-hidden={!storyOpen}
      >
        <div className="story-drawer" onClick={(e) => e.stopPropagation()}>
          <button className="story-drawer-close" onClick={() => setStoryOpen(false)} aria-label="Cerrar historia">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="story-drawer-panel">
            <div style={{ position: 'absolute', top: '18%', right: '12%', width: 80, height: 106, background: 'linear-gradient(155deg, rgba(60,140,60,0.35), rgba(20,70,20,0.15))', borderRadius: '50% 5% 50% 5%', transform: 'rotate(-18deg)', filter: 'blur(1px)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 12 }}>
                {category?.name.toUpperCase()} · COLOMBIA
              </div>
              <div className="display" style={{ fontSize: 'clamp(26px, 6vw, 38px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>
                {product.tagline}
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 28px 48px' }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>HISTORIA DEL CULTIVO</div>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--fg-dim)', marginBottom: 20, whiteSpace: 'pre-line' }}>
              {product.description}
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
              En VERDE. seleccionamos este material genético directamente con propagadores certificados. Cada unidad pasa por inspección agronómica antes del despacho para garantizar que llega lista para producir.
            </p>
            <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip">{product.specs.clima}</span>
              <span className="chip">{product.specs.dificultad}</span>
              <span className="chip">{product.specs.sol}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) { .pdp-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
      `}</style>
    </div>
  );
}
