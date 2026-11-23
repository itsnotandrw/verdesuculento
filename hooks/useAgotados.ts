'use client';

import { useEffect, useState } from 'react';

let cache: Set<string> | null = null;
let pendiente: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cargar() {
  if (pendiente) return pendiente;
  pendiente = fetch('/api/stock')
    .then((r) => r.json())
    .then((d: { agotados?: string[] }) => { cache = new Set(d.agotados ?? []); oyentes.forEach((f) => f()); })
    .catch(() => { cache = cache ?? new Set(); })
    .finally(() => { setTimeout(() => { pendiente = null; }, 30000); });
  return pendiente;
}

/** Lectura inmediata (para el carrito): true si ya se sabe que está agotado. */
export const estaAgotado = (id: string) => cache?.has(id) ?? false;

/** ¿Este producto está agotado (inventario en 0)? Se consulta una sola vez para toda la página. */
export function useAgotado(id: string): boolean {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    oyentes.add(f);
    void cargar();
    return () => { oyentes.delete(f); };
  }, []);
  return cache?.has(id) ?? false;
}
