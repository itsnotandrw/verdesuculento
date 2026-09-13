import { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.siteUrl.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /pedido lleva la referencia del cliente y /admin es el panel interno:
        // ninguno de los dos puede terminar indexado.
        disallow: ['/carrito', '/checkout', '/pedido', '/admin', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
