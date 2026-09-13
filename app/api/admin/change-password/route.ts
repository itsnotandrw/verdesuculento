/**
 * POST /api/admin/change-password — cambia la contraseña del panel.
 *
 * A propósito SOLO acepta sesión de navegador (no ADMIN_API_TOKEN): un
 * script no tiene por qué poder cambiar la contraseña de un humano. Exige la
 * contraseña actual además de la sesión -- una sesión robada no basta sola
 * para tomar la cuenta permanentemente.
 */

import { ValidationError, cuerpo, fail, fallo, ok, texto } from '@/lib/api';
import { sesionActual } from '@/lib/admin/session';
import { hashPassword, verifyPassword } from '@/lib/admin/password';
import { actualizarPassword, getCredenciales, passwordEditable } from '@/lib/admin/store';

export const dynamic = 'force-dynamic';

const LARGO_MINIMO = 10;

export async function POST(request: Request) {
  const sesion = sesionActual();
  if (!sesion) return fail('No autorizado.', 401);

  try {
    if (!passwordEditable()) {
      return fail('No se puede cambiar la contraseña: falta configurar Redis (KV_REST_API_URL/TOKEN).', 503);
    }

    const credenciales = await getCredenciales();
    if (!credenciales) return fail('El login del panel no está configurado.', 503);

    const body = await cuerpo(request);
    const actual = texto(body.currentPassword, 'la contraseña actual', { max: 200 });
    const nueva = texto(body.newPassword, 'la contraseña nueva', { max: 200 });

    if (!verifyPassword(actual, credenciales.passwordHash)) {
      return fail('La contraseña actual no es correcta.', 401);
    }
    if (nueva.length < LARGO_MINIMO) {
      return fail(`La contraseña nueva debe tener al menos ${LARGO_MINIMO} caracteres.`, 422);
    }

    await actualizarPassword(credenciales.email, hashPassword(nueva));
    console.log(`[admin] contraseña cambiada para ${credenciales.email}`);
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/admin/change-password');
  }
}
