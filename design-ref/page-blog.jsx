// VERDE. — Blog index & article page

function BlogPage({ setPage }) {
  return (
    <main className="page-section">
      <section style={{ padding: '40px 0 48px' }}>
        <div className="container">
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em', marginBottom: 12 }}>
            <a onClick={() => setPage({ name: 'home' })} style={{ cursor: 'pointer' }}>INICIO</a>
            <span style={{ margin: '0 10px' }}>/</span>
            <span style={{ color: 'var(--fg)' }}>DIARIO</span>
          </div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>DIARIO AGRONÓMICO</div>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 130px)', letterSpacing: '-0.025em', marginBottom: 24 }}>
            Aprende <em style={{ color: 'var(--accent)' }}>a cultivar.</em>
          </h1>
          <p style={{ color: 'var(--fg-dim)', fontSize: 19, maxWidth: 640, lineHeight: 1.5 }}>
            Guías estacionales, técnicas de cultivo y conocimiento agronómico escrito por agrónomos y horticultores en activo.
          </p>
        </div>
      </section>

      {/* Featured (first article) */}
      <section style={{ padding: '24px 0 60px' }}>
        <div className="container">
          {window.ARTICLES.slice(0, 1).map(a => (
            <article key={a.slug} onClick={() => setPage({ name: 'article', slug: a.slug })}
              data-cursor-hover
              style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr',
                background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)',
                overflow: 'hidden', cursor: 'none',
                transition: 'transform 0.5s var(--ease-out)',
                border: '1px solid var(--border)',
              }}
              className="blog-featured"
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="article-card-img" style={{ '--shape-color': a.image, backgroundColor: a.image, aspectRatio: 'auto', minHeight: 400 }} />
              <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 16, display: 'flex', gap: 16 }}>
                  <span>{a.category.toUpperCase()}</span>
                  <span style={{ color: 'var(--fg-dim)' }}>{a.minutes} MIN DE LECTURA</span>
                </div>
                <h2 className="display" style={{ fontSize: 'clamp(36px, 4.5vw, 60px)', letterSpacing: '-0.02em', marginBottom: 20 }}>{a.title}</h2>
                <p style={{ color: 'var(--fg-dim)', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>{a.excerpt}</p>
                <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
                  Leer artículo <span className="btn-arrow">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Other articles */}
      <section style={{ padding: '40px 0 80px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 36, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
            <h2 className="display" style={{ fontSize: 36 }}>Más lecturas</h2>
            <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em' }}>{window.ARTICLES.length - 1} ARTÍCULOS</span>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {window.ARTICLES.slice(1).map(a => (
              <article key={a.slug} className="article-card" onClick={() => setPage({ name: 'article', slug: a.slug })}>
                <div className="article-card-img" style={{ '--shape-color': a.image, backgroundColor: a.image }} />
                <div className="article-card-body">
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.category.toUpperCase()}</span>
                    <span>{a.minutes} MIN</span>
                  </div>
                  <h3 className="article-card-title">{a.title}</h3>
                  <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.55, marginTop: 12 }}>{a.excerpt}</p>
                </div>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 760px) {
          .blog-featured { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function ArticlePage({ setPage, slug }) {
  const article = window.ARTICLES.find(a => a.slug === slug) || window.ARTICLES[0];
  const others = window.ARTICLES.filter(a => a.slug !== article.slug).slice(0, 2);

  React.useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  return (
    <main className="page-section">
      <article>
        {/* Hero image */}
        <div style={{ width: '100%', height: 'clamp(280px, 50vw, 520px)', backgroundColor: article.image, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.1) 0%, transparent 30%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.2) 0%, transparent 40%)' }} />
        </div>

        <div className="container" style={{ maxWidth: 760, padding: '60px 32px' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em', marginBottom: 16 }}>
            <a onClick={() => setPage({ name: 'blog' })} style={{ cursor: 'pointer' }}>DIARIO</a>
            <span style={{ margin: '0 10px' }}>/</span>
            <span style={{ color: 'var(--accent)' }}>{article.category.toUpperCase()}</span>
            <span style={{ margin: '0 10px', color: 'var(--fg-dim)' }}>·</span>
            <span style={{ color: 'var(--fg-dim)' }}>{article.minutes} MIN DE LECTURA</span>
          </div>

          <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.025em', marginBottom: 24, lineHeight: 1.05 }}>
            {article.title}
          </h1>

          <p style={{ fontSize: 21, color: 'var(--fg-dim)', lineHeight: 1.5, marginBottom: 36, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {article.excerpt}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 24, paddingBottom: 40, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-fg)', fontFamily: 'var(--font-display)', fontSize: 22 }}>JM</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Juan Marín</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.05em' }}>Agrónomo · Vivero VERDE.</div>
            </div>
          </div>

          {/* Article body (sample / mock content) */}
          <div className="article-body" style={{ marginTop: 48, fontSize: 17, lineHeight: 1.7, color: 'var(--fg)' }}>
            <p style={{ marginBottom: 24 }}>
              En Colombia, los climas templados de altura ofrecen condiciones casi únicas en el continente para ciertos cultivos que comúnmente asociamos con regiones templadas del norte. Este artículo te guía paso a paso para entender qué considerar antes de empezar.
            </p>

            <h2 className="display" style={{ fontSize: 32, marginTop: 48, marginBottom: 16, letterSpacing: '-0.01em' }}>
              <em style={{ color: 'var(--accent)' }}>01.</em> Elige la variedad correcta
            </h2>
            <p style={{ marginBottom: 24 }}>
              No todas las variedades funcionan igual. Las que mejor se adaptan al trópico de altura colombiano han sido evaluadas durante años por centros de investigación nacionales. Pregunta siempre al vivero por el origen y los resultados productivos esperados.
            </p>

            <ul style={{ paddingLeft: 24, marginBottom: 24, display: 'grid', gap: 8, color: 'var(--fg-dim)' }}>
              <li>Pide certificación fitosanitaria a tu proveedor</li>
              <li>Consulta el manejo agronómico recomendado</li>
              <li>Visita una finca de referencia si es posible</li>
            </ul>

            <h2 className="display" style={{ fontSize: 32, marginTop: 48, marginBottom: 16, letterSpacing: '-0.01em' }}>
              <em style={{ color: 'var(--accent)' }}>02.</em> Prepara el sustrato
            </h2>
            <p style={{ marginBottom: 24 }}>
              La química del suelo es la base de todo. Una prueba de suelos básica te dirá si necesitas corregir el pH, aplicar materia orgánica o ajustar la disponibilidad de macronutrientes. Es una inversión pequeña con retornos enormes.
            </p>

            <blockquote style={{
              borderLeft: '3px solid var(--accent)',
              paddingLeft: 24, margin: '40px 0',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 24, lineHeight: 1.4, color: 'var(--fg)',
              letterSpacing: '-0.01em',
            }}>
              "Un cultivo sano empieza años antes en el suelo. La planta solo refleja lo que encuentra."
            </blockquote>

            <h2 className="display" style={{ fontSize: 32, marginTop: 48, marginBottom: 16, letterSpacing: '-0.01em' }}>
              <em style={{ color: 'var(--accent)' }}>03.</em> Riego y mantenimiento
            </h2>
            <p style={{ marginBottom: 24 }}>
              El error más común en cultivos nuevos es el exceso de riego. La frecuencia y volumen dependen del clima local, del sustrato y de la etapa de desarrollo. Aprende a leer la planta antes de regar por costumbre.
            </p>

            <p style={{ marginBottom: 24 }}>
              Para más detalles sobre técnicas específicas, escríbenos por WhatsApp y nuestro equipo agronómico te acompañará personalmente desde la primera siembra hasta la primera cosecha.
            </p>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 60, padding: 32, background: 'color-mix(in oklab, var(--accent) 8%, var(--bg-elev))', border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--border))', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <h3 className="display" style={{ fontSize: 28, marginBottom: 10, letterSpacing: '-0.01em' }}>
              ¿Listo para empezar tu cultivo?
            </h3>
            <p style={{ color: 'var(--fg-dim)', marginBottom: 20 }}>
              Explora nuestro catálogo de plántulas certificadas.
            </p>
            <button className="btn btn-primary" onClick={() => setPage({ name: 'catalog' })}>
              Ver catálogo <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      </article>

      {/* Related */}
      {others.length > 0 && (
        <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="eyebrow" style={{ marginBottom: 16 }}>SIGUE LEYENDO</div>
            <h2 className="display" style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', marginBottom: 40, letterSpacing: '-0.02em' }}>
              Más del <em style={{ color: 'var(--accent)' }}>diario.</em>
            </h2>
            <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {others.map(a => (
                <article key={a.slug} className="article-card" onClick={() => setPage({ name: 'article', slug: a.slug })}>
                  <div className="article-card-img" style={{ '--shape-color': a.image, backgroundColor: a.image }} />
                  <div className="article-card-body">
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>{a.category.toUpperCase()}</div>
                    <h3 className="article-card-title">{a.title}</h3>
                  </div>
                </article>
              ))}
            </Reveal>
          </div>
        </section>
      )}
    </main>
  );
}

window.BlogPage = BlogPage;
window.ArticlePage = ArticlePage;
