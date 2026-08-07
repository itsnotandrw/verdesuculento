/**
 * Adaptador de Envia.com (agregador multi-transportadora, multi-país).
 *
 * ⚠️ ESCRITO CONTRA LA DOCUMENTACIÓN PÚBLICA, SIN PROBAR EN SANDBOX. Mismo
 * criterio que `mipaquete.ts`: la estructura está terminada, los nombres de
 * campos se confirman en la Fase 0. Se mantiene como segundo candidato porque
 * la decisión entre ambos debe salir de comparar tarifas reales en 3-5 rutas,
 * no de leer sus páginas de marketing.
 *
 * Autentica con Bearer token y separa sandbox (`api-test.envia.com`) de
 * producción (`api.envia.com`) por URL base, no por llave.
 *
 * Docs: envia.com/es-CO/desarrolladores
 */

import { env } from '@/lib/env';
import { roundToHundred } from '@/lib/money';
import type { ShippingProvider } from '../provider';
import {
  ShippingNotConfiguredError,
  type CodCoverage,
  type CreateShipmentInput,
  type CreatedShipment,
  type QuoteRequest,
  type ShipmentStatus,
  type ShippingAddress,
  type ShippingQuote,
  type ShippingWebhookEvent,
  type TrackingEvent,
} from '../types';
import { pesoFacturableKg, zonaDe } from '../zonas';

const ID = 'envia';

/** VERIFICAR: catálogo de estados de `GET /ship/generalTracking`. */
const ESTADOS: Record<string, ShipmentStatus> = {
  created: 'created',
  label_created: 'created',
  picked_up: 'picked_up',
  in_transit: 'in_transit',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  exception: 'incident',
  returned: 'returned',
};

function credenciales(): { token: string; baseUrl: string } {
  const { token, baseUrl } = env.shipping.envia;
  if (!token) throw new ShippingNotConfiguredError(ID, 'ENVIA_TOKEN');
  return { token, baseUrl: baseUrl.replace(/\/$/, '') };
}

async function llamar<T>(ruta: string, body?: unknown): Promise<T> {
  const { token, baseUrl } = credenciales();

  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`[envia] ${ruta} → ${respuesta.status} ${detalle.slice(0, 300)}`);
  }

  const json = (await respuesta.json()) as { meta?: string; data?: T; error?: unknown };
  if (json.error) throw new Error(`[envia] ${ruta} → ${JSON.stringify(json.error).slice(0, 300)}`);
  return (json.data ?? json) as T;
}

/** Envia.com describe origen y destino con el mismo objeto. */
function ubicacion(direccion: ShippingAddress, nombre: string, contacto?: { telefono: string; email: string }) {
  return {
    name: nombre,
    company: 'Vivero Verde Suculento',
    email: contacto?.email ?? '',
    phone: contacto?.telefono ?? '',
    street: direccion.direccion ?? '',
    number: direccion.barrio ?? 'S/N',
    district: direccion.barrio ?? '',
    city: direccion.ciudad,
    state: direccion.departamento,
    country: 'CO',
    postalCode: direccion.codigoPostal ?? '',
  };
}

function paquete(request: QuoteRequest) {
  const { weightGrams, lengthCm, widthCm, heightCm, declaredValue } = request.parcel;
  return [
    {
      content: 'Plantas vivas',
      amount: 1,
      type: 'box',
      dimensions: { length: lengthCm, width: widthCm, height: heightCm },
      weight: Math.max(1, pesoFacturableKg(weightGrams, lengthCm, widthCm, heightCm)),
      insurance: 0,
      declaredValue,
      weightUnit: 'KG',
      lengthUnit: 'CM',
    },
  ];
}

interface TarifaEnvia {
  carrier?: string;
  service?: string;
  serviceDescription?: string;
  totalPrice?: number;
  basePrice?: number;
  deliveryEstimate?: string;
  deliveryDate?: { date_from?: number; date_to?: number };
}

