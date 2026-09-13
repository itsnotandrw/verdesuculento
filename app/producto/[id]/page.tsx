import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/data/catalog';
import { getProductById, getRelatedProducts, getCrossSellProducts } from '@/lib/catalog/store';
import { SOCIAL_PROOF } from '@/data/socialProof';
import { env } from '@/lib/env';
import ProductContent from './ProductContent';
import type { Product } from '@/types';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductById(params.id);
  if (!product) return {};
  return {
    title: `${product.name} — Vivero Verde Suculento`,
    description: product.description,
  };
}

/**
 * Product + BreadcrumbList (schema.org). Ninguno de los dos existía antes —
 * es justo el hueco de SEO que el proyecto de referencia (tdrobotica) tiene
 * documentado como pendiente propio, así que se hace bien acá desde el
 * arranque en vez de repetirlo.
 */
function jsonLd(product: Product) {
  const baseUrl = env.siteUrl.replace(/\/$/, '');
  const categoria = CATEGORIES.find((c) => c.id === product.category);
  const social = SOCIAL_PROOF[product.id];
  const url = `${baseUrl}/producto/${product.id}`;

  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    // Las fotos ya vienen en URL absoluta desde el catálogo (scraping de ML);
    // si algún día hay una relativa, esto la resuelve igual.
    image: product.images.map((img) => (img.startsWith('http') ? img : `${baseUrl}${img}`)),
    url,
    brand: { '@type': 'Brand', name: 'Vivero Verde Suculento' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'COP',
      price: String(product.price),
      // Sin stock por unidad en el catálogo hoy (es estático, sin inventario
      // en tiempo real) — InStock es la representación honesta mientras el
      // producto siga publicado; si en el futuro hay control de inventario,
      // este campo es el primero que debe volverse dinámico.
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  // Sin inventar calificaciones: solo se agrega si de verdad hay reseñas
  // (vienen de Mercado Libre, ver data/socialProof.ts). Un aggregateRating
  // falso es exactamente el tipo de cosa que Google penaliza en rich results.
  if (social?.rating != null && social.reviewCount > 0) {
    productLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: social.rating,
      reviewCount: social.reviewCount,
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Catálogo', item: `${baseUrl}/catalogo` },
      ...(categoria
        ? [{ '@type': 'ListItem', position: 2, name: categoria.name, item: `${baseUrl}/catalogo/${categoria.id}` }]
        : []),
      { '@type': 'ListItem', position: categoria ? 3 : 2, name: product.name, item: url },
    ],
  };

  return [productLd, breadcrumbLd];
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  // Calculado acá (servidor) y pasado como prop en vez de que ProductContent
  // (cliente) importe el catálogo directo — el catálogo ahora puede vivir en
  // Redis, y un componente cliente no puede leer ahí.
  const [related, crossSell] = await Promise.all([
    getRelatedProducts(product, 3),
    getCrossSellProducts(product),
  ]);

  return (
    <>
      {jsonLd(product).map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <ProductContent product={product} related={related} crossSell={crossSell} />
    </>
  );
}
