'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { CATEGORY_PHOTOS } from '@/data/catalog';

export interface StackItem { id: string; name: string; count?: number; href?: string; pct?: number }

const GAP = 10;      // separación entre tarjetas
const PEEK = 12;     // cuánto asoma cada tarjeta apilada por arriba
const SHRINK = 0.035;

/**
 * Menú de categorías con tarjetas apiladas (efecto "scroll stack"): al desplazarse, cada tarjeta
 * se queda fija arriba y las siguientes pasan por encima, mientras las anteriores se reducen un poco.
 * Cada tarjeta lleva de fondo la foto de su categoría. Usa el scroll nativo del contenedor.
 */
export default function CatalogStack({ items, scrollerRef, onNavigate, variant = 'foto' }: {
  variant?: 'foto' | 'oferta';
  items: StackItem[];
  scrollerRef: React.RefObject<HTMLDivElement>;
  onNavigate: () => void;
}) {
  const cardsRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const stackRef = useRef<HTMLDivElement>(null);

  const actualizar = useCallback(() => {
    const sc = scrollerRef.current;
    const cards = cardsRef.current;
    if (!sc || !cards.length || !cards[0]) return;
    const h = cards[0].offsetHeight + GAP;
    const top = sc.scrollTop - (stackRef.current?.offsetTop ?? 0) + 10;
    cards.forEach((card, i) => {
      if (!card) return;
      // Suma de lo "cubierta" que está esta tarjeta por las siguientes (0 a 1 por cada una).
      let cubierta = 0;
      for (let j = i + 1; j < cards.length; j++) {
        const llegada = j * h - (8 + j * PEEK);
        cubierta += Math.min(1, Math.max(0, (top - (llegada - h)) / h));
      }
      card.style.transform = `scale(${Math.max(0.82, 1 - cubierta * SHRINK).toFixed(3)})`;
      card.style.filter = cubierta > 0.01 ? `brightness(${Math.max(0.55, 1 - cubierta * 0.12).toFixed(2)})` : '';
    });
  }, [scrollerRef]);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    actualizar();
    sc.addEventListener('scroll', actualizar, { passive: true });
    return () => sc.removeEventListener('scroll', actualizar);
  }, [actualizar, scrollerRef, items.length]);

  return (
    <div className={`cs-stack ${variant === 'oferta' ? 'cs-oferta' : ''}`} ref={stackRef} style={{ paddingBottom: 6 }}>
      {items.map((it, i) => (
        <Link
          key={it.id}
          href={it.href ?? `/catalogo/${it.id}`}
          className="cs-card"
          ref={(el) => { cardsRef.current[i] = el; }}
          onClick={onNavigate}
          style={{ top: 8 + i * PEEK, zIndex: i + 1, marginBottom: GAP }}
        >
          {variant === 'oferta' ? (
            <>
              <span className="cs-name">{it.name}</span>
              <span className="cs-pct">{it.pct}% OFF</span>
            </>
          ) : (
            <>
              <span className="cs-photo" style={{ backgroundImage: CATEGORY_PHOTOS[it.id] ? `url(${CATEGORY_PHOTOS[it.id]})` : undefined }} />
              <span className="cs-shade" />
              <span className="cs-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="cs-name">{it.name}</span>
              <span className="cs-count">{it.count} productos →</span>
            </>
          )}
        </Link>
      ))}
    </div>
  );
}
