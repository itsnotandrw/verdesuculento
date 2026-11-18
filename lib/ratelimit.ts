/**
 * Rate limiting por endpoint. SOLO SERVIDOR.
 *
 * Un limitador por endpoint (ventana fija sobre Redis propio), no uno genérico
 * global — cada ruta tiene un perfil de abuso distinto. Reutiliza la misma
 * conexión `REDIS_URL` que ya usa el almacenamiento de pedidos (ver lib/orders/store.ts): si ya está configurado Redis para no
 * perder pedidos en Railway, el rate limiting sale gratis.
 *
 * **Dos políticas distintas cuando Redis no está disponible**, a propósito:
 *
 *   - `limitarCheckout`: sin Redis, permite todo (fail-open). Preferible
 *     dejar pasar tráfico sin límite temporalmente a tumbar ventas por una
 *     caída de infraestructura — un checkout bloqueado cuesta plata real.
 *   - `limitarLogin`: sin Redis, cae a un limitador en memoria del propio
 *     proceso. El login del panel es exactamente el tipo de endpoint de alto
 *     riesgo de abuso (fuerza bruta contra la contraseña del admin) donde NO
 *     conviene fail-open solo porque Redis no esté configurado — a
 *     diferencia del checkout, dejar pasar intentos ilimitados de login no
 *     tiene ningún beneficio de negocio que compense el riesgo.
 */

import { redis } from './redis';

/**
 * Ventana fija en Redis: INCR de una clave por (limitador, IP, ventana) con
 * expiración. Devuelve true si todavía está dentro del límite.
 */
function crear(nombre: string, limite: number, ventanaMs: number) {
  if (!redis) return null;
  const cliente = redis;
  return async (ip: string): Promise<boolean> => {
    const bucket = Math.floor(Date.now() / ventanaMs);
    const clave = `verde:ratelimit:${nombre}:${ip}:${bucket}`;
    const n = await cliente.incr(clave);
    if (n === 1) await cliente.pexpire(clave, ventanaMs);
    return n <= limite;
  };
}

const checkoutLimiter = crear('checkout', 10, 60_000);
const loginLimiter = crear('admin-login', 5, 5 * 60_000);
const busquedaPedidosLimiter = crear('order-lookup', 10, 10 * 60_000);

/** 10 intentos de crear pedido por minuto por IP. Fail-open sin Redis. */
export async function limitarCheckout(ip: string): Promise<boolean> {
  if (!checkoutLimiter) return true;
  try {
    return await checkoutLimiter(ip);
  } catch (error) {
    // Redis configurado pero caído en este momento: mismo criterio fail-open
    // que sin configurar — no tumbar ventas por una caída de infraestructura
    // que no es culpa del comprador.
    console.warn('[ratelimit] checkout: Redis falló, dejando pasar.', error);
    return true;
  }
}

// Fallback en memoria para los endpoints que NUNCA deben fail-open (ver el
// porqué en el comentario de arriba). Vive en memoria del proceso: en
// Railway (un solo proceso persistente) esto protege de verdad; se reinicia
// en cada redeploy, aceptable como capa secundaria.
function crearLimitadorMemoria(maxIntentos: number, ventanaMs: number) {
  const registro = new Map<string, { conteo: number; expiraEn: number }>();
  return (clave: string): boolean => {
    const ahora = Date.now();
    const entrada = registro.get(clave);
    if (!entrada || ahora > entrada.expiraEn) {
      registro.set(clave, { conteo: 1, expiraEn: ahora + ventanaMs });
      return true;
    }
    entrada.conteo++;
    return entrada.conteo <= maxIntentos;
  };
}

const limitarLoginEnMemoria = crearLimitadorMemoria(5, 5 * 60_000);
const limitarBusquedaEnMemoria = crearLimitadorMemoria(10, 10 * 60_000);

