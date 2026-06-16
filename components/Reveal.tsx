'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: boolean;
  [key: string]: unknown;
}

export default function Reveal({ children, className = '', as: Tag = 'div', stagger = false, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;

    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.add('in');
    };

    const checkVisible = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        reveal();
        return true;
      }
      return false;
    };

    if (checkVisible()) return;
    requestAnimationFrame(checkVisible);
    const t1 = setTimeout(checkVisible, 100);
    const t2 = setTimeout(checkVisible, 400);
    if (document.fonts?.ready) document.fonts.ready.then(checkVisible);

    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) reveal(); }),
      { threshold: 0.05, rootMargin: '0px 0px -5% 0px' }
    );
    obs.observe(el);

    const onScroll = () => checkVisible();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
