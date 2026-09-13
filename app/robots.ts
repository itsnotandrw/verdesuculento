import { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.siteUrl.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /pedido lleva la referencia del cliente, /mis-pedidos es un
        // formulario de correo y /admin es el panel interno: ninguno de los
        // tres puede terminar indexado.
        disallow: ['/carrito', '/checkout', '/pedido', '/mis-pedidos', '/admin', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
