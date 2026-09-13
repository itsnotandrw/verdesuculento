'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { motion } from 'motion/react';

interface BlurTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  emphasizeLast?: number;
  emphasizeStyle?: CSSProperties;
  breakBeforeLast?: number;
}

// Inspirado en el BlurText de react-bits (reactbits.dev), reescrito a mano
// para soportar lo que los títulos de este sitio ya usan: una porción final
// resaltada en el color de acento (equivalente al <em> que tenían) y un
// salto de línea manual — cosas que el componente original no contempla.
export default function BlurText({
  text,
  as: Tag = 'h1',
  className = '',
  style,
  delay = 90,
  emphasizeLast = 0,
  emphasizeStyle = { color: 'var(--accent)' },
  breakBeforeLast = 0,
}: BlurTextProps) {
  const words = text.split(' ');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap', ...style }}>
      {words.map((word, i) => {
        const isEmphasized = emphasizeLast > 0 && i >= words.length - emphasizeLast;
        const isBreakPoint = breakBeforeLast > 0 && i === words.length - breakBeforeLast;
        return (
          <span key={i} style={{ display: 'contents' }}>
            {isBreakPoint && <span style={{ flexBasis: '100%', height: 0 }} aria-hidden="true" />}
            <motion.span
              style={{ display: 'inline-block', whiteSpace: 'pre', ...(isEmphasized ? emphasizeStyle : undefined) }}
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={inView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: (i * delay) / 1000, ease: [0.16, 1, 0.3, 1] }}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}
