'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const tipRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tipX = 0, tipY = 0, leafX = 0, leafY = 0;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    let raf = 0;
    let running = false;

    const tick = () => {
      const dx = targetX - mouseX;
      const dy = targetY - mouseY;
      const moved = Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05;

      if (moved) {
        mouseX += dx * 0.75;
        mouseY += dy * 0.75;
      }

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

      const tipDelta = Math.abs(mouseX - tipX) + Math.abs(mouseY - tipY);
      const leafDelta = Math.abs(mouseX - leafX) + Math.abs(mouseY - leafY);
      if (!moved && tipDelta < 0.1 && leafDelta < 0.1) {
        running = false;
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      mouseX = targetX;
      mouseY = targetY;
      tick();
    };

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      startLoop();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const checkHover = (e: MouseEvent) => {
      const target = e.target as Element;
      const isHover = !!target.closest(
        'a, button, .product-card, .article-card, .chip, .swatch, .discovery-pill, [data-cursor-hover]'
      );
      tipRef.current?.classList.toggle('hover', isHover);
      leafRef.current?.classList.toggle('hover', isHover);
    };
    window.addEventListener('mouseover', checkHover, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
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
