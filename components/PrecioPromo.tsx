'use client';

import type { CSSProperties } from 'react';
import { formatCOP } from '@/data/catalog';

/**
 * Precio con promoción. Sin promoción, solo el precio.
 *  - Por defecto (en línea): precio de lista tachado y precio final, para espacios chicos (carrito, buscador…).
 *  - `ml`: estilo Mercado Libre — el precio de lista tachado y pequeño arriba, el precio final GRANDE y el
 *    descuento en verde ("15% OFF") al lado. Es el que se usa en tarjetas y fichas.
 */
export default function PrecioPromo({
  unit, list, qty = 1, style, className, ml = false,
}: { unit: number; list: number; qty?: number; style?: CSSProperties; className?: string; ml?: boolean }) {
  const hay = unit < list;
  if (ml) {
    const pct = hay ? Math.max(1, Math.round((1 - unit / list) * 100)) : 0;
    return (
      <span className={`pml${hay ? ' pml-con' : ''}${className ? ' ' + className : ''}`} style={style}>
        {hay && <s className="pml-list">{formatCOP(list * qty)}</s>}
        <span className="pml-row">
          <b className="pml-unit">{formatCOP(unit * qty)}</b>
          {hay && <em className="pml-off">{pct}% OFF</em>}
        </span>
      </span>
    );
  }
  if (!hay) return <span className={className} style={style}>{formatCOP(unit * qty)}</span>;
  return (
    <span className={className} style={style}>
      <s style={{ opacity: 0.55, fontSize: '0.78em', marginRight: 8, fontWeight: 400 }}>{formatCOP(list * qty)}</s>
      <span style={{ color: 'var(--accent)' }}>{formatCOP(unit * qty)}</span>
    </span>
  );
}
