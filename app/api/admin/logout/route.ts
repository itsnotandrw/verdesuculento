/** POST /api/admin/logout — cierra la sesión del panel, borrando la cookie. */

import { NextResponse } from 'next/server';
import { NOMBRE_COOKIE } from '@/lib/admin/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(NOMBRE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return respuesta;
}
