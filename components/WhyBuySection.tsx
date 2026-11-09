'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

const WHATSAPP = 'https://wa.me/573205550102';
const FREE_FROM = Number(process.env.NEXT_PUBLIC_SHIPPING_FREE_FROM ?? 120000);
const fmt = (n: number) => '$' + n.toLocaleString('es-CO');

type Benefit = {
  n: string;
  t: string;
  d: string;
  /** 'card' abre la tarjeta flotante; string = ruta de redirección */
  action: 'card' | string;
  cta: string;
  /** Oculto pero conservado: poner true para volver a mostrarlo. */
  visible: boolean;
};

const BENEFITS: Benefit[] = [
  { n: '01', t: 'Envíos a toda Colombia', d: 'Empaque especializado para plantas vivas. Llegada garantizada en 2 a 5 días hábiles.', action: 'card', cta: 'Cómo funcionan los envíos', visible: true },
  { n: '02', t: 'Plantas seleccionadas', d: 'Material genético certificado. Cada plántula pasa por inspección agronómica antes del despacho.', action: '/catalogo', cta: 'Ver productos destacados', visible: true },
  { n: '03', t: 'Asesoría especializada', d: 'Acompañamiento de un agrónomo desde la compra hasta la primera cosecha. Sin costo adicional.', action: '/asesoria', cta: 'Hablar con un asesor', visible: true },
  // OCULTO por decisión del cliente (se conserva para reactivarlo).
  { n: '04', t: 'Garantía planta viva', d: 'Si tu planta no sobrevive al envío, la reponemos sin preguntas. Es nuestra promesa.', action: '/asesoria', cta: 'Saber más', visible: false },
];

export default function WhyBuySection() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = BENEFITS.filter((b) => b.visible);

  return (
    <section style={{ padding: 'clamp(16px, 2vw, 28px) 0', borderTop: '1px solid var(--border)' }}>
      <div className="container">
        <Reveal>
          <div className="eyebrow" style={{ marginBottom: 24 }}>POR QUÉ COMPRAR CON NOSOTROS</div>
          <h2 className="display" style={{ fontSize: 'clamp(40px, 6vw, 92px)', maxWidth: 1100, marginBottom: 32, letterSpacing: '-0.02em' }}>
            Una planta no es un objeto cualquiera. Es{' '}
            <em style={{ color: 'var(--accent)' }}>un ser vivo que confiamos a tus manos.</em>{' '}
            Por eso hacemos esto bien.
          </h2>
        </Reveal>
        <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
          {items.map((item) => {
            const inner = (
              <>
                <div className="mono" style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 24, letterSpacing: '0.1em' }}>{item.n} ─</div>
                <h3 className="display" style={{ fontSize: 30, marginBottom: 12, letterSpacing: '-0.01em' }}>{item.t}</h3>
                <p style={{ color: 'var(--fg-dim)', lineHeight: 1.55, marginBottom: 20 }}>{item.d}</p>
                <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                  {item.cta.toUpperCase()} →
                </span>
              </>
            );
            const style = { display: 'block', textAlign: 'left', background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textDecoration: 'none' } as const;
            return item.action === 'card' ? (
              <button key={item.n} type="button" style={style} onClick={() => setOpen(true)} aria-haspopup="dialog">
                {inner}
              </button>
            ) : (
              <Link key={item.n} href={item.action} style={style}>
                {inner}
              </Link>
            );
          })}
        </Reveal>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cómo funcionan los envíos en Colombia"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--bg, #f7f3ec)', color: 'var(--fg, inherit)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              padding: 'clamp(24px, 5vw, 40px)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 0, fontSize: 24, cursor: 'pointer', color: 'inherit', lineHeight: 1 }}
            >
              ×
            </button>
            <div className="mono" style={{ color: 'var(--accent)', fontSize: 12, letterSpacing: '0.1em', marginBottom: 12 }}>01 ─ ENVÍOS</div>
            <h3 className="display" style={{ fontSize: 'clamp(28px, 6vw, 38px)', marginBottom: 16, letterSpacing: '-0.01em' }}>
              Cómo funcionan los envíos en Colombia
            </h3>
            <ol style={{ paddingLeft: 20, display: 'grid', gap: 12, color: 'var(--fg-dim)', lineHeight: 1.55, marginBottom: 24 }}>
              <li><strong>Despachamos desde Soacha, Cundinamarca</strong>, a todo el país con transportadora.</li>
              <li><strong>Empaque especializado</strong> para plantas vivas, preparado por el vivero antes del despacho.</li>
              <li><strong>Llega en 2 a 5 días hábiles</strong>, según la ciudad de destino.</li>
              <li>
                <strong>Envío gratis desde {fmt(FREE_FROM)}</strong>; por debajo de ese valor, el costo se cotiza en el carrito según tu destino.
              </li>
              <li>Si tu planta no sobrevive al envío, la reponemos.</li>
            </ol>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Preguntar por WhatsApp <span className="btn-arrow">→</span>
              </a>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
