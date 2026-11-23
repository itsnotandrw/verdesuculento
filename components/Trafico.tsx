'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function enviar(cuerpo: Record<string, unknown>) {
  try {
    const datos = JSON.stringify(cuerpo);
    if (navigator.sendBeacon) navigator.sendBeacon('/api/trafico', new Blob([datos], { type: 'text/plain' }));
    else fetch('/api/trafico', { method: 'POST', body: datos, keepalive: true }).catch(() => undefined);
  } catch { /* medir nunca rompe nada */ }
}

/** Registra un evento de la tienda (hoy: «carrito» al añadir un producto). */
export function trackEvento(evento: 'carrito') {
  enviar({ tipo: 'evento', evento });
}

/**
 * Cuenta cada página que ve el visitante (sin cookies ni datos personales). La primera página de la pestaña cuenta como
 * visita nueva y lleva de dónde llegó (referente o utm_source). El panel /admin no se mide.
 */
export default function Trafico() {
  const ruta = usePathname() ?? '/';

  useEffect(() => {
    if (ruta.startsWith('/admin')) return;
    let nueva = false;
    try {
      if (!sessionStorage.getItem('verde-visita')) { sessionStorage.setItem('verde-visita', '1'); nueva = true; }
    } catch { nueva = false; }
    const utm = nueva ? new URLSearchParams(location.search).get('utm_source') ?? undefined : undefined;
    enviar({ tipo: 'pv', ruta, nueva, ref: nueva ? document.referrer : undefined, utm });
  }, [ruta]);

  return null;
}
