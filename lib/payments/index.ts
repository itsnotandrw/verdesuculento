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

const CATALOGO: Record<PaymentMethodId, Omit<MetodoDisponible, 'id' | 'instant'>> = {
  BREB: {
    label: 'Bre-B — transferencia con llave',
    description: 'Paga desde cualquier banco o billetera con la llave del vivero. Sin costo adicional.',
    order: 1,
  },
  NEQUI: {
    label: 'Nequi',
    description: 'Te llega una notificación a la app y la apruebas. Confirmación inmediata.',
    order: 2,
  },
  PSE: {
    label: 'PSE — débito bancario',
    description: 'Pagas desde la web de tu banco. Confirmación en minutos.',
    order: 3,
  },
  COD: {
    label: 'Contra entrega',
    description: 'Pagas en efectivo cuando recibas el pedido.',
    order: 4,
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
  const proveedor = paymentProvider();
  const ids: PaymentMethodId[] = [...proveedor.methods];

  // El contra entrega no lo ofrece la pasarela sino la transportadora, así que
  // se agrega aparte y solo si hay cobertura de recaudo confirmada.
  if (codDisponible && !ids.includes('COD')) ids.push('COD');

  return ids
    .map((id) => ({
      id,
      ...CATALOGO[id],
      instant: id === 'COD' ? true : !proveedor.requiresManualVerification,
    }))
    .sort((a, b) => a.order - b.order);
}

export type { PaymentProvider, PaymentContext } from './provider';
export * from './types';
