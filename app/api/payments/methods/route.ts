/**
 * GET /api/payments/methods — métodos que el checkout puede mostrar hoy.
 *
 * La lista sale del proveedor activo, así que el día que entre Wompi el
 * checkout muestra Nequi, PSE y tarjeta sin que haya que tocarlo.
 *
 * `?cod=1` incluye contra entrega (el checkout lo pide solo si la cotización
 * confirmó cobertura de recaudo para ese destino).
 */

import { fallo, ok, limitarPeticion } from '@/lib/api';
import { metodosDisponibles } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const excedido = await limitarPeticion(request, 'metodos');
  if (excedido) return excedido;
  try {
    const url = new URL(request.url);
    const cod = url.searchParams.get('cod') === '1';
    return ok({ methods: metodosDisponibles(cod) });
  } catch (error) {
    return fallo(error, 'GET /api/payments/methods');
  }
}
