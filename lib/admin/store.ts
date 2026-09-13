/**
 * Credenciales del admin e historial de accesos. SOLO SERVIDOR.
 *
 * Mismo patrón que lib/catalog/store.ts: si hay Redis configurado, ahí vive
 * la verdad (y se puede cambiar la contraseña desde la propia interfaz); si
 * no, cae a las variables de entorno (ADMIN_EMAIL/ADMIN_PASSWORD_HASH), de
 * solo lectura — cambiar la contraseña sin Redis solo se puede haciendo
 * redeploy con una variable nueva, como antes.
 */

import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

const redis = env.kv.url && env.kv.token ? new Redis({ url: env.kv.url, token: env.kv.token }) : null;

const CLAVE_CREDENCIALES = 'verde:admin:credenciales';
const CLAVE_ACCESOS = 'verde:admin:accesos';
const MAX_ACCESOS_GUARDADOS = 20;

export interface CredencialesAdmin {
  email: string;
  passwordHash: string;
}

export interface IntentoLogin {
  email: string;
  ip: string;
  exito: boolean;
  at: string;
}

/** ¿La contraseña se puede cambiar desde /admin/cuenta, o solo por variable de entorno? */
export function passwordEditable(): boolean {
  return redis !== null;
}

export async function getCredenciales(): Promise<CredencialesAdmin | null> {
  if (redis) {
    const guardadas = await redis.get<CredencialesAdmin>(CLAVE_CREDENCIALES);
    if (guardadas) return guardadas;
  }
  if (env.adminEmail && env.adminPasswordHash) {
    return { email: env.adminEmail, passwordHash: env.adminPasswordHash };
  }
  return null;
}

export async function actualizarPassword(email: string, passwordHash: string): Promise<void> {
  if (!redis) {
    throw new Error('No se puede guardar: falta configurar Redis (KV_REST_API_URL/TOKEN).');
  }
  await redis.set(CLAVE_CREDENCIALES, { email, passwordHash } satisfies CredencialesAdmin);
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
  const filas = await redis.lrange<string>(CLAVE_ACCESOS, 0, MAX_ACCESOS_GUARDADOS - 1);
  return filas
    .map((f) => {
      try {
        // El cliente de Upstash a veces ya devuelve el objeto parseado y a
        // veces el string crudo, según la versión -- se admite cualquiera.
        return typeof f === 'string' ? (JSON.parse(f) as IntentoLogin) : (f as IntentoLogin);
      } catch {
        return null;
      }
    })
    .filter((r): r is IntentoLogin => r !== null);
}
