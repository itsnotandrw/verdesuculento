import type { Order, ShipmentStatus, TrackingEvent } from '@/lib/orders/types';

export interface ShippingAddress {
  departamento: string;
  ciudad: string;
  direccion?: string;
  barrio?: string;
  codigoPostal?: string;
  /**
   * Código DANE del municipio. Es la fuente #1 de errores al integrar
   * agregadores: cada uno tiene su propio catálogo de ciudades y no aceptan
   * texto libre. Se resuelve con `lib/shipping/ciudades.ts`.
   */
  cityCode?: string;
}

export interface ShippingParcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
}

export interface QuoteRequest {
  destination: ShippingAddress;
  parcel: ShippingParcel;
  /** Subtotal de la mercancía: define si aplica el envío gratis. */
  merchandiseValue: number;
  /** Si el cliente quiere pagar al recibir, la tarifa cambia. */
  cashOnDelivery?: boolean;
}

export interface ShippingQuote {
  /**
   * Determinista: `proveedor:transportadora:servicio`. El checkout devuelve
   * este id al crear el pedido y el servidor **re-cotiza** para obtener el
   * precio; nunca confía en el monto que venga del navegador.
   */
  id: string;
  provider: string;
  carrier: string;
  carrierCode: string;
  service: string;
  serviceCode: string;
  cost: number;
  /** Costo antes del descuento por envío gratis, para poder mostrar el tachado. */
  listCost: number;
  currency: 'COP';
  etaMinDays: number;
  etaMaxDays: number;
  etaLabel: string;
  cashOnDeliveryAvailable: boolean;
  cashOnDeliveryFee: number;
  /** Aviso para el cliente (zona especial, ruta lenta, etc.). */
  note?: string;
}

export interface CodCoverage {
  available: boolean;
  /** Comisión del recaudo, en pesos, ya calculada sobre el total. */
  fee: number;
  /** Días hábiles que tarda el giro del dinero recaudado. */
  settlementDays: number;
  reason?: string;
}

export interface CreateShipmentInput {
  order: Order;
  quote: ShippingQuote;
  /** Monto a recaudar al entregar. Solo en contra entrega. */
  cashOnDelivery?: number;
}

export interface CreatedShipment {
  provider: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  labelUrl?: string;
  /** Lo que se le cotizó al cliente — nunca cambia por lo que cobre la transportadora después. */
  cost: number;
  codAmount?: number;
  status: ShipmentStatus;
  externalId?: string;
  /**
   * Lo que la transportadora facturó de verdad al generar la guía, si el
   * proveedor lo informa (Envia lo trae en `/ship/generate/`). No hay
   * reserva de tarifa entre cotizar y generar —confirmado en su propia
   * documentación—, así que el precio pudo moverse en el tiempo que pasó
   * entre que el cliente vio el total y que se aprobó el pago. Sirve para
   * detectar esa diferencia, no para cobrarle otra cosa al cliente.
   */
  actualCost?: number;
  /** Saldo restante en la cuenta del proveedor tras esta guía, si lo informa. */
  providerBalance?: number;
}

export interface ShippingWebhookEvent {
  /** Id del evento en el proveedor: la clave de idempotencia. */
  eventId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  description: string;
  occurredAt: string;
  location?: string;
}

export type { TrackingEvent, ShipmentStatus };

/** El proveedor existe pero le faltan credenciales. */
export class ShippingNotConfiguredError extends Error {
  constructor(proveedor: string, falta: string) {
    super(
      `El proveedor de envíos "${proveedor}" no está configurado: falta ${falta}. ` +
        `Revisa .env.local (ver .env.example).`
    );
    this.name = 'ShippingNotConfiguredError';
  }
}

/** El destino no tiene cobertura de recaudo contra entrega. */
export class CodNotAvailableError extends Error {
  constructor(destino: string) {
    super(`No hay cobertura de contra entrega para ${destino}.`);
    this.name = 'CodNotAvailableError';
  }
}

/**
 * No se pudo identificar el municipio de destino.
 *
 * Es un error del cliente, no del sistema: escribió mal la ciudad o eligió un
 * departamento que no le corresponde. Tiene su propia clase para que el
 * checkout muestre "no encontramos ese municipio" en vez de "intenta de nuevo
 * en un momento", que lo dejaría reintentando lo mismo para siempre.
 */
export class DestinoNoResueltoError extends Error {
  constructor(ciudad: string, departamento: string) {
    super(
      `No encontramos el municipio "${ciudad}" en ${departamento}. ` +
        'Revisa que el nombre esté bien escrito y que corresponda al departamento.'
    );
    this.name = 'DestinoNoResueltoError';
  }
}
