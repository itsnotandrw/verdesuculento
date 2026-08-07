import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
    sitemap: 'https://verde.co/sitemap.xml',
  };
}
