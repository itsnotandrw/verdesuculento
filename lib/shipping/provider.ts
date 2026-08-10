import type {
  CodCoverage,
  CreateShipmentInput,
  CreatedShipment,
  QuoteRequest,
  ShippingAddress,
  ShippingQuote,
  ShippingWebhookEvent,
  TrackingEvent,
} from './types';

/**
 * Contrato que cumple toda transportadora o agregador.
 *
 * La idea del patrón adaptador aquí es que cambiar de Mipaquete a Envía.com
 * —o negociar directo con Servientrega el día que el volumen lo justifique—
 * sea cambiar una variable de entorno, no reescribir el checkout. Todo lo que
 * el resto del sistema conoce son estos siete métodos.
 */
export interface ShippingProvider {
  readonly id: string;
  readonly label: string;

  /** ¿Tiene credenciales suficientes para operar? */
  isConfigured(): boolean;

  /** Opciones de envío para un destino. Puede devolver varias (estándar/express). */
  quote(request: QuoteRequest): Promise<ShippingQuote[]>;

  /** ¿Hay recaudo contra entrega en este destino? Se consulta ANTES de ofrecerlo. */
  codCoverage(destination: ShippingAddress, amount: number): Promise<CodCoverage>;

  /** Genera la guía. Solo se llama con el dinero asegurado. */
  createShipment(input: CreateShipmentInput): Promise<CreatedShipment>;

  /** Historial de estados de una guía. */
  track(trackingNumber: string): Promise<TrackingEvent[]>;

  /**
   * Valida la firma del webhook y lo traduce al modelo interno.
   * Devuelve `null` si la firma no cuadra o si el evento no interesa: quien
   * llama debe tratar el `null` como "descartar", nunca como "aceptar".
   */
  parseWebhook(
    payload: unknown,
    headers: Record<string, string>,
    rawBody: string
  ): ShippingWebhookEvent | null;
}
