import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from '@/data/catalog';
import ArticleSwapper from '@/components/ArticleSwapper';

const ARTICLE_PHOTOS: Record<string, string> = {
  'cultivar-arandanos': 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=1200&q=80',
  'limon-tahiti':       'https://images.unsplash.com/photo-1590502160462-58b41354f588?auto=format&fit=crop&w=1200&q=80',
  'riego-suculentas':   'https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=1200&q=80',
  'fertilizar-frutales':'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80',
};

export const metadata: Metadata = {
  title: 'Diario agronómico — VERDE.',
  description: 'Guías de cultivo, manejo agronómico y consejos para tu huerto. Contenido educativo del equipo de VERDE.',
};

export default function BlogPage() {
  const [featured, ...rest] = ARTICLES;

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container">
        <nav style={{ marginBottom: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Inicio</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Diario</span>
        </nav>

        <div style={{ marginBottom: 72 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>DIARIO AGRONÓMICO</div>
          <h1 className="display" style={{ fontSize: 'clamp(52px, 8vw, 120px)', maxWidth: 900 }}>
            Aprende a <em style={{ color: 'var(--accent)' }}>cultivar.</em>
          </h1>
          <p style={{ color: 'var(--fg-dim)', maxWidth: 560, marginTop: 20, fontSize: 17, lineHeight: 1.6 }}>
            Guías escritas por agrónomos. Sin jargon, sin adornos. Lo que necesitas saber para que tu planta prospere.
          </p>
        </div>

        {/* Featured article */}
        <Link
          href={`/diario/${featured.slug}`}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48,
            background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', marginBottom: 48,
            textDecoration: 'none', color: 'inherit',
            border: '1px solid var(--border)',
            transition: 'transform 0.4s var(--ease-out)',
          }}
          className="featured-article"
        >
          <div style={{
            aspectRatio: '4/3',
            backgroundColor: featured.image,
            backgroundImage: ARTICLE_PHOTOS[featured.slug]
              ? `url(${ARTICLE_PHOTOS[featured.slug]})`
              : 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 40%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{ padding: '48px 40px 48px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', marginBottom: 20, display: 'flex', gap: 16 }}>
                <span>{featured.category.toUpperCase()}</span>
                <span>{featured.minutes} MIN LECTURA</span>
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(32px, 3vw, 52px)', lineHeight: 1.1, marginBottom: 20 }}>{featured.title}</h2>
              <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, fontSize: 16 }}>{featured.excerpt}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 32, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
              Leer artículo <span>→</span>
            </div>
          </div>
        </Link>

        {/* Article grid + CardSwap showcase */}
        <section style={{ marginBottom: 96 }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>EXPLORA LAS GUÍAS</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
            padding: '40px 0',
          }} className="diario-swap-grid">
            {/* Left: text + CTA */}
            <div>
              <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 56px)', marginBottom: 20, letterSpacing: '-0.02em' }}>
                Guías que <em style={{ color: 'var(--accent)' }}>funcionan.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 16, lineHeight: 1.65, maxWidth: 420, marginBottom: 28 }}>
                Cada artículo está escrito por nuestro equipo agronómico con experiencia real en campo.
                Sin teoría vacía — solo lo que probamos en el vivero.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Array.from(new Set(rest.map((a) => a.category))).map((cat) => (
                  <span key={cat} className="chip">{cat}</span>
                ))}
              </div>
            </div>
            {/* Right: animated card stack */}
            <div style={{ height: 500, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArticleSwapper articles={rest} photos={ARTICLE_PHOTOS} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 80, padding: '64px 0', borderTop: '1px solid var(--border)' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>¿TIENES UNA PREGUNTA?</div>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 72px)', marginBottom: 20 }}>
            Nuestro agrónomo <em style={{ color: 'var(--accent)' }}>te responde.</em>
          </h2>
          <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 32px' }}>Escríbenos por WhatsApp o correo. Respondemos en menos de 24 horas.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://wa.me/573205550102" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              WhatsApp <span className="btn-arrow">→</span>
            </a>
            <a href="mailto:hola@verde.co" className="btn btn-ghost">hola@verde.co</a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) { .featured-article { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
