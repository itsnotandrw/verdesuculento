/**
 * Sesión del panel admin. SOLO SERVIDOR.
 *
 * La sesión la emite y guarda Better Auth (lib/auth.ts): cookie httpOnly + sesión en Redis. Aquí solo se lee, y se
 * vuelve a exigir la lista blanca en cada petición: si un correo sale de ADMIN_EMAILS, pierde el acceso al instante.
 */

import { headers } from 'next/headers';
import { auth, esCorreoAdmin } from '@/lib/auth';

export interface SesionAdmin {
  email: string;
}

export async function sesionActual(): Promise<SesionAdmin | null> {
  try {
    const sesion = await auth.api.getSession({ headers: headers() });
    const email = sesion?.user?.email;
    if (!email || !esCorreoAdmin(email)) return null;
    return { email };
  } catch (error) {
    console.error('[admin] no se pudo leer la sesión:', error);
    return null;
  }
}
