/**
 * Rate limiting por endpoint. SOLO SERVIDOR.
 *
 * Un limitador por endpoint (Upstash, sliding window), no uno genérico
 * global — cada ruta tiene un perfil de abuso distinto. Reutiliza las mismas
 * credenciales `KV_REST_API_URL`/`TOKEN` que ya usa el almacenamiento de
 * pedidos (ver lib/orders/store.ts): si ya está configurado Redis para no
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

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env';

const redis = env.kv.url && env.kv.token ? new Redis({ url: env.kv.url, token: env.kv.token }) : null;

function crear(nombre: string, limite: number, ventana: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limite, ventana),
    prefix: `verde:ratelimit:${nombre}`,
    analytics: false,
  });
}

const checkoutLimiter = crear('checkout', 10, '1 m');
const loginLimiter = crear('admin-login', 5, '5 m');
const busquedaPedidosLimiter = crear('order-lookup', 10, '10 m');

/** 10 intentos de crear pedido por minuto por IP. Fail-open sin Redis. */
export async function limitarCheckout(ip: string): Promise<boolean> {
  if (!checkoutLimiter) return true;
  try {
    const { success } = await checkoutLimiter.limit(ip);
    return success;
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
    const { success } = await loginLimiter.limit(ip);
    return success;
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
    const { success } = await busquedaPedidosLimiter.limit(ip);
    return success;
  } catch (error) {
    console.warn('[ratelimit] order-lookup: Redis falló, cayendo al limitador en memoria.', error);
    return limitarBusquedaEnMemoria(ip);
  }
}

/** IP del cliente detrás del proxy (Railway, Vercel, cualquiera con x-forwarded-for). */
export function ipDe(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'desconocida';
}
