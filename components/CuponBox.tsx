'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useCupon } from '@/hooks/useCupon';
import { formatCOP } from '@/data/catalog';

/** Caja para escribir el código de un cupón. Muestra el ahorro o el motivo por el que no aplica. */
export default function CuponBox() {
  const { couponCode, setCouponCode } = useCart();
  const estado = useCupon();
  const [texto, setTexto] = useState('');

  const aplicar = () => { if (texto.trim()) setCouponCode(texto.trim().toUpperCase()); };
  const quitar = () => { setCouponCode(''); setTexto(''); };

  if (couponCode && estado.valido) {
    return (
      <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid color-mix(in oklab, var(--accent) 45%, transparent)', background: 'color-mix(in oklab, var(--accent) 10%, transparent)', fontSize: 13, lineHeight: 1.45 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <span><b className="mono" style={{ letterSpacing: '0.08em' }}>{estado.code}</b> aplicado · ahorras <b>{formatCOP(estado.descuento)}</b></span>
          <button type="button" onClick={quitar} style={{ fontSize: 11, textDecoration: 'underline', color: 'var(--fg-dim)', cursor: 'pointer' }}>Quitar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor="cupon-input" className="mono" style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 8 }}>
        ¿Tienes un cupón?
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="cupon-input"
          value={couponCode ? couponCode : texto}
          onChange={(e) => { if (couponCode) setCouponCode(''); setTexto(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } }}
          placeholder="Código"
          autoComplete="off"
          spellCheck={false}
          className="checkout-input"
          style={{ flex: 1, minWidth: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={aplicar} disabled={estado.cargando}>
          {estado.cargando ? '…' : 'Aplicar'}
        </button>
      </div>
      {couponCode && estado.valido === false && estado.motivo && (
        <p style={{ marginTop: 8, fontSize: 12.5, color: '#ef4444', lineHeight: 1.45 }}>{estado.motivo}</p>
      )}
    </div>
  );
}
