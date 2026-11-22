/**
 * Barrera de las PÁGINAS del panel (/admin/*), antes de renderizar nada.
 *
 * Por qué hace falta: el layout del panel también redirige a /admin/login, pero en Next.js el layout y la
 * página se renderizan en paralelo y, con streaming, el HTML con los datos de la página puede salir antes de
 * que el redirect del layout se aplique. Un `curl` a /admin devolvía los indicadores sin iniciar sesión. Aquí
 * se corta ANTES: sin sesión válida, 307 a /admin/login y la página ni se ejecuta.
 *
 * La sesión es de Better Auth (lib/auth.ts). Este código corre en el runtime Edge, que no puede hablar con Redis,
 * así que le pregunta a `/api/auth/get-session` (el propio servidor) y exige además que el correo siga en
 * ADMIN_EMAILS. Cualquier fallo (el servidor no responde, la respuesta no es la esperada) CIERRA el acceso.
 * Las rutas /api/admin/* tienen su propia barrera (`autorizarAdmin`).
 * ADMIN_DEV_OPEN=1 solo se respeta fuera de producción (igual que env.adminOpen).
 */

import { NextResponse, type NextRequest } from 'next/server';

async function sesionValida(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return false;
  const lista = (process.env.ADMIN_EMAILS ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return false;

  // En producción se llama al propio proceso (el host público de Railway puede no resolver desde dentro).
  const base = process.env.NODE_ENV === 'production' ? `http://127.0.0.1:${process.env.PORT || 3000}` : request.nextUrl.origin;
  try {
    const respuesta = await fetch(`${base}/api/auth/get-session`, { headers: { cookie }, cache: 'no-store' });
    if (!respuesta.ok) return false;
    const datos = (await respuesta.json()) as { user?: { email?: unknown } } | null;
    const email = datos?.user?.email;
    return typeof email === 'string' && lista.includes(email.trim().toLowerCase());
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

  if (await sesionValida(request)) return NextResponse.next();

  // Next exige URL absoluta aquí. Detrás del proxy de Railway el host interno no es el público: se usa el que manda el proxy.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  const respuesta = NextResponse.redirect(new URL('/admin/login', `${proto}://${host}`), 307);
  respuesta.headers.set('Cache-Control', 'no-store');
  return respuesta;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
