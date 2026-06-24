'use client';

import Link from 'next/link';
import CardSwap, { CardSwapCard } from '@/components/CardSwap';

interface Article {
  slug: string;
  title: string;
  category: string;
  minutes: number;
  excerpt: string;
  image: string;
}

export default function ArticleSwapper({
  articles,
  photos,
}: {
  articles: Article[];
  photos: Record<string, string>;
}) {
  return (
    <CardSwap
      width={620}
      height={400}
      cardDistance={40}
      verticalDistance={50}
      delay={5000}
      easing="elastic"
      skewAmount={5}
      pauseOnHover
    >
      {articles.slice(0, 3).map((article) => (
        <CardSwapCard
          key={article.slug}
          style={{
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            padding: 0,
          }}
        >
          {/* Image side */}
          <div
            style={{
              width: '38%',
              minHeight: '100%',
              backgroundColor: article.image,
              backgroundImage: photos[article.slug]
                ? `url(${photos[article.slug]})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, transparent 60%, var(--bg-elev))',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Text side */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '28px 28px 24px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--fg-mute)',
                letterSpacing: '0.12em',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{article.category.toUpperCase()}</span>
              <span>{article.minutes} MIN</span>
            </div>

            <h3
              className="display"
              style={{
                fontSize: 'clamp(22px, 2.5vw, 32px)',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                color: 'var(--fg)',
                flex: 1,
              }}
            >
              {article.title}
            </h3>

            <p
              style={{
                fontSize: 13,
                color: 'var(--fg-dim)',
                lineHeight: 1.55,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {article.excerpt}
            </p>

            <Link
              href={`/diario/${article.slug}`}
              className="btn btn-ghost"
              style={{ alignSelf: 'flex-start', marginTop: 'auto', fontSize: 12 }}
              tabIndex={-1}
            >
              Leer artículo <span className="btn-arrow">→</span>
            </Link>
          </div>
        </CardSwapCard>
      ))}
    </CardSwap>
  );
}
