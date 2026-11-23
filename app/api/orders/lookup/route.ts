/**
 * POST /api/orders/lookup — "mis pedidos".
 *
 *  - Con `ticket` (la referencia VS-XXXXXX que llega al correo): devuelve la referencia para abrir el pedido.
 *  - Con `email`: NO muestra nada en pantalla; si existen pedidos con ese correo, se los envía por correo (así nadie ve
 *    pedidos ajenos solo por conocer un correo). La respuesta es siempre la misma, haya o no pedidos.
 */

import { ValidationError, cuerpo, email as validarEmail, fail, fallo, ok } from '@/lib/api';
import { correoListaPedidos, enviarSinFallar } from '@/lib/orders/correos';
import { orders } from '@/lib/orders/store';
import { ipDe, limitar, limitarBusquedaPedidos } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const MENSAJE_CORREO = 'Si hay pedidos con ese correo, te enviamos la lista. Revisa tu bandeja (y el correo no deseado).';

export async function POST(request: Request) {
  try {
    if (!(await limitarBusquedaPedidos(ipDe(request)))) {
      return fail('Demasiadas búsquedas seguidas. Espera unos minutos e intenta de nuevo.', 429);
    }
    const body = await cuerpo(request);

    if (typeof body.ticket === 'string' && body.ticket.trim()) {
      const limpio = body.ticket.trim().toUpperCase().replace(/\s+/g, '');
      const ref = /^VS-/.test(limpio) ? limpio : `VS-${limpio}`;
      const pedido = await orders.byReference(ref);
      return pedido ? ok({ reference: pedido.reference }) : fail('No encontramos un pedido con ese ticket. Revisa que esté completo (VS-XXXXXX).', 404);
    }

    const correo = validarEmail(body.email).toLowerCase();
    if (!(await limitar('pedidos-correo', correo))) return ok({ enviado: true, mensaje: MENSAJE_CORREO });
    const todos = await orders.list({ limite: 500 });
    const propios = todos.filter((o) => o.customer.email.toLowerCase() === correo).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
    if (propios.length) enviarSinFallar(correoListaPedidos(correo, propios), 'lista de pedidos');
    return ok({ enviado: true, mensaje: MENSAJE_CORREO });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/orders/lookup');
  }
}
