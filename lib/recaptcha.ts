/**
 * reCAPTCHA v3 (Google) para formularios sensibles. SOLO SERVIDOR.
 *
 * Patrón tomado de 01_xschool (frontend-prod): token en el navegador → verificación en el servidor contra
 * `siteverify` → se acepta si `success`, la acción coincide y `score >= 0.5`. Un score de 0 es un bot probable:
 * se comprueba el TIPO del score, nunca la veracidad del valor.
 *
 * Activación: solo hace falta poner dos variables (ver docs/recaptcha.md):
 *   NEXT_PUBLIC_RECAPTCHA_SITE_KEY  (pública, también la lee el navegador)
 *   RECAPTCHA_SECRET_KEY            (secreta, solo servidor)
 * Sin ambas, el sitio funciona igual y no bloquea a nadie (así el despliegue no depende de Google).
 * Con ambas, es FAIL-CLOSED: si Google no responde o el token no sirve, se rechaza.
 */

import { NextResponse } from 'next/server';
import { recaptchaSiteKey } from '@/lib/recaptcha-config';
export { recaptchaSiteKey };

const VERIFICACION = 'https://www.google.com/recaptcha/api/siteverify';
const TIMEOUT_MS = 5000;

/** ¿Está configurado? Requiere la llave pública y la secreta. */
export const recaptchaActivo = (): boolean => Boolean(recaptchaSiteKey() && process.env.RECAPTCHA_SECRET_KEY?.trim());

export const recaptchaMinScore = (): number => {
  const n = Number(process.env.RECAPTCHA_MIN_SCORE);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.5;
};

let avisoSinConfigurar = false;

export type ResultadoRecaptcha = { ok: true } | { ok: false; motivo: string; codigos: string[] };

/** Verifica un token de reCAPTCHA v3 para una acción concreta. Nunca lanza: devuelve ok o el motivo. */
export async function verificarRecaptcha(token: unknown, accion: string, ip?: string): Promise<ResultadoRecaptcha> {
  if (!recaptchaActivo()) {
    if (process.env.NODE_ENV === 'production' && !avisoSinConfigurar) {
      avisoSinConfigurar = true;
      console.warn('[recaptcha] sin configurar: los formularios no están protegidos. Agrega NEXT_PUBLIC_RECAPTCHA_SITE_KEY y RECAPTCHA_SECRET_KEY.');
    }
    return { ok: true };
  }

  if (typeof token !== 'string' || !token.trim()) {
    return { ok: false, motivo: 'falta-token', codigos: ['falta-token'] };
  }

  try {
    const cuerpo = new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY as string, response: token });
    if (ip && ip !== 'desconocida') cuerpo.set('remoteip', ip);

    const respuesta = await fetch(VERIFICACION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const datos = (await respuesta.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      'error-codes'?: string[];
    };

    if (!datos.success) {
      const codigos = datos['error-codes'] ?? ['no-exitoso'];
      console.warn(`[recaptcha] rechazado (${accion}):`, codigos, '| host:', datos.hostname);
      // invalid-keys / bad-request casi siempre son configuración (dominio no registrado en el sitio de reCAPTCHA).
      return { ok: false, motivo: 'verificacion-fallida', codigos };
    }
    if (typeof datos.action === 'string' && datos.action !== accion) {
      console.warn(`[recaptcha] acción inesperada: ${datos.action} (se esperaba ${accion})`);
      return { ok: false, motivo: 'accion-incorrecta', codigos: ['accion-incorrecta'] };
    }
    if (typeof datos.score === 'number' && datos.score < recaptchaMinScore()) {
      console.warn(`[recaptcha] score bajo (${accion}): ${datos.score}`);
      return { ok: false, motivo: 'score-bajo', codigos: [`score-bajo:${datos.score}`] };
    }
    return { ok: true };
  } catch (error) {
    console.error('[recaptcha] no se pudo verificar:', error instanceof Error ? error.message : error);
    return { ok: false, motivo: 'sin-respuesta', codigos: ['sin-respuesta'] };
  }
}

/** Para rutas de API: devuelve la respuesta de error si no pasa, o null si puede continuar. */
export async function exigirRecaptcha(token: unknown, accion: string, ip?: string): Promise<NextResponse | null> {
  const r = await verificarRecaptcha(token, accion, ip);
  if (r.ok) return null;
  return NextResponse.json(
    { error: 'No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.', codigo: 'recaptcha', motivo: r.motivo },
    { status: 403 }
  );
}
