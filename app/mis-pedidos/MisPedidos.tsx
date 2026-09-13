'use client';

/**
 * "Mis pedidos" — alternativa a una cuenta con contraseña: el cliente busca
 * por correo y ve un resumen (sin dirección ni teléfono, ver la ruta de la
 * API) de cada pedido, con link al detalle completo por su referencia.
 */

import { useState } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/data/catalog';

interface PedidoResumen {
  reference: string;
  orderNumber: number | null;
  createdAt: string;
  status: string;
  statusLabel: string;
  total: number;
  etaLabel: string;
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

export default function MisPedidos() {
  const [email, setEmail] = useState('');
  const [pedidos, setPedidos] = useState<PedidoResumen[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    setPedidos(null);
    try {
      const respuesta = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo buscar.');
      setPedidos(datos.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo buscar.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>SEGUIMIENTO</div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 7vw, 56px)', marginBottom: 14 }}>
          Mis pedidos<em style={{ color: 'var(--accent)' }}>.</em>
        </h1>
        <p style={{ color: 'var(--fg-dim)', marginBottom: 32, fontSize: 15, lineHeight: 1.6 }}>
          Escribe el correo con el que hiciste tu compra para ver tus pedidos.
        </p>

        <form onSubmit={buscar} style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
          <input
            type="email"
            className="checkout-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            required
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="btn btn-primary" disabled={buscando}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 24 }}>{error}</p>}

        {pedidos && pedidos.length === 0 && (
          <p style={{ color: 'var(--fg-dim)' }}>No encontramos pedidos con ese correo.</p>
        )}

        {pedidos && pedidos.length > 0 && (
          <div style={{ display: 'grid', gap: 12 }}>
            {pedidos.map((p) => (
              <Link
                key={p.reference}
                href={`/pedido/${p.reference}`}
                className="pay-panel"
                style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', textDecoration: 'none', color: 'inherit' }}
              >
                {p.orderNumber != null && (
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    #{p.orderNumber}
                  </span>
                )}
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--fg-dim)', flexShrink: 0 }}>
                  {new Date(p.createdAt).toLocaleDateString('es-CO')}
                </span>
                <span className="status-pill" data-tone={TONO[p.status] ?? 'wait'}>{p.statusLabel}</span>
                <span className="mono" style={{ fontSize: 14, marginLeft: 'auto', flexShrink: 0 }}>{formatCOP(p.total)}</span>
                <span className="btn-arrow" style={{ flexShrink: 0 }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
