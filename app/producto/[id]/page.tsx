'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATALOG, CATEGORIES, getProductById, getRelatedProducts, getCrossSellProducts, formatCOP } from '@/data/catalog';
import { useCart } from '@/context/CartContext';
import ProductShape from '@/components/ProductShape';
import ProductCard from '@/components/ProductCard';
import type { ProductColor } from '@/types';

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id);
  if (!product) notFound();

  const { add } = useCart();
  const [activeColor, setActiveColor] = useState<ProductColor>(product.colors[0]);
  const [activeSize, setActiveSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const related = getRelatedProducts(product, 3);
  const crossSell = getCrossSellProducts(product);
  const category = CATEGORIES.find((c) => c.id === product.category);
  const specs = product.specs;

  // Sticky ATC: show when main CTA scrolls out of view (mobile benchmark)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (ctaRef.current) observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, []);

  const handleAdd = () => add(product, { color: activeColor, size: activeSize, qty });

  return (
    <div className="page-section" style={{ paddingTop: 100 }}>
      <div className="container">
        {/* Breadcrumb */}
        <nav style={{ marginBottom: 40, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <ProductShape product={{ ...product, colors: [activeColor] }} />
            {product.badge && (
              <div className="product-badge">{product.badge}</div>
            )}
            <div style={{ position: 'absolute', bottom: 20, left: 20, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>
              {product.id.toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{category?.name}</div>
            <h1 className="display" style={{ fontSize: 'clamp(44px, 5vw, 80px)', marginBottom: 8, letterSpacing: '-0.025em' }}>{product.name}</h1>
            <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--fg-dim)', marginBottom: 20 }}>{product.tagline}</p>
            <div className="mono" style={{ fontSize: 28, marginBottom: 28, letterSpacing: '-0.02em' }}>{formatCOP(product.price)}</div>

            <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, marginBottom: 32, fontSize: 16 }}>{product.description}</p>

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
            <div style={{ marginBottom: 28 }}>
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
                  style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 18 }}
                >−</button>
                <span className="mono" style={{ minWidth: 32, textAlign: 'center', fontSize: 16 }}>{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 18 }}
                >+</button>
              </div>
            </div>

            {/* Main CTA */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap' }}>
              <button ref={ctaRef} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minWidth: 200 }} onClick={handleAdd}>
                Añadir al carrito — {formatCOP(product.price * qty)} <span className="btn-arrow">→</span>
              </button>
              <Link href="/checkout" className="btn btn-ghost" style={{ justifyContent: 'center' }}>Comprar ya</Link>
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

        {/* Historia del cultivo */}
        <section style={{ padding: '64px 0', borderTop: '1px solid var(--border)', marginBottom: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="story-grid">
            {/* Immersive gradient panel */}
            <div style={{
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(155deg, #09190c 0%, #142a17 45%, #0b1e0e 75%, #071109 100%)',
              padding: '48px 36px',
              position: 'relative', overflow: 'hidden',
              minHeight: 280,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 30%, color-mix(in oklab, var(--accent) 15%, transparent), transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: '20%', right: '15%', width: 90, height: 120, background: 'linear-gradient(155deg, rgba(60,140,60,0.35), rgba(20,70,20,0.15))', borderRadius: '50% 5% 50% 5%', transform: 'rotate(-18deg)', filter: 'blur(1px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 12 }}>
                  {category?.name.toUpperCase()} · COLOMBIA
                </div>
                <div className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>
                  {product.tagline}
                </div>
              </div>
            </div>
            {/* Story text */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>HISTORIA DEL CULTIVO</div>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--fg-dim)', marginBottom: 20 }}>
                {product.description}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
                En VERDE. seleccionamos este material genético directamente con propagadores certificados. Cada unidad pasa por inspección agronómica antes del despacho para garantizar que llega lista para producir.
              </p>
              <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="chip">{product.specs.clima}</span>
                <span className="chip">{product.specs.dificultad}</span>
                <span className="chip">{product.specs.sol}</span>
              </div>
            </div>
          </div>
          <style>{`@media (max-width: 760px) { .story-grid { grid-template-columns: 1fr !important; } }`}</style>
        </section>

        {/* Cross-sell (benchmark) */}
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

      {/* Sticky Add-to-Cart (mobile — benchmark) */}
      <div className={`sticky-atc ${stickyVisible ? 'visible' : ''}`}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{formatCOP(product.price)}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>
          Añadir <span className="btn-arrow">→</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 760px) { .pdp-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
      `}</style>
    </div>
  );
}
