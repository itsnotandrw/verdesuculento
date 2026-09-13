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
import { RECOGER_TIENDA_QUOTE_ID } from './constants';

export { logisticaDe, armarPaquete } from './paquete';
export { RECOGER_TIENDA_QUOTE_ID } from './constants';

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
 * La opción "recoger en tienda": cuesta $0, no tiene transportadora, y no
 * depende del destino — por eso no pasa por ningún adaptador de
 * `shippingProvider()`, a diferencia de todas las demás cotizaciones.
 */
export function cotizacionRecogerEnTienda(): ShippingQuote {
  return {
    id: RECOGER_TIENDA_QUOTE_ID,
    provider: 'pickup',
    carrier: 'Recoger en tienda',
    carrierCode: 'pickup',
    service: `${env.shipping.origin.direccion}, ${env.shipping.origin.ciudad}`,
    serviceCode: 'pickup',
    cost: 0,
    listCost: 0,
    currency: 'COP',
    etaMinDays: 0,
    etaMaxDays: 0,
    etaLabel: 'Te avisamos por WhatsApp/correo cuando esté listo',
    cashOnDeliveryAvailable: false,
    cashOnDeliveryFee: 0,
  };
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
  // Recoger en tienda no tiene destino que cotizar -- ni siquiera hace falta
  // que `destination` traiga algo válido.
  if (quoteId === RECOGER_TIENDA_QUOTE_ID) return cotizacionRecogerEnTienda();

  const opciones = await cotizar({ destination, parcel, merchandiseValue, cashOnDelivery });
  return opciones.find((opcion) => opcion.id === quoteId) ?? null;
}

export type { ShippingProvider } from './provider';
export * from './types';
