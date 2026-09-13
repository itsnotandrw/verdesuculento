/**
 * POST /api/orders/lookup — "mis pedidos", buscados por correo.
 *
 * Alternativa liviana a una cuenta con contraseña: el cliente escribe su
 * correo y ve un resumen de sus pedidos, cada uno con link a
 * /pedido/[reference] para el detalle completo.
 *
 * A propósito devuelve MENOS información que /pedido/[reference] (nada de
 * dirección, teléfono ni la referencia de pago) — un correo es mucho menos
 * secreto que el código aleatorio de un pedido, así que esta puerta se deja
 * más angosta. Quien de verdad necesita ver todo entra por la referencia.
 */

import { ValidationError, cuerpo, email as validarEmail, fail, fallo, ok } from '@/lib/api';
import { orders } from '@/lib/orders/store';
import { etiquetaEstado } from '@/lib/orders/types';
import { ipDe, limitarBusquedaPedidos } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Nunca fail-open (ver lib/ratelimit.ts): sin esto, alguien podría probar
    // muchos correos seguidos buscando pedidos ajenos.
    if (!(await limitarBusquedaPedidos(ipDe(request)))) {
      return fail('Demasiadas búsquedas seguidas. Espera unos minutos e intenta de nuevo.', 429);
    }

    const body = await cuerpo(request);
    const correo = validarEmail(body.email).toLowerCase();

    const todos = await orders.list({ limite: 500 });
    const propios = todos
      .filter((o) => o.customer.email.toLowerCase() === correo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({
        reference: o.reference,
        orderNumber: o.orderNumber ?? null,
        createdAt: o.createdAt,
        status: o.status,
        statusLabel: etiquetaEstado(o.status),
        total: o.total,
        etaLabel: o.selectedQuote.etaLabel,
      }));

    return ok({ orders: propios });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/orders/lookup');
  }
}
