import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatCOP } from '@/data/catalog';
import { getAllProducts } from '@/lib/catalog/store';
import { getOfertas } from '@/lib/promotions-store';
import { aplicaScope } from '@/lib/promotions';
import ProductCard from '@/components/ProductCard';

export const revalidate = 60;

interface Props { params: { slug: string } }

async function buscar(slug: string) {
  return (await getOfertas()).find((o) => o.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await buscar(params.slug);
  if (!o) return {};
  return { title: `${o.title} — ${o.pct}% OFF · Vivero Verde Suculento`, description: `Catálogo exclusivo: ${o.pct}% de descuento en ${o.title}.` };
}

export default async function OfertaPage({ params }: Props) {
  const oferta = await buscar(params.slug);
  if (!oferta) notFound();
  const productos = (await getAllProducts()).filter((p) => aplicaScope(oferta.scope, p));
  const hasta = oferta.endsAt ? new Date(oferta.endsAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : null;

  return (
    <div className="page-section" style={{ paddingTop: 110 }}>
      <div className="container">
        <nav style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--fg-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Inicio</Link>
          <span style={{ color: 'var(--fg-mute)' }}>/</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Ofertas</span>
        </nav>

        <header style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{oferta.kind === 'cupon' ? 'CATÁLOGO EXCLUSIVO · CUPÓN' : 'CATÁLOGO EXCLUSIVO · CAMPAÑA'}</div>
          <h1 className="display" style={{ fontSize: 'clamp(44px, 7vw, 104px)' }}>
            {oferta.pct}% OFF <em style={{ color: 'var(--accent)' }}>{oferta.title}.</em>
          </h1>
          <p style={{ color: 'var(--fg-dim)', maxWidth: 560, marginTop: 18, fontSize: 17, lineHeight: 1.6 }}>
            {oferta.kind === 'cupon'
              ? `Productos seleccionados con ${oferta.pct}% de descuento${oferta.minPurchase ? ` en compras desde ${formatCOP(oferta.minPurchase)}` : ''}${oferta.maxDiscount ? ` (descuento máximo ${formatCOP(oferta.maxDiscount)})` : ''}.`
              : `Selección especial de la campaña con ${oferta.pct}% de descuento.`}
            {hasta ? ` Disponible hasta el ${hasta}.` : ''}
          </p>
          {oferta.code && (
            <p className="mono" style={{ marginTop: 16, fontSize: 12.5, color: 'var(--fg-dim)' }}>
              Tu cupón: <b style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>{oferta.code}</b>
            </p>
          )}
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {productos.map((p) => <ProductCard key={p.id} product={p} discountPct={oferta.pct} />)}
        </div>
        {productos.length === 0 && <p style={{ color: 'var(--fg-dim)' }}>Por ahora no hay productos en esta oferta.</p>}
      </div>
    </div>
  );
}
