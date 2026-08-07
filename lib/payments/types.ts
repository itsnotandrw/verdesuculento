import type { PaymentMethodId, PaymentStatus } from '@/lib/orders/types';

export type { PaymentMethodId, PaymentStatus };

/**
 * Cómo el cliente termina de pagar. Cada variante corresponde a una pantalla
 * distinta del checkout; el componente elige por `kind` y no necesita saber
 * qué proveedor la generó.
 */
export type PaymentInstructions =
  | {
      kind: 'manual_transfer';
      /** Llave Bre-B a la que se transfiere. */
      brebKey: string;
      keyType: string;
      holder: string;
      bank: string;
      /** Alternativa para quien todavía no tenga Bre-B activo en su banco. */
      nequi?: string;
      /** Lo que el cliente escribe en la descripción de la transferencia. */
      reference: string;
      amount: number;
      deadline: string;
    }
  | { kind: 'redirect'; url: string }
  | { kind: 'push'; phone: string; message: string }
  | {
      kind: 'widget';
      publicKey: string;
      /** Firma de integridad SHA-256. Sin ella Wompi rechaza la transacción. */
      signature: string;
      reference: string;
      amountInCents: number;
      currency: string;
      redirectUrl: string;
    }
  | { kind: 'cod'; amount: number; note: string };

export interface PaymentIntent {
  /** Id en la pasarela. En el flujo manual es la propia referencia. */
  id: string;
  provider: string;
  method: PaymentMethodId;
  reference: string;
  amount: number;
  status: PaymentStatus;
  expiresAt: string;
  instructions: PaymentInstructions;
}

export interface PaymentWebhookEvent {
  /** Clave de idempotencia: el mismo evento puede llegar varias veces. */
  eventId: string;
  /** Referencia del intento de pago, que es como encontramos el pedido. */
  reference: string;
  intentId: string;
  status: PaymentStatus;
  amount: number;
  occurredAt: string;
}

export class PaymentNotConfiguredError extends Error {
  constructor(proveedor: string, falta: string) {
    super(
      `El proveedor de pagos "${proveedor}" no está configurado: falta ${falta}. ` +
        `Revisa .env.local (ver .env.example).`
    );
    this.name = 'PaymentNotConfiguredError';
  }
}

export class PaymentMethodNotSupportedError extends Error {
  constructor(proveedor: string, method: string) {
    super(`El proveedor de pagos "${proveedor}" no soporta el método "${method}".`);
    this.name = 'PaymentMethodNotSupportedError';
  }
}
