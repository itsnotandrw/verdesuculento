/**
 * Barrera de las PÁGINAS del panel (/admin/*), antes de renderizar nada.
 *
 * Por qué hace falta: el layout del panel también redirige a /admin/login, pero en Next.js el layout y la
 * página se renderizan en paralelo y, con streaming, el HTML con los datos de la página puede salir antes de
 * que el redirect del layout se aplique. Un `curl` a /admin devolvía los indicadores sin iniciar sesión. Aquí
 * se corta ANTES: sin cookie de sesión válida, 307 a /admin/login y la página ni se ejecuta.
 *
 * Corre en el runtime Edge, así que verifica la cookie con Web Crypto (mismo formato que lib/admin/session.ts:
 * `base64url(JSON{email,exp}).hmacSha256Hex`). Las rutas /api/admin/* tienen su propia barrera (`autorizarAdmin`).
 * ADMIN_DEV_OPEN=1 solo se respeta fuera de producción (igual que env.adminOpen).
 */

import { NextResponse, type NextRequest } from 'next/server';

const NOMBRE_COOKIE = 'verde_admin_session';

function aBytes(base64url: string): Uint8Array {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function firmaHex(payload: string, secreto: string): Promise<string> {
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('');
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sesionValida(token: string | undefined): Promise<boolean> {
  const secreto = (process.env.ADMIN_SESSION_SECRET ?? '').trim();
  if (!token || !secreto) return false;
  const punto = token.lastIndexOf('.');
  if (punto < 0) return false;
  const payload = token.slice(0, punto);
  if (!iguales(token.slice(punto + 1), await firmaHex(payload, secreto))) return false;
  try {
    const datos = JSON.parse(new TextDecoder().decode(aBytes(payload))) as { email?: unknown; exp?: unknown };
    return typeof datos.email === 'string' && typeof datos.exp === 'number' && Date.now() <= datos.exp;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return NextResponse.next();

  const abiertoEnDesarrollo =
    ['1', 'true', 'si', 'sí', 'yes'].includes((process.env.ADMIN_DEV_OPEN ?? '').trim().toLowerCase()) &&
    process.env.NODE_ENV !== 'production';
  if (abiertoEnDesarrollo) return NextResponse.next();

  if (await sesionValida(request.cookies.get(NOMBRE_COOKIE)?.value)) return NextResponse.next();

  // Next exige URL absoluta aquí. Detrás del proxy de Railway el host interno no es el público: se usa el que manda el proxy.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  const respuesta = NextResponse.redirect(new URL('/admin/login', `${proto}://${host}`), 307);
  respuesta.headers.set('Cache-Control', 'no-store');
  return respuesta;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
