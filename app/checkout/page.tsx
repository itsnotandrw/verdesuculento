'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import { DEPARTAMENTOS } from '@/lib/shipping/zonas';
import { ciudadesDe, OTRO_MUNICIPIO } from '@/lib/shipping/ciudades';
import { RECOGER_TIENDA_QUOTE_ID, DIRECCION_RECOGIDA } from '@/lib/shipping/constants';
import ProductShape from '@/components/ProductShape';
import PrecioPromo from '@/components/PrecioPromo';
import CuponBox from '@/components/CuponBox';
import { LogoEnvio, LogoPago } from '@/components/LogosCheckout';
import { useCupon } from '@/hooks/useCupon';
import { tokenRecaptcha } from '@/lib/recaptcha-cliente';
import AvisoRecaptcha from '@/components/AvisoRecaptcha';
import BotonCatalogo from '@/components/BotonCatalogo';
import { anotarPedidoPorMedir, conversionAds } from '@/lib/google-ads';

const STEPS = ['Envío', 'Pago'];

interface Quote {
  id: string;
  carrier: string;
  /** Código de la transportadora (para el logo). */
  carrierCode?: string;
  service: string;
  cost: number;
  listCost: number;
  etaLabel: string;
  note?: string;
  /** Texto que reemplaza al valor cuando el costo aún no se conoce (entrega el mismo día). */
  costLabel?: string;
  /** Marca de la opción más barata / más rápida. */
  etiqueta?: string;
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
  /**
   * Cédula o NIT del destinatario. TCC la exige para generar la guía —
   * probado contra su API real: sin esto, /ship/generate/ responde
   * "NIT/CC destino no puede ser vacío" y el pedido queda pagado sin poder
   * despachar. Las otras transportadoras no la piden, pero TCC compite en
   * varias rutas y a veces es la única opción, así que es obligatoria
   * siempre y no solo cuando el cliente elige TCC.
   */
  documento: string;
  /** Valor del desplegable: un municipio de la lista, o el centinela OTRO_MUNICIPIO. */
  ciudad: string;
  /** Solo se usa cuando `ciudad === OTRO_MUNICIPIO`: el nombre que el cliente escribe a mano. */
  ciudadOtra: string;
  departamento: string;
  direccion: string;
  barrio: string;
  /** Torre, apto, piso o punto de referencia. Va al campo de instrucciones de entrega, no al de barrio. */
  notas: string;
  codigoPostal: string;
}

const INITIAL_FORM: FormData = {
  nombre: '', apellido: '', email: '', telefono: '', documento: '',
  ciudad: '', ciudadOtra: '', departamento: '', direccion: '', barrio: '', notas: '', codigoPostal: '',
};

