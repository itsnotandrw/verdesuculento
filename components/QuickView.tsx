'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuickView } from '@/context/QuickViewContext';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import { RATINGS } from '@/data/ratings';
import ProductShape from './ProductShape';
import ImageCarousel from './ImageCarousel';
import StarRating from './StarRating';
import type { ProductColor } from '@/types';

export default function QuickView() {
  const { product, close } = useQuickView();
  const { add } = useCart();
  const [activeColor, setActiveColor] = useState<ProductColor | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const color = activeColor ?? product?.colors[0] ?? null;
  const size = activeSize ?? product?.sizes[0] ?? null;

  // Escape key handler
  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [product, close]);

  // Body scroll lock
  useEffect(() => {
    if (product) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => document.body.classList.remove('scroll-locked');
  }, [product]);

  // Focus trap
  useEffect(() => {
    if (!product || !modalRef.current) return;
    const modal = modalRef.current;
    const focusable = modal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    focusable[0].focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [product]);

  if (!product) return (
    <div className="modal-overlay" aria-hidden />
  );

  return (
    <div className="modal-overlay open" onClick={close} role="dialog" aria-modal="true" aria-label="Vista rápida del producto">
      <div ref={modalRef} className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={close} aria-label="Cerrar vista rápida">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="modal-img">
          {product.images.length > 0 ? (
            <ImageCarousel images={product.images} alt={product.name} sizes="(max-width: 760px) 92vw, 480px" />
          ) : (
            <ProductShape product={product} activeColorHex={color?.hex} />
          )}
        </div>

        {/*
          modal-info se parte en dos: una zona que hace scroll (descripción,
          variedades) y una barra de acción que no se mueve. Antes todo era un
          solo bloque sin altura acotada dentro del grid —el hijo crecía más
          allá del modal y el overflow:hidden del padre recortaba el botón
          Añadir en vez de dejarlo alcanzable con scroll. Ahora la altura
          disponible se reparte explícitamente entre las dos zonas.
        */}
        <div className="modal-info">
          <div className="modal-info-scroll">
            <div className="eyebrow" style={{ marginBottom: 10 }}>{product.category}</div>
            <h2 className="display" style={{ fontSize: 44, marginBottom: 8 }}>{product.name}</h2>
            {RATINGS[product.id]?.rating != null && (
              <div style={{ marginBottom: 10 }}>
                <StarRating rating={RATINGS[product.id].rating!} count={RATINGS[product.id].reviewCount} size={13} showValue />
              </div>
            )}
            <div className="mono" style={{ fontSize: 18, marginBottom: 18 }}>{formatCOP(product.price)}</div>
            {/* white-space: pre-line respeta los \n\n que ya trae la descripción
                (viene del scraping de ML) — sin esto el HTML los colapsa y todo
                el texto se ve como un solo párrafo amontonado. */}
            <p style={{ color: 'var(--fg-dim)', marginBottom: 24, lineHeight: 1.65, whiteSpace: 'pre-line' }}>{product.description}</p>

            {product.colors.length > 1 && (
              <div style={{ marginBottom: 4 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Variedad: <span style={{ color: 'var(--fg)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-ui)' }}>{color?.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {product.colors.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setActiveColor(c)}
                      className={`swatch ${color?.hex === c.hex ? 'active' : ''}`}
                      style={{ width: 32, height: 32, background: c.hex, padding: 2, backgroundClip: 'content-box' }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barra flotante: el selector de presentación y "Añadir" quedan
              siempre visibles, sin depender de hasta dónde se haya scrolleado
              la descripción. */}
          <div className="modal-info-actions">
            {product.sizes.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSize(s)}
                      className={`chip ${size === s ? 'active' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sin pulso de feedback aquí a propósito: el modal se cierra en
                el mismo click, así que cualquier animación en este botón se
                desmonta antes de llegar a verse. El carrito lateral que se
                abre al instante ya cumple ese rol. */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (color && size) add(product, { color, size });
                close();
              }}
            >
              Añadir — {formatCOP(product.price)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
