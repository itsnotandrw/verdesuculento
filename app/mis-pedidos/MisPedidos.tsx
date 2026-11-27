'use client';

/**
 * "Mis pedidos": el cliente encuentra su pedido de dos formas, sin cuenta ni contraseña:
 *  - con su TICKET (VS-XXXXXX, llega al correo al comprar) → abre el pedido directo;
 *  - con su correo → le enviamos la lista de sus pedidos por correo (no se muestra en pantalla, por privacidad).
 */

import { useState } from 'react';
import { tokenRecaptcha } from '@/lib/recaptcha-cliente';
import AvisoRecaptcha from '@/components/AvisoRecaptcha';

export default function MisPedidos() {
  const [modo, setModo] = useState<'ticket' | 'correo'>('ticket');
  const [valor, setValor] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    setAviso(null);
    try {
      const respuesta = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recaptchaToken: await tokenRecaptcha('mis_pedidos'), ...(modo === 'ticket' ? { ticket: valor } : { email: valor }) }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo buscar.');
      // Carga completa: la etiqueta de anuncios no debe seguir activa en la página del pedido.
      if (datos.reference) window.location.assign(`/pedido/${datos.reference}`);
      else setAviso(datos.mensaje ?? 'Listo. Revisa tu correo.');
    } catch (er) {
      setError(er instanceof Error ? er.message : 'No se pudo buscar.');
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
        <p style={{ color: 'var(--fg-dim)', marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
          Al comprar te enviamos un correo con tu <b>ticket</b> (por ejemplo VS-A7K4M2) y tu comprobante de pago. Con el ticket abres tu pedido al instante.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }} role="tablist">
          {([['ticket', 'Tengo mi ticket'], ['correo', 'Busco con mi correo']] as const).map(([id, texto]) => (
            <button key={id} type="button" role="tab" aria-selected={modo === id} className={`chip ${modo === id ? 'active' : ''}`}
              onClick={() => { setModo(id); setValor(''); setError(null); setAviso(null); }}>{texto}</button>
          ))}
        </div>

        <form onSubmit={buscar} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            key={modo}
            type={modo === 'correo' ? 'email' : 'text'}
            className="checkout-input"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={modo === 'ticket' ? 'VS-A7K4M2' : 'tucorreo@ejemplo.com'}
            autoCapitalize={modo === 'ticket' ? 'characters' : 'none'}
            required
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="btn btn-primary" disabled={buscando}>
            {buscando ? 'Buscando…' : modo === 'ticket' ? 'Ver pedido' : 'Enviarme mis pedidos'}
          </button>
        </form>

        {modo === 'correo' && !aviso && (
          <p style={{ fontSize: 13, color: 'var(--fg-dim)' }}>Por tu privacidad no mostramos pedidos en pantalla: te enviamos la lista al correo con el que compraste.</p>
        )}
        <AvisoRecaptcha />
        {error && <p role="alert" style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
        {aviso && <p role="status" style={{ fontSize: 14, color: 'var(--accent)', lineHeight: 1.6 }}>{aviso}</p>}
      </div>
    </div>
  );
}
