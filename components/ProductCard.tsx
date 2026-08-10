'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useQuickView } from '@/context/QuickViewContext';
import { formatCOP } from '@/data/catalog';
import { RATINGS } from '@/data/ratings';
import ProductShape from './ProductShape';
import StarRating from './StarRating';
import SoldCount from './SoldCount';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  sizes?: string;
}

export default function ProductCard({ product, compact = false, sizes = '(max-width: 480px) 94vw, (max-width: 720px) 47vw, 25vw' }: ProductCardProps) {
  const { add } = useCart();
  const { open } = useQuickView();
  const [activeColor, setActiveColor] = useState(product.colors[0]);
  const rating = RATINGS[product.id];
  const badgeLabel = rating?.bestsellerRank ? 'Más vendido' : product.badge;

  return (
    <article className="product-card" data-compact={compact ? 'true' : 'false'}>
      {badgeLabel && <span className="product-badge">{badgeLabel}</span>}

      <Link href={`/producto/${product.id}`} className="product-card-media" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
        {product.images.length > 0 ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes={sizes}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <ProductShape product={product} activeColorHex={activeColor.hex} />
        )}
        <div className="product-card-actions">
          <button
            className="product-card-quickview"
            onClick={(e) => { e.preventDefault(); open(product); }}
          >
            Vista rápida
          </button>
          <button
            className="product-card-add"
            onClick={(e) => {
              e.preventDefault();
              add(product, { color: activeColor });
              // Se reinicia la clase a mano (con reflow forzado de por medio)
              // en vez de confiar en un solo toggle de estado: un segundo
              // click antes de que termine la animación no la reiniciaría, y
              // el feedback de "sí se añadió" es justo lo que importa cuando
              // el cliente hace click varias veces seguido.
              const btn = e.currentTarget;
              btn.classList.remove('pulse');
              void btn.offsetWidth;
              btn.classList.add('pulse');
            }}
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
          {(rating?.rating != null || (rating?.soldCount ?? 0) > 0) && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {rating?.rating != null && (
                <StarRating rating={rating.rating} count={rating.reviewCount} size={11} showValue />
              )}
              {!compact && rating && <SoldCount count={rating.soldCount} size={11} />}
            </div>
          )}
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
