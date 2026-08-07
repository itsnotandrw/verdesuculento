'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import { DEPARTAMENTOS } from '@/lib/shipping/zonas';
import ProductShape from '@/components/ProductShape';

const STEPS = ['Envío', 'Pago'];

interface Quote {
  id: string;
  carrier: string;
  service: string;
  cost: number;
  listCost: number;
  etaLabel: string;
  note?: string;
}

interface Metodo {
  id: string;
  label: string;
  description: string;
  instant: boolean;
}

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

const CAMPOS_REQUERIDOS: Array<keyof FormData> = [
  'nombre', 'apellido', 'email', 'telefono', 'ciudad', 'departamento', 'direccion',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, count, clear } = useCart();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [codDisponible, setCodDisponible] = useState(false);

  const [metodos, setMetodos] = useState<Metodo[]>([]);
  const [metodo, setMetodo] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);

  const quote = quotes.find((q) => q.id === quoteId) ?? null;
  const envio = quote?.cost ?? 0;
  const total = subtotal + envio;

  // --- cotización: se dispara cuando ya hay destino y algo en el carrito
  const cotizar = useCallback(async () => {
    if (!form.departamento.trim() || !form.ciudad.trim() || items.length === 0) {
      setQuotes([]);
      return;
    }

    setCotizando(true);
    setErrorEnvio(null);

    try {
      const respuesta = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento: form.departamento,
          ciudad: form.ciudad,
          codigoPostal: form.codigoPostal,
          lines: items.map((i) => ({
            productId: i.product.id,
            color: i.color.name,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No pudimos cotizar el envío.');

      setQuotes(datos.quotes ?? []);
      setCodDisponible(Boolean(datos.cod?.available));
      // Se preselecciona la más barata: es la que elige casi todo el mundo.
      setQuoteId((actual) =>
        datos.quotes?.some((q: Quote) => q.id === actual) ? actual : (datos.quotes?.[0]?.id ?? null)
      );
    } catch (error) {
      setQuotes([]);
      setQuoteId(null);
      setErrorEnvio(error instanceof Error ? error.message : 'No pudimos cotizar el envío.');
    } finally {
      setCotizando(false);
    }
  }, [form.departamento, form.ciudad, form.codigoPostal, items]);

  // Se espera a que el cliente termine de escribir la ciudad antes de cotizar.
  const temporizador = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(cotizar, 450);
    return () => clearTimeout(temporizador.current);
  }, [cotizar]);

  // --- métodos de pago: los define el proveedor activo, no el checkout
  useEffect(() => {
    let vigente = true;
    fetch(`/api/payments/methods${codDisponible ? '?cod=1' : ''}`)
      .then((r) => r.json())
      .then((datos) => {
        if (!vigente) return;
        const lista: Metodo[] = datos.methods ?? [];
        setMetodos(lista);
        setMetodo((actual) => (lista.some((m) => m.id === actual) ? actual : (lista[0]?.id ?? null)));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [codDisponible]);

  if (count === 0 && !enviando) {
    return (
      <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 'clamp(44px, 9vw, 72px)', marginBottom: 20 }}>Carrito vacío.</h1>
        <Link href="/catalogo" className="btn btn-primary">Ver catálogo →</Link>
      </div>
    );
  }

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validarEnvio = (): boolean => {
    const nuevos: Partial<Record<keyof FormData, string>> = {};
    for (const campo of CAMPOS_REQUERIDOS) {
      if (!form[campo].trim()) nuevos[campo] = 'Requerido';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nuevos.email = 'Email inválido';
    }
    if (form.telefono.replace(/\D/g, '').length < 7) {
      nuevos.telefono = nuevos.telefono ?? 'Teléfono inválido';
    }
    setErrors(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const continuarAPago = () => {
    if (!validarEnvio()) return;
    if (!quoteId) {
      setErrorEnvio('Elige una opción de envío para continuar.');
      return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmarPedido = async () => {
    if (!quoteId || !metodo) return;
    setEnviando(true);
    setErrorPedido(null);

    try {
      const respuesta = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          method: metodo,
          quoteId,
          lines: items.map((i) => ({
            productId: i.product.id,
            color: i.color.name,
            size: i.size,
            qty: i.qty,
          })),
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No pudimos crear el pedido.');

      // El carrito se limpia solo cuando el pedido ya existe en el servidor: si
      // algo falla, el cliente no pierde lo que había armado.
      clear();
      router.push(`/pedido/${datos.order.reference}`);
    } catch (error) {
      setErrorPedido(error instanceof Error ? error.message : 'No pudimos crear el pedido.');
      setEnviando(false);
    }
  };

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="checkout-steps" role="navigation" aria-label="Pasos del checkout">
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined, minWidth: 0 }}>
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
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 16px', minWidth: 12 }} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="checkout-layout">
            <div style={{ minWidth: 0 }}>
              <h2 className="display checkout-title">Información de envío</h2>

              <div className="checkout-fields-grid">
                {CAMPOS.map((f) => (
                  <div key={f.field} style={{ gridColumn: f.full ? '1 / -1' : undefined, minWidth: 0 }}>
                    <label htmlFor={`checkout-${f.field}`} className="checkout-label">
                      {f.label}{' '}
                      {errors[f.field] && (
                        <span style={{ color: '#ef4444', textTransform: 'none', letterSpacing: 0 }}>({errors[f.field]})</span>
                      )}
                    </label>

                    {f.field === 'departamento' ? (
                      <select
                        id="checkout-departamento"
                        className="checkout-input"
                        value={form.departamento}
                        onChange={(e) => updateField('departamento', e.target.value)}
                        aria-invalid={!!errors.departamento}
                        style={{ borderColor: errors.departamento ? '#ef4444' : undefined }}
                      >
                        <option value="">Selecciona…</option>
                        {DEPARTAMENTOS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`checkout-${f.field}`}
                        type={f.type}
                        inputMode={f.inputMode}
                        autoComplete={f.autoComplete}
                        placeholder={f.placeholder}
                        value={form[f.field]}
                        onChange={(e) => updateField(f.field, e.target.value)}
                        aria-invalid={!!errors[f.field]}
                        className="checkout-input"
                        style={{ borderColor: errors[f.field] ? '#ef4444' : undefined }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* --- opciones de envío --- */}
              <div style={{ marginTop: 40 }}>
                <div className="eyebrow" style={{ marginBottom: 16 }}>Opciones de envío</div>

                {!form.departamento || !form.ciudad ? (
                  <p className="checkout-hint">Elige departamento y ciudad para ver el costo del envío.</p>
                ) : cotizando ? (
                  <p className="checkout-hint"><span className="spinner-sm" /> Cotizando con las transportadoras…</p>
                ) : errorEnvio ? (
                  <p className="checkout-hint" style={{ color: '#ef4444' }}>{errorEnvio}</p>
                ) : quotes.length === 0 ? (
                  <p className="checkout-hint">No hay cobertura para ese destino. Escríbenos y lo resolvemos.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {quotes.map((q) => (
                      <label key={q.id} className={`option-card ${quoteId === q.id ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="envio"
                          value={q.id}
                          checked={quoteId === q.id}
                          onChange={() => setQuoteId(q.id)}
                          style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {q.service} · {q.carrier}
                          </div>
                          <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 3 }}>
                            {q.etaLabel}
                          </div>
                          {q.note && (
                            <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 6, lineHeight: 1.5 }}>{q.note}</div>
                          )}
                        </div>
                        <div className="mono" style={{ fontSize: 14, flexShrink: 0, textAlign: 'right' }}>
                          {q.cost === 0 ? (
                            <span style={{ color: 'var(--accent)' }}>Gratis</span>
                          ) : (
                            formatCOP(q.cost)
                          )}
                          {q.cost < q.listCost && q.cost > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--fg-mute)', textDecoration: 'line-through' }}>
                              {formatCOP(q.listCost)}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={continuarAPago}>
                Continuar al pago <span className="btn-arrow">→</span>
              </button>
            </div>

            <OrderSummary items={items} subtotal={subtotal} envio={envio} total={total} quote={quote} />
          </div>
        )}

        {step === 1 && (
          <div className="checkout-layout">
            <div style={{ minWidth: 0 }}>
              <h2 className="display checkout-title">Método de pago</h2>

              <div style={{ display: 'grid', gap: 10 }}>
                {metodos.map((m) => (
                  <label key={m.id} className={`option-card ${metodo === m.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="pago"
                      value={m.id}
                      checked={metodo === m.id}
                      onChange={() => setMetodo(m.id)}
                      style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {m.label}
                        {m.instant && <span className="badge-inline">Confirmación inmediata</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-dim)', marginTop: 4, lineHeight: 1.5 }}>
                        {m.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="checkout-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--fg-dim)', flexShrink: 0 }} aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p style={{ fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.55 }}>
                  No almacenamos datos de tarjetas ni claves bancarias. En el siguiente paso te damos los datos
                  exactos para pagar y la referencia de tu pedido.
                </p>
              </div>

              {errorPedido && (
                <p style={{ marginTop: 20, fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>{errorPedido}</p>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => setStep(0)} disabled={enviando}>← Volver</button>
                <button className="btn btn-primary" onClick={confirmarPedido} disabled={enviando || !metodo}>
                  {enviando ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="spinner-sm" /> Creando pedido…
                    </span>
                  ) : (
                    <>Confirmar pedido <span className="btn-arrow">→</span></>
                  )}
                </button>
              </div>
            </div>

            <OrderSummary items={items} subtotal={subtotal} envio={envio} total={total} quote={quote} />
          </div>
        )}
      </div>
    </div>
  );
}

const CAMPOS: Array<{
  field: keyof FormData;
  label: string;
  type: string;
  placeholder: string;
  full?: boolean;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoComplete?: string;
}> = [
  { field: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Tu nombre', autoComplete: 'given-name' },
  { field: 'apellido', label: 'Apellido', type: 'text', placeholder: 'Tu apellido', autoComplete: 'family-name' },
  { field: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com', full: true, inputMode: 'email', autoComplete: 'email' },
  { field: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', placeholder: '300 000 0000', inputMode: 'tel', autoComplete: 'tel' },
  { field: 'departamento', label: 'Departamento', type: 'text', placeholder: 'Cundinamarca', autoComplete: 'address-level1' },
  { field: 'ciudad', label: 'Ciudad', type: 'text', placeholder: 'Bogotá', autoComplete: 'address-level2' },
  { field: 'codigoPostal', label: 'Código postal', type: 'text', placeholder: '110111', inputMode: 'numeric', autoComplete: 'postal-code' },
  { field: 'direccion', label: 'Dirección', type: 'text', placeholder: 'Calle 123 # 45-67', full: true, autoComplete: 'street-address' },
  { field: 'barrio', label: 'Barrio / Apto', type: 'text', placeholder: 'Barrio, Apto 101', full: true },
];

function OrderSummary({
  items, subtotal, envio, total, quote,
}: {
  items: ReturnType<typeof useCart>['items'];
  subtotal: number;
  envio: number;
  total: number;
  quote: Quote | null;
}) {
  return (
    <aside className="checkout-summary">
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
          <span className="mono">{formatCOP(subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)', minWidth: 0 }}>
            Envío
            {quote && <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--fg-mute)' }}>{quote.etaLabel}</span>}
          </span>
          <span className="mono" style={{ flexShrink: 0 }}>
            {quote ? (envio === 0 ? <span style={{ color: 'var(--accent)' }}>Gratis</span> : formatCOP(envio)) : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <span className="display" style={{ fontSize: 22 }}>Total</span>
          <span className="display" style={{ fontSize: 28 }}>{formatCOP(total)}</span>
        </div>
      </div>
    </aside>
  );
}
