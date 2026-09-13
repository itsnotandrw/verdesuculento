'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CountUpProps {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  separator?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Inspirado en el CountUp de react-bits (reactbits.dev), reimplementado con
// GSAP en vez de Framer Motion: el sitio ya trae GSAP como dependencia
// (CardSwap, scroll horizontal), así que evita sumar una librería de
// animación más solo para este efecto.
export default function CountUp({ to, decimals = 0, prefix = '', suffix = '', duration = 1.6, separator = false, className, style }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  const format = (value: number) => {
    const body = separator
      ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
      : value.toFixed(decimals);
    return prefix + body + suffix;
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { value: 0 };
    let tween: gsap.core.Tween | null = null;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        tween = gsap.to(obj, {
          value: to,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            if (el) el.textContent = format(obj.value);
          },
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      tween?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, decimals, prefix, suffix, duration, separator]);

  return <span ref={ref} className={className} style={style}>{format(0)}</span>;
}
