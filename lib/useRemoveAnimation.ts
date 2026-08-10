'use client';

import { useCallback, useRef, useState } from 'react';

/** Debe coincidir con la duración de la transición en .removing (globals.css). */
const DURACION_MS = 380;

/**
 * Anima la salida de una fila antes de borrarla de verdad.
 *
 * El patrón es "medir y luego colapsar": no se adivina una altura fija (que
 * podría recortar un nombre de producto largo de dos líneas), se lee el alto
 * real con `scrollHeight` y se anima desde ese valor exacto hasta 0. El
 * `remove` real —el que saca el ítem del carrito— se llama recién cuando la
 * animación termina, para que React no desmonte la fila a mitad de camino.
 */
export function useRemoveAnimation(remove: (key: string) => void) {
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const registrarFila = useCallback((key: string) => (el: HTMLElement | null) => {
    rowRefs.current[key] = el;
  }, []);

  const handleRemove = useCallback((key: string) => {
    const el = rowRefs.current[key];
    if (el) {
      el.style.maxHeight = `${el.scrollHeight}px`;
      void el.offsetHeight; // fuerza el reflow para que el navegador registre el alto de partida
    }

    requestAnimationFrame(() => {
      setRemovingKeys((prev) => new Set(prev).add(key));
      if (el) el.style.maxHeight = '0px';
    });

    setTimeout(() => {
      remove(key);
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, DURACION_MS);
  }, [remove]);

  return { removingKeys, registrarFila, handleRemove };
}
