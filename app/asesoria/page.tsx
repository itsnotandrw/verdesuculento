import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Asesoría agronómica — VERDE.',
  description: 'Asesoría agronómica personalizada con nuestro equipo de expertos. Incluida gratis por 6 meses con cada compra.',
};

const STEPS = [
  {
    n: '01',
    title: 'Compra tu planta',
    desc: 'Selecciona la variedad que mejor se adapta a tu altitud, clima y espacio disponible. El equipo agronómico valida que sea la opción correcta para ti.',
  },
  {
    n: '02',
    title: 'Recibe con instrucciones',
    desc: 'Con cada pedido recibes una guía de trasplante y establecimiento específica para tu zona geográfica. No es genérica, es tuya.',
  },
  {
    n: '03',
    title: 'Acompañamiento directo',
    desc: 'Los primeros 6 meses tienes acceso a nuestro equipo por WhatsApp o correo. Envías una foto, te respondemos en menos de 24 horas.',
  },
];

const INCLUDED = [
  'Diagnóstico inicial de tu zona y condiciones de cultivo',
  'Guía varietal personalizada según altitud y temperatura',
  'Protocolo de trasplante y establecimiento',
  'Calendario de fertilización para los primeros 6 meses',
  'Identificación y manejo de plagas comunes en Colombia',
  'Soporte por WhatsApp y correo sin costo adicional',
  'Acceso al diario agronómico VERDE. con guías de cultivo',
  'Consulta de seguimiento a los 30, 90 y 180 días',
];

const FAQ = [
  {
    q: '¿Realmente es gratis?',
    a: 'Sí. La asesoría está incluida en el precio de cualquier planta que compres. No hay cargo adicional. Creemos que vender sin soporte técnico es vender a medias.',
  },
  {
    q: '¿Quién responde mis preguntas?',
    a: 'Un agrónomo certificado. No hay bots, ni respuestas automáticas. Cuando escribes al WhatsApp de VERDE., responde Valentina, Sebastián o Camilo, según la especialidad.',
  },
  {
    q: '¿Funciona si vivo en una ciudad?',
    a: 'Sí. Tenemos clientes con terrazas, balcones, patios pequeños y fincas. La asesoría se adapta a tu espacio, no al revés.',
  },
  {
    q: '¿Qué pasa después de los 6 meses?',
    a: 'Puedes continuar con consultas puntuales a tarifa preferencial para clientes, o simplemente escribirnos — seguimos respondiendo aunque sea de forma más puntual.',
  },
];

