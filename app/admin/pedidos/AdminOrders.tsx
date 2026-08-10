'use client';

/**
 * Panel de verificación de pagos.
 *
 * Es la contraparte operativa del pago manual: mientras no haya pasarela, este
 * es el lugar donde alguien mira el extracto y aprueba. La bandeja ordena
 * primero lo que espera acción humana, porque cada minuto ahí es un despacho
 * que no sale.
 *
 * El token se guarda en `sessionStorage`, no en `localStorage`: al cerrar la
 * pestaña se va. Es un panel que aprueba pagos, no conviene que quede pegado
 * en un computador compartido.
 */

import { useCallback, useEffect, useState } from 'react';
import { formatCOP } from '@/data/catalog';

interface Linea {
  name: string;
  qty: number;
  unitPrice: number;
  color: string;
  size: string;
}

interface Evento {
  at: string;
  type: string;
  message: string;
  actor: string;
}

interface Pedido {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  cliente: string;
  email: string;
  telefono: string;
  destino: string;
  direccion: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  metodo: string;
  pagoEstado: string;
  pagoReferencia: string;
  declaradoEn?: string;
  aprobadoEn?: string;
  verificadoPor?: string;
  nota?: string;
  envio: {
    carrier: string;
    service: string;
    trackingNumber: string;
    statusLabel: string;
    codAmount?: number;
    codSettledAt?: string;
    labelUrl?: string;
    cost?: number;
    actualCost?: number;
  } | null;
  lineas: Linea[];
  timeline: Evento[];
}

interface Resumen {
  total: number;
  porVerificar: number;
  pagadosSinGuia: number;
  recaudosPendientes: number;
}

