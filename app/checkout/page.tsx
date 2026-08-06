'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import ProductShape from '@/components/ProductShape';

const STEPS = ['Envío', 'Pago', 'Confirmación'];

const PAYMENT_METHODS = [
  { id: 'pse', label: 'PSE — Débito bancario', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9l9-6 9 6"/><path d="M9 22V12h6v10"/></svg> },
  { id: 'card', label: 'Tarjeta de crédito / débito', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
  { id: 'efecty', label: 'Efecty o Baloto', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
  { id: 'nequi', label: 'Nequi / Daviplata', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg> },
];

interface FormData {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  barrio: string;
  codigoPostal: string;
}

const INITIAL_FORM: FormData = {
  nombre: '', apellido: '', email: '', telefono: '',
  ciudad: '', departamento: '', direccion: '', barrio: '', codigoPostal: '',
};

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pse');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const shipping = 10000;

  if (count === 0 && step < 2) {
    return (
      <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 72, marginBottom: 20 }}>Carrito vacío.</h1>
        <Link href="/catalogo" className="btn btn-primary">Ver catálogo →</Link>
      </div>
    );
  }

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep0 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nombre.trim()) newErrors.nombre = 'Requerido';
    if (!form.apellido.trim()) newErrors.apellido = 'Requerido';
    if (!form.email.trim()) newErrors.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.telefono.trim()) newErrors.telefono = 'Requerido';
    if (!form.ciudad.trim()) newErrors.ciudad = 'Requerido';
    if (!form.departamento.trim()) newErrors.departamento = 'Requerido';
    if (!form.direccion.trim()) newErrors.direccion = 'Requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToPayment = () => {
    if (validateStep0()) setStep(1);
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise((r) => setTimeout(r, 1500));
    setOrderRef(`VS-${Math.floor(10000 + Math.random() * 90000)}`);
    clear();
    setStep(2);
    setIsProcessing(false);
  };

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 960 }}>
        {/* Steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 64, alignItems: 'center' }} role="navigation" aria-label="Pasos del checkout">
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
            <div style={{ minWidth: 0 }}>
              <h2 className="display" style={{ fontSize: 40, marginBottom: 32 }}>Información de envío</h2>
              <div className="checkout-fields-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                {([
                  { field: 'nombre' as const, label: 'Nombre', type: 'text', placeholder: 'Tu nombre' },
                  { field: 'apellido' as const, label: 'Apellido', type: 'text', placeholder: 'Tu apellido' },
                  { field: 'email' as const, label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com', full: true },
                  { field: 'telefono' as const, label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000' },
                  { field: 'ciudad' as const, label: 'Ciudad', type: 'text', placeholder: 'Bogotá' },
                  { field: 'departamento' as const, label: 'Departamento', type: 'text', placeholder: 'Cundinamarca' },
                  { field: 'direccion' as const, label: 'Dirección', type: 'text', placeholder: 'Calle 123 # 45-67', full: true },
                  { field: 'barrio' as const, label: 'Barrio / Apto', type: 'text', placeholder: 'Barrio, Apto 101' },
                  { field: 'codigoPostal' as const, label: 'Código postal', type: 'text', placeholder: '110111' },
                ]).map((f) => (
                  <div key={f.field} style={{ gridColumn: f.full ? '1 / -1' : undefined }}>
                    <label htmlFor={`checkout-${f.field}`} style={{ display: 'block', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-dim)', marginBottom: 8 }}>
                      {f.label} {errors[f.field] && <span style={{ color: '#ef4444', textTransform: 'none', letterSpacing: 0 }}>({errors[f.field]})</span>}
                    </label>
                    <input
                      id={`checkout-${f.field}`}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.field]}
                      onChange={(e) => updateField(f.field, e.target.value)}
                      aria-invalid={!!errors[f.field]}
                      aria-describedby={errors[f.field] ? `error-${f.field}` : undefined}
                      style={{
                        width: '100%',
                        background: 'var(--bg-elev)',
                        border: `1px solid ${errors[f.field] ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '12px 16px',
                        color: 'var(--fg)',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={handleContinueToPayment}>
                Continuar al pago <span className="btn-arrow">→</span>
              </button>
            </div>

            <OrderSummary items={items} subtotal={subtotal} shipping={shipping} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48 }} className="checkout-layout">
            <div style={{ minWidth: 0 }}>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--fg-dim)', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <p style={{ fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.5 }}>Tus datos de pago están protegidos con cifrado SSL de 256 bits. No almacenamos información de tarjetas.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button className="btn btn-ghost" onClick={() => setStep(0)}>← Volver</button>
                <button className="btn btn-primary" onClick={handleFinish} disabled={isProcessing}>
                  {isProcessing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="loading-spinner-sm" /> Procesando...
                    </span>
                  ) : (
                    <>Confirmar pedido <span className="btn-arrow">→</span></>
                  )}
                </button>
              </div>
              <style>{`
                .loading-spinner-sm {
                  width: 16px; height: 16px;
                  border: 2px solid rgba(255,255,255,0.3);
                  border-top-color: currentColor;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  display: inline-block;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
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
            {orderRef && (
              <div className="mono" style={{ fontSize: 13, color: 'var(--fg-dim)', marginBottom: 48 }}>
                Referencia: #{orderRef}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn btn-primary">Volver al inicio <span className="btn-arrow">→</span></Link>
              <Link href="/diario" className="btn btn-ghost">Leer guías de cultivo</Link>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 760px) { .checkout-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .checkout-fields-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function OrderSummary({ items, subtotal, shipping }: { items: ReturnType<typeof useCart>['items']; subtotal: number; shipping: number }) {
  return (
    <aside style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 28, border: '1px solid var(--border)', height: 'fit-content', position: 'sticky', top: 100, minWidth: 0 }}>
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
