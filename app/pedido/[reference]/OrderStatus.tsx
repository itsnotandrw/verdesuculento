'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/data/catalog';

interface PublicOrder {
  reference: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string;
  shipmentStatus: string;
  carrier?: string;
  trackingNumber?: string;
  etaLabel: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  lines: Array<{ name: string; qty: number; unitPrice: number; color: string; size: string }>;
  destino: string;
  tracking: Array<{ status: string; description: string; occurredAt: string; location?: string }>;
}

interface Instrucciones {
  brebKey: string;
  keyType: string;
  holder: string;
  bank: string;
  nequi: string | null;
}

const TONO: Record<string, 'wait' | 'ok' | 'bad'> = {
  awaiting_payment: 'wait',
  payment_in_review: 'wait',
  paid: 'ok',
  shipped: 'ok',
  delivered: 'ok',
  cancelled: 'bad',
  expired: 'bad',
};

const ETIQUETA: Record<string, string> = {
  awaiting_payment: 'Esperando pago',
  payment_in_review: 'Verificando pago',
  paid: 'Pago confirmado',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

function fecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderStatus({
  inicial,
  instrucciones,
  requiereVerificacionManual,
}: {
  inicial: PublicOrder;
  instrucciones: Instrucciones | null;
  requiereVerificacionManual: boolean;
}) {
  const [pedido, setPedido] = useState<PublicOrder>(inicial);
  const [declarando, setDeclarando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const esperandoPago = pedido.paymentStatus === 'pending';
  const enRevision = pedido.paymentStatus === 'in_review';

  // Mientras el pago no esté resuelto se refresca solo: si el operador aprueba
  // desde el panel, el cliente lo ve sin recargar.
  useEffect(() => {
    if (!esperandoPago && !enRevision) return;

    const intervalo = setInterval(async () => {
      try {
        const respuesta = await fetch(`/api/orders/${pedido.reference}`, { cache: 'no-store' });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (datos.order) setPedido(datos.order);
      } catch {
        // Sin conexión no pasa nada: se reintenta en el siguiente ciclo.
      }
    }, 15_000);

    return () => clearInterval(intervalo);
  }, [pedido.reference, esperandoPago, enRevision]);

  const copiar = async (texto: string, llave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(llave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  };

  const declararPago = async () => {
    setDeclarando(true);
    try {
      const respuesta = await fetch(`/api/orders/${pedido.reference}/declarar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const datos = await respuesta.json();
      if (respuesta.ok && datos.order) setPedido(datos.order);
    } finally {
      setDeclarando(false);
    }
  };

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 860 }}>
        {/* --- encabezado --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="eyebrow">PEDIDO {pedido.reference}</div>
          <span className="status-pill" data-tone={TONO[pedido.status] ?? 'wait'}>
            {ETIQUETA[pedido.status] ?? pedido.status}
          </span>
        </div>

        <h1 className="display" style={{ fontSize: 'clamp(38px, 8vw, 68px)', marginBottom: 16, lineHeight: 1.05 }}>
          {esperandoPago && 'Falta un paso'}
          {enRevision && (
            <>
              Verificando tu pago<em style={{ color: 'var(--accent)' }}>.</em>
            </>
          )}
          {pedido.paymentStatus === 'approved' && pedido.shipmentStatus === 'delivered' && (
            <>
              Entregado<em style={{ color: 'var(--accent)' }}>.</em>
            </>
          )}
          {pedido.paymentStatus === 'approved' && pedido.shipmentStatus !== 'delivered' && (
            <>
              ¡Gracias por tu compra<em style={{ color: 'var(--accent)' }}>!</em>
            </>
          )}
          {(pedido.paymentStatus === 'declined' || pedido.paymentStatus === 'expired') && 'Pedido cerrado'}
        </h1>

        <p style={{ color: 'var(--fg-dim)', lineHeight: 1.65, marginBottom: 40, maxWidth: 560 }}>
          {esperandoPago &&
            'Transfiere el valor exacto a la llave del vivero usando la referencia de abajo. Apenas veamos el abono, despachamos tu planta.'}
          {enRevision &&
            'Ya registramos tu aviso. Estamos confirmando el abono en la cuenta; en cuanto aparezca, tu pedido pasa a despacho y te avisamos por correo.'}
          {pedido.paymentStatus === 'approved' &&
            `Tu pedido está confirmado y viaja a ${pedido.destino}. Cada planta sale empacada para el viaje y con garantía de planta viva.`}
          {pedido.paymentStatus === 'declined' && 'Este pedido fue cancelado. Si crees que es un error, escríbenos y lo revisamos.'}
          {pedido.paymentStatus === 'expired' && 'Venció el plazo de pago y liberamos el pedido. Puedes volver a armarlo cuando quieras.'}
        </p>

        {/* --- instrucciones de pago Bre-B --- */}
        {instrucciones && (esperandoPago || enRevision) && (
          <div className="pay-panel" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div className="eyebrow" style={{ margin: 0 }}>Pagar con Bre-B</div>
              <span className="badge-inline">Desde cualquier banco o billetera</span>
            </div>

            <div className="pay-field">
              <div style={{ minWidth: 0 }}>
                <div className="pay-field-label">Llave del vivero · {instrucciones.keyType}</div>
                <div className="pay-field-value">{instrucciones.brebKey}</div>
              </div>
              <button
                className={`pay-copy ${copiado === 'llave' ? 'done' : ''}`}
                onClick={() => copiar(instrucciones.brebKey, 'llave')}
              >
                {copiado === 'llave' ? '✓ Copiada' : 'Copiar'}
              </button>
            </div>

            <div className="pay-field">
              <div style={{ minWidth: 0 }}>
                <div className="pay-field-label">Valor exacto</div>
                <div className="pay-field-value">{formatCOP(pedido.total)}</div>
              </div>
              <button
                className={`pay-copy ${copiado === 'monto' ? 'done' : ''}`}
                onClick={() => copiar(String(pedido.total), 'monto')}
              >
                {copiado === 'monto' ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="pay-field">
              <div style={{ minWidth: 0 }}>
                <div className="pay-field-label">Referencia — escríbela en la descripción</div>
                <div className="pay-field-value">{pedido.paymentReference}</div>
              </div>
              <button
                className={`pay-copy ${copiado === 'ref' ? 'done' : ''}`}
                onClick={() => copiar(pedido.paymentReference, 'ref')}
              >
                {copiado === 'ref' ? '✓ Copiada' : 'Copiar'}
              </button>
            </div>

            <div style={{ marginTop: 18, fontSize: 13, color: 'var(--fg-dim)', lineHeight: 1.6 }}>
              A nombre de <strong style={{ color: 'var(--fg)' }}>{instrucciones.holder}</strong> · {instrucciones.bank}
              {instrucciones.nequi && (
                <>
                  <br />
                  ¿Tu banco aún no tiene Bre-B? También puedes transferir a Nequi{' '}
                  <strong style={{ color: 'var(--fg)' }}>{instrucciones.nequi}</strong> con la misma referencia.
                </>
              )}
              <br />
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>
                Tienes hasta el {fecha(pedido.expiresAt)} para completar el pago.
              </span>
            </div>

            {esperandoPago && requiereVerificacionManual && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-primary" onClick={declararPago} disabled={declarando} style={{ width: '100%', justifyContent: 'center' }}>
                  {declarando ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="spinner-sm" /> Registrando…
                    </span>
                  ) : (
                    'Ya hice la transferencia'
                  )}
                </button>
                <p style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 12, lineHeight: 1.55 }}>
                  Esto nos avisa para que revisemos. La confirmación llega cuando el abono aparece en la cuenta,
                  normalmente en menos de una hora en horario hábil.
                </p>
              </div>
            )}

            {enRevision && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="spinner-sm" />
                <span style={{ fontSize: 13, color: 'var(--fg-dim)' }}>
                  Revisando el abono. Esta página se actualiza sola.
                </span>
              </div>
            )}
          </div>
        )}

        {/* --- envío --- */}
        {pedido.trackingNumber && (
          <div className="pay-panel" style={{ marginBottom: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>Envío</div>
            <div className="pay-field">
              <div style={{ minWidth: 0 }}>
                <div className="pay-field-label">Guía · {pedido.carrier}</div>
                <div className="pay-field-value">{pedido.trackingNumber}</div>
              </div>
              <button
                className={`pay-copy ${copiado === 'guia' ? 'done' : ''}`}
                onClick={() => copiar(pedido.trackingNumber!, 'guia')}
              >
                {copiado === 'guia' ? '✓ Copiada' : 'Copiar'}
              </button>
            </div>

            {pedido.tracking.length > 0 && (
              <div style={{ marginTop: 24 }}>
                {[...pedido.tracking]
                  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                  .map((evento, i) => (
                    <div key={i} className="timeline-item" data-done={i === 0 ? 'true' : 'false'}>
                      <span className="timeline-dot" aria-hidden />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>{evento.description}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 3 }}>
                          {fecha(evento.occurredAt)}
                          {evento.location && ` · ${evento.location}`}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* --- resumen --- */}
        <div className="pay-panel">
          <div className="eyebrow" style={{ marginBottom: 18 }}>Resumen</div>

          {pedido.lines.map((linea, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{linea.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>
                  ×{linea.qty}
                  {linea.size && ` · ${linea.size}`}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 13.5, flexShrink: 0 }}>
                {formatCOP(linea.unitPrice * linea.qty)}
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, marginBottom: 8 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
              <span className="mono">{formatCOP(pedido.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, marginBottom: 16 }}>
              <span style={{ color: 'var(--fg-dim)', minWidth: 0 }}>
                Envío a {pedido.destino}
                <span className="mono" style={{ display: 'block', fontSize: 11, color: 'var(--fg-mute)' }}>{pedido.etaLabel}</span>
              </span>
              <span className="mono" style={{ flexShrink: 0 }}>
                {pedido.shippingCost === 0 ? <span style={{ color: 'var(--accent)' }}>Gratis</span> : formatCOP(pedido.shippingCost)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span className="display" style={{ fontSize: 22 }}>Total</span>
              <span className="display" style={{ fontSize: 28 }}>{formatCOP(pedido.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
          <Link href="/catalogo" className="btn btn-primary">Seguir comprando <span className="btn-arrow">→</span></Link>
          <Link href="/diario" className="btn btn-ghost">Guías de cultivo</Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--fg-mute)', marginTop: 28, lineHeight: 1.6 }}>
          Guarda este enlace: aquí puedes volver a ver el estado de tu pedido en cualquier momento.
        </p>
      </div>
    </div>
  );
}
