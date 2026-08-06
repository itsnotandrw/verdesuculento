import type { SellerStats } from '@/types';

export default function SellerTrust({ seller }: { seller: SellerStats }) {
  const statusLabel = seller.powerSellerStatus === 'gold' ? 'Gold' : seller.powerSellerStatus === 'silver' ? 'Silver' : 'Verificado';

  return (
    <div className="seller-trust">
      <span className="seller-trust-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Vendedor {statusLabel} verificado</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 2 }}>
          {seller.positivePct}% calificaciones positivas · +{seller.completedTransactions.toLocaleString('es-CO')} ventas
        </div>
      </div>
    </div>
  );
}
