/**
 * POST /api/shipping/quote — opciones de envío para un destino y un carrito.
 *
 * Toda llamada a APIs externas pasa por el servidor: las llaves del agregador
 * nunca llegan al navegador.
 */

import { getProductById } from '@/data/catalog';
import { ValidationError, cuerpo, fail, fallo, lineasCarrito, ok, texto } from '@/lib/api';
import { env } from '@/lib/env';
import { armarPaquete, cotizar, logisticaDe, shippingProvider } from '@/lib/shipping';
import type { OrderLine } from '@/lib/orders/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await cuerpo(request);

    const destination = {
      departamento: texto(body.departamento, 'el departamento', { max: 80 }),
      ciudad: texto(body.ciudad, 'la ciudad', { max: 80 }),
      codigoPostal: texto(body.codigoPostal, 'el código postal', { max: 12, requerido: false }),
    };

    const lineas = lineasCarrito(body.lines);
    const contraEntrega = body.cashOnDelivery === true;

    // El subtotal se calcula con el catálogo del servidor, no con lo que mande
    // el navegador: de él depende si aplica el envío gratis.
    const lines: OrderLine[] = [];
    for (const linea of lineas) {
      const producto = getProductById(linea.productId);
      if (!producto) return fail(`El producto ${linea.productId} ya no está disponible.`, 400);
      lines.push({
        productId: producto.id,
        name: producto.name,
        color: linea.color,
        size: linea.size,
        qty: linea.qty,
        unitPrice: producto.price,
        weightGrams: logisticaDe(producto.id).weightGrams,
      });
    }

    const subtotal = lines.reduce((suma, l) => suma + l.unitPrice * l.qty, 0);
    const parcel = armarPaquete(lines, subtotal);

    const quotes = await cotizar({
      destination,
      parcel,
      merchandiseValue: subtotal,
      cashOnDelivery: contraEntrega,
    });

    // La cobertura de contra entrega se resuelve aquí para que el checkout sepa
    // si puede ofrecer el método antes de mostrarlo.
    const cod = env.shipping.codEnabled
      ? await shippingProvider().codCoverage(destination, subtotal)
      : { available: false, fee: 0, settlementDays: 0, reason: 'Contra entrega no habilitado.' };

    return ok({
      quotes,
      subtotal,
      freeShippingFrom: env.shipping.freeShippingFrom,
      cod,
      parcel: {
        weightGrams: parcel.weightGrams,
        lengthCm: parcel.lengthCm,
        widthCm: parcel.widthCm,
        heightCm: parcel.heightCm,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 422);
    return fallo(error, 'POST /api/shipping/quote');
  }
}
