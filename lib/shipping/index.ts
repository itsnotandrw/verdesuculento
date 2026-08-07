/**
 * Punto de entrada del módulo de envíos. SOLO SERVIDOR.
 *
 * El resto del sistema importa `shippingProvider()` y nunca un adaptador
 * concreto: así cambiar de transportadora es cambiar `SHIPPING_PROVIDER` en
 * `.env.local`, sin tocar el checkout ni el orquestador.
 */

import { env } from '@/lib/env';
import { LOGISTICS, LOGISTICS_FALLBACK } from '@/data/logistics';
import type { OrderLine } from '@/lib/orders/types';
import type { ShippingProvider } from './provider';
import { tarifaPropiaProvider } from './providers/tarifa-propia';
import { mipaqueteProvider } from './providers/mipaquete';
import { enviaProvider } from './providers/envia';
import type { QuoteRequest, ShippingAddress, ShippingParcel, ShippingQuote } from './types';

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

/** Peso y dimensiones declarados en ML para un producto. */
export function logisticaDe(productId: string) {
  return LOGISTICS[productId] ?? LOGISTICS_FALLBACK;
}

/**
 * Convierte el carrito en un paquete cotizable.
 *
 * Modelo: una sola caja donde las plantas van **apiladas**, que es como se
 * despachan. La base es la huella del producto más grande y la altura crece
 * con el volumen acumulado.
 *
 * La tentación es aproximar la caja a un cubo del volumen total, pero eso
 * infla el resultado sin control: una planta de 10×20×40 (8 L) se convierte en
 * una caja de 40×32×32 (41 L) porque ninguna dimensión puede bajar del lado
 * más largo. Cinco veces el volumen real, y con divisor volumétrico 6000 eso
 * es cobrarle al cliente el doble del envío.
 */
export function armarPaquete(lines: OrderLine[], declaredValue: number): ShippingParcel {
  let pesoTotal = 0;
  let volumenTotal = 0;
  let baseLargo = 0;
  let baseAncho = 0;
  let altoMinimo = 0;

  for (const linea of lines) {
    const l = logisticaDe(linea.productId);

    // Se normaliza la orientación (largo ≥ ancho ≥ alto) para que dos productos
    // con las mismas medidas declaradas en distinto orden apilen igual.
    const [largo, ancho, alto] = [l.lengthCm, l.widthCm, l.heightCm].sort((a, b) => b - a);

    pesoTotal += l.weightGrams * linea.qty;
    volumenTotal += largo * ancho * alto * linea.qty;
    baseLargo = Math.max(baseLargo, largo);
    baseAncho = Math.max(baseAncho, ancho);
    altoMinimo = Math.max(altoMinimo, alto);
  }

  if (volumenTotal === 0 || baseLargo === 0 || baseAncho === 0) {
    return { ...LOGISTICS_FALLBACK, declaredValue };
  }

  // 15% de holgura por el embalaje: las plantas van con relleno y separadores,
  // y ese aire lo cobra la transportadora aunque nosotros lo ignoremos.
  const alto = Math.max(altoMinimo, Math.ceil((volumenTotal * 1.15) / (baseLargo * baseAncho)));

  return {
    weightGrams: Math.round(pesoTotal),
    lengthCm: baseLargo,
    widthCm: baseAncho,
    heightCm: alto,
    declaredValue,
  };
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
