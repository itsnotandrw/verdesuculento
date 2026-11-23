/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite correr el servidor de desarrollo en otra carpeta sin pisar el build de producción (NEXT_DIST_DIR=.next-dev)
  distDir: process.env.NEXT_DIST_DIR || '.next',

  images: {
    // Sin optimizador en el servidor: las fotos ya están preparadas en 3 tamaños (ver lib/image-loader.ts)
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    deviceSizes: [384, 768, 1280],
    imageSizes: [96, 192],
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
  experimental: {
    // Navegar dentro del sitio no reutiliza páginas viejas más de 30 s (antes hasta 5 min): un cambio del admin se ve pronto
    staleTimes: { dynamic: 0, static: 30 },
    instrumentationHook: true,
  },

  // Dominio canónico: sin "www". Cualquier petición que llegue por www se redirige (301) al dominio raíz, conservando la ruta.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.viveroverdesuculento.co' }],
        destination: 'https://viveroverdesuculento.co/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      // Imágenes y datos propios: caché larga en el navegador (los nombres de las variantes no cambian de contenido)
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
      },
      {
        source: '/promos/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        source: '/data/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=86400' }],
      },
      {
        source: '/:path*',
        headers: [
          // CSP: solo se permite cargar scripts y datos del propio sitio. 'unsafe-inline' es necesario para los scripts
          // de arranque de Next y los estilos en línea; aun así bloquea scripts de otros dominios, conexiones a
          // terceros, formularios hacia fuera, plugins y que otro sitio meta este en un iframe.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google.com https://www.gstatic.com",
              'frame-src https://www.google.com https://maps.google.com',
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
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
