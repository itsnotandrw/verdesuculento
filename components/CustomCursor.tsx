'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const tipRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tipX = 0, tipY = 0, leafX = 0, leafY = 0;
    let mouseX = 0, mouseY = 0;
    let raf: number;

    const onMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMove);

    const tick = () => {
      tipX += (mouseX - tipX) * 0.75;
      tipY += (mouseY - tipY) * 0.75;
      leafX += (mouseX - leafX) * 0.14;
      leafY += (mouseY - leafY) * 0.14;

      if (tipRef.current) {
        tipRef.current.style.transform = `translate(${tipX}px, ${tipY}px) translate(-50%, -50%)`;
      }
      if (leafRef.current) {
        leafRef.current.style.transform = `translate(${leafX}px, ${leafY}px) translate(-50%, -50%) rotate(-45deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const checkHover = (e: MouseEvent) => {
      const target = e.target as Element;
      const isHover = !!target.closest('a, button, .product-card, .article-card, .chip, [data-cursor-hover]');
      tipRef.current?.classList.toggle('hover', isHover);
      leafRef.current?.classList.toggle('hover', isHover);
    };
    window.addEventListener('mouseover', checkHover);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', checkHover);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={leafRef} className="cursor-leaf" aria-hidden />
      <div ref={tipRef} className="cursor-tip" aria-hidden />
    </>
  );
}
