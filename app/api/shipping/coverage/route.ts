/**
 * POST /api/shipping/coverage — ¿hay recaudo contra entrega en este destino?
 *
 * Se consulta ANTES de ofrecer el método en el checkout. Ofrecer contra
 * entrega donde no hay recaudo es despachar producto que nadie va a cobrar.
 */

import { ValidationError, cuerpo, entero, fail, fallo, ok, texto } from '@/lib/api';
import { shippingProvider } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await cuerpo(request);

    const cobertura = await shippingProvider().codCoverage(
      {
        departamento: texto(body.departamento, 'el departamento', { max: 80 }),
        ciudad: texto(body.ciudad, 'la ciudad', { max: 80 }),
      },
      entero(body.amount ?? 0, 'El monto', 0)
    );

    return ok(cobertura);
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/shipping/coverage');
  }
}