interface Sistema {
  almacenamiento: { id: string; durable: boolean; serverless: boolean; apto: boolean; motivo?: string };
  pagos: string;
  envios: string;
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

const CLAVE = 'verde-admin-token';

export default function AdminOrders() {
  const [token, setToken] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [sistema, setSistema] = useState<Sistema | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [operador, setOperador] = useState('');

  useEffect(() => {
    const guardado = sessionStorage.getItem(CLAVE);
    if (guardado) {
      setToken(guardado);
      setAutenticado(true);
    }
  }, []);

  const cargar = useCallback(
    async (elToken: string) => {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${elToken}` },
          cache: 'no-store',
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          setAutenticado(false);
          sessionStorage.removeItem(CLAVE);
          throw new Error(datos.error ?? 'No autorizado.');
        }

        setPedidos(datos.orders ?? []);
        setResumen(datos.resumen ?? null);
        setSistema(datos.sistema ?? null);
        setAutenticado(true);
        sessionStorage.setItem(CLAVE, elToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar.');
      } finally {
        setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    if (autenticado && token) cargar(token);
  }, [autenticado, token, cargar]);

  const accionar = async (pedido: Pedido, accion: string, extra: Record<string, unknown> = {}) => {
    setOcupado(pedido.id);
    setError(null);
    try {
      const respuesta = await fetch(`/api/admin/orders/${pedido.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accion, quien: operador || 'operador', ...extra }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo aplicar la acción.');
      await cargar(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aplicar la acción.');
    } finally {
      setOcupado(null);
    }
  };

  // ------------------------------------------------------------- login
  if (!autenticado) {
    return (
      <div className="page-section" style={{ paddingTop: 140 }}>
        <div className="container" style={{ maxWidth: 420 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>PANEL INTERNO</div>
          <h1 className="display" style={{ fontSize: 'clamp(34px, 7vw, 48px)', marginBottom: 28 }}>Pedidos</h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (token.trim()) cargar(token.trim());
            }}
          >
            <label className="checkout-label" htmlFor="admin-token">Token de acceso</label>
            <input
              id="admin-token"
              type="password"
              className="checkout-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
            />
            {error && <p style={{ marginTop: 14, fontSize: 13, color: '#ef4444' }}>{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }} disabled={cargando}>
              {cargando ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- bandeja
  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
            <h1 className="display" style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>Pedidos</h1>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => cargar(token)} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {sistema && !sistema.almacenamiento.apto && (
          <div className="admin-alerta" role="alert">
            <strong style={{ display: 'block', marginBottom: 6 }}>
              El checkout está rechazando pedidos
            </strong>
            {sistema.almacenamiento.motivo}
          </div>
        )}

        {resumen && (
          <div className="admin-stats">
            <Stat valor={resumen.porVerificar} etiqueta="Por verificar" destacado={resumen.porVerificar > 0} />
            <Stat valor={resumen.pagadosSinGuia} etiqueta="Pagados sin guía" destacado={resumen.pagadosSinGuia > 0} />
            <Stat valor={resumen.recaudosPendientes} etiqueta="Recaudos por conciliar" />
            <Stat valor={resumen.total} etiqueta="Pedidos totales" />
          </div>
        )}

        <div style={{ margin: '24px 0 32px' }}>
          <label className="checkout-label" htmlFor="admin-operador">Tu nombre (queda en la bitácora del pedido)</label>
          <input
            id="admin-operador"
            className="checkout-input"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            placeholder="Quién está verificando"
            style={{ maxWidth: 320 }}
          />
        </div>

        {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</p>}

        {sistema && (
          <p className="mono" style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginBottom: 20, letterSpacing: '0.05em' }}>
            pagos: {sistema.pagos} · envíos: {sistema.envios} · pedidos: {sistema.almacenamiento.id}
          </p>
        )}

        {pedidos.length === 0 && !cargando && (
          <p style={{ color: 'var(--fg-dim)' }}>Todavía no hay pedidos.</p>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {pedidos.map((pedido) => {
            const expandido = abierto === pedido.id;
            const trabajando = ocupado === pedido.id;

            return (
              <div key={pedido.id} className="pay-panel" style={{ padding: 20 }}>
                <button
                  onClick={() => setAbierto(expandido ? null : pedido.id)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', cursor: 'none' }}
                  aria-expanded={expandido}
                >
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{pedido.reference}</span>
                  <span className="status-pill" data-tone={TONO[pedido.status] ?? 'wait'}>{pedido.statusLabel}</span>
                  <span style={{ fontSize: 13, color: 'var(--fg-dim)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pedido.cliente} · {pedido.destino}
                  </span>
                  <span className="mono" style={{ fontSize: 14, flexShrink: 0 }}>{formatCOP(pedido.total)}</span>
                </button>

                {expandido && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                    <div className="admin-detalle">
                      <Dato etiqueta="Referencia de pago" valor={pedido.pagoReferencia} mono />
                      <Dato etiqueta="Método" valor={pedido.metodo} />
                      <Dato etiqueta="Estado del pago" valor={pedido.pagoEstado} />
                      <Dato etiqueta="Teléfono" valor={pedido.telefono} />
                      <Dato etiqueta="Correo" valor={pedido.email} />
                      <Dato etiqueta="Dirección" valor={`${pedido.direccion} — ${pedido.destino}`} />
                      {pedido.declaradoEn && (
                        <Dato etiqueta="Cliente reportó pago" valor={new Date(pedido.declaradoEn).toLocaleString('es-CO')} />
                      )}
                      {pedido.verificadoPor && <Dato etiqueta="Verificado por" valor={pedido.verificadoPor} />}
                      {pedido.envio && (
                        <>
                          <Dato etiqueta="Guía" valor={`${pedido.envio.trackingNumber} · ${pedido.envio.carrier}`} mono />
                          <Dato etiqueta="Estado del envío" valor={pedido.envio.statusLabel} />
                        </>
                      )}
                    </div>

                    {/* Solo aparece si la transportadora cobró distinto de lo
                        cotizado al cliente — Envia no reserva tarifa entre
                        cotizar y generar, así que el precio pudo moverse. */}
                    {pedido.envio?.actualCost != null && (
                      <div
                        style={{
                          marginTop: 16, padding: '12px 14px', borderRadius: 10,
                          background: 'color-mix(in oklab, #f0b429 12%, var(--bg-elev))',
                          border: '1px solid color-mix(in oklab, #f0b429 35%, transparent)',
                          fontSize: 12.5, lineHeight: 1.5,
                        }}
                      >
                        <strong>Costo de envío distinto al cotizado:</strong> se le mostró{' '}
                        {formatCOP(pedido.envio.cost ?? 0)} al cliente, la transportadora cobró{' '}
                        {formatCOP(pedido.envio.actualCost)}.
                      </div>
                    )}

                    <div style={{ marginTop: 20 }}>
                      <div className="pay-field-label" style={{ marginBottom: 8 }}>Productos</div>
                      {pedido.lineas.map((l, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, marginBottom: 6 }}>
                          <span style={{ minWidth: 0, color: 'var(--fg-dim)' }}>{l.name} ×{l.qty}</span>
                          <span className="mono" style={{ flexShrink: 0 }}>{formatCOP(l.unitPrice * l.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* --- acciones --- */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
                      {(pedido.pagoEstado === 'in_review' || pedido.pagoEstado === 'pending') && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={trabajando}
                          onClick={() => {
                            if (
                              confirm(
                                `¿Confirmas que viste el abono de ${formatCOP(pedido.total)} con la referencia ${pedido.pagoReferencia} REFLEJADO EN LA CUENTA?\n\nUn comprobante enviado por el cliente no es suficiente. Al aceptar se genera la guía.`
                              )
                            ) {
                              accionar(pedido, 'aprobar', { confirmoAbono: true });
                            }
                          }}
                        >
                          {trabajando ? 'Procesando…' : 'Aprobar pago y despachar'}
                        </button>
                      )}

                      {pedido.pagoEstado !== 'approved' && (
                        <>
                          <button className="btn btn-ghost btn-sm" disabled={trabajando} onClick={() => accionar(pedido, 'reintentar-pago')}>
                            Nueva referencia
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={trabajando}
                            onClick={() => {
                              const motivo = prompt('Motivo del rechazo:');
                              if (motivo) accionar(pedido, 'rechazar', { motivo });
                            }}
                          >
                            Rechazar
                          </button>
                        </>
                      )}

                      {pedido.pagoEstado === 'approved' && !pedido.envio && (
                        <button className="btn btn-primary btn-sm" disabled={trabajando} onClick={() => accionar(pedido, 'reintentar-guia')}>
                          Generar guía
                        </button>
                      )}

                      {pedido.envio?.codAmount && !pedido.envio.codSettledAt && (
                        <button className="btn btn-ghost btn-sm" disabled={trabajando} onClick={() => accionar(pedido, 'conciliar')}>
                          Marcar recaudo girado
                        </button>
                      )}

                      <a className="btn btn-ghost btn-sm" href={`/pedido/${pedido.reference}`} target="_blank" rel="noreferrer">
                        Ver como el cliente
                      </a>
                    </div>

                    {pedido.timeline.length > 0 && (
                      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                        <div className="pay-field-label" style={{ marginBottom: 12 }}>Bitácora</div>
                        {[...pedido.timeline].reverse().map((evento, i) => (
                          <div key={i} className="timeline-item" data-done={i === 0 ? 'true' : 'false'}>
                            <span className="timeline-dot" aria-hidden />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{evento.message}</div>
                              <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 3 }}>
                                {new Date(evento.at).toLocaleString('es-CO')} · {evento.actor}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ valor, etiqueta, destacado = false }: { valor: number; etiqueta: string; destacado?: boolean }) {
  return (
    <div className="admin-stat" data-destacado={destacado ? 'true' : 'false'}>
      <div className="display" style={{ fontSize: 32, lineHeight: 1 }}>{valor}</div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', marginTop: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {etiqueta}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="pay-field-label">{etiqueta}</div>
      <div className={mono ? 'mono' : undefined} style={{ fontSize: 13.5, wordBreak: 'break-word', lineHeight: 1.45 }}>
        {valor}
      </div>
    </div>
  );
}