export const enviaProvider: ShippingProvider = {
  id: ID,
  label: 'Envia.com',

  isConfigured() {
    return Boolean(env.shipping.envia.token);
  },

  async quote(request: QuoteRequest): Promise<ShippingQuote[]> {
    const tarifas = await llamar<TarifaEnvia[]>('/ship/rate/', {
      origin: ubicacion(env.shipping.origin, 'Vivero Verde Suculento'),
      destination: ubicacion(request.destination, 'Cliente'),
      packages: paquete(request),
      shipment: { carrier: '', type: 1 },
      settings: { currency: 'COP' },
    });

    const envioGratis =
      env.shipping.freeShippingFrom > 0 &&
      request.merchandiseValue >= env.shipping.freeShippingFrom;
    const zona = zonaDe(request.destination.departamento);

    return tarifas
      .map((tarifa): ShippingQuote => {
        const carrier = tarifa.carrier ?? 'transportadora';
        const servicio = tarifa.service ?? 'estandar';
        const listCost = roundToHundred(tarifa.totalPrice ?? tarifa.basePrice ?? 0);
        const min = tarifa.deliveryDate?.date_from ?? zona.etaMin;
        const max = tarifa.deliveryDate?.date_to ?? zona.etaMax;

        return {
          id: `${ID}:${carrier}:${servicio}`,
          provider: ID,
          carrier: carrier.charAt(0).toUpperCase() + carrier.slice(1),
          carrierCode: carrier,
          service: tarifa.serviceDescription ?? servicio,
          serviceCode: servicio,
          listCost,
          cost: envioGratis ? 0 : listCost,
          currency: 'COP',
          etaMinDays: min,
          etaMaxDays: max,
          etaLabel: min === max ? `${min} días hábiles` : `${min} — ${max} días hábiles`,
          // VERIFICAR: Envia.com maneja el recaudo por servicio, no global.
          cashOnDeliveryAvailable: false,
          cashOnDeliveryFee: 0,
        };
      })
      .sort((a, b) => a.cost - b.cost);
  },

  async codCoverage(destination: ShippingAddress): Promise<CodCoverage> {
    // VERIFICAR: en Envia.com el recaudo depende de la transportadora elegida.
    // Hasta confirmarlo en sandbox se responde "no disponible", que es el
    // default seguro: ofrecer contra entrega sin cobertura real significa
    // producto en la calle y dinero que no existe.
    return {
      available: false,
      fee: 0,
      settlementDays: 0,
      reason: `Cobertura de recaudo pendiente de verificar para ${destination.ciudad}.`,
    };
  },

  async createShipment({ order, quote }: CreateShipmentInput): Promise<CreatedShipment> {
    const guia = await llamar<{
      trackingNumber?: string;
      label?: string;
      shipmentId?: string;
    }>('/ship/generate/', {
      origin: ubicacion(env.shipping.origin, 'Vivero Verde Suculento'),
      destination: ubicacion(
        { departamento: order.address.departamento, ciudad: order.address.ciudad, direccion: order.address.direccion, barrio: order.address.barrio, codigoPostal: order.address.codigoPostal },
        `${order.customer.nombre} ${order.customer.apellido}`,
        { telefono: order.customer.telefono, email: order.customer.email }
      ),
      packages: [
        {
          content: 'Plantas vivas',
          amount: 1,
          type: 'box',
          dimensions: { length: 30, width: 20, height: 20 },
          weight: Math.max(1, order.lines.reduce((s, l) => s + (l.weightGrams * l.qty) / 1000, 0)),
          insurance: 0,
          declaredValue: order.subtotal,
          weightUnit: 'KG',
          lengthUnit: 'CM',
        },
      ],
      shipment: { carrier: quote.carrierCode, service: quote.serviceCode, type: 1 },
      settings: { printFormat: 'PDF', printSize: 'STOCK_4X6', comments: `Pedido ${order.reference}. PLANTAS VIVAS.` },
    });

    if (!guia.trackingNumber) throw new Error('[envia] la respuesta no trajo número de guía.');

    return {
      provider: ID,
      carrier: quote.carrier,
      service: quote.service,
      trackingNumber: guia.trackingNumber,
      labelUrl: guia.label,
      cost: quote.cost,
      status: 'created',
      externalId: guia.shipmentId ?? guia.trackingNumber,
    };
  },

  async track(trackingNumber: string): Promise<TrackingEvent[]> {
    const eventos = await llamar<Array<{ status?: string; date?: string; description?: string; location?: string }>>(
      `/ship/generalTracking/${encodeURIComponent(trackingNumber)}`
    );

    return eventos.map((evento) => ({
      status: ESTADOS[(evento.status ?? '').toLowerCase()] ?? 'in_transit',
      description: evento.description ?? evento.status ?? 'Actualización de la transportadora',
      occurredAt: evento.date ?? new Date().toISOString(),
      location: evento.location,
    }));
  },

  parseWebhook(payload, headers): ShippingWebhookEvent | null {
    const secreto = env.shipping.envia.webhookSecret;
    if (!secreto) {
      console.error('[envia] webhook recibido sin SHIPPING_WEBHOOK_SECRET configurado. Descartado.');
      return null;
    }

    // VERIFICAR: header y esquema de firma.
    if ((headers['x-envia-signature'] ?? headers['x-signature'] ?? '') !== secreto) {
      console.error('[envia] firma de webhook inválida. Descartado.');
      return null;
    }

    const cuerpo = payload as {
      id?: string;
      trackingNumber?: string;
      status?: string;
      date?: string;
      description?: string;
      location?: string;
    };

    if (!cuerpo.trackingNumber || !cuerpo.status) return null;

    return {
      eventId: cuerpo.id ?? `${cuerpo.trackingNumber}:${cuerpo.status}:${cuerpo.date}`,
      trackingNumber: cuerpo.trackingNumber,
      status: ESTADOS[cuerpo.status.toLowerCase()] ?? 'in_transit',
      description: cuerpo.description ?? cuerpo.status,
      occurredAt: cuerpo.date ?? new Date().toISOString(),
      location: cuerpo.location,
    };
  },
};
