'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  thumbnails?: boolean;
  priority?: boolean;
}

export default function ImageCarousel({ images, alt, thumbnails = false, priority = false }: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const touchDeltaX = useRef(0);

  if (images.length === 0) return null;

  const goTo = (i: number) => setIndex((i + images.length) % images.length);
  const showThumbs = thumbnails && images.length > 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStart.current.x;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(touchDeltaX.current) > 40 && Math.abs(touchDeltaX.current) > Math.abs(deltaY)) {
      goTo(touchDeltaX.current < 0 ? index + 1 : index - 1);
    }
  };

  return (
    <div
      className="carousel-root"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Image
        key={images[index]}
        src={images[index]}
        alt={alt}
        fill
        sizes="(max-width: 760px) 100vw, 50vw"
        style={{ objectFit: 'cover' }}
        priority={priority}
      />

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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex(i); }}
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex(i); }}
              className={`carousel-thumb ${i === index ? 'active' : ''}`}
            >
              <Image src={img} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
