'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
      <div className="container">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'color-mix(in oklab, #ef4444 15%, var(--bg-elev))', border: '1px solid color-mix(in oklab, #ef4444 30%, var(--border))', display: 'grid', placeItems: 'center', margin: '0 auto 24px', fontSize: 36 }}>!</div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>ALGO SALIÓ MAL</div>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 6vw, 88px)', marginBottom: 20 }}>
          Error<em style={{ color: 'var(--accent)' }}> inesperado.</em>
        </h1>
        <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Ocurrió un problema al cargar esta página. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={reset}>
            Intentar de nuevo <span className="btn-arrow">→</span>
          </button>
          <a href="/" className="btn btn-ghost">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