export default function AsesoriaPage() {
  return (
    <div style={{ paddingTop: 80 }}>
      <div className="container" style={{ paddingTop: 40 }}>
        <nav style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Inicio</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Asesoría</span>
        </nav>
      </div>

      {/* ── HERO ─────────────────────────────────── */}
      <section style={{ padding: '100px 0 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 500, height: 600,
          background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>ASESORÍA AGRONÓMICA INCLUIDA</div>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 130px)', letterSpacing: '-0.03em', lineHeight: 0.92, marginBottom: 28, maxWidth: 1100 }}>
              Tu agrónomo <em style={{ color: 'var(--accent)' }}>personal.</em>
            </h1>
            <p style={{ color: 'var(--fg-dim)', fontSize: 19, maxWidth: 580, lineHeight: 1.55, marginBottom: 48 }}>
              Gratis los primeros 6 meses. Sin chatbots, sin scripts. Un agrónomo real que conoce tu planta, tu altitud y tu suelo.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="https://wa.me/573205550102" className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                Hablar con un agrónomo <span className="btn-arrow">→</span>
              </a>
              <Link href="/catalogo" className="btn btn-ghost">Ver plantas</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>CÓMO FUNCIONA</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 88px)', marginBottom: 72, letterSpacing: '-0.025em' }}>
              Tres pasos para <em style={{ color: 'var(--accent)' }}>cultivar con respaldo.</em>
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {STEPS.map((step) => (
              <div key={step.n} style={{
                background: 'var(--bg-elev)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 32px',
                border: '1px solid var(--border)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                }} />
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 14 }}>{step.n} ─</div>
                <h3 className="display" style={{ fontSize: 28, marginBottom: 14 }}>{step.title}</h3>
                <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, fontSize: 15 }}>{step.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── QUÉ INCLUYE ──────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="asesoria-split">
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 20 }}>QUÉ INCLUYE</div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 72px)', marginBottom: 28, letterSpacing: '-0.02em' }}>
                Todo lo que necesitas <em style={{ color: 'var(--accent)' }}>para cosechar.</em>
              </h2>
              <p style={{ color: 'var(--fg-dim)', fontSize: 16, lineHeight: 1.75 }}>
                El acompañamiento agronómico de VERDE. cubre el ciclo completo: desde que la planta llega a tus manos hasta la primera cosecha. Sin costo adicional para clientes activos.
              </p>
            </Reveal>
            <Reveal stagger>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {INCLUDED.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    padding: '18px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
                      border: '1px solid color-mix(in oklab, var(--accent) 40%, transparent)',
                      display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent)' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--fg-dim)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
        <style>{`@media (max-width:760px){.asesoria-split{grid-template-columns:1fr !important;gap:48px !important;}}`}</style>
      </section>

      {/* ── INMERSIVO — Testimonio ────────────────── */}
      <section style={{
        position: 'relative', padding: '100px 0', overflow: 'hidden',
        background: 'linear-gradient(155deg, #09190c 0%, #142a17 45%, #0b1e0e 100%)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 40%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 65%)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div style={{ maxWidth: 760 }}>
              <div style={{ fontSize: 72, lineHeight: 1, color: 'var(--accent)', marginBottom: 24, fontFamily: 'var(--font-display)' }}>"</div>
              <p className="display" style={{ fontSize: 'clamp(24px, 3.5vw, 44px)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.3, marginBottom: 40 }}>
                Le escribí al WhatsApp de VERDE. a las 10 de la noche porque a mi arándano le salieron manchas raras. A los 20 minutos me respondió Valentina con fotos de referencia y el tratamiento exacto. Eso no lo hace ningún vivero normal.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: '50% 0 50% 50%', transform: 'rotate(45deg)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>María Camila Ospina</div>
                  <div className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>CLIENTE DESDE 2023 · RIONEGRO, ANT.</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 20 }}>PREGUNTAS FRECUENTES</div>
            <h2 className="display" style={{ fontSize: 'clamp(44px, 6vw, 80px)', marginBottom: 72, letterSpacing: '-0.025em' }}>
              Lo que nos <em style={{ color: 'var(--accent)' }}>preguntan.</em>
            </h2>
          </Reveal>
          <Reveal stagger style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 48, alignItems: 'start' }} className="faq-row">
                  <h3 className="display" style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', letterSpacing: '-0.01em' }}>{item.q}</h3>
                  <p style={{ color: 'var(--fg-dim)', lineHeight: 1.7, fontSize: 16 }}>{item.a}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
        <style>{`@media (max-width:760px){.faq-row{grid-template-columns:1fr !important;gap:12px !important;}}`}</style>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section style={{ padding: '120px 0', textAlign: 'center' }}>
        <div className="container">
          <Reveal>
            <div style={{
              display: 'inline-block',
              padding: '4px 16px',
              background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
              border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
              borderRadius: 999,
              marginBottom: 24,
            }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}>GRATIS CON CADA COMPRA</span>
            </div>
            <h2 className="display" style={{ fontSize: 'clamp(48px, 7vw, 100px)', letterSpacing: '-0.03em', lineHeight: 0.95, marginBottom: 28 }}>
              Empieza a cultivar <em style={{ color: 'var(--accent)' }}>con respaldo.</em>
            </h2>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 480, margin: '0 auto 40px', fontSize: 17, lineHeight: 1.6 }}>
              Escoge tu planta, recíbela con instrucciones personalizadas y ten un agrónomo disponible por 6 meses.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalogo" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 32px' }}>
                Ver catálogo <span className="btn-arrow">→</span>
              </Link>
              <a href="https://wa.me/573205550102" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Preguntar por WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
