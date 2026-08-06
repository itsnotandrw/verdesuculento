interface StarRatingProps {
  rating: number;
  size?: number;
  count?: number;
  showValue?: boolean;
}

export default function StarRating({ rating, size = 13, count, showValue = false }: StarRatingProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
              <Star size={size} color="var(--border-strong)" />
              <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${fill * 100}%` }}>
                <Star size={size} color="var(--accent)" />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="mono" style={{ fontSize: size, color: 'var(--fg-dim)' }}>
          {rating.toFixed(1)}{count !== undefined && ` (${count})`}
        </span>
      )}
    </span>
  );
}

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ position: 'absolute', inset: 0 }}>
      <path d="M12 2.5l2.97 6.24 6.78.79-5.03 4.7 1.4 6.77L12 17.6l-6.12 3.4 1.4-6.77-5.03-4.7 6.78-.79L12 2.5z" />
    </svg>
  );
}
