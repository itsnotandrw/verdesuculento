/**
 * Punto de entrada del módulo de pagos. SOLO SERVIDOR.
 *
 * El checkout pide métodos a `metodosDisponibles()` y nunca importa un
 * adaptador concreto. Cuando entre Wompi, la lista de métodos del checkout
 * cambia sola.
 */

import { env } from '@/lib/env';
import type { PaymentMethodId } from '@/lib/orders/types';
import type { PaymentProvider } from './provider';
import { brebManualProvider } from './providers/breb-manual';
import { wompiProvider } from './providers/wompi';

const PROVEEDORES: Record<string, PaymentProvider> = {
  [brebManualProvider.id]: brebManualProvider,
  [wompiProvider.id]: wompiProvider,
};

export function paymentProvider(): PaymentProvider {
  const elegido = PROVEEDORES[env.payments.provider];

  if (!elegido) {
    console.warn(
      `[payments] PAYMENT_PROVIDER="${env.payments.provider}" no existe. ` +
        `Opciones: ${Object.keys(PROVEEDORES).join(', ')}. Usando Bre-B manual.`
    );
    return brebManualProvider;
  }

  // Degradar a manual es preferible a un checkout que revienta: se puede
  // seguir vendiendo aunque las llaves de la pasarela estén mal puestas.
  if (!elegido.isConfigured()) {
    console.warn(
      `[payments] "${elegido.id}" está seleccionado pero le faltan credenciales. ` +
        `Usando Bre-B manual mientras tanto.`
    );
    return brebManualProvider;
  }

  return elegido;
}

export interface MetodoDisponible {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** Si el pago se confirma solo o espera verificación humana. */
  instant: boolean;
  /** Orden en el checkout: primero los baratos. */
  order: number;
}

/** Proveedor que atiende cada método: Bre-B es siempre manual y Wompi atiende el pago en línea. */
export function paymentProviderFor(method: PaymentMethodId): PaymentProvider {
  if (method === 'BREB') return brebManualProvider;
  if (wompiProvider.methods.includes(method)) {
    if (!wompiProvider.isConfigured()) {
      throw new Error('El pago con Wompi no está disponible: faltan las credenciales en el servidor.');
    }
    return wompiProvider;
  }
  return paymentProvider();
}

/** Proveedor por su id (para pedidos ya creados). */
export function paymentProviderById(id: string): PaymentProvider {
  return id === wompiProvider.id ? wompiProvider : id === brebManualProvider.id ? brebManualProvider : paymentProvider();
}

const CATALOGO: Record<PaymentMethodId, Omit<MetodoDisponible, 'id' | 'instant'>> = {
  WOMPI: {
    label: 'Wompi — tarjeta, PSE o Nequi',
    description: 'Pagas en la página segura de Wompi con tarjeta, PSE, Nequi o Bancolombia. Confirmación inmediata.',
    order: 1,
  },
  BREB: {
    label: 'Bre-B — transferencia con llave',
    description: 'Paga desde cualquier banco o billetera con la llave del vivero. Sin costo adicional.',
    order: 2,
  },
  NEQUI: {
    label: 'Nequi',
    description: 'Te llega una notificación a la app y la apruebas. Confirmación inmediata.',
    order: 3,
  },
  PSE: {
    label: 'PSE — débito bancario',
    description: 'Pagas desde la web de tu banco. Confirmación en minutos.',
    order: 4,
  },
  COD: {
    label: 'Contra entrega',
    description: 'Pagas en efectivo cuando recibas el pedido.',
    order: 9,
  },
  CARD: {
    label: 'Tarjeta de crédito o débito',
    description: 'Hasta 36 cuotas. Ideal para pedidos grandes.',
    order: 5,
  },
};

/**
 * Métodos que el checkout puede mostrar hoy, ordenados de más barato a más
 * caro para el negocio.
 *
 * El orden importa: la mayoría de clientes elige el primero, y cada punto de
 * mezcla que se mueve de tarjeta hacia Bre-B/Nequi es margen que se queda en
 * el negocio en vez de irse en comisión.
 */
export function metodosDisponibles(codDisponible = false): MetodoDisponible[] {
  // Conviven tres métodos: Wompi (si hay credenciales), Bre-B (siempre) y contra entrega (solo con cobertura de recaudo).
  const ids: PaymentMethodId[] = ['BREB'];
  if (wompiProvider.isConfigured()) ids.unshift('WOMPI');
  if (codDisponible) ids.push('COD');

  return ids
    .map((id) => ({
      id,
      ...CATALOGO[id],
      // Solo Bre-B espera a que alguien vea el abono; Wompi y contra entrega se confirman solos.
      instant: id !== 'BREB',
    }))
    .sort((a, b) => a.order - b.order);
}

export type { PaymentProvider, PaymentContext } from './provider';
export * from './types';
