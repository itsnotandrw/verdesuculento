'use client';

import { useState } from 'react';
import { useQuickView } from '@/context/QuickViewContext';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import ProductShape from './ProductShape';
import type { ProductColor } from '@/types';

export default function QuickView() {
  const { product, close } = useQuickView();
  const { add } = useCart();
  const [activeColor, setActiveColor] = useState<ProductColor | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);

  const color = activeColor ?? product?.colors[0] ?? null;
  const size = activeSize ?? product?.sizes[0] ?? null;

  if (!product) return (
    <div className="modal-overlay" aria-hidden />
  );

  return (
    <div className="modal-overlay open" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="modal-img">
          <ProductShape product={product} activeColorHex={color?.hex} />
        </div>

        <div className="modal-info">
          <div className="eyebrow" style={{ marginBottom: 10 }}>{product.category}</div>
          <h2 className="display" style={{ fontSize: 44, marginBottom: 8 }}>{product.name}</h2>
          <div className="mono" style={{ fontSize: 18, marginBottom: 18 }}>{formatCOP(product.price)}</div>
          <p style={{ color: 'var(--fg-dim)', marginBottom: 24, lineHeight: 1.6 }}>{product.description}</p>

          {product.colors.length > 1 && (
            <div style={{ marginBottom: 18 }}>
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

          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Presentación</div>
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
  );
}
