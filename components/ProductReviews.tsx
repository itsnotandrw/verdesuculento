import StarRating from './StarRating';
import Reveal from './Reveal';
import type { SocialProof } from '@/types';

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' });
}

export default function ProductReviews({ data }: { data: SocialProof }) {
  if (!data.rating || data.reviewCount === 0) return null;

  return (
    <section id="reviews" style={{ paddingTop: 64, borderTop: '1px solid var(--border)' }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>OPINIONES DE COMPRADORES</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
        <div className="display" style={{ fontSize: 56, lineHeight: 1 }}>{data.rating.toFixed(1)}</div>
        <div>
          <StarRating rating={data.rating} size={18} />
          <div className="mono" style={{ fontSize: 13, color: 'var(--fg-dim)', marginTop: 8 }}>
            Basado en {data.reviewCount} {data.reviewCount === 1 ? 'reseña' : 'reseñas'} en Mercado Libre
          </div>
        </div>
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
          </div>
        ))}
      </Reveal>
    </section>
  );
}
