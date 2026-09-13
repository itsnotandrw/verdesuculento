'use client';

import { useCallback, useRef, type MouseEvent } from 'react';

// Inspirado en el SpotlightCard de react-bits (reactbits.dev), adaptado para
// no fijar colores propios: solo mueve la posición del brillo vía custom
// properties, y el color/tema los define el CSS del sitio (var(--accent),
// tema claro/oscuro) para que combine con cualquier tarjeta existente.
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }, []);

  return { ref, onMouseMove };
}
