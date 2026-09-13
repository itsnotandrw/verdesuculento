/**
 * Sesión de navegador para el panel admin. SOLO SERVIDOR.
 *
 * Reemplaza el patrón anterior (pegar `ADMIN_API_TOKEN` en un campo de la
 * página, guardarlo en `sessionStorage`, mandarlo a mano en cada fetch) por
 * una cookie de sesión de verdad:
 *
 *   - httpOnly: JavaScript de la página no puede leerla -- un XSS no se la
 *     puede robar. El token viejo, guardado en sessionStorage, sí era
 *     legible por cualquier script que corriera en la página.
 *   - Firmada con HMAC-SHA256 (mismo patrón que ya usa el proyecto para
 *     verificar webhooks) -- nadie puede fabricar una sesión sin conocer
 *     `ADMIN_SESSION_SECRET`, y no se puede alterar el email o la fecha de
 *     vencimiento sin invalidar la firma.
 *   - Con vencimiento (7 días) codificado dentro del propio token -- no hace
 *     falta una base de datos de sesiones para poder expirarlas.
 *
 * Formato del token: `base64url(JSON{email,exp}).firmaHex`. No es JWT
 * (ningún header, ningún "alg" que un atacante pueda intentar cambiar a
 * "none") -- deliberadamente el formato más simple que cumple el objetivo,
 * mismo criterio que el resto del proyecto usa para HMAC de webhooks.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export const NOMBRE_COOKIE = 'verde_admin_session';
export const DURACION_SESION_MS = 7 * 24 * 60 * 60 * 1000;

function firmar(payload: string): string {
  return createHmac('sha256', env.adminSessionSecret).update(payload).digest('hex');
}

export function crearTokenSesion(email: string): string {
  const exp = Date.now() + DURACION_SESION_MS;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64url');
  return `${payload}.${firmar(payload)}`;
}

export interface SesionAdmin {
  email: string;
}

export function verificarTokenSesion(token: string | undefined | null): SesionAdmin | null {
  if (!token || !env.adminSessionSecret) return null;

  const punto = token.lastIndexOf('.');
  if (punto < 0) return null;
  const payload = token.slice(0, punto);
  const firmaRecibida = token.slice(punto + 1);

  const firmaEsperada = firmar(payload);
  const a = Buffer.from(firmaRecibida, 'utf-8');
  const b = Buffer.from(firmaEsperada, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let datos: { email?: unknown; exp?: unknown };
  try {
    datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (typeof datos.email !== 'string' || typeof datos.exp !== 'number') return null;
  if (Date.now() > datos.exp) return null;

  return { email: datos.email };
}

/** Lee y valida la cookie de sesión del request actual. Node runtime únicamente. */
export function sesionActual(): SesionAdmin | null {
  const token = cookies().get(NOMBRE_COOKIE)?.value;
  return verificarTokenSesion(token);
}
