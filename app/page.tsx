import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { CATALOG, CATEGORIES, TESTIMONIALS, ARTICLES, getFeaturedProducts, formatCOP } from '@/data/catalog';
import ProductCard from '@/components/ProductCard';
import ProductShape from '@/components/ProductShape';
import Reveal from '@/components/Reveal';
import NewsletterForm from '@/components/NewsletterForm';
import HorizontalScrollerClient from '@/components/HorizontalScrollerClient';

export const metadata: Metadata = {
  title: 'VERDE. — Vivero & Agricultura Moderna',
  description: 'Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos. Envío a toda Colombia con garantía de plantas vivas.',
};

export default function HomePage() {
  const featured = getFeaturedProducts().slice(0, 4);

  return (
    <main>
      {/* ── HERO ─────────────────────────────────────── */}
      <HeroSection />

      {/* ── MARQUEE ──────────────────────────────────── */}
      <div className="marquee" aria-label="Beneficios de VERDE">
        <div className="marquee-track">
          {['Envío a toda Colombia', 'Garantía planta viva', 'Asesoría agronómica', 'Genética certificada', 'Empaque biodegradable',
            'Envío a toda Colombia', 'Garantía planta viva', 'Asesoría agronómica', 'Genética certificada', 'Empaque biodegradable'].map((t, i) => (
            <span className="marquee-item" key={i}>
              {t}<span className="dot" />
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ────────────────────────── */}
      <section style={{ padding: '140px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>SELECCIÓN DEL VIVERO</div>
              <h2 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>
                Productos <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>destacados.</em>
              </h2>
            </div>
            <Link href="/catalogo" className="btn btn-ghost">
              Ver todo <span className="btn-arrow">→</span>
            </Link>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── EDITORIAL — Del campo a tu cultivo ──────── */}
      <section className="editorial-immersive" style={{ padding: '120px 0' }}>
        <div className="editorial-immersive-overlay" />
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="editorial-grid">
            {/* Foto real del vivero */}
            <Reveal>
              <div style={{
                aspectRatio: '4/5',
                borderRadius: 'var(--radius-lg)',
                position: 'relative', overflow: 'hidden',
              }}>
                <Image
                  src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=85"
                  alt="Vivero VERDE en Antioquia, Colombia"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
                  <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>VIVERO · VEREDA LA CEJA</div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>Antioquia, Colombia — 1.950 msnm</p>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 20, color: 'var(--fg-dim)' }}>DEL CAMPO A TU CULTIVO</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 78px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                No vendemos plántulas.<br />
                Vendemos <em style={{ color: 'var(--accent)' }}>cosechas.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.7, maxWidth: 480, marginBottom: 36 }}>
                Cada variedad la seleccionamos en viveros especializados de Antioquia, Cundinamarca y el Eje Cafetero. Trabajamos con propagadores certificados, no con semilla genérica.
              </p>
              <div style={{ display: 'flex', gap: 40, marginBottom: 40, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { n: '21', label: 'variedades curadas' },
                  { n: '12', label: 'meses de cultivo promedio' },
                  { n: '100%', label: 'garantía de llegada' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="display" style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--accent)', lineHeight: 1 }}>{s.n}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 6, letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <Link href="/catalogo" className="btn btn-primary">Explorar catálogo <span className="btn-arrow">→</span></Link>
            </Reveal>
          </div>
        </div>
        <style>{`@media (max-width: 760px) { .editorial-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* ── HORIZONTAL CATEGORY SCROLL ───────────────── */}
      <section style={{ padding: '100px 0' }}>
        <div className="container" style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>OCHO FAMILIAS</div>
          <h2 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}>
            Categorías <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>destacadas.</em>
          </h2>
        </div>
        <HorizontalScroller />
      </section>

      {/* ── MANIFESTO / BENEFITS ─────────────────────── */}
      <section style={{ padding: '140px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 24 }}>POR QUÉ COMPRAR EN VERDE.</div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 92px)', maxWidth: 1100, marginBottom: 64, letterSpacing: '-0.02em' }}>
              Una planta no es un objeto cualquiera. Es{' '}
              <em style={{ color: 'var(--accent)' }}>un ser vivo que confiamos a tus manos.</em>{' '}
              Por eso hacemos esto bien.
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            {[
              { n: '01', t: 'Envíos a toda Colombia', d: 'Empaque especializado para plantas vivas. Llegada garantizada en 2 a 5 días hábiles.' },
              { n: '02', t: 'Plantas seleccionadas', d: 'Material genético certificado. Cada plántula pasa por inspección agronómica antes del despacho.' },
              { n: '03', t: 'Asesoría especializada', d: 'Acompañamiento de un agrónomo desde la compra hasta la primera cosecha. Sin costo adicional.' },
              { n: '04', t: 'Garantía planta viva', d: 'Si tu planta no sobrevive al envío, la reponemos sin preguntas. Es nuestra promesa.' },
            ].map((item) => (
              <div key={item.n}>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 24, letterSpacing: '0.1em' }}>{item.n} ─</div>
                <h3 className="display" style={{ fontSize: 30, marginBottom: 12, letterSpacing: '-0.01em' }}>{item.t}</h3>
                <p style={{ color: 'var(--fg-dim)', lineHeight: 1.55 }}>{item.d}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── PARALLAX SHOWCASE ────────────────────────── */}
      <section style={{ padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}
            className="parallax-grid" data-parallax-section>
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 16 }}>EL ARÁNDANO COLOMBIANO</div>
              <h2 className="display" style={{ fontSize: 'clamp(48px, 6vw, 92px)', marginBottom: 24, letterSpacing: '-0.02em' }}>
                Producción <em style={{ color: 'var(--accent)' }}>en altura.</em><br />
                Cosecha en 12 meses.
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.6, maxWidth: 480, marginBottom: 32 }}>
                Variedades Biloxi, Emerald y Sharpblue, aclimatadas al trópico de altura colombiano entre los 1.800 y 2.800 msnm.
              </p>
              <Link href="/producto/br-01" className="btn btn-primary">
                Conocer arándano <span className="btn-arrow">→</span>
              </Link>
            </Reveal>
            <div style={{
              aspectRatio: '4/5',
              background: 'var(--parallax-card-bg)',
              borderRadius: 'var(--radius-lg)',
              display: 'grid', placeItems: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div className="product-shape cluster" style={{ ['--shape-color' as string]: '#3a4a8a', width: '65%' }} />
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)', letterSpacing: '0.1em' }}>
                <span>ARÁNDANO / BILOXI</span>
                <span>{formatCOP(45000)}</span>
              </div>
            </div>
          </div>
        </div>
        <style>{`@media (max-width: 760px) { .parallax-grid { grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: 56 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>LO QUE DICEN NUESTROS CLIENTES</div>
            <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', letterSpacing: '-0.02em' }}>
              Confianza <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>cultivada.</em>
            </h2>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
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

      {/* ── EDITORIAL — Cultiva en Colombia ──────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 14 }}>CULTIVA EN COLOMBIA</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 100px)', maxWidth: 1000, letterSpacing: '-0.025em' }}>
              Un agrónomo responde<br />
              <em style={{ color: 'var(--accent)' }}>cada planta que vendemos.</em>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 64, borderTop: '1px solid var(--border)' }} className="agro-stats-grid">
            {[
              { n: '10', unit: 'ciudades', sub: 'Con envío verificado en Colombia' },
              { n: '6', unit: 'meses', sub: 'De asesoría agronómica incluida gratis' },
              { n: '< 24h', unit: 'respuesta', sub: 'WhatsApp o correo, siempre humano' },
            ].map((s, i) => (
              <Reveal key={i}>
                <div style={{ padding: '48px 0 48px', paddingRight: i < 2 ? 48 : 0, paddingLeft: i > 0 ? 48 : 0, borderRight: i < 2 ? '1px solid var(--border)' : 'none' }} className={`agro-stat-${i}`}>
                  <div className="display" style={{ fontSize: 'clamp(60px, 7vw, 100px)', color: 'var(--accent)', lineHeight: 1, letterSpacing: '-0.03em' }}>{s.n}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 4, marginBottom: 10 }}>{s.unit}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>{s.sub.toUpperCase()}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ marginTop: 48 }}>
            <Link href="/diario" className="btn btn-ghost">Leer el diario agronómico <span className="btn-arrow">→</span></Link>
          </div>
        </div>
        <style>{`@media (max-width: 760px) { .agro-stats-grid { grid-template-columns: 1fr !important; } .agro-stat-0, .agro-stat-1 { border-right: none !important; border-bottom: 1px solid var(--border) !important; padding-right: 0 !important; padding-left: 0 !important; } }`}</style>
      </section>

      {/* ── BLOG TEASER ──────────────────────────────── */}
      <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>DEL DIARIO</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 88px)', letterSpacing: '-0.02em' }}>
                Aprende <em style={{ color: 'var(--accent)' }}>a cultivar.</em>
              </h2>
            </div>
            <Link href="/diario" className="btn btn-ghost">
              Ver diario completo <span className="btn-arrow">→</span>
            </Link>
          </div>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {ARTICLES.slice(0, 3).map((a) => (
              <Link key={a.slug} href={`/diario/${a.slug}`} className="article-card">
                <div
                  className="article-card-img"
                  style={{
                    backgroundColor: a.image,
                    backgroundImage: ARTICLE_PHOTOS[a.slug] ? `url(${ARTICLE_PHOTOS[a.slug]})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="article-card-body">
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.category.toUpperCase()}</span>
                    <span>{a.minutes} MIN</span>
                  </div>
                  <h3 className="article-card-title">{a.title}</h3>
                </div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────── */}
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
            <NewsletterForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function FloatingBotanicals() {
  const leaves = [
    { top: '12%', left: '7%',  w: 72,  h: 92,  rot: '35deg',  delay: '0s',    dur: '7.5s', opacity: '0.13' },
    { top: '68%', left: 'auto', right: '7%', w: 52, h: 68, rot: '-25deg', delay: '1.4s', dur: '9.2s', opacity: '0.10' },
    { top: '38%', left: '3%',  w: 42,  h: 56,  rot: '-15deg', delay: '2.8s', dur: '11s',  opacity: '0.08' },
    { top: '18%', left: 'auto', right: '4%', w: 64, h: 84, rot: '48deg',  delay: '0.7s', dur: '8.4s', opacity: '0.11' },
    { top: '78%', left: '14%', w: 36,  h: 48,  rot: '-40deg', delay: '2.1s', dur: '10.5s',opacity: '0.09' },
    { top: '52%', left: 'auto', right: '13%', w: 46, h: 60, rot: '22deg', delay: '3.6s', dur: '12s',  opacity: '0.08' },
  ] as const;
  return (
    <>
      {leaves.map((l, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="hero-botanical"
          style={{
            top: l.top,
            left: 'left' in l && l.left !== 'auto' ? l.left : undefined,
            right: 'right' in l ? l.right : undefined,
            width: l.w,
            height: l.h,
            ['--leaf-rot' as string]: l.rot,
            ['--leaf-delay' as string]: l.delay,
            ['--leaf-dur' as string]: l.dur,
            ['--leaf-opacity' as string]: l.opacity,
          }}
        />
      ))}
    </>
  );
}

const CAT_PHOTOS: Record<string, string> = {
  frutales:      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
  citricos:      'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=600&q=80',
  berries:       'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=600&q=80',
  suculentas:    'https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=600&q=80',
  materas:       'https://images.unsplash.com/photo-1591189864121-f64e1060793b?auto=format&fit=crop&w=600&q=80',
  fertilizantes: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
  sustratos:     'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80',
  otros:         'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=600&q=80',
};

const ARTICLE_PHOTOS: Record<string, string> = {
  'cultivar-arandanos': 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=800&q=80',
  'limon-tahiti':       'https://images.unsplash.com/photo-1590502160462-58b41354f588?auto=format&fit=crop&w=800&q=80',
  'riego-suculentas':   'https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=800&q=80',
  'fertilizar-frutales':'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
};

function HeroSection() {
  return (
    <section style={{ height: '100vh', minHeight: 720, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
      {/* Foto de fondo con overlay */}
      <div className="hero-photo-bg">
        <Image
          src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1920&q=70"
          alt="Vivero VERDE — plantas y cultivos"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <FloatingBotanicals />
      <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
        <div className="eyebrow reveal in" style={{ marginBottom: 24 }}>COSECHA 2026 · VIVERO LA CEJA · ANTIOQUIA</div>
        <h1 className="display hero-heading" style={{ fontSize: 'clamp(52px, 8vw, 120px)', marginBottom: 28, letterSpacing: '-0.025em', lineHeight: 0.95, maxWidth: 1200, marginInline: 'auto' }}>
          Todo para tu cultivo<br />
          <em style={{ fontStyle: 'italic', color: 'var(--hero-em)' }}>en un solo lugar.</em>
        </h1>
        <Reveal>
          <p style={{ fontSize: 19, color: 'var(--fg-dim)', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.5 }}>
            Frutales, ornamentales, suculentas e insumos agrícolas seleccionados por agrónomos. Envío a toda Colombia con garantía de plantas vivas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', pointerEvents: 'auto', flexWrap: 'wrap' }}>
            <Link href="/catalogo" className="btn btn-primary">
              Ver catálogo <span className="btn-arrow">→</span>
            </Link>
            <Link href="/asesoria" className="btn btn-ghost">Contactar asesor</Link>
          </div>
        </Reveal>
      </div>
      <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.22em' }}>SCROLL</div>
        <div style={{ width: 1, height: 38, background: 'linear-gradient(to bottom, var(--fg-dim), transparent)' }} />
      </div>
    </section>
  );
}

function HorizontalScroller() {
  return (
    <HorizontalScrollerClient>
      <div style={{ display: 'flex', gap: 20, padding: '0 32px', width: 'max-content' }}>
        {CATEGORIES.map((cat, i) => {
          const product = CATALOG.find((p) => p.category === cat.id);
          const accent = i % 2 === 0 ? 'var(--accent)' : 'var(--accent-2)';
          return (
            <Link
              key={cat.id}
              href={`/catalogo/${cat.id}`}
              data-cursor-hover
              className="cat-card"
              style={{
                width: 340, height: 480,
                background: i % 2 === 0 ? 'var(--cat-card-a)' : 'var(--cat-card-b)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                position: 'relative', overflow: 'hidden',
                border: '1px solid var(--border)',
                textDecoration: 'none', color: 'inherit',
                transition: 'transform 0.5s var(--ease-out)',
              }}
            >
              {CAT_PHOTOS[cat.id] && (
                <div
                  className="cat-card-photo"
                  style={{
                    backgroundImage: `url(${CAT_PHOTOS[cat.id]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
              <div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
                  {String(i + 1).padStart(2, '0')} / {String(CATEGORIES.length).padStart(2, '0')}
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
            </Link>
          );
        })}
      </div>
    </HorizontalScrollerClient>
  );
}
