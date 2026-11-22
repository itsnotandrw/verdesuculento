/**
 * Historial de accesos al panel (últimos 20, en Redis). SOLO SERVIDOR.
 */

import { redis } from '@/lib/redis';

const CLAVE_ACCESOS = 'verde:admin:accesos';
const MAX_ACCESOS_GUARDADOS = 20;

export interface IntentoLogin {
  email: string;
  ip: string;
  exito: boolean;
  at: string;
}

/**
 * Registra un intento de login. Nunca lanza -- un fallo guardando el
 * historial no puede tumbar el login en sí, que es lo importante de verdad.
 * Sin Redis, esto es un no-op silencioso; el rastro que queda entonces es
 * el console.log/warn de la ruta, visible en los logs de Railway.
 */
export async function registrarIntentoLogin(intento: Omit<IntentoLogin, 'at'>): Promise<void> {
  if (!redis) return;
  try {
    const registro: IntentoLogin = { ...intento, at: new Date().toISOString() };
    await redis.lpush(CLAVE_ACCESOS, JSON.stringify(registro));
    await redis.ltrim(CLAVE_ACCESOS, 0, MAX_ACCESOS_GUARDADOS - 1);
  } catch (error) {
    console.warn('[admin] no se pudo registrar el intento de login:', error);
  }
}

export async function obtenerAccesos(): Promise<IntentoLogin[]> {
  if (!redis) return [];
  const filas: unknown[] = await redis.lrange(CLAVE_ACCESOS, 0, MAX_ACCESOS_GUARDADOS - 1);
  return filas
    .map((f) => {
      try {
        // Se admite tanto el objeto ya parseado como el string crudo (según
        // cómo se haya guardado).
        return typeof f === 'string' ? (JSON.parse(f) as IntentoLogin) : (f as IntentoLogin);
      } catch {
        return null;
      }
    })
    .filter((r): r is IntentoLogin => r !== null);
}
