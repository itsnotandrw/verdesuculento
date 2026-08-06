'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Lightbox from './Lightbox';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  thumbnails?: boolean;
  priority?: boolean;
  sizes?: string;
}

export default function ImageCarousel({ images, alt, thumbnails = false, priority = false, sizes = '(max-width: 760px) 100vw, 50vw' }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const trackWidth = useRef(1);

  if (images.length === 0) return null;

  const clamp = (i: number) => Math.max(0, Math.min(images.length - 1, i));
  const goTo = (i: number) => setIndex(clamp(i));
  const showThumbs = thumbnails && images.length > 1;

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

  return (
    <div className="carousel-root" onClick={(e) => e.stopPropagation()}>
      <div
        ref={trackRef}
        className="carousel-track"
        style={trackStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((img, i) => (
          <div
            key={img}
            className="carousel-slide"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
          >
            <Image
              src={img}
              alt={alt}
              fill
              sizes={sizes}
              style={{ objectFit: 'cover' }}
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(index - 1); }}
            className="carousel-arrow carousel-arrow-prev"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(index + 1); }}
            className="carousel-arrow carousel-arrow-next"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {!showThumbs && (
            <div className="carousel-dots">
              {images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
                  className={`carousel-dot ${i === index ? 'active' : ''}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showThumbs && (
        <div className="carousel-thumbs">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              aria-label={`Ver foto ${i + 1}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
              className={`carousel-thumb ${i === index ? 'active' : ''}`}
            >
              <Image src={img} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={images}
          alt={alt}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
