// VERDE. — Page: Home
const { useState: useStateHome, useEffect: useEffectHome, useRef: useRefHome } = React;

function HomePage({ setPage }) {
  const heroRef = useRefHome(null);
  const parallaxRef = useRefHome(null);

  useEffectHome(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${y * 0.3}px)`;
        heroRef.current.style.opacity = Math.max(0, 1 - y / 700);
      }
      const zone = y < 800 ? 1 : y < 1800 ? 2 : 3;
      document.body.className = `scroll-zone-${zone}`;
      document.querySelectorAll('[data-parallax]').forEach(el => {
        const speed = parseFloat(el.dataset.parallax);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        el.style.transform = `translateY(${center * speed}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main>
      {/* HERO */}
      <section style={{ height: '100vh', minHeight: 720, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        <div ref={heroRef} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div className="hero-product-glow" />
          <div className="hero-product"><div className="hero-product-shape" /></div>
        </div>

        {/* Decorative botanical accents (CSS only) */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '15%', left: '8%', width: 80, height: 100, background: 'linear-gradient(155deg, var(--accent), color-mix(in oklab, var(--accent) 60%, black))', borderRadius: '50% 5% 50% 5%', transform: 'rotate(35deg)', opacity: 0.18, filter: 'blur(0.5px)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: '20%', right: '10%', width: 60, height: 80, background: 'linear-gradient(155deg, var(--accent), color-mix(in oklab, var(--accent) 60%, black))', borderRadius: '50% 5% 50% 5%', transform: 'rotate(-25deg)', opacity: 0.15 }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: '60%', left: '5%', width: 40, height: 55, background: 'linear-gradient(155deg, var(--accent-2), color-mix(in oklab, var(--accent-2) 60%, black))', borderRadius: '50% 5% 50% 5%', transform: 'rotate(15deg)', opacity: 0.2 }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
          <div className="eyebrow reveal in" style={{ marginBottom: 24 }}>COSECHA 2026 · VIVERO LA CEJA · ANTIOQUIA</div>
          <h1 className="display" style={{ fontSize: 'clamp(52px, 8vw, 120px)', marginBottom: 28, letterSpacing: '-0.025em', lineHeight: 0.95, maxWidth: 1200, marginInline: 'auto' }}>
            Todo para tu cultivo<br/>
            <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>en un solo lugar.</em>
          </h1>
          <Reveal>
            <p style={{ fontSize: 19, color: 'var(--fg-dim)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.5 }}>
              Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos. Envío a toda Colombia con garantía de plantas vivas.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', pointerEvents: 'auto', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setPage({ name: 'catalog' })}>
                Ver catálogo <span className="btn-arrow">→</span>
              </button>
              <button className="btn btn-ghost">
                Contactar asesor
              </button>
            </div>
          </Reveal>
        </div>

        <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.22em' }}>SCROLL</div>
          <div style={{ width: 1, height: 38, background: 'linear-gradient(to bottom, var(--fg-dim), transparent)' }} />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-track">
          {['Envío a toda Colombia', 'Garantía planta viva', 'Asesoría agronómica', 'Genética certificada', 'Empaque biodegradable'].concat(['Envío a toda Colombia', 'Garantía planta viva', 'Asesoría agronómica', 'Genética certificada', 'Empaque biodegradable']).map((t, i) => (
            <span className="marquee-item" key={i}>{t}<span className="dot" /></span>
          ))}
        </div>
      </div>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: '140px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>SELECCIÓN DEL VIVERO</div>
              <h2 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>
                Productos <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>destacados.</em>
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage({ name: 'catalog' })}>
              Ver todo <span className="btn-arrow">→</span>
            </button>
          </div>

          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {window.CATALOG.filter(p => p.badge).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} onClick={() => setPage({ name: 'product', id: p.id })} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* HORIZONTAL SCROLL CATEGORIES */}
      <section style={{ padding: '100px 0' }}>
        <div className="container" style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>OCHO FAMILIAS</div>
          <h2 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}>
            Categorías <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>destacadas.</em>
          </h2>
        </div>
        <HorizontalScroller setPage={setPage} />
      </section>

      {/* MANIFIESTO / BENEFITS */}
      <section style={{ padding: '140px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 24 }}>POR QUÉ COMPRAR EN VERDE.</div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 92px)', maxWidth: 1100, marginBottom: 64, letterSpacing: '-0.02em' }}>
              Una planta no es un objeto cualquiera. Es <em style={{ color: 'var(--accent)' }}>un ser vivo que confiamos a tus manos.</em> Por eso hacemos esto bien.
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            {[
              { n: '01', t: 'Envíos a toda Colombia', d: 'Empaque especializado para plantas vivas. Llegada garantizada en 2 a 5 días hábiles.' },
              { n: '02', t: 'Plantas seleccionadas', d: 'Material genético certificado. Cada plántula pasa por inspección agronómica antes del despacho.' },
              { n: '03', t: 'Asesoría especializada', d: 'Acompañamiento de un agrónomo desde la compra hasta la primera cosecha. Sin costo adicional.' },
              { n: '04', t: 'Garantía planta viva', d: 'Si tu planta no sobrevive al envío, la reponemos sin preguntas. Es nuestra promesa.' },
            ].map(item => (
              <div key={item.n}>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 24, letterSpacing: '0.1em' }}>{item.n} ─</div>
                <h3 className="display" style={{ fontSize: 30, marginBottom: 12, letterSpacing: '-0.01em' }}>{item.t}</h3>
                <p style={{ color: 'var(--fg-dim)', lineHeight: 1.55 }}>{item.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* PARALLAX SHOWCASE — featured single product */}
      <section style={{ padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="parallax-grid">
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 16 }}>EL ARÁNDANO COLOMBIANO</div>
              <h2 className="display" style={{ fontSize: 'clamp(48px, 6vw, 92px)', marginBottom: 24, letterSpacing: '-0.02em' }}>
                Producción <em style={{ color: 'var(--accent)' }}>en altura.</em><br/>
                Cosecha en 12 meses.
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.6, maxWidth: 480, marginBottom: 32 }}>
                Variedades Biloxi, Emerald y Sharpblue, aclimatadas al trópico de altura colombiano entre los 1.800 y 2.800 msnm. Sustrato ácido incluido. Asesoría técnica gratis durante los primeros 6 meses.
              </p>
              <button className="btn btn-primary" onClick={() => setPage({ name: 'product', id: 'br-01' })}>
                Conocer arándano <span className="btn-arrow">→</span>
              </button>
            </Reveal>
            <div ref={parallaxRef} data-parallax="-0.08" style={{ aspectRatio: '4/5', background: 'var(--parallax-card-bg)', borderRadius: 'var(--radius-lg)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div className="product-shape cluster" style={{ '--shape-color': '#3a4a8a', width: '65%' }} />
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>
                <span>ARÁNDANO / BILOXI</span>
                <span>$45.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>LO QUE DICEN NUESTROS CLIENTES</div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', letterSpacing: '-0.02em' }}>
              Confianza <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>cultivada.</em>
            </h2>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {window.TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <p className="testimonial-text">{t.text}</p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2, letterSpacing: '0.05em' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* BLOG TEASER */}
      <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>DEL DIARIO</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', letterSpacing: '-0.02em' }}>
                Aprende <em style={{ color: 'var(--accent)' }}>a cultivar.</em>
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={() => setPage({ name: 'blog' })}>
              Ver diario completo <span className="btn-arrow">→</span>
            </button>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {window.ARTICLES.slice(0, 3).map((a) => (
              <article key={a.slug} className="article-card" onClick={() => setPage({ name: 'article', slug: a.slug })}>
                <div className="article-card-img" style={{ '--shape-color': a.image, backgroundColor: a.image }} />
                <div className="article-card-body">
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.category.toUpperCase()}</span>
                    <span>{a.minutes} MIN</span>
                  </div>
                  <h3 className="article-card-title">{a.title}</h3>
                </div>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>BOLETÍN AGRONÓMICO</div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', maxWidth: 900, margin: '0 auto 28px', letterSpacing: '-0.02em' }}>
              Consejos de cultivo. <em style={{ color: 'var(--accent)' }}>Una vez al mes.</em>
            </h2>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 32px' }}>
              Guías estacionales, nuevas variedades en el vivero y descuentos exclusivos para suscriptores.
            </p>
            <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', maxWidth: 480, margin: '0 auto', gap: 0, border: '1px solid var(--border-strong)', borderRadius: 999, padding: 6 }}>
              <input type="email" placeholder="tu@email.com" style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 20px', outline: 'none', color: 'var(--fg)' }} />
              <button className="btn btn-primary" type="submit">Suscribirme</button>
            </form>
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 760px) {
          .parallax-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

// Horizontal scroller for categories
function HorizontalScroller({ setPage }) {
  const trackRef = useRefHome(null);
  return (
    <div className="no-scrollbar" style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }} ref={trackRef}>
      <div style={{ display: 'flex', gap: 20, padding: '0 32px', width: 'max-content' }}>
        {window.CATEGORIES.map((cat, i) => {
          const product = window.CATALOG.find(p => p.category === cat.id);
          const accent = i % 2 === 0 ? 'var(--accent)' : 'var(--accent-2)';
          return (
            <article
              key={cat.id}
              onClick={() => setPage({ name: 'category', cat: cat.id })}
              data-cursor-hover
              style={{
                width: 340, height: 480,
                background: i % 2 === 0 ? 'var(--cat-card-a)' : 'var(--cat-card-b)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'none',
                transition: 'transform 0.5s var(--ease-out)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
                  {String(i + 1).padStart(2, '0')} / {String(window.CATEGORIES.length).padStart(2, '0')}
                </div>
                <h3 className="display" style={{ fontSize: 42, marginBottom: 10, letterSpacing: '-0.02em' }}>{cat.name}</h3>
                <p style={{ color: 'var(--fg-dim)', maxWidth: 240, lineHeight: 1.5 }}>{cat.blurb}</p>
              </div>
              {product && (
                <div style={{ display: 'grid', placeItems: 'center', flex: 1 }}>
                  <ProductShape product={product} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{cat.count} productos</span>
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: accent, color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontSize: 16 }}>→</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

window.HomePage = HomePage;
