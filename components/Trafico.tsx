'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { paginaAds } from '@/lib/google-ads';

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
 * visita nueva y lleva de dónde llegó (anuncio de Google, referente o utm_source). El panel /admin no se mide.
 */
export default function Trafico() {
  const ruta = usePathname() ?? '/';

  useEffect(() => {
    if (ruta.startsWith('/admin')) return;
    paginaAds();
    let nueva = false;
    try {
      if (!sessionStorage.getItem('verde-visita')) { sessionStorage.setItem('verde-visita', '1'); nueva = true; }
    } catch { nueva = false; }
    const q = new URLSearchParams(location.search);
    const utm = nueva ? q.get('utm_source') ?? undefined : undefined;
    // Clic en un anuncio de Google: trae gclid/gbraid/wbraid/gad_source (o utm de pago a Google). Solo se envía el sí/no.
    const ads = nueva && (['gclid', 'gbraid', 'wbraid', 'gad_source'].some((k) => q.has(k)) || (/google/i.test(utm ?? '') && /cpc|ppc|paid/i.test(q.get('utm_medium') ?? '')));
    enviar({ tipo: 'pv', ruta, nueva, ref: nueva ? document.referrer : undefined, utm, ads: ads || undefined });
  }, [ruta]);

  return null;
}
