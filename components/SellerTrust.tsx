/**
 * Badge compacto de reputación, junto al botón de compra.
 *
 * Vive donde se decide la compra; la ficha completa está más abajo, en la
 * pestaña "Reputación" de `#pdp-tabs`. Aquí caben tres datos y no más.
 */

import type { SellerStats } from '@/types';
import { Handshake } from 'lucide-react';

export default function SellerTrust({
  seller,
  onNavigate,
}: {
  seller: SellerStats;
  /** Si el link vive en una página con pestañas, cambia a la de reputación antes de saltar. */
  onNavigate?: () => void;
}) {
  return (
    <a href="#pdp-tabs" className="seller-trust" onClick={onNavigate} style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="seller-trust-icon" aria-hidden>
        <Handshake size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{seller.medal}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 2, lineHeight: 1.45 }}>
          {seller.positivePct}% positivas · {seller.completedTransactions.toLocaleString('es-CO')} ventas ·{' '}
          {seller.cancellationRate}% cancelaciones
        </div>
      </div>
    </a>
  );
}
