'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CountUpProps {
  to: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Inspirado en el CountUp de react-bits (reactbits.dev), reimplementado con
// GSAP en vez de Framer Motion: el sitio ya trae GSAP como dependencia
// (CardSwap, scroll horizontal), así que evita sumar una librería de
// animación más solo para este efecto.
export default function CountUp({ to, decimals = 0, suffix = '', duration = 1.6, className, style }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

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
            if (el) el.textContent = obj.value.toFixed(decimals) + suffix;
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
  }, [to, decimals, suffix, duration]);

  return <span ref={ref} className={className} style={style}>{(0).toFixed(decimals) + suffix}</span>;
}
