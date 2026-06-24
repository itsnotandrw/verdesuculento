import { MetadataRoute } from 'next';
import { CATALOG, CATEGORIES, ARTICLES } from '@/data/catalog';

const BASE_URL = 'https://verde.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${BASE_URL}/catalogo`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${BASE_URL}/diario`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/nosotros`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/asesoria`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/carrito`, lastModified: new Date(), changeFrequency: 'never' as const, priority: 0.3 },
    { url: `${BASE_URL}/checkout`, lastModified: new Date(), changeFrequency: 'never' as const, priority: 0.3 },
  ];

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/catalogo/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const productPages = CATALOG.map((product) => ({
    url: `${BASE_URL}/producto/${product.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const articlePages = ARTICLES.map((article) => ({
    url: `${BASE_URL}/diario/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...articlePages];
}
