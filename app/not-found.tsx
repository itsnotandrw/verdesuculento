import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
      <div className="container">
        <div style={{ width: 80, height: 100, background: 'var(--border-strong)', borderRadius: '50% 0 50% 50%', transform: 'rotate(-15deg)', margin: '0 auto 24px', opacity: 0.3 }} />
        <div className="eyebrow" style={{ marginBottom: 16 }}>PÁGINA NO ENCONTRADA</div>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 6vw, 88px)', marginBottom: 20 }}>
          No encontramos<em style={{ color: 'var(--accent)' }}> lo que buscas.</em>
        </h1>
        <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Es posible que el enlace esté roto o que la página haya sido movida. Explora nuestro catálogo para encontrar lo que necesitas.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/catalogo" className="btn btn-primary">
            Ver catálogo <span className="btn-arrow">→</span>
          </Link>
          <Link href="/" className="btn btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
