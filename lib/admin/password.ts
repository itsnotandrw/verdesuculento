/**
 * Hash y verificación de la contraseña del panel admin. SOLO SERVIDOR.
 *
 * `scrypt` de Node en vez de bcrypt/argon2: es parte de la librería estándar
 * (`node:crypto`), así que no agrega dependencia nueva — coherente con el
 * resto del proyecto, que ya hace todo su HMAC de webhooks a mano con
 * `node:crypto` en vez de traer una librería para eso.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;

/** Formato guardado: "salHex:hashHex". Genera uno nuevo con generarHashCLI() abajo. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;

  let calculado: Buffer;
  let guardado: Buffer;
  try {
    calculado = scryptSync(password, salt, KEYLEN);
    guardado = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }

  // timingSafeEqual exige buffers del mismo largo -- si el hash guardado
  // está corrupto o truncado, compararía largos distintos y lanzaría en vez
  // de simplemente devolver "no coincide".
  if (calculado.length !== guardado.length) return false;
  return timingSafeEqual(calculado, guardado);
}
