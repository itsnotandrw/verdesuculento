'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import ProductShape from '@/components/ProductShape';

const STEPS = ['Envío', 'Pago', 'Confirmación'];

const PAYMENT_METHODS = [
  { id: 'pse', label: 'PSE — Débito bancario', icon: '🏦' },
  { id: 'card', label: 'Tarjeta de crédito / débito', icon: '💳' },
  { id: 'efecty', label: 'Efecty o Baloto', icon: '💵' },
  { id: 'nequi', label: 'Nequi / Daviplata', icon: '📱' },
];

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pse');
  const shipping = 10000;

  if (count === 0 && step < 2) {
    return (
      <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 72, marginBottom: 20 }}>Carrito vacío.</h1>
        <Link href="/catalogo" className="btn btn-primary">Ver catálogo →</Link>
      </div>
    );
  }

  const handleFinish = () => {
    clear();
    setStep(2);
  };

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 960 }}>
        {/* Steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 64, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: i <= step ? 'var(--accent)' : 'var(--bg-elev)',
                border: `1px solid ${i <= step ? 'var(--accent)' : 'var(--border)'}`,
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                color: i <= step ? 'var(--accent-fg)' : 'var(--fg-mute)',
                flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ marginLeft: 10, fontSize: 14, color: i === step ? 'var(--fg)' : 'var(--fg-dim)', fontWeight: i === step ? 500 : 400 }}>{s}</span>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 20px' }} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48 }} className="checkout-layout">
            <div>
              <h2 className="display" style={{ fontSize: 40, marginBottom: 32 }}>Información de envío</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Nombre', type: 'text', placeholder: 'Tu nombre' },
                  { label: 'Apellido', type: 'text', placeholder: 'Tu apellido' },
                  { label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com', full: true },
                  { label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000' },
                  { label: 'Ciudad', type: 'text', placeholder: 'Bogotá' },
                  { label: 'Departamento', type: 'text', placeholder: 'Cundinamarca' },
                  { label: 'Dirección', type: 'text', placeholder: 'Calle 123 # 45-67', full: true },
                  { label: 'Barrio / Apto', type: 'text', placeholder: 'Barrio, Apto 101' },
                  { label: 'Código postal', type: 'text', placeholder: '110111' },
                ].map((f) => (
                  <div key={f.label} style={{ gridColumn: f.full ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-dim)', marginBottom: 8 }}>{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      style={{ width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', color: 'var(--fg)', fontSize: 14, outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={() => setStep(1)}>
                Continuar al pago <span className="btn-arrow">→</span>
              </button>
            </div>

            <OrderSummary items={items} subtotal={subtotal} shipping={shipping} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48 }} className="checkout-layout">
            <div>
              <h2 className="display" style={{ fontSize: 40, marginBottom: 32 }}>Método de pago</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '18px 20px',
                      background: paymentMethod === m.id ? 'color-mix(in oklab, var(--accent) 10%, var(--bg-elev))' : 'var(--bg-elev)',
                      border: `1px solid ${paymentMethod === m.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <span style={{ fontSize: 15 }}>{m.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <p style={{ fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.5 }}>Tus datos de pago están protegidos con cifrado SSL de 256 bits. No almacenamos información de tarjetas.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button className="btn btn-ghost" onClick={() => setStep(0)}>← Volver</button>
                <button className="btn btn-primary" onClick={handleFinish}>
                  Confirmar pedido <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>

            <OrderSummary items={items} subtotal={subtotal} shipping={shipping} />
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 32px', fontSize: 36 }}>✓</div>
            <div className="eyebrow" style={{ marginBottom: 16 }}>PEDIDO CONFIRMADO</div>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 6vw, 88px)', marginBottom: 20 }}>
              ¡Gracias por tu compra<em style={{ color: 'var(--accent)' }}>!</em>
            </h1>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 520, margin: '0 auto 16px', lineHeight: 1.6 }}>
              Tu pedido ha sido recibido. Recibirás un correo de confirmación con el número de seguimiento cuando tu planta sea despachada.
            </p>
            <div className="mono" style={{ fontSize: 13, color: 'var(--fg-dim)', marginBottom: 48 }}>
              Referencia: #VS-{Math.floor(Math.random() * 90000) + 10000}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn btn-primary">Volver al inicio <span className="btn-arrow">→</span></Link>
              <Link href="/diario" className="btn btn-ghost">Leer guías de cultivo</Link>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 760px) { .checkout-layout { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function OrderSummary({ items, subtotal, shipping }: { items: ReturnType<typeof useCart>['items']; subtotal: number; shipping: number }) {
  return (
    <aside style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 28, border: '1px solid var(--border)', height: 'fit-content', position: 'sticky', top: 100 }}>
      <div className="eyebrow" style={{ marginBottom: 20 }}>Tu pedido</div>
      <div style={{ marginBottom: 20 }}>
        {items.map((item) => (
          <div key={item.variantKey} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, background: 'var(--bg-elev-2)', borderRadius: 8, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <ProductShape product={item.product} activeColorHex={item.color.hex} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>×{item.qty}</div>
            </div>
            <div className="mono" style={{ fontSize: 13, flexShrink: 0 }}>{formatCOP(item.product.price * item.qty)}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
          <span className="mono">{formatCOP(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)' }}>Envío</span>
          <span className="mono">{formatCOP(shipping)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="display" style={{ fontSize: 22 }}>Total</span>
          <span className="display" style={{ fontSize: 28 }}>{formatCOP(subtotal + shipping)}</span>
        </div>
      </div>
    </aside>
  );
}
