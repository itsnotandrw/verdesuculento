import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Nosotros — VERDE.',
  description: 'Conoce el equipo detrás de VERDE. Agrónomos y amantes de las plantas comprometidos con la agricultura moderna en Colombia.',
};

const TEAM = [
  {
    name: 'Sebastián Mora',
    role: 'Fundador & Agrónomo jefe',
    bio: 'Ingeniero agrónomo de la Universidad Nacional, con 12 años propagando material vegetal en Antioquia. Fundó VERDE. para acercar la genética de vivero a los colombianos.',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Valentina Ríos',
    role: 'Directora agronómica',
    bio: 'MSc en Horticultura Tropical. Lidera la selección varietal y los protocolos de inspección para que cada planta llegue lista para producir.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Camilo Zapata',
    role: 'Logística & post-venta',
    bio: 'Especialista en packaging sostenible para material vivo. Diseñó el sistema de embalaje de VERDE. que garantiza la llegada en perfectas condiciones.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
];

const VALUES = [
  {
    n: '01',
    title: 'Honestidad agronómica',
    desc: 'Describimos cada planta con sus condiciones reales de cultivo. Sin exageración, sin promesas vacías. Si algo no crece en tu altitud, te lo decimos.',
  },
  {
    n: '02',
    title: 'Material genético certificado',
    desc: 'Trabajamos directamente con propagadores verificados. Cada variedad pasa por selección clonal y control sanitario antes de llegar al vivero.',
  },
  {
    n: '03',
    title: 'Acompañamiento real',
    desc: 'La asesoría agronómica no es un chatbot. Es un agrónomo respondiendo por WhatsApp o correo, sin scripts, sin tiempos de espera de 72 horas.',
  },
  {
    n: '04',
    title: 'Empaque responsable',
    desc: 'Usamos materiales biodegradables y reciclados. El transporte de plantas vivas requiere cuidado especial — y lo hacemos sin generar más basura.',
  },
];

export default function NosotrosPage() {
  return (
    <div style={{ paddingTop: 80 }}>

      {/* ── HERO ─────────────────────────────────── */}
      <section style={{ position: 'relative', height: '70vh', minHeight: 560, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1800&q=75)',
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
          filter: 'brightness(0.45)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Reveal>
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>VEREDA LA CEJA · ANTIOQUIA · 1.950 MSNM</div>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 130px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.92, marginBottom: 28 }}>
              Somos <em style={{ color: 'var(--accent)' }}>VERDE.</em>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 19, maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
              Un vivero fundado por agrónomos, para personas que quieren cultivar en serio.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HISTORIA ─────────────────────────────── */}
      <section style={{ padding: '120px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="nosotros-grid-2">
            <Reveal className="reveal-left">
              <div style={{
                aspectRatio: '3/4',
                borderRadius: 'var(--radius-lg)',
                backgroundImage: 'url(https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=85)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
                <div style={{ position: 'absolute', bottom: 28, left: 28 }}>
                  <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>DESDE 2019</div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>Vivero La Ceja, Antioquia</p>
                </div>
              </div>
            </Reveal>

            <Reveal className="reveal-right">
              <div className="eyebrow" style={{ marginBottom: 20 }}>NUESTRA HISTORIA</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                Empezamos cultivando.<br />
                Terminamos <em style={{ color: 'var(--accent)' }}>enseñando.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.75, marginBottom: 20 }}>
                VERDE. nació en 2019 cuando Sebastián Mora, recién egresado de la Universidad Nacional, se dio cuenta de que no existía en Colombia un vivero que combinara genética certificada con asesoría honesta.
              </p>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.75, marginBottom: 20 }}>
                La primera temporada vendimos 40 plantas de arándano a vecinos del corregimiento. Hoy despachamos a 10 ciudades del país, con el mismo protocolo de siempre: inspección agronómica antes del despacho, empaque especializado, y un agrónomo disponible durante los primeros seis meses.
              </p>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.75 }}>
                No somos un intermediario. Somos el vivero.
              </p>
              <div style={{ display: 'flex', gap: 48, marginTop: 40, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
                {[{ n: '2019', label: 'Fundación' }, { n: '21+', label: 'Variedades' }, { n: '10', label: 'Ciudades' }].map((s) => (
                  <div key={s.label}>
                    <div className="display" style={{ fontSize: 'clamp(36px, 4vw, 56px)', color: 'var(--accent)', lineHeight: 1 }}>{s.n}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 6, letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
        <style>{`@media (max-width:760px){.nosotros-grid-2{grid-template-columns:1fr !important;gap:48px !important;}}`}</style>
      </section>

      {/* ── VALORES ──────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>LO QUE NOS GUÍA</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 88px)', maxWidth: 900, marginBottom: 72, letterSpacing: '-0.025em' }}>
              Cultivamos con <em style={{ color: 'var(--accent)' }}>principios.</em>
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
            {VALUES.map((v) => (
              <div key={v.n} style={{ paddingTop: 28, borderTop: '1px solid var(--border)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 20 }}>{v.n} ─</div>
                <h3 className="display" style={{ fontSize: 28, marginBottom: 14 }}>{v.title}</h3>
                <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, fontSize: 15 }}>{v.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── EQUIPO ───────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>EL EQUIPO</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 88px)', marginBottom: 72, letterSpacing: '-0.025em' }}>
              Las personas detrás de <em style={{ color: 'var(--accent)' }}>cada planta.</em>
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {TEAM.map((member) => (
              <div key={member.name} className="team-card">
                <div style={{
                  width: '100%', aspectRatio: '3/4',
                  borderRadius: 'var(--radius-lg)',
                  backgroundImage: `url(${member.photo})`,
                  backgroundSize: 'cover', backgroundPosition: 'center top',
                  marginBottom: 24,
                  overflow: 'hidden',
                }} />
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 8 }}>{member.role.toUpperCase()}</div>
                <h3 className="display" style={{ fontSize: 28, marginBottom: 12 }}>{member.name}</h3>
                <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.65 }}>{member.bio}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── VIVERO / VISITA ──────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="nosotros-grid-2">
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 20 }}>EL VIVERO</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                Visítanos en <em style={{ color: 'var(--accent)' }}>La Ceja.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                Nuestro vivero está ubicado en la vereda El Tambo, Municipio de La Ceja del Tambo, Antioquia. A 40 km de Medellín, en un microclima perfecto para la aclimatación de frutales de altura.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
                {[
                  { icon: '📍', label: 'Vereda El Tambo, La Ceja, Antioquia' },
                  { icon: '📅', label: 'Lunes a sábado 7 AM — 4 PM' },
                  { icon: '📞', label: '+57 320 555 0102' },
                  { icon: '✉️', label: 'hola@verde.co' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 15, color: 'var(--fg-dim)' }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="https://wa.me/573205550102" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  WhatsApp <span className="btn-arrow">→</span>
                </a>
                <Link href="/catalogo" className="btn btn-ghost">Ver catálogo</Link>
              </div>
            </Reveal>
            <Reveal className="reveal-right">
              <div style={{
                aspectRatio: '4/3',
                borderRadius: 'var(--radius-lg)',
                backgroundImage: 'url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=85)',
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>¿LISTO PARA CULTIVAR?</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 88px)', marginBottom: 28, letterSpacing: '-0.025em' }}>
              Tu próxima cosecha <em style={{ color: 'var(--accent)' }}>empieza aquí.</em>
            </h2>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 40px', fontSize: 17, lineHeight: 1.6 }}>
              Explora nuestro catálogo, elige tu variedad y el equipo agronómico estará contigo desde el primer día.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalogo" className="btn btn-primary">
                Ver catálogo <span className="btn-arrow">→</span>
              </Link>
              <Link href="/asesoria" className="btn btn-ghost">Conocer asesoría</Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
