'use client';

import type { CSSProperties } from 'react';
import { formatCOP } from '@/data/catalog';

/** Precio con promoción: precio de lista tachado y precio final. Sin promoción, solo el precio. */
export default function PrecioPromo({
  unit, list, qty = 1, style, className,
}: { unit: number; list: number; qty?: number; style?: CSSProperties; className?: string }) {
  if (unit >= list) return <span className={className} style={style}>{formatCOP(unit * qty)}</span>;
  return (
    <span className={className} style={style}>
      <s style={{ opacity: 0.55, fontSize: '0.78em', marginRight: 8, fontWeight: 400 }}>{formatCOP(list * qty)}</s>
      <span style={{ color: 'var(--accent)' }}>{formatCOP(unit * qty)}</span>
    </span>
  );
}
