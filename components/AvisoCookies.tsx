'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { guardarPreferenciaCookies, leerPreferenciaCookies } from '@/lib/google-ads';

/** Aviso corto de cookies: aparece hasta que el visitante decide. Se puede cambiar luego en /privacidad. */
export default function AvisoCookies() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(leerPreferenciaCookies() === null), []);
  if (!visible) return null;
  const elegir = (v: 'si' | 'no') => { guardarPreferenciaCookies(v); setVisible(false); };
  return (
    <div className="aviso-cookies" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies de Google para medir nuestros anuncios.{' '}
        <Link href="/privacidad">Más información</Link>
      </p>
      <div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => elegir('si')}>Aceptar</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => elegir('no')}>Rechazar</button>
      </div>
    </div>
  );
}
