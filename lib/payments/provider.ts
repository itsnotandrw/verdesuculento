import type { Order, PaymentMethodId, PaymentStatus } from '@/lib/orders/types';
import type { PaymentIntent, PaymentWebhookEvent } from './types';

/**
 * Datos que solo algunos métodos necesitan y que no caben en el pedido.
 *
 * PSE es el caso claro: exige banco y documento del pagador, que no son parte
 * de la dirección de envío. Se pasan aparte para no ensuciar el modelo de
 * pedido con campos que casi ningún método usa.
 */
export interface PaymentContext {
  /** Código de la institución financiera para PSE. */
  pseBankCode?: string;
  legalIdType?: 'CC' | 'CE' | 'NIT' | 'PP';
  legalId?: string;
  userType?: 'person' | 'company';
  /** Celular al que llega el push de Nequi, si difiere del de contacto. */
  nequiPhone?: string;
}

/**
 * Contrato que cumple toda pasarela de pago.
 *
 * El contra entrega no pasa por aquí: el dinero lo asegura el recaudo de la
 * transportadora, así que vive en el módulo de envíos.
 */
export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  readonly methods: PaymentMethodId[];

  /**
   * `true` cuando el pago no puede confirmarse solo y hace falta que un humano
   * verifique el abono contra el extracto.
   *
   * El orquestador consulta esta bandera para decidir si un pago "declarado"
   * pasa a `in_review` (espera al humano) o si puede confiarse en el webhook.
   * Es la diferencia de arquitectura entre el flujo de hoy y el de mañana.
   */
  readonly requiresManualVerification: boolean;

  isConfigured(): boolean;

  /** Crea el intento y devuelve lo que el cliente necesita para pagar. */
  createIntent(order: Order, method: PaymentMethodId, context?: PaymentContext): Promise<PaymentIntent>;

  /**
   * Consulta el estado real en la pasarela. Es el respaldo obligatorio del
   * webhook: PSE puede tardar minutos y ningún método da resultado síncrono.
   */
  getStatus(intentId: string): Promise<PaymentStatus>;

  /**
   * Valida la firma del webhook y lo traduce al modelo interno.
   * `null` significa "descartar": firma inválida o evento que no interesa.
   * Nunca debe interpretarse como aprobación.
   */
  parseWebhook(
    payload: unknown,
    headers: Record<string, string>,
    rawBody: string
  ): PaymentWebhookEvent | null;
}
