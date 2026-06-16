import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATALOG, CATEGORIES, formatCOP } from '@/data/catalog';
import ProductCard from '@/components/ProductCard';

interface Props {
  params: { categoria: string };
}

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ categoria: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = CATEGORIES.find((c) => c.id === params.categoria);
  if (!cat) return {};
  return {
    title: `${cat.name} — Catálogo VERDE.`,
    description: cat.blurb,
  };
}

export default function CategoryPage({ params }: Props) {
  const cat = CATEGORIES.find((c) => c.id === params.categoria);
  if (!cat) notFound();

  const products = CATALOG.filter((p) => p.category === params.categoria);

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container">
        <nav style={{ marginBottom: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/catalogo" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Catálogo</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{cat.name}</span>
        </nav>

        <div style={{ marginBottom: 64 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{cat.count} PRODUCTOS</div>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 120px)' }}>
            {cat.name}<em style={{ color: 'var(--accent)' }}>.</em>
          </h1>
          <p style={{ color: 'var(--fg-dim)', maxWidth: 480, marginTop: 20, fontSize: 17, lineHeight: 1.6 }}>{cat.blurb}</p>
        </div>

        {/* Other categories */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 56, paddingBottom: 32, borderBottom: '1px solid var(--border)' }}>
          {CATEGORIES.filter((c) => c.id !== params.categoria).map((c) => (
            <Link key={c.id} href={`/catalogo/${c.id}`} className="chip">{c.name}</Link>
          ))}
        </div>

        <div data-product-grid style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
