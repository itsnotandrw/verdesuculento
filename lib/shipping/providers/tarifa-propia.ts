/**
 * Proveedor de envíos por tarifa propia. **Activo hoy.**
 *
 * No llama a ninguna API: calcula la tarifa con la zonificación y el peso
 * volumétrico reales del paquete, y la guía se genera cuando el operador la
 * despacha por el canal que ya usa. Es el equivalente en envíos del pago
 * manual: honesto sobre lo que hace, y con la misma interfaz que tendrá el
 * agregador para que el cambio sea de una variable de entorno.
 *
 * Lo que este proveedor NO puede hacer, y por eso el agregador es el siguiente
 * paso: número de guía real, tracking automático y recaudo contra entrega.
 */

import { env } from '@/lib/env';
import { roundToHundred } from '@/lib/money';
import { nuevaGuiaLocal } from '@/lib/ids';
import type { ShippingProvider } from '../provider';
import type {
  CodCoverage,
  CreateShipmentInput,
  CreatedShipment,
  QuoteRequest,
  ShippingAddress,
  ShippingQuote,
  ShippingWebhookEvent,
  TrackingEvent,
} from '../types';
import { pesoFacturableKg, zonaDe } from '../zonas';

const ID = 'tarifa-propia';

function etaLabel(min: number, max: number): string {
  return min === max ? `${min} día hábil` : `${min} — ${max} días hábiles`;
}

function cotizar(request: QuoteRequest): ShippingQuote[] {
  const zona = zonaDe(request.destination.departamento);
  const { weightGrams, lengthCm, widthCm, heightCm } = request.parcel;
  const kg = pesoFacturableKg(weightGrams, lengthCm, widthCm, heightCm);

  // Se cobra por kilo o fracción: 2,2 kg paga como 3 kg, igual que las
  // transportadoras.
  const kilosAdicionales = Math.max(0, Math.ceil(kg) - zona.kilosIncluidos);
  const listCost = roundToHundred(zona.base + kilosAdicionales * zona.porKiloAdicional);

  const envioGratis =
    env.shipping.freeShippingFrom > 0 &&
    request.merchandiseValue >= env.shipping.freeShippingFrom;

  const estandar: ShippingQuote = {
    id: `${ID}:propio:estandar`,
    provider: ID,
    carrier: 'Red de transportadoras',
    carrierCode: 'propio',
    service: 'Estándar',
    serviceCode: 'estandar',
    listCost,
    cost: envioGratis ? 0 : listCost,
    currency: 'COP',
    etaMinDays: zona.etaMin,
    etaMaxDays: zona.etaMax,
    etaLabel: etaLabel(zona.etaMin, zona.etaMax),
    cashOnDeliveryAvailable: env.shipping.codEnabled && zona.contraEntrega,
    cashOnDeliveryFee: 0,
    note: zona.aviso,
  };

  // El express solo se ofrece donde de verdad recorta días. En zona 4 el
  // cuello de botella es la ruta, no el servicio: cobrarlo sería vender humo.
  if (zona.id === 'z4') return [estandar];

  const expressListCost = roundToHundred(listCost * 1.6);
  const expressMin = Math.max(1, zona.etaMin - 1);
  const expressMax = Math.max(expressMin, zona.etaMax - 2);

  const express: ShippingQuote = {
    ...estandar,
    id: `${ID}:propio:express`,
    service: 'Express',
    serviceCode: 'express',
    listCost: expressListCost,
    // El envío gratis cubre el estándar; el express cobra la diferencia.
    cost: envioGratis ? roundToHundred(expressListCost - listCost) : expressListCost,
    etaMinDays: expressMin,
    etaMaxDays: expressMax,
    etaLabel: etaLabel(expressMin, expressMax),
    note: 'Menos tiempo en tránsito: la mejor opción para plantas en clima cálido.',
  };

  return [estandar, express];
}

export const tarifaPropiaProvider: ShippingProvider = {
  id: ID,
  label: 'Tarifa propia',

  isConfigured() {
    return true;
  },

  async quote(request) {
    return cotizar(request);
  },

  async codCoverage(destination: ShippingAddress, amount: number): Promise<CodCoverage> {
    const zona = zonaDe(destination.departamento);
    const disponible = env.shipping.codEnabled && zona.contraEntrega;

    return {
      available: disponible,
      // 4% es el orden de magnitud que cobran los agregadores por recaudar.
      // El número real lo fija el contrato; se ajusta al conectar el agregador.
      fee: disponible ? roundToHundred(amount * 0.04) : 0,
      settlementDays: 8,
      reason: disponible
        ? undefined
        : env.shipping.codEnabled
          ? `Sin cobertura de recaudo en ${zona.nombre}.`
          : 'El contra entrega se habilita al conectar el agregador de envíos.',
    };
  },

  async createShipment({ order, quote, cashOnDelivery }: CreateShipmentInput): Promise<CreatedShipment> {
    // Sin agregador no hay guía real: se emite un número interno para que el
    // pedido tenga identidad rastreable y el operador lo cruce con la guía que
    // genere en el portal de la transportadora. El día que entre el agregador,
    // este número lo reemplaza el de la transportadora sin cambiar el modelo.
    return {
      provider: ID,
      carrier: quote.carrier,
      service: quote.service,
      trackingNumber: nuevaGuiaLocal(),
      cost: quote.cost,
      codAmount: cashOnDelivery,
      status: 'created',
      externalId: order.reference,
    };
  },

  async track(): Promise<TrackingEvent[]> {
    // El histórico vive en nuestra propia base: lo alimenta el operador desde
    // el panel. No hay API externa a la que preguntarle.
    return [];
  },

  parseWebhook(): ShippingWebhookEvent | null {
    return null;
  },
};
