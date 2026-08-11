/**
 * Badge compacto de reputación, junto al botón de compra.
 *
 * Vive donde se decide la compra; la ficha completa está más abajo, en la
 * pestaña "Reputación" de `#pdp-tabs`. Aquí caben tres datos y no más.
 */

import type { SellerStats } from '@/types';

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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
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
