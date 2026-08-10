/**
 * Adaptador de Mipaquete.com (agregador multi-transportadora).
 *
 * ⚠️ ESCRITO CONTRA LA DOCUMENTACIÓN PÚBLICA, SIN PROBAR EN SANDBOX.
 * La estructura, el manejo de errores, el mapeo de estados y la integración con
 * el orquestador están terminados. Lo que falta verificar en la Fase 0 del
 * roadmap —y está marcado con `VERIFICAR` a lo largo del archivo— son los
 * nombres exactos de los campos de request/response, que es donde estos
 * agregadores suelen diferir de sus propios docs:
 *
 *   1. Header de autenticación (`session-tracker`) y cómo se obtiene la API key.
 *   2. Nombres de campos en `POST /price` y en la respuesta de tarifas.
 *   3. Códigos de estado del tracking y su texto exacto.
 *   4. Firma/secreto del webhook de novedades.
 *
 * Hasta entonces el proveedor activo es `tarifa-propia`. Cambiar de uno a otro
 * es cambiar `SHIPPING_PROVIDER` en `.env.local`.
 *
 * Docs: api.documentacion.mipaquete.com
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
import { codigoDane, pesoFacturableKg, zonaDe } from '../zonas';

const ID = 'mipaquete';

/** VERIFICAR: catálogo real en `GET /deliveryCompanies`. */
const TRANSPORTADORAS: Record<string, string> = {
  '1': 'Servientrega',
  '2': 'Coordinadora',
  '3': 'Inter Rapidísimo',
  '4': 'Envía',
  '5': 'TCC',
};

/** VERIFICAR: los códigos que manda el webhook de novedades. */
const ESTADOS: Record<string, ShipmentStatus> = {
  generado: 'created',
  admitido: 'picked_up',
  recogido: 'picked_up',
  'en transito': 'in_transit',
  'en tránsito': 'in_transit',
  'en reparto': 'out_for_delivery',
  'en distribucion': 'out_for_delivery',
  entregado: 'delivered',
  novedad: 'incident',
  devuelto: 'returned',
  devolucion: 'returned',
};

function mapearEstado(texto: string): ShipmentStatus {
  const clave = texto.trim().toLowerCase();
  return ESTADOS[clave] ?? 'in_transit';
}

function credenciales(): { apiKey: string; baseUrl: string } {
  const { apiKey, baseUrl } = env.shipping.mipaquete;
  if (!apiKey) throw new ShippingNotConfiguredError(ID, 'MIPAQUETE_API_KEY');
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, '') };
}

async function llamar<T>(
  ruta: string,
  opciones: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { apiKey, baseUrl } = credenciales();

  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: opciones.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      // VERIFICAR: Mipaquete autentica con este header, no con Bearer.
      'session-tracker': apiKey,
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    // Las tarifas cambian poco; el caché evita castigar el checkout con una
    // llamada por render. Las mutaciones nunca se cachean.
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`[mipaquete] ${opciones.method ?? 'GET'} ${ruta} → ${respuesta.status} ${detalle.slice(0, 300)}`);
  }

  return (await respuesta.json()) as T;
}

interface TarifaMipaquete {
  deliveryCompanyId: string | number;
  deliveryCompany?: string;
  shippingCost?: number;
  totalPrice?: number;
  deliveryTime?: string | number;
  collectionServiceCost?: number;
}

