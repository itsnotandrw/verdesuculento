import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICLES } from '@/data/catalog';

const ARTICLE_PHOTOS: Record<string, string> = {
  'cultivar-arandanos': 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=1600&q=85',
  'limon-tahiti':       'https://images.unsplash.com/photo-1590502160462-58b41354f588?auto=format&fit=crop&w=1600&q=85',
  'riego-suculentas':   'https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=1600&q=85',
  'fertilizar-frutales':'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1600&q=85',
};

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = ARTICLES.find((a) => a.slug === params.slug);
  if (!article) return {};
  return {
    title: `${article.title} — VERDE. Diario`,
    description: article.excerpt,
  };
}

export default function ArticlePage({ params }: Props) {
  const article = ARTICLES.find((a) => a.slug === params.slug);
  if (!article) notFound();

  const related = ARTICLES.filter((a) => a.slug !== params.slug).slice(0, 2);

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: 48, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/diario" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Diario</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>{article.category}</span>
        </nav>

        {/* Header */}
        <header style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <span className="chip">{article.category}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{article.minutes} MIN LECTURA</span>
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 24 }}>
            {article.title}
          </h1>
          <p style={{ fontSize: 20, color: 'var(--fg-dim)', lineHeight: 1.55, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
            {article.excerpt}
          </p>
        </header>

        {/* Hero image */}
        <div style={{
          height: 440,
          backgroundColor: article.image,
          backgroundImage: ARTICLE_PHOTOS[article.slug]
            ? `url(${ARTICLE_PHOTOS[article.slug]})`
            : 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15), transparent 50%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 64,
        }} />

        {/* Article body */}
        <div style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: 'var(--fg-dim)',
          paddingBottom: 64,
          borderBottom: '1px solid var(--border)',
        }}>
          {(article.body ?? '').split('\n').map((para, i) => (
            para.trim() ? <p key={i} style={{ marginBottom: 24 }}>{para}</p> : null
          ))}

          {/* Placeholder content sections to fill out the article */}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--fg)', margin: '48px 0 20px', fontStyle: 'italic' }}>
            Preparación del terreno
          </h2>
          <p>
            El éxito en el cultivo comienza meses antes de la siembra. La preparación adecuada del suelo — su estructura, pH y materia orgánica — determina en gran medida el resultado final. Un suelo bien preparado reduce significativamente la necesidad de intervenciones posteriores.
          </p>
          <p>
            Para lograrlo, realiza un análisis de suelo previo. Este análisis, disponible en laboratorios agronómicos regionales por menos de $80.000 COP, te dará información precisa sobre el pH, la textura, los macro y micronutrientes disponibles y la necesidad de enmiendas.
          </p>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--fg)', margin: '48px 0 20px', fontStyle: 'italic' }}>
            Manejo del agua
          </h2>
          <p>
            El riego eficiente es uno de los pilares del cultivo sostenible. En Colombia, los regímenes de lluvia varían significativamente según la región y la altitud. Adaptar el plan de riego a estas condiciones es fundamental para evitar tanto el estrés hídrico como el exceso de humedad.
          </p>
          <p>
            El riego por goteo, aunque representa una inversión inicial mayor, reduce el consumo de agua hasta en un 40% comparado con el riego por aspersión y disminuye el riesgo de enfermedades foliares. Para producciones familiares, el riego manual con frecuencias bien definidas puede ser igualmente efectivo si se monitorea correctamente.
          </p>

          <div style={{
            margin: '48px 0',
            padding: '28px 32px',
            background: 'color-mix(in oklab, var(--accent) 8%, var(--bg-elev))',
            borderLeft: '3px solid var(--accent)',
            borderRadius: '0 var(--radius) var(--radius) 0',
          }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>CONSEJO DEL AGRÓNOMO</div>
            <p style={{ margin: 0, color: 'var(--fg)', fontSize: 16, lineHeight: 1.6 }}>
              Si tienes dudas específicas sobre tu cultivo — variedad, altitud, tipo de suelo — escríbenos por WhatsApp. Nuestro equipo agronómico responde en menos de 24 horas sin costo adicional para clientes de VERDE.
            </p>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', color: 'var(--fg)', margin: '48px 0 20px', fontStyle: 'italic' }}>
            Control de plagas y enfermedades
          </h2>
          <p>
            El manejo integrado de plagas (MIP) es el enfoque más efectivo y sostenible. Combina monitoreo constante, umbrales de acción, control biológico y — como último recurso — intervenciones químicas selectivas y de bajo impacto ambiental.
          </p>
          <p>
            Identificar tempranamente cualquier síntoma en el follaje, los tallos o los frutos permite intervenciones menos agresivas y más económicas. Las plagas más comunes en cultivos de Colombia incluyen áfidos, ácaros, trips y moscas de la fruta, cada una con estrategias de manejo específicas.
          </p>
        </div>

        {/* Author / CTA */}
        <div style={{ padding: '48px 0', display: 'flex', gap: 20, alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: '50% 0 50% 50%', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Equipo agronómico VERDE.</div>
            <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Ingenieros agrónomos con experiencia en cultivos tropicales colombianos. ¿Tienes preguntas sobre este tema?{' '}
              <a href="https://wa.me/573205550102" style={{ color: 'var(--accent)' }} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div style={{ paddingTop: 48, marginBottom: 80 }}>
          <Link href="/diario" className="btn btn-ghost">
            ← Volver al diario
          </Link>
        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 64, paddingBottom: 80 }}>
          <div className="container">
            <div className="eyebrow" style={{ marginBottom: 16 }}>SEGUIR LEYENDO</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginBottom: 40 }}>
              Más artículos<em style={{ color: 'var(--accent)' }}>.</em>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {related.map((a) => (
                <Link key={a.slug} href={`/diario/${a.slug}`} className="article-card">
                  <div className="article-card-img" style={{ backgroundColor: a.image }} />
                  <div className="article-card-body">
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a.category.toUpperCase()}</span>
                      <span>{a.minutes} MIN</span>
                    </div>
                    <h3 className="article-card-title">{a.title}</h3>
                    <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{a.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
