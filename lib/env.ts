/**
 * Acceso tipado a la configuración. SOLO SERVIDOR (salvo lo marcado como público).
 *
 * Ninguna llave privada puede leerse desde un componente cliente: Next.js solo
 * expone al bundle del navegador las variables con prefijo `NEXT_PUBLIC_`.
 *
 * Todo tiene un valor por defecto razonable para que el proyecto arranque sin
 * `.env.local` — con el proveedor manual activo. Cuando lleguen las llaves de
 * Wompi y del agregador de envíos, basta llenar el `.env.local` (ver
 * `.env.example`) sin tocar una línea de código.
 */

function str(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim();
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw == null) return fallback;
  return ['1', 'true', 'si', 'sí', 'yes'].includes(raw.trim().toLowerCase());
}

export const env = {
  /** URL pública del sitio. La usan los webhooks y los enlaces de seguimiento. */
  siteUrl: str('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000'),

  // ------------------------------------------------------------------ pagos
  payments: {
    /** 'breb-manual' (activo hoy) | 'wompi' (cuando existan las llaves). */
    provider: str('PAYMENT_PROVIDER', 'breb-manual'),

    /** Minutos que un pedido sobrevive esperando el pago antes de expirar. */
    intentTtlMinutes: num('PAYMENT_TTL_MINUTES', 60 * 24),

    /** Datos de la llave Bre-B del negocio (flujo manual). */
    breb: {
      key: str('BREB_KEY', '@verdesuculento'),
      keyType: str('BREB_KEY_TYPE', 'Llave alfanumérica'),
      holder: str('BREB_HOLDER', 'Vivero Verde Suculento S.A.S.'),
      bank: str('BREB_BANK', 'Bancolombia'),
      /** Respaldo para quien aún no tiene Bre-B en su banco. */
      nequi: str('BREB_NEQUI_FALLBACK', ''),
    },

    wompi: {
      publicKey: str('NEXT_PUBLIC_WOMPI_PUBLIC_KEY'),
      privateKey: str('WOMPI_PRIVATE_KEY'),
      integritySecret: str('WOMPI_INTEGRITY_SECRET'),
      eventsSecret: str('WOMPI_EVENTS_SECRET'),
      baseUrl: str('WOMPI_BASE_URL', 'https://api-sandbox.co.uat.wompi.dev/v1'),
    },
  },

  // ----------------------------------------------------------------- envíos
  shipping: {
    /** 'tarifa-propia' (activo hoy) | 'mipaquete' | 'envia'. */
    provider: str('SHIPPING_PROVIDER', 'tarifa-propia'),

    /** Compra mínima para envío gratis. 0 lo desactiva. */
    freeShippingFrom: num('SHIPPING_FREE_FROM', 120_000),

    /** Bodega de despacho (origen de todas las guías). */
    origin: {
      departamento: str('SHIPPING_ORIGIN_DEPT', 'Cundinamarca'),
      ciudad: str('SHIPPING_ORIGIN_CITY', 'Bogotá'),
      cityCode: str('SHIPPING_ORIGIN_CITY_CODE', '11001000'),
      /** Envia lo exige en origen y destino. 110111 = Bogotá. */
      postalCode: str('SHIPPING_ORIGIN_POSTAL_CODE', '110111'),
      direccion: str('SHIPPING_ORIGIN_ADDRESS', 'Vivero Verde Suculento'),
    },

    /** Contra entrega: se ofrece solo si el proveedor confirma cobertura. */
    codEnabled: bool('SHIPPING_COD_ENABLED', false),

    mipaquete: {
      apiKey: str('MIPAQUETE_API_KEY'),
      baseUrl: str('MIPAQUETE_BASE_URL', 'https://api-v2.dev.mipaquete.com'),
      webhookSecret: str('SHIPPING_WEBHOOK_SECRET'),
    },

    envia: {
      token: str('ENVIA_TOKEN'),
      baseUrl: str('ENVIA_BASE_URL', 'https://api-test.envia.com'),
      webhookSecret: str('SHIPPING_WEBHOOK_SECRET'),
    },
  },

  // ------------------------------------------------------------------ admin
  /**
   * Token del panel de verificación manual de pagos. Sin él, las rutas de
   * administración responden 503 en lugar de quedar abiertas — un panel que
   * marca pedidos como pagados no puede tener autenticación opcional.
   */
  adminToken: str('ADMIN_API_TOKEN'),

  /**
   * Secreto que Vercel Cron manda solo en el header `Authorization` cuando
   * este mismo valor está configurado como variable de entorno del proyecto
   * — no hay que generarlo ni copiarlo a mano, Vercel lo inyecta él mismo en
   * cada llamada programada. Separado de `adminToken` porque uno lo escribe
   * un humano en el panel y el otro lo manda una máquina en automático.
   */
  cronSecret: str('CRON_SECRET'),

  /** Ruta del archivo donde persisten los pedidos (ver lib/orders/store.ts). */
  ordersFile: str('ORDERS_FILE', '.data/orders.json'),

  /**
   * Redis por REST para guardar los pedidos. Se aceptan los dos juegos de
   * nombres: los que inyecta la integración de Vercel (`KV_*`) y los que da
   * Upstash directamente (`UPSTASH_*`), para no tener que renombrar nada.
   */
  kv: {
    url: str('KV_REST_API_URL') || str('UPSTASH_REDIS_REST_URL'),
    token: str('KV_REST_API_TOKEN') || str('UPSTASH_REDIS_REST_TOKEN'),
  },

  /**
   * ¿Corremos donde el disco local no se comparte entre rutas? En serverless
   * cada ruta es una función aparte, así que guardar pedidos en un archivo es
   * perderlos.
   */
  serverless: Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.CF_PAGES
  ),
};

export type Env = typeof env;
