'use client';

// Galería acordeón de reseñas reales (efecto tipo "Accordion Gallery" de React Bits):
// los paneles se angostan y el activo se abre mostrando la foto del comprador y su comentario.
// Escritorio: se abre al pasar el mouse. Táctil: al tocar. Teclado: flechas, Enter o Espacio.
// En pantallas angostas el acordeón pasa a vertical. Rota solo cada 6 s si nadie lo está usando.
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './ReviewsGallery.css';

export interface ReviewItem {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  contenido: string;
  fecha: string; // ya formateada en el servidor (evita diferencias de hidratación)
  foto: string;
}

export default function ReviewsGallery({ items }: { items: ReviewItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setActive((i + 1) % items.length); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setActive((i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' || e.key === ' ') { if (e.target === e.currentTarget) { e.preventDefault(); setActive(i); } }
  };

  return (
    <div
      className="rg"
      role="list"
      aria-label="Reseñas de compradores con fotos"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {items.map((r, i) => {
        const on = i === active;
        return (
          <div
            key={r.id}
            role="listitem"
            tabIndex={0}
            className={`rg-panel${on ? ' on' : ''}`}
            aria-label={`${r.productName}: ${r.rating} de 5 estrellas`}
            aria-current={on}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(i); }}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Image
              className="rg-img"
              src={r.foto}
              alt={`Foto real de un comprador: ${r.productName}`}
              fill
              sizes="(max-width: 720px) 100vw, 60vw"
            />
            <span className="rg-shade" aria-hidden />
            <span className="rg-tag" aria-hidden>
              <b>{'★'.repeat(r.rating)}</b> {r.productName}
            </span>
            <div className="rg-body">
              <span className="rg-stars" aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <p className="rg-quote">{r.contenido}</p>
              <div className="rg-meta">
                <span>Comprador verificado · Mercado Libre · {r.fecha}</span>
                <Link href={`/producto/${r.productId}`} tabIndex={on ? 0 : -1} className="rg-link">
                  {r.productName} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
