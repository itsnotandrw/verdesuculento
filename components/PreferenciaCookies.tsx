'use client';

import { useEffect, useState } from 'react';
import { leerPreferenciaCookies, guardarPreferenciaCookies, type PreferenciaAds } from '@/lib/google-ads';

/** Permite cambiar en cualquier momento la decisión sobre las cookies de anuncios (página de privacidad). */
export default function PreferenciaCookies() {
  const [valor, setValor] = useState<PreferenciaAds>(null);
  useEffect(() => setValor(leerPreferenciaCookies()), []);
  const elegir = (v: 'si' | 'no') => { guardarPreferenciaCookies(v); setValor(v); };
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className={`btn btn-sm ${valor === 'si' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={valor === 'si'} onClick={() => elegir('si')}>Permitir cookies de anuncios</button>
      <button type="button" className={`btn btn-sm ${valor === 'no' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={valor === 'no'} onClick={() => elegir('no')}>No permitirlas</button>
      <span role="status" style={{ fontSize: 13 }}>{valor === 'no' ? 'Quedaron desactivadas en este navegador.' : valor === 'si' ? 'Quedaron permitidas en este navegador.' : ''}</span>
    </div>
  );
}
