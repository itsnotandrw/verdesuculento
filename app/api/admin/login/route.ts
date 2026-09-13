/**
 * POST /api/admin/login — inicia sesión en el panel /admin.
 *
 * No confunde con `ADMIN_API_TOKEN` (ver lib/api.ts): esto es para el
 * navegador humano, emite una cookie httpOnly firmada en vez de un token que
 * el cliente tiene que guardar y mandar a mano.
 */

import { NextResponse } from 'next/server';
import { ValidationError, cuerpo, fail, fallo, texto } from '@/lib/api';
import { env } from '@/lib/env';
import { verifyPassword } from '@/lib/admin/password';
import { crearTokenSesion, DURACION_SESION_MS, NOMBRE_COOKIE } from '@/lib/admin/session';
import { ipDe, limitarLogin } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!env.adminEmail || !env.adminPasswordHash || !env.adminSessionSecret) {
      return fail('El login del panel no está configurado. Ver .env.example.', 503);
    }

    // Nunca fail-open acá (ver lib/ratelimit.ts): sin esto, la contraseña es
    // la única barrera contra fuerza bruta.
    if (!(await limitarLogin(ipDe(request)))) {
      return fail('Demasiados intentos. Espera unos minutos e intenta de nuevo.', 429);
    }

    const body = await cuerpo(request);
    const email = texto(body.email, 'el correo', { max: 160 }).toLowerCase();
    const password = texto(body.password, 'la contraseña', { max: 200 });

    // El correo no es secreto -- solo identifica cuál cuenta es (hoy, una
    // sola). No hace falta tiempo constante para esa comparación; el secreto
    // real, la contraseña, sí se compara en tiempo constante dentro de
    // verifyPassword. El mensaje de error es el mismo para "correo
    // incorrecto" y "contraseña incorrecta" a propósito: no le regala a un
    // atacante cuál de los dos datos acertó.
    if (email !== env.adminEmail.toLowerCase() || !verifyPassword(password, env.adminPasswordHash)) {
      return fail('Correo o contraseña incorrectos.', 401);
    }

    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.set(NOMBRE_COOKIE, crearTokenSesion(email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(DURACION_SESION_MS / 1000),
    });
    return respuesta;
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/login');
  }
}