const CAMPOS_REQUERIDOS_DOMICILIO: Array<keyof FormData> = [
  'nombre', 'apellido', 'email', 'telefono', 'documento', 'ciudad', 'departamento', 'direccion',
];
// Recoger en tienda no necesita nada de dirección -- solo identificar a quién
// le entregamos.
const CAMPOS_REQUERIDOS_RECOGER: Array<keyof FormData> = [
  'nombre', 'apellido', 'email', 'telefono', 'documento',
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, count, clear, couponCode } = useCart();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [modoEntrega, setModoEntrega] = useState<'domicilio' | 'recoger'>('domicilio');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [codDisponible, setCodDisponible] = useState(false);
  // Opciones de envío que admiten contra entrega → cargo fijo que se suma a su envío. Llega de una segunda consulta.
  const [codOpciones, setCodOpciones] = useState<Record<string, number>>({});
  const cotizacionActual = useRef(0);

  const [metodos, setMetodos] = useState<Metodo[]>([]);
  const [metodo, setMetodo] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);

  const quote = quotes.find((q) => q.id === quoteId) ?? null;
  const cupon = useCupon();
  const descuentoCupon = cupon.valido ? cupon.descuento : 0;
  // Contra entrega: lo recauda la transportadora, así que no aplica a recoger en tienda ni a entrega el mismo día.
  const contraEntregaPosible =
    codDisponible && !!quote && quote.id !== RECOGER_TIENDA_QUOTE_ID && !quote.id.startsWith('local:') && quote.id in codOpciones;
  // Con contra entrega el recaudo va DENTRO del envío (no es una línea aparte): el cliente ve un solo valor de envío.
  const recargoCod = metodo === 'COD' && quote && quote.id in codOpciones ? codOpciones[quote.id] : 0;
  const envio = (quote?.cost ?? 0) + recargoCod;
  const total = subtotal - descuentoCupon + envio;

  // Google Ads: «inició el pago», una vez por visita y solo con productos en el carrito.
  useEffect(() => {
    if (subtotal <= 0) return;
    try {
      if (sessionStorage.getItem('verde-pago-medido')) return;
      sessionStorage.setItem('verde-pago-medido', '1');
    } catch { /* sin almacenamiento: se mide igual */ }
    conversionAds('pago', subtotal);
  }, [subtotal]);

  // El desplegable guarda el municipio elegido, o el centinela "Otro
  // municipio…" si el cliente no lo encontró en la lista. La ciudad real a
  // cotizar/enviar sale de aquí, nunca del valor crudo del select.
  const eligiendoOtro = form.ciudad === OTRO_MUNICIPIO;
  const ciudadEfectiva = eligiendoOtro ? form.ciudadOtra.trim() : form.ciudad;

  // --- cotización: se dispara cuando ya hay destino y algo en el carrito
  const cotizar = useCallback(async () => {
    const idCotizacion = ++cotizacionActual.current;
    // Recoger en tienda no depende del destino ni de ninguna transportadora:
    // es una sola opción fija, gratis, siempre disponible.
    if (modoEntrega === 'recoger') {
      setQuotes([{
        id: RECOGER_TIENDA_QUOTE_ID,
        carrier: 'Recoger en tienda',
        service: `${DIRECCION_RECOGIDA.direccion}, ${DIRECCION_RECOGIDA.ciudad}`,
        cost: 0,
        listCost: 0,
        etaLabel: 'Te avisamos por WhatsApp/correo cuando esté listo',
      }]);
      setQuoteId(RECOGER_TIENDA_QUOTE_ID);
      setCodDisponible(false);
      setCodOpciones({});
      setErrorEnvio(null);
      return;
    }

    if (!form.departamento.trim() || !ciudadEfectiva.trim() || items.length === 0) {
      setQuotes([]);
      setCodOpciones({});
      return;
    }

    setCotizando(true);
    setErrorEnvio(null);

    const lineasCotizacion = items.map((i) => ({
      productId: i.product.id,
      color: i.color.name,
      size: i.size,
      qty: i.qty,
    }));

    const consultarContraEntrega = async (id: number) => {
      try {
        const r = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ departamento: form.departamento, ciudad: ciudadEfectiva, codigoPostal: form.codigoPostal, lines: lineasCotizacion, cashOnDelivery: true }),
        });
        const d = await r.json();
        if (id !== cotizacionActual.current) return;
        const mapa: Record<string, number> = {};
        if (r.ok) for (const q of d.quotes ?? []) if (q.cashOnDeliveryAvailable) mapa[q.id] = q.cashOnDeliveryFee ?? 0;
        setCodOpciones(mapa);
      } catch {
        if (id === cotizacionActual.current) setCodOpciones({});
      }
    };

    try {
      const respuesta = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento: form.departamento,
          ciudad: ciudadEfectiva,
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
      setCodOpciones({});
      // Segunda consulta, sin bloquear la primera: qué transportadoras recaudan en este destino y a qué costo.
      if (datos.cod?.available) void consultarContraEntrega(idCotizacion);
      // Se preselecciona la primera opción con costo conocido; la entrega el mismo día se elige a mano.
      setQuoteId((actual) =>
        datos.quotes?.some((q: Quote) => q.id === actual)
          ? actual
          : ((datos.quotes?.find((q: Quote) => !q.costLabel) ?? datos.quotes?.[0])?.id ?? null)
      );
    } catch (error) {
      setQuotes([]);
      setQuoteId(null);
      setErrorEnvio(error instanceof Error ? error.message : 'No pudimos cotizar el envío.');
    } finally {
      setCotizando(false);
    }
  }, [modoEntrega, form.departamento, ciudadEfectiva, form.codigoPostal, items]);

  // Se espera a que el cliente termine de escribir "Otro municipio" antes de
  // cotizar; elegir de la lista ya no necesita esperar nada, pero el mismo
  // temporizador no hace daño en ese caso.
  const temporizador = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(cotizar, 450);
    return () => clearTimeout(temporizador.current);
  }, [cotizar]);

  // --- métodos de pago: los define el proveedor activo, no el checkout
  useEffect(() => {
    let vigente = true;
    fetch(`/api/payments/methods${contraEntregaPosible ? '?cod=1' : ''}`)
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
  }, [contraEntregaPosible]);

  if (count === 0 && !enviando) {
    return (
      <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
        <h1 className="display" style={{ fontSize: 'clamp(44px, 9vw, 72px)', marginBottom: 20 }}>Carrito vacío.</h1>
        <BotonCatalogo className="btn btn-primary">Ver catálogo →</BotonCatalogo>
      </div>
    );
  }

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => {
      // Cambiar de departamento invalida la ciudad elegida: la lista de
      // municipios depende del departamento, y un municipio de Antioquia
      // seleccionado antes de cambiar a Cundinamarca ya no tiene sentido.
      if (field === 'departamento' && value !== prev.departamento) {
        return { ...prev, departamento: value, ciudad: '', ciudadOtra: '' };
      }
      return { ...prev, [field]: value };
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validarEnvio = (): boolean => {
    const nuevos: Partial<Record<keyof FormData, string>> = {};
    const requeridos = modoEntrega === 'recoger' ? CAMPOS_REQUERIDOS_RECOGER : CAMPOS_REQUERIDOS_DOMICILIO;
    for (const campo of requeridos) {
      if (!form[campo].trim()) nuevos[campo] = 'Requerido';
    }
    // El municipio manual solo es obligatorio cuando se eligió "Otro
    // municipio…"; el resto del tiempo el campo no se muestra siquiera.
    if (modoEntrega === 'domicilio' && eligiendoOtro && !form.ciudadOtra.trim()) {
      nuevos.ciudadOtra = 'Requerido';
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
      // `ciudadOtra` es un campo solo de este formulario, para el caso "Otro
      // municipio…"; la API espera `ciudad` con el nombre real ya resuelto.
      const { ciudadOtra: _ciudadOtra, ...datosEnvio } = form;

      // Recoger en tienda: se manda la dirección de la propia tienda en vez
      // de los campos de dirección (vacíos, ni se mostraron) -- así el
      // pedido queda con un destino real y legible en el panel admin, en
      // vez de campos en blanco.
      const direccionFinal =
        modoEntrega === 'recoger'
          ? { departamento: DIRECCION_RECOGIDA.departamento, ciudad: DIRECCION_RECOGIDA.ciudad, direccion: DIRECCION_RECOGIDA.direccion, barrio: '', codigoPostal: '' }
          : { ciudad: ciudadEfectiva };

      const recaptchaToken = await tokenRecaptcha('checkout');
      const respuesta = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recaptchaToken,
          ...datosEnvio,
          ...direccionFinal,
          method: metodo,
          quoteId,
          couponCode: cupon.valido ? couponCode : undefined,
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
      anotarPedidoPorMedir(datos.order.reference);
      // Wompi: se manda al cliente a la página segura de pago; el pedido ya existe y esperará el aviso de Wompi.
      const instrucciones = datos.intent?.instructions as { kind?: string; url?: string } | undefined;
      if (instrucciones?.kind === 'redirect' && instrucciones.url) {
        window.location.href = instrucciones.url;
        return;
      }
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

              {/* --- domicilio vs. recoger en tienda --- */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`chip ${modoEntrega === 'domicilio' ? 'active' : ''}`}
                  onClick={() => setModoEntrega('domicilio')}
                >
                  Envío a domicilio
                </button>
                <button
                  type="button"
                  className={`chip ${modoEntrega === 'recoger' ? 'active' : ''}`}
                  onClick={() => setModoEntrega('recoger')}
                >
                  Recoger en tienda — gratis
                </button>
              </div>

              {modoEntrega === 'recoger' && (
                <p className="checkout-hint" style={{ marginBottom: 28 }}>
                  Recoges en {DIRECCION_RECOGIDA.direccion}, {DIRECCION_RECOGIDA.ciudad},{' '}
                  {DIRECCION_RECOGIDA.departamento}. Te avisamos por correo o WhatsApp cuando esté listo.
                </p>
              )}

              <div className="checkout-fields-grid">
                {CAMPOS.filter((f) => modoEntrega === 'domicilio' || !f.soloDomicilio).map((f) => (
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
                    ) : f.field === 'ciudad' ? (
                      // Desplegable, no texto libre: así nadie llega a "Bogota"
                      // sin tilde o "Medellin" mal escrito y se topa con un
                      // rechazo de cotización que no entiende. Depende del
                      // departamento — sin uno elegido, solo hay un aviso.
                      <select
                        id="checkout-ciudad"
                        className="checkout-input"
                        value={form.ciudad}
                        onChange={(e) => updateField('ciudad', e.target.value)}
                        disabled={!form.departamento}
                        aria-invalid={!!errors.ciudad}
                        style={{ borderColor: errors.ciudad ? '#ef4444' : undefined }}
                      >
                        <option value="">
                          {form.departamento ? 'Selecciona…' : 'Elige primero el departamento'}
                        </option>
                        {form.departamento &&
                          ciudadesDe(form.departamento).map((c) => (
                            <option key={c} value={c}>{c}</option>
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

                {modoEntrega === 'domicilio' && eligiendoOtro && (
                  <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                    <label htmlFor="checkout-ciudad-otra" className="checkout-label">
                      Nombre del municipio{' '}
                      {errors.ciudadOtra && (
                        <span style={{ color: '#ef4444', textTransform: 'none', letterSpacing: 0 }}>({errors.ciudadOtra})</span>
                      )}
                    </label>
                    <input
                      id="checkout-ciudad-otra"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Escribe el nombre de tu municipio"
                      value={form.ciudadOtra}
                      onChange={(e) => updateField('ciudadOtra', e.target.value)}
                      aria-invalid={!!errors.ciudadOtra}
                      className="checkout-input"
                      style={{ borderColor: errors.ciudadOtra ? '#ef4444' : undefined }}
                    />
                  </div>
                )}
              </div>

              {/* --- opciones de envío --- */}
              <div style={{ marginTop: 40 }}>
                <div className="eyebrow" style={{ marginBottom: 16 }}>Opciones de envío</div>

                {modoEntrega === 'domicilio' && (!form.departamento || !ciudadEfectiva) ? (
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
                        <LogoEnvio codigo={q.carrierCode} nombre={q.carrier} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>{q.service} · {q.carrier}</span>
                            {q.etiqueta && <span className="badge-inline">{q.etiqueta}</span>}
                          </div>
                          <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 3 }}>
                            {q.etaLabel}
                          </div>
                          {q.id in codOpciones && (
                            <span className="badge-inline" style={{ marginTop: 6, display: 'inline-block' }}>
                              Contra entrega disponible{codOpciones[q.id] > 0 ? ` · +${formatCOP(codOpciones[q.id])} en el envío` : ''}
                            </span>
                          )}
                          {q.note && (
                            <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 6, lineHeight: 1.5 }}>{q.note}</div>
                          )}
                        </div>
                        <div className="mono" style={{ fontSize: 14, flexShrink: 0, textAlign: 'right' }}>
                          {q.costLabel ? (
                            <span style={{ color: 'var(--accent)', fontSize: 12 }}>{q.costLabel}</span>
                          ) : q.cost === 0 ? (
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

            <OrderSummary items={items} subtotal={subtotal} envio={envio} total={total} quote={quote} descuentoCupon={descuentoCupon} cuponCode={cupon.code} recargoCod={recargoCod} />
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
                        {m.id === 'COD' && quote && (codOpciones[quote.id] ?? 0) > 0 && ` El envío sube ${formatCOP(codOpciones[quote.id])} por el recaudo.`}
                      </div>
                    </div>
                    <LogoPago metodo={m.id} />
                  </label>
                ))}
                {!metodos.some((m) => m.id === 'COD') && (
                  <div className="option-card" aria-disabled="true" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                    <input type="radio" disabled style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>Contra entrega <span className="badge-inline">No disponible en este pedido</span></div>
                      <div style={{ fontSize: 12.5, color: 'var(--fg-dim)', marginTop: 4, lineHeight: 1.5 }}>
                        {modoEntrega === 'recoger'
                          ? 'No aplica a recoger en tienda: lo cobra la transportadora al entregar. Pagas con cualquiera de los otros métodos.'
                          : quote?.id.startsWith('local:')
                            ? 'No aplica a la entrega el mismo día. Pagas con cualquiera de los otros métodos.'
                            : 'Pagas en efectivo al recibir, solo en destinos con cobertura de recaudo. No está disponible para este destino o este pedido.'}
                      </div>
                    </div>
                  </div>
                )}
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
              <AvisoRecaptcha />
            </div>

            <OrderSummary items={items} subtotal={subtotal} envio={envio} total={total} quote={quote} descuentoCupon={descuentoCupon} cuponCode={cupon.code} recargoCod={recargoCod} />
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
  /** Recoger en tienda no necesita dirección: este campo no se muestra en ese modo. */
  soloDomicilio?: boolean;
}> = [
  { field: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Tu nombre', autoComplete: 'given-name' },
  { field: 'apellido', label: 'Apellido', type: 'text', placeholder: 'Tu apellido', autoComplete: 'family-name' },
  { field: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@email.com', full: true, inputMode: 'email', autoComplete: 'email' },
  { field: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', placeholder: '300 000 0000', inputMode: 'tel', autoComplete: 'tel' },
  // Algunas transportadoras (TCC, confirmado) rechazan la guía sin esto.
  { field: 'documento', label: 'Cédula o NIT', type: 'text', placeholder: '1234567890', inputMode: 'numeric', autoComplete: 'off' },
  { field: 'departamento', label: 'Departamento', type: 'text', placeholder: 'Cundinamarca', autoComplete: 'address-level1', soloDomicilio: true },
  { field: 'ciudad', label: 'Ciudad', type: 'text', placeholder: 'Bogotá', autoComplete: 'address-level2', soloDomicilio: true },
  { field: 'direccion', label: 'Dirección (con barrio)', type: 'text', placeholder: 'Calle 123 # 45-67, barrio El Poblado', full: true, autoComplete: 'street-address', soloDomicilio: true },
  // Torre/apto/piso van aparte de "barrio": la transportadora los lee de un
  // campo de instrucciones de entrega distinto, no del nombre del barrio.
  { field: 'notas', label: 'Apto, torre o punto de referencia (opcional)', type: 'text', placeholder: 'Apto 301, torre 2, edificio azul' },
];

function OrderSummary({
  items, subtotal, envio, total, quote, descuentoCupon, cuponCode, recargoCod = 0,
}: {
  items: ReturnType<typeof useCart>['items'];
  subtotal: number;
  envio: number;
  total: number;
  quote: Quote | null;
  descuentoCupon: number;
  cuponCode?: string;
  /** Parte del envío que corresponde al recaudo contra entrega. */
  recargoCod?: number;
}) {
  const { listSubtotal, linePrice } = useCart();
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
            <div className="mono" style={{ fontSize: 13, flexShrink: 0 }}><PrecioPromo unit={linePrice(item).unit} list={linePrice(item).list} qty={item.qty} /></div>
          </div>
        ))}
      </div>

      <CuponBox />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
          <span className="mono">{formatCOP(listSubtotal)}</span>
        </div>
        {listSubtotal > subtotal && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14, color: 'var(--accent)' }}>
            <span>Promociones</span>
            <span className="mono">−{formatCOP(listSubtotal - subtotal)}</span>
          </div>
        )}
        {descuentoCupon > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 14, color: 'var(--accent)' }}>
            <span>Cupón {cuponCode}</span>
            <span className="mono">−{formatCOP(descuentoCupon)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, fontSize: 14 }}>
          <span style={{ color: 'var(--fg-dim)', minWidth: 0 }}>
            Envío
            {quote && <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--fg-mute)' }}>{quote.etaLabel}</span>}
            {recargoCod > 0 && <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--fg-mute)' }}>Incluye {formatCOP(recargoCod)} de recaudo contra entrega</span>}
          </span>
          <span className="mono" style={{ flexShrink: 0 }}>
            {quote ? (quote.costLabel ? <span style={{ color: 'var(--accent)', fontSize: 12 }}>{quote.costLabel}</span> : envio === 0 ? <span style={{ color: 'var(--accent)' }}>Gratis</span> : formatCOP(envio)) : '—'}
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
