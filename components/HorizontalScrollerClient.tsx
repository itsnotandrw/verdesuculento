'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function HorizontalScrollerClient({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkBounds, { passive: true });
    const ro = new ResizeObserver(checkBounds);
    ro.observe(el);
    checkBounds();
    return () => { el.removeEventListener('scroll', checkBounds); ro.disconnect(); };
  }, [checkBounds]);

  // Drag-to-scroll for desktop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onUp = () => {
      isDown = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.4;
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('mousemove', onMove);

    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('mousemove', onMove);
    };
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 370, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Fade edges */}
      {canLeft && <div className="scroller-fade-left" aria-hidden />}
      {canRight && <div className="scroller-fade-right" aria-hidden />}

      {/* Arrow buttons */}
      <button
        className={`scroller-arrow scroller-arrow-left ${canLeft ? 'visible' : ''}`}
        onClick={() => scrollBy(-1)}
        aria-label="Categorías anteriores"
        tabIndex={canLeft ? 0 : -1}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        className={`scroller-arrow scroller-arrow-right ${canRight ? 'visible' : ''}`}
        onClick={() => scrollBy(1)}
        aria-label="Categorías siguientes"
        tabIndex={canRight ? 0 : -1}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', cursor: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}
