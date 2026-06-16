'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useQuickView } from '@/context/QuickViewContext';
import { formatCOP } from '@/data/catalog';
import ProductShape from './ProductShape';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const { add } = useCart();
  const { open } = useQuickView();
  const [activeColor, setActiveColor] = useState(product.colors[0]);

  return (
    <article className="product-card" data-compact={compact ? 'true' : 'false'}>
      {product.badge && <span className="product-badge">{product.badge}</span>}

      <Link href={`/producto/${product.id}`} className="product-card-media" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
        <ProductShape product={product} activeColorHex={activeColor.hex} />
        <div className="product-card-actions">
          <button
            className="product-card-quickview"
            onClick={(e) => { e.preventDefault(); open(product); }}
          >
            Vista rápida
          </button>
          <button
            className="product-card-add"
            onClick={(e) => { e.preventDefault(); add(product, { color: activeColor }); }}
            aria-label="Añadir al carrito"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </Link>

      <div className="product-card-info">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/producto/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="product-card-title">{product.name}</div>
          </Link>
          {!compact && <div className="product-card-tag">{product.tagline}</div>}
          {product.colors.length > 1 && (
            <div
              className="product-card-swatches"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={() => {}}
              role="group"
              aria-label="Variedades"
            >
              {product.colors.slice(0, 5).map((c) => (
                <button
                  key={c.hex}
                  onMouseEnter={() => setActiveColor(c)}
                  onClick={() => setActiveColor(c)}
                  className={`swatch ${activeColor.hex === c.hex ? 'active' : ''}`}
                  style={{ background: c.hex }}
                  aria-label={c.name}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 2 }}>
                  +{product.colors.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="product-card-price">{formatCOP(product.price)}</div>
      </div>
    </article>
  );
}
