import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import BlurText from '@/components/BlurText';
import { CONTACTO } from '@/data/contacto';
import MapaPlegable from '@/components/MapaPlegable';

export const metadata: Metadata = {
  title: 'Nosotros — Vivero Verde Suculento',
  description: 'Conoce el equipo detrás de Vivero Verde Suculento Agrónomos y amantes de las plantas comprometidos con la agricultura moderna en Colombia.',
};

// Equipo real del vivero. Mientras no haya foto de cada persona se muestran sus iniciales; para agregar una foto,
// poner el archivo en /public/images/equipo/ y escribir su ruta en `photo`.
const TEAM: { name: string; role: string; bio: string; initials: string; photo?: string }[] = [
  {
    name: 'Fabián Esteban Ramírez',
    role: 'Fundador y Agrónomo jefe',
    bio: 'Ingeniero agrónomo. Lidera la producción vegetal del vivero y la asesoría de cultivo para los clientes.',
    initials: 'FR',
  },
  {
    name: 'Daniel Pinzón',
    role: 'Logística y envíos',
    bio: 'Se encarga del alistamiento de los pedidos, la poslogística y los despachos a todo el país.',
    initials: 'DP',
  },
  {
    name: 'Karen Dayana Ramírez',
    role: 'Atención al cliente y ventas',
    bio: 'Asesoría comercial y atención por chat: acompaña cada pedido desde la consulta hasta la entrega.',
    initials: 'KR',
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
      <div className="container" style={{ paddingTop: 40 }}>
        <nav style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Inicio</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Nosotros</span>
        </nav>
      </div>

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
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>SOACHA · CUNDINAMARCA</div>
            <BlurText
              text="Somos Vivero Verde Suculento"
              className="display"
              style={{ fontSize: 'clamp(56px, 9vw, 130px)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.92, marginBottom: 28, justifyContent: 'center' }}
              emphasizeLast={3}
            />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 19, maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
              Un vivero fundado por un agrónomo, para personas que quieren cultivar en serio.
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
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>Vivero Verde Suculento, Soacha</p>
                </div>
              </div>
            </Reveal>

            <Reveal className="reveal-right">
              <div className="eyebrow" style={{ marginBottom: 20 }}>NUESTRA HISTORIA</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                Empezamos cultivando.<br />
                Terminamos <em style={{ color: 'var(--accent)' }}>enseñando.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.75 }}>
                Vivero Verde Suculento nació en 2019 cuando Fabián Esteban Ramírez, aún siendo estudiante de la Universidad Nacional, se dio cuenta de que en Colombia no existía un vivero que combinara material genético certificado con asesoría honesta y envíos a todo el país. Iniciamos vendiendo suculentas, posteriormente pasamos a los arándanos, ampliamos nuestra línea con berries y frutales de clima frío, y finalmente dimos el paso hacia un vivero de clima cálido, donde desarrollamos también frutales de clima cálido de gran importancia.
              </p>
              <div style={{ marginTop: 40, paddingTop: 24 }}>
                <span className="chip">🏅 MercadoLíder Gold</span>{' '}
                <span className="chip">★ Calificación positiva en Mercado Libre</span>
              </div>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 20, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
                {[
                  { to: 3076, prefix: '+', suffix: '', separator: true, label: 'Pedidos completados' },
                  { to: 1200, prefix: '+', suffix: '', separator: true, label: 'Seguidores en Mercado Libre' },
                  { to: 1000, prefix: '+', suffix: '', separator: true, label: 'Seguidores en redes sociales' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="display" style={{ fontSize: 'clamp(36px, 4vw, 56px)', color: 'var(--accent)', lineHeight: 1 }}>
                      <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} separator={s.separator} />
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 6, letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <p className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 20, letterSpacing: '0.04em' }}>
                Reputación real de nuestra tienda en Mercado Libre.
              </p>
            </Reveal>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@media (max-width:760px){.nosotros-grid-2{grid-template-columns:1fr !important;gap:48px !important;}}` }} />
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
                {member.photo ? (
                  <div style={{
                    width: '100%', aspectRatio: '3/4',
                    borderRadius: 'var(--radius-lg)',
                    backgroundImage: `url(${member.photo})`,
                    backgroundSize: 'cover', backgroundPosition: 'center top',
                    marginBottom: 24,
                    overflow: 'hidden',
                  }} />
                ) : (
                  <div aria-hidden="true" style={{
                    width: '100%', aspectRatio: '3/4', marginBottom: 24, borderRadius: 'var(--radius-lg)',
                    display: 'grid', placeItems: 'center',
                    background: 'linear-gradient(155deg, color-mix(in oklab, var(--accent) 38%, var(--bg-elev)), var(--bg-elev))',
                    border: '1px solid var(--border)',
                  }}>
                    <span className="display" style={{ fontSize: 'clamp(64px, 9vw, 110px)', color: 'var(--accent)', letterSpacing: '-0.03em' }}>{member.initials}</span>
                  </div>
                )}
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
              <div className="eyebrow" style={{ marginBottom: 20 }}>DÓNDE ESTAMOS</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                Dos sedes en <em style={{ color: 'var(--accent)' }}>Cundinamarca.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                En Soacha funciona el centro de envíos y entregas, y en Santandercito el centro de producción vegetal. Atendemos de lunes a sábado.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 36 }}>
                {CONTACTO.sedes.map((sede) => (
                  <div key={sede.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, color: 'var(--fg-dim)' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex', marginTop: 3 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    </span>
                    <span>
                      <strong style={{ display: 'block', color: 'var(--fg)', fontWeight: 500 }}>{sede.nombre}</strong>
                      <a href={sede.mapa} target="_blank" rel="noopener noreferrer">{sede.direccion}</a>
                    </span>
                  </div>
                ))}
                {([
                  { svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, label: CONTACTO.horario },
                  { svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label: CONTACTO.telefono },
                  { svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>, label: CONTACTO.email },
                ] as { svg: JSX.Element; label: string }[]).map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 15, color: 'var(--fg-dim)' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0, display: 'flex' }}>{item.svg}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={CONTACTO.whatsappUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  WhatsApp <span className="btn-arrow">→</span>
                </a>
                <Link href="/catalogo" className="btn btn-ghost">Ver catálogo</Link>
              </div>
            </Reveal>
            <Reveal className="reveal-right">
              <MapaPlegable />
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
