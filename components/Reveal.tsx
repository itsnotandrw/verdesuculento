'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: boolean;
  [key: string]: unknown;
}

export default function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  stagger = false,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Synchronous check: if already in viewport, reveal instantly
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('in');
      return;
    }

    // Below the fold: use IntersectionObserver only (no scroll listener overhead)
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          entries[0].target.classList.add('in');
          obs.disconnect();
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -32px 0px' }
    );
    obs.observe(el);

    return () => obs.disconnect();
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag
      ref={ref as any}
      className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
