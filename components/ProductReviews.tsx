import StarRating from './StarRating';
import Reveal from './Reveal';
import { formatVendidos } from './SoldCount';
import type { SocialProof } from '@/types';

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' });
}

export default function ProductReviews({ data }: { data: SocialProof }) {
  if (!data.rating || data.reviewCount === 0) return null;

  const vendidos = formatVendidos(data.soldCount);

  return (
    <section id="reviews" style={{ paddingTop: 64, borderTop: '1px solid var(--border)' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>OPINIONES DE COMPRADORES</div>

      <div className="reviews-summary">
        <div style={{ minWidth: 0 }}>
          <div className="display" style={{ fontSize: 'clamp(48px, 10vw, 64px)', lineHeight: 1 }}>
            {data.rating.toFixed(1)}
          </div>
          <div style={{ marginTop: 10 }}>
            <StarRating rating={data.rating} size={18} />
          </div>
          <div className="mono" style={{ fontSize: 12.5, color: 'var(--fg-dim)', marginTop: 10, lineHeight: 1.5 }}>
            {data.reviewCount} {data.reviewCount === 1 ? 'calificación' : 'calificaciones'}
            {vendidos && (
              <>
                <br />
                {vendidos}
              </>
            )}
          </div>
        </div>

        {/* Distribución. En porcentaje y no en conteos: el promedio y el total
            son los oficiales de Mercado Libre, pero la distribución sale de las
            reseñas que pudimos traer. Mostrar conteos absolutos sería inventar
            cifras que no tenemos. */}
        {data.breakdown.length > 0 && (
          <div className="reviews-breakdown">
            {data.breakdown.map((fila) => (
              <div key={fila.stars} className="reviews-breakdown-row">
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', width: 12, textAlign: 'right', flexShrink: 0 }}>
                  {fila.stars}
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--fg-mute)" style={{ flexShrink: 0 }} aria-hidden>
                  <path d="M12 2.5l2.97 6.24 6.78.79-5.03 4.7 1.4 6.77L12 17.6l-6.12 3.4 1.4-6.77-5.03-4.7 6.78-.79L12 2.5z" />
                </svg>
                <span className="reviews-bar" aria-hidden>
                  <span className="reviews-bar-fill" style={{ width: `${fila.pct}%` }} />
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', width: 34, textAlign: 'right', flexShrink: 0 }}>
                  {fila.pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {data.reviews.map((r, i) => (
          <div key={i} className="review-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <StarRating rating={r.rating} size={13} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', flexShrink: 0 }}>{formatReviewDate(r.fecha)}</span>
            </div>
            {r.titulo && <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>{r.titulo}</div>}
            {r.contenido && <p style={{ fontSize: 14, color: 'var(--fg-dim)', lineHeight: 1.6 }}>{r.contenido}</p>}
            {r.likes > 0 && (
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-mute)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
                {r.likes} {r.likes === 1 ? 'persona la encontró útil' : 'personas la encontraron útil'}
              </div>
            )}
          </div>
        ))}
      </Reveal>

      <p className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 24, lineHeight: 1.6 }}>
        Calificaciones y reseñas verificadas de compradores reales en Mercado Libre, donde vendemos desde
        hace años. Solo compra confirmada puede calificar.
      </p>
    </section>
  );
}
