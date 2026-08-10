/**
 * Cierra los pedidos cuyo pago nunca llegó dentro del plazo
 * (`PAYMENT_TTL_MINUTES`, 24 h por defecto).
 *
 * Dos formas de llamarlo:
 *
 *   POST, con el token del panel — para correrlo a mano:
 *     curl -X POST https://<dominio>/api/admin/expirar \
 *          -H "Authorization: Bearer $ADMIN_API_TOKEN"
 *
 *   GET, automático — Vercel Cron (ver vercel.json) llama a esta ruta según
 *     el horario configurado ahí. Vercel manda el header
 *     `Authorization: Bearer $CRON_SECRET` solo si esa variable de entorno
 *     existe en el proyecto: se configura una vez en el dashboard y Vercel
 *     se encarga de firmar cada llamada, sin que el código tenga que saber
 *     nada de credenciales de Vercel.
 *
 * Antes de expirar cada pedido consulta el estado real en la pasarela: matar
 * un pedido que sí se pagó es mucho peor que dejarlo abierto unas horas de más.
 */

import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { autorizarAdmin, fail, fallo, ok } from '@/lib/api';
import { env } from '@/lib/env';
import { expirarPendientes } from '@/lib/orders/orchestrator';

export const dynamic = 'force-dynamic';

async function correr() {
  try {
    const resultado = await expirarPendientes();
    return ok({ ...resultado, corridoEn: new Date().toISOString() });
  } catch (error) {
    return fallo(error, 'expirar pedidos');
  }
}

/** Mismo criterio que `autorizarAdmin`: 503 si falta configurar, 401 si el secreto no coincide. */
function autorizarCron(request: Request): NextResponse | null {
  if (!env.cronSecret) {
    return fail('El cron no está habilitado: falta configurar CRON_SECRET en el proyecto.', 503);
  }

  const cabecera = request.headers.get('authorization') ?? '';
  const recibido = cabecera.replace(/^Bearer\s+/i, '').trim();
  if (!recibido) return fail('No autorizado.', 401);

  const a = Buffer.from(recibido, 'utf-8');
  const b = Buffer.from(env.cronSecret, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail('No autorizado.', 401);

  return null;
}

export async function POST(request: Request) {
  const noAutorizado = autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  return correr();
}

/** Vercel Cron llama por GET, nunca por POST. */
export async function GET(request: Request) {
  const noAutorizado = autorizarCron(request);
  if (noAutorizado) return noAutorizado;
  return correr();
}
