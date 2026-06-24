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

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('in');
      return;
    }

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

  // If className already contains a reveal variant, use it directly
  // instead of prepending the base 'reveal' class to avoid conflicting transforms
  const hasVariant = /reveal-(left|right)/.test(className);
  const baseClass = stagger ? 'reveal-stagger' : 'reveal';
  const finalClass = hasVariant ? className : `${baseClass} ${className}`;

  return (
    <Tag
      ref={ref as any}
      className={finalClass}
      {...rest}
    >
      {children}
    </Tag>
  );
}