export const mipaqueteProvider: ShippingProvider = {
  id: ID,
  label: 'Mipaquete',

  isConfigured() {
    return Boolean(env.shipping.mipaquete.apiKey);
  },

  async quote(request: QuoteRequest): Promise<ShippingQuote[]> {
    const origen = codigoDane(env.shipping.origin.ciudad);
    const destino = request.destination.cityCode ?? codigoDane(request.destination.ciudad);

    if (!origen || !destino) {
      // Sin código DANE no hay cotización posible. Es la falla #1 al integrar
      // agregadores: hay que cachear su catálogo de ciudades y mapear el
      // autocomplete del checkout contra él.
      throw new Error(
        `[mipaquete] falta el código DANE de ${!origen ? 'la bodega' : request.destination.ciudad}. ` +
          `Cachea el catálogo de GET /cities y mapea el autocompletado del checkout.`
      );
    }

    const { weightGrams, lengthCm, widthCm, heightCm } = request.parcel;

    // VERIFICAR: nombres de campos de POST /price.
    const tarifas = await llamar<TarifaMipaquete[]>('/price', {
      method: 'POST',
      body: {
        cityOrigin: origen,
        cityDestiny: destino,
        weight: Math.max(1, Math.round(pesoFacturableKg(weightGrams, lengthCm, widthCm, heightCm))),
        height: heightCm,
        width: widthCm,
        length: lengthCm,
        quantity: 1,
        declaredValue: request.parcel.declaredValue,
        // El recaudo cambia la tarifa, así que se cotiza distinto de entrada.
        collectionService: Boolean(request.cashOnDelivery),
      },
    });

    const envioGratis =
      env.shipping.freeShippingFrom > 0 &&
      request.merchandiseValue >= env.shipping.freeShippingFrom;

    return tarifas
      .map((tarifa): ShippingQuote => {
        const codigo = String(tarifa.deliveryCompanyId);
        const nombre = tarifa.deliveryCompany ?? TRANSPORTADORAS[codigo] ?? 'Transportadora';
        const listCost = roundToHundred(tarifa.totalPrice ?? tarifa.shippingCost ?? 0);
        const dias = Number(tarifa.deliveryTime) || zonaDe(request.destination.departamento).etaMax;

        return {
          id: `${ID}:${codigo}:estandar`,
          provider: ID,
          carrier: nombre,
          carrierCode: codigo,
          service: 'Estándar',
          serviceCode: 'estandar',
          listCost,
          cost: envioGratis ? 0 : listCost,
          currency: 'COP',
          etaMinDays: Math.max(1, dias - 1),
          etaMaxDays: dias,
          etaLabel: `${Math.max(1, dias - 1)} — ${dias} días hábiles`,
          cashOnDeliveryAvailable: env.shipping.codEnabled,
          cashOnDeliveryFee: roundToHundred(tarifa.collectionServiceCost ?? 0),
        };
      })
      // La más barata primero: es la que el cliente elegirá casi siempre.
      .sort((a, b) => a.cost - b.cost);
  },

  async codCoverage(destination: ShippingAddress, amount: number): Promise<CodCoverage> {
    if (!env.shipping.codEnabled) {
      return { available: false, fee: 0, settlementDays: 0, reason: 'Contra entrega deshabilitado.' };
    }

    const destino = destination.cityCode ?? codigoDane(destination.ciudad);
    if (!destino) {
      return { available: false, fee: 0, settlementDays: 0, reason: 'Municipio sin código DANE.' };
    }

    // VERIFICAR: endpoint y forma de la respuesta de cobertura de recaudo.
    const cobertura = await llamar<{ collectionService?: boolean; cost?: number }>(
      `/coverage?cityCode=${destino}`
    );

    return {
      available: Boolean(cobertura.collectionService),
      fee: roundToHundred(cobertura.cost ?? amount * 0.04),
      settlementDays: 8,
      reason: cobertura.collectionService ? undefined : `Sin recaudo en ${destination.ciudad}.`,
    };
  },

  async createShipment({ order, quote, cashOnDelivery }: CreateShipmentInput): Promise<CreatedShipment> {
    const origen = codigoDane(env.shipping.origin.ciudad)!;
    const destino = order.address.codigoPostal ?? codigoDane(order.address.ciudad);

    // VERIFICAR: nombres de campos de POST /sendings.
    const guia = await llamar<{ mpCode?: string; trackingNumber?: string; labelUrl?: string; id?: string }>(
      '/sendings',
      {
        method: 'POST',
        body: {
          deliveryCompanyId: quote.carrierCode,
          cityOrigin: origen,
          cityDestiny: destino,
          nameSender: 'Vivero Verde Suculento',
          addressSender: env.shipping.origin.direccion,
          nameReceiver: `${order.customer.nombre} ${order.customer.apellido}`,
          cellPhoneReceiver: order.customer.telefono,
          addressReceiver: [order.address.direccion, order.address.barrio].filter(Boolean).join(', '),
          emailReceiver: order.customer.email,
          declaredValue: order.subtotal,
          weight: order.lines.reduce((s, l) => s + (l.weightGrams * l.qty) / 1000, 0),
          observations: `Pedido ${order.reference}. PLANTAS VIVAS — no exponer al sol, manipular con cuidado.`,
          // El recaudo es lo que convierte al contra entrega en dinero asegurado.
          collectionService: Boolean(cashOnDelivery),
          collectionServiceValue: cashOnDelivery ?? 0,
        },
      }
    );

    const numero = guia.mpCode ?? guia.trackingNumber;
    if (!numero) throw new Error('[mipaquete] la respuesta no trajo número de guía.');

    return {
      provider: ID,
      carrier: quote.carrier,
      service: quote.service,
      trackingNumber: numero,
      labelUrl: guia.labelUrl,
      cost: quote.cost,
      codAmount: cashOnDelivery,
      status: 'created',
      externalId: guia.id ?? numero,
    };
  },

  async track(trackingNumber: string): Promise<TrackingEvent[]> {
    // VERIFICAR: ruta y forma del histórico de estados.
    const eventos = await llamar<Array<{ status?: string; date?: string; observation?: string; city?: string }>>(
      `/sendings/tracking?mpCode=${encodeURIComponent(trackingNumber)}`
    );

    return eventos.map((evento) => ({
      status: mapearEstado(evento.status ?? ''),
      description: evento.observation ?? evento.status ?? 'Actualización de la transportadora',
      occurredAt: evento.date ?? new Date().toISOString(),
      location: evento.city,
    }));
  },

  parseWebhook(payload, headers, _rawBody): ShippingWebhookEvent | null {
    const secreto = env.shipping.mipaquete.webhookSecret;

    // Sin secreto configurado el webhook se descarta. Un endpoint que actualiza
    // el estado de pedidos no puede aceptar cuerpos anónimos de internet.
    if (!secreto) {
      console.error('[mipaquete] webhook recibido sin SHIPPING_WEBHOOK_SECRET configurado. Descartado.');
      return null;
    }

    // VERIFICAR: el header y el esquema de firma que usa Mipaquete.
    const firma = headers['x-mipaquete-signature'] ?? headers['x-signature'] ?? '';
    if (firma !== secreto) {
      console.error('[mipaquete] firma de webhook inválida. Descartado.');
      return null;
    }

    const cuerpo = payload as {
      id?: string;
      eventId?: string;
      mpCode?: string;
      status?: string;
      date?: string;
      observation?: string;
      city?: string;
    };

    if (!cuerpo.mpCode || !cuerpo.status) return null;

    return {
      eventId: cuerpo.eventId ?? cuerpo.id ?? `${cuerpo.mpCode}:${cuerpo.status}:${cuerpo.date}`,
      trackingNumber: cuerpo.mpCode,
      status: mapearEstado(cuerpo.status),
      description: cuerpo.observation ?? cuerpo.status,
      occurredAt: cuerpo.date ?? new Date().toISOString(),
      location: cuerpo.city,
    };
  },
};
