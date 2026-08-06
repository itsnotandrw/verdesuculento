'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface LightboxProps {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export default function Lightbox({ images, alt, index, onIndexChange, onClose }: LightboxProps) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const trackWidth = useRef(1);
  const trackRef = useRef<HTMLDivElement>(null);

  const clamp = (i: number) => Math.max(0, Math.min(images.length - 1, i));
  const goTo = (i: number) => onIndexChange(clamp(i));

  useEffect(() => {
    document.body.classList.add('scroll-locked');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('scroll-locked');
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    trackWidth.current = trackRef.current?.clientWidth || 1;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) <= Math.abs(dy)) return;
    const atStart = index === 0 && dx > 0;
    const atEnd = index === images.length - 1 && dx < 0;
    setDragX(atStart || atEnd ? dx / 3 : dx);
  };
  const handleTouchEnd = () => {
    setDragging(false);
    if (Math.abs(dragX) > trackWidth.current * 0.18) {
      goTo(index + (dragX < 0 ? 1 : -1));
    }
    setDragX(0);
  };

  const trackStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
    transition: dragging ? 'none' : 'transform 0.4s cubic-bezier(.2,.8,.2,1)',
  };

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {images.length > 1 && (
        <span className="lightbox-counter">{index + 1} / {images.length}</span>
      )}

      <div
        ref={trackRef}
        className="lightbox-track"
        style={trackStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((img) => (
          <div key={img} className="lightbox-slide">
            <Image src={img} alt={alt} fill sizes="100vw" style={{ objectFit: 'contain' }} />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            className="carousel-arrow lightbox-arrow-prev"
            aria-label="Foto anterior"
            onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className="carousel-arrow lightbox-arrow-next"
            aria-label="Foto siguiente"
            onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
