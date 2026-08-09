/**
 * Punto de entrada del módulo de envíos. SOLO SERVIDOR.
 *
 * El resto del sistema importa `shippingProvider()` y nunca un adaptador
 * concreto: así cambiar de transportadora es cambiar `SHIPPING_PROVIDER` en
 * `.env.local`, sin tocar el checkout ni el orquestador.
 */

import { env } from '@/lib/env';
import type { ShippingProvider } from './provider';
import { tarifaPropiaProvider } from './providers/tarifa-propia';
import { mipaqueteProvider } from './providers/mipaquete';
import { enviaProvider } from './providers/envia';
import type { QuoteRequest, ShippingAddress, ShippingParcel, ShippingQuote } from './types';

export { logisticaDe, armarPaquete } from './paquete';

const PROVEEDORES: Record<string, ShippingProvider> = {
  [tarifaPropiaProvider.id]: tarifaPropiaProvider,
  [mipaqueteProvider.id]: mipaqueteProvider,
  [enviaProvider.id]: enviaProvider,
};

export function shippingProvider(): ShippingProvider {
  const elegido = PROVEEDORES[env.shipping.provider];

  if (!elegido) {
    console.warn(
      `[shipping] SHIPPING_PROVIDER="${env.shipping.provider}" no existe. ` +
        `Opciones: ${Object.keys(PROVEEDORES).join(', ')}. Usando tarifa propia.`
    );
    return tarifaPropiaProvider;
  }

  // Un agregador sin credenciales tumbaría el checkout entero. Mejor degradar a
  // la tarifa propia —que siempre cotiza— y dejar constancia en el log.
  if (!elegido.isConfigured()) {
    console.warn(
      `[shipping] "${elegido.id}" está seleccionado pero le faltan credenciales. ` +
        `Usando tarifa propia mientras tanto.`
    );
    return tarifaPropiaProvider;
  }

  return elegido;
}

/** Cotiza contra el proveedor activo. */
export async function cotizar(request: QuoteRequest): Promise<ShippingQuote[]> {
  return shippingProvider().quote(request);
}

/**
 * Re-cotiza y busca la opción por id.
 *
 * El checkout devuelve el id de la cotización elegida, nunca su precio: el
 * monto a cobrar se recalcula siempre en el servidor. Si el navegador manda un
 * total manipulado, aquí no tiene efecto.
 */
export async function resolverCotizacion(
  quoteId: string,
  destination: ShippingAddress,
  parcel: ShippingParcel,
  merchandiseValue: number,
  cashOnDelivery = false
): Promise<ShippingQuote | null> {
  const opciones = await cotizar({ destination, parcel, merchandiseValue, cashOnDelivery });
  return opciones.find((opcion) => opcion.id === quoteId) ?? null;
}

export type { ShippingProvider } from './provider';
export * from './types';
