/**
 * Consolidación del carrito en un paquete cotizable.
 *
 * Vive separado de `index.ts` a propósito: `index.ts` importa los adaptadores
 * (`providers/*.ts`), y `createShipment()` en el adaptador de Envia necesita
 * armar el mismo paquete que se cotizó para generar la guía con las
 * dimensiones reales — no una caja genérica. Si esta función viviera en
 * `index.ts`, importarla desde `envia.ts` sería una dependencia circular
 * (`index → envia → index`).
 */

import { LOGISTICS, LOGISTICS_FALLBACK } from '@/data/logistics';
import type { OrderLine } from '@/lib/orders/types';
import type { ShippingParcel } from './types';

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
