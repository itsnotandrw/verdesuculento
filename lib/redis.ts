/**
 * Cliente Redis propio (TCP, `ioredis`). SOLO SERVIDOR.
 *
 * Redis AUTOALOJADO — sin límites de comandos ni de memoria de un servicio
 * administrado. En desarrollo es un contenedor local:
 *
 *   docker run -d --name verde-redis --restart unless-stopped \
 *     -p 127.0.0.1:6379:6379 -v verde-redis-data:/data \
 *     redis:7-alpine redis-server --appendonly yes   (ver docs/redis-local.md)
 *
 * y en Railway, el plugin de Redis (o cualquier Redis) vía `REDIS_URL`.
 * Sin `REDIS_URL`, `redis` es `null` y cada módulo cae a su respaldo
 * (archivo / catálogo estático / memoria), igual que antes.
 */

import Redis from 'ioredis';
import { env } from '@/lib/env';

type Comando = (string | number)[];

const globalRedis = globalThis as unknown as { __verdeRedis?: Redis | null };

function crear(): Redis | null {
  if (!env.redisUrl) return null;
  // Durante `next build` (prerender) no hay red privada: en Railway, `redis.railway.internal` solo resuelve
  // en ejecución. Sin conexión aquí cada módulo usa su respaldo estático y el ISR trae los datos reales después.
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  // La red privada de Railway (`*.railway.internal`) puede ser solo IPv6 y ioredis resuelve IPv4 por defecto:
  // family 0 acepta ambas. Fuera de Railway no cambia nada.
  let host = '';
  try { host = new URL(env.redisUrl).hostname; } catch { /* URL inválida: ioredis avisará */ }
  const cliente = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    ...(host.endsWith('.railway.internal') ? { family: 0 } : {}),
  });
  cliente.on('error', (e) => console.error('[redis] error:', e.message));
  return cliente;
}

// Una sola conexión por proceso (en desarrollo, Next recarga módulos: se
// guarda en globalThis para no abrir una conexión nueva en cada recarga).
export const redis: Redis | null = globalRedis.__verdeRedis ?? (globalRedis.__verdeRedis = crear());

export function redisConfigurado(): boolean {
  return redis !== null;
}

function requerido(): Redis {
  if (!redis) throw new Error('[redis] falta REDIS_URL.');
  return redis;
}

/** Un comando crudo (`['SET', 'k', 'v']`). */
export async function cmd<T = unknown>(comando: Comando): Promise<T> {
  const [nombre, ...args] = comando;
  return (await requerido().call(String(nombre), ...args.map(String))) as T;
}

/** Varios comandos en una sola ida y vuelta. */
export async function tuberia<T = unknown>(comandos: Comando[]): Promise<T[]> {
  if (comandos.length === 0) return [];
  const p = requerido().pipeline();
  for (const [nombre, ...args] of comandos) p.call(String(nombre), ...args.map(String));
  const resultados = (await p.exec()) ?? [];
  return resultados.map(([error, valor]) => {
    if (error) throw error;
    return valor as T;
  });
}

/** Lee un valor JSON. */
export async function getJson<T>(clave: string): Promise<T | null> {
  const crudo = await requerido().get(clave);
  if (crudo == null) return null;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return null;
  }
}

/** Guarda un valor como JSON. */
export async function setJson(clave: string, valor: unknown): Promise<void> {
  await requerido().set(clave, JSON.stringify(valor));
}

/** Comprobación de conectividad para el diagnóstico del panel. */
export async function redisDisponible(): Promise<boolean> {
  if (!redis) return false;
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}