/** 5 intentos de login por 5 minutos por IP. Nunca fail-open. */
export async function limitarLogin(ip: string): Promise<boolean> {
  if (!loginLimiter) return limitarLoginEnMemoria(ip);
  try {
    return await loginLimiter(ip);
  } catch (error) {
    console.warn('[ratelimit] login: Redis falló, cayendo al limitador en memoria.', error);
    return limitarLoginEnMemoria(ip);
  }
}

/**
 * 10 búsquedas de "mis pedidos" por correo cada 10 minutos por IP. Tampoco
 * fail-open: a diferencia del checkout, esto expone (aunque resumida)
 * información de pedidos ajenos si alguien prueba muchos correos seguidos —
 * el correo es bastante menos secreto que la referencia del pedido.
 */
export async function limitarBusquedaPedidos(ip: string): Promise<boolean> {
  if (!busquedaPedidosLimiter) return limitarBusquedaEnMemoria(ip);
  try {
    return await busquedaPedidosLimiter(ip);
  } catch (error) {
    console.warn('[ratelimit] order-lookup: Redis falló, cayendo al limitador en memoria.', error);
    return limitarBusquedaEnMemoria(ip);
  }
}

/**
 * Límites por endpoint público: [peticiones, ventana en ms] por IP. Sin Redis o si Redis falla, se limita en memoria
 * (no se deja el endpoint abierto). Pensados para que un humano no los note y un bot sí.
 */
const LIMITES = {
  cupon: [12, 60_000],
  cotizar: [20, 60_000],
  cobertura: [30, 60_000],
  buscar: [40, 60_000],
  carrito: [40, 60_000],
  'estado-pago': [40, 60_000],
  pedido: [60, 60_000],
  declarar: [10, 60_000],
  rastreo: [30, 60_000],
  metodos: [40, 60_000],
} as const satisfies Record<string, readonly [number, number]>;

export type NombreLimite = keyof typeof LIMITES;

const memoriaGenerica = new Map<string, { conteo: number; expiraEn: number }>();

export async function limitar(nombre: NombreLimite, ip: string): Promise<boolean> {
  const [limite, ventanaMs] = LIMITES[nombre];
  if (redis) {
    try {
      const clave = `verde:ratelimit:${nombre}:${ip}:${Math.floor(Date.now() / ventanaMs)}`;
      const n = await redis.incr(clave);
      if (n === 1) await redis.pexpire(clave, ventanaMs);
      return n <= limite;
    } catch (error) {
      console.warn(`[ratelimit] ${nombre}: Redis falló, limitando en memoria.`, error);
    }
  }
  const ahora = Date.now();
  const clave = `${nombre}:${ip}`;
  const e = memoriaGenerica.get(clave);
  if (!e || ahora > e.expiraEn) {
    if (memoriaGenerica.size > 5000) memoriaGenerica.clear(); // evita crecer sin límite
    memoriaGenerica.set(clave, { conteo: 1, expiraEn: ahora + ventanaMs });
    return true;
  }
  e.conteo++;
  return e.conteo <= limite;
}

/**
 * IP del cliente detrás del proxy. NO se usa la primera entrada de x-forwarded-for: la manda el propio cliente y
 * cualquiera podría inventar una IP distinta en cada petición para saltarse los límites. Se toma la que añadió el
 * proxy de confianza (la última, o la `TRUSTED_PROXY_HOPS`-ésima desde el final si hay más de un proxy delante).
 */
export function ipDe(request: Request): string {
  // x-real-ip solo donde el proxy de confianza lo FIJA (un cliente puede enviarlo con cualquier valor). En Railway el
  // borde lo sobrescribe siempre (comprobado en producción) y x-forwarded-for llega como "cliente, proxy": la última
  // entrada es la IP del proxy, que cambia en cada petición, así que no sirve como llave.
  const enRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID);
  if (enRailway || process.env.TRUST_X_REAL_IP === '1') {
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const partes = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    const saltos = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1);
    return partes[Math.max(0, partes.length - saltos)] ?? 'desconocida';
  }
  return 'desconocida';
}
