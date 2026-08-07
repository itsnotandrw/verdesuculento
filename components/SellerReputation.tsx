/**
 * Reputación del vendedor, con los datos reales de Mercado Libre.
 *
 * Se reconstruye el termómetro de ML —cinco tramos, el último encendido— en
 * vez de pegar una captura de pantalla del perfil. Tres razones:
 *
 *   1. Una captura envejece: el día que suban las ventas, la imagen miente.
 *   2. Poner la marca de Mercado Libre en la tienda propia es raro justo
 *      cuando el punto es dejar de depender de ellos.
 *   3. Las métricas duras (0% de cancelaciones, 0,3% de reclamos sobre 733
 *      ventas en 60 días) convencen más que un logo, y aquí sí caben.
 *
 * El enlace al perfil queda para quien quiera verificarlo en la fuente.
 */

import type { SellerStats } from '@/types';

/** El termómetro de ML va de 1_red a 5_green. */
function nivelIndice(level: string): number {
  const n = parseInt(level, 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5;
}

const COLORES = ['#e63f3f', '#ef8b3f', '#f0c43f', '#a8c93f', 'var(--accent)'];

export default function SellerReputation({ seller }: { seller: SellerStats }) {
  const indice = nivelIndice(seller.level);

  const metricas = [
    {
      valor: `${seller.positivePct}%`,
      etiqueta: 'Calificaciones positivas',
      detalle: `${seller.negativePct}% negativas`,
    },
    {
      valor: seller.completedTransactions.toLocaleString('es-CO'),
      etiqueta: 'Ventas concretadas',
      detalle: `${seller.sales60d} en los últimos 60 días`,
    },
    {
      valor: `${seller.cancellationRate}%`,
      etiqueta: 'Cancelaciones',
      detalle: 'De los pedidos recientes',
    },
    {
      valor: `${seller.claimsRate}%`,
      etiqueta: 'Reclamos',
      detalle: 'Sobre las ventas de 60 días',
    },
  ];

  return (
    <section className="seller-rep" aria-labelledby="reputacion-titulo">
      <div className="seller-rep-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>QUIÉN CULTIVA TUS PLANTAS</div>
          <h2 id="reputacion-titulo" className="display seller-rep-title">
            {seller.medal}<em style={{ color: 'var(--accent)' }}>.</em>
          </h2>
          <p style={{ color: 'var(--fg-dim)', fontSize: 14.5, lineHeight: 1.6, marginTop: 10, maxWidth: 460 }}>
            {seller.motto} Somos el mismo vivero que lleva {seller.completedTransactions.toLocaleString('es-CO')} ventas
            y {seller.followersLabel} seguidores en Mercado Libre. Esta tienda es nuestra casa propia — mismos
            cultivos, mismo empaque, misma garantía.
          </p>
        </div>

        <div className="seller-rep-medal" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* termómetro de reputación */}
      <div className="seller-rep-thermo" role="img" aria-label={`Nivel de reputación ${indice} de 5, el más alto`}>
        {COLORES.map((color, i) => (
          <span
            key={i}
            className="seller-rep-bar"
            style={{
              background: i + 1 === indice ? color : `color-mix(in oklab, ${color} 22%, transparent)`,
              height: i + 1 === indice ? 10 : 6,
            }}
          />
        ))}
      </div>
      <div className="mono seller-rep-thermo-label">
        Nivel {indice} de 5 · {seller.points} puntos de reputación
      </div>

      <div className="seller-rep-grid">
        {metricas.map((m) => (
          <div key={m.etiqueta} style={{ minWidth: 0 }}>
            <div className="display seller-rep-metric">{m.valor}</div>
            <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{m.etiqueta}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 3 }}>{m.detalle}</div>
          </div>
        ))}
      </div>

      <a
        href={seller.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mono seller-rep-link"
      >
        Verificar reputación en Mercado Libre ↗
      </a>
    </section>
  );
}
