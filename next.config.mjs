/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Headers de seguridad básicos, a todas las rutas. No incluye una CSP con
  // nonce dinámico a propósito: ese patrón (ver docs/railway-deploy.md y la
  // referencia de tdrobotica) hace falta cuando hay contenido HTML de
  // terceros/CMS que se renderiza con dangerouslySetInnerHTML — acá todo el
  // contenido es propio (catálogo estático, sin CMS), así que el riesgo que
  // una CSP estricta mitigaría no existe hoy. Si el sitio empieza a
  // renderizar HTML externo (reseñas con formato libre, un blog con CMS,
  // etc.), ese es el momento de agregarla.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS: el sitio va a vivir en un dominio propio detrás de HTTPS
          // (Railway lo termina solo). Sin preload a propósito -- eso es
          // irreversible sin pasar por el proceso de remoción de la lista de
          // Chromium, y agregarlo desde el día uno de un dominio nuevo es
          // apostar fuerte antes de confirmar que todo el sitio sirve bien
          // por HTTPS de forma estable.
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
