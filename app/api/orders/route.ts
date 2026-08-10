/**
 * POST /api/orders — crea el pedido y su intento de pago.
 *
 * Recibe ids (de producto y de cotización), nunca montos: el total lo calcula
 * el servidor contra el catálogo y la tarifa vigente.
 */

import { ValidationError, cuerpo, email, fail, fallo, lineasCarrito, ok, telefono, texto } from '@/lib/api';
import { crearPedido } from '@/lib/orders/orchestrator';
import { toPublicOrder, type PaymentMethodId } from '@/lib/orders/types';
import type { PaymentContext } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const METODOS: PaymentMethodId[] = ['BREB', 'NEQUI', 'PSE', 'CARD', 'COD'];

export async function POST(request: Request) {
  try {
    const body = await cuerpo(request);

    const metodo = texto(body.method, 'el método de pago', { max: 10 }).toUpperCase() as PaymentMethodId;
    if (!METODOS.includes(metodo)) return fail('Método de pago no válido.', 422);

    const contexto = (body.paymentContext ?? {}) as PaymentContext;

    const { order, intent } = await crearPedido(
      {
        customer: {
          nombre: texto(body.nombre, 'el nombre', { max: 60 }),
          apellido: texto(body.apellido, 'el apellido', { max: 60 }),
          email: email(body.email),
          telefono: telefono(body.telefono),
          // Requerido en el servidor, no solo en el checkout: TCC rechaza la
          // guía sin la cédula/NIT del destinatario ("NIT/CC destino no puede
          // ser vacío", probado contra su API real), y confiar solo en la
          // validación del navegador dejaría ese hueco abierto a cualquiera
          // que llame a esta API directamente.
          documento: texto(body.documento, 'la cédula o NIT', { max: 20 }),
        },
        address: {
          departamento: texto(body.departamento, 'el departamento', { max: 80 }),
          ciudad: texto(body.ciudad, 'la ciudad', { max: 80 }),
          direccion: texto(body.direccion, 'la dirección', { max: 160 }),
          barrio: texto(body.barrio, 'el barrio', { max: 100, requerido: false }),
          codigoPostal: texto(body.codigoPostal, 'el código postal', { max: 12, requerido: false }),
          notas: texto(body.notas, 'las notas', { max: 300, requerido: false }),
        },
        lines: lineasCarrito(body.lines),
        quoteId: texto(body.quoteId, 'la opción de envío', { max: 80 }),
        method: metodo,
      },
      contexto
    );

    return ok({ order: toPublicOrder(order), intent }, 201);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/orders');
  }
}
