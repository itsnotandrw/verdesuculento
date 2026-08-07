/**
 * Adaptador de Wompi (Bancolombia): tarjetas, PSE, Nequi y Bre-B en recaudo.
 *
 * Estado: **implementado, a la espera de credenciales.** A diferencia de los
 * adaptadores de envío, aquí la criptografía sí está escrita y es la de
 * verdad: firma de integridad y validación del checksum de los webhooks, con
 * comparación en tiempo constante. Eso es lo que no se puede improvisar el día
 * del lanzamiento.
 *
 * Para activarlo:
 *   1. Crear la cuenta en Wompi y pedir llaves de **test** desde el día 1
 *      (no exigen licencia activa para el sandbox).
 *   2. Llenar en `.env.local`: NEXT_PUBLIC_WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY,
 *      WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET.
 *   3. Configurar la URL de eventos en el dashboard apuntando a
 *      `https://<dominio>/api/webhooks/payments`.
 *   4. `PAYMENT_PROVIDER=wompi`.
 *
 * Reglas que este archivo respeta y que conviene no relajar:
 *   - La redirección del navegador NUNCA confirma un pago. Solo el webhook
 *     validado, o `getStatus()` consultado contra la API.
 *   - Los montos viajan en centavos. La conversión ocurre solo aquí.
 *   - La referencia es por intento de pago, no por pedido: Wompi rechaza
 *     referencias repetidas y eso rompería los reintentos.
 *
 * Docs: docs.wompi.co/docs/colombia
 */

import { createHash, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';
import { toCents } from '@/lib/money';
import type { Order, PaymentMethodId, PaymentStatus } from '@/lib/orders/types';
import type { PaymentContext, PaymentProvider } from '../provider';
import {
  PaymentMethodNotSupportedError,
  PaymentNotConfiguredError,
  type PaymentIntent,
  type PaymentWebhookEvent,
} from '../types';

const ID = 'wompi';

const ESTADOS: Record<string, PaymentStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  VOIDED: 'declined',
  ERROR: 'declined',
};

function config() {
  const { publicKey, privateKey, integritySecret, eventsSecret, baseUrl } = env.payments.wompi;
  if (!publicKey) throw new PaymentNotConfiguredError(ID, 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY');
  if (!privateKey) throw new PaymentNotConfiguredError(ID, 'WOMPI_PRIVATE_KEY');
  if (!integritySecret) throw new PaymentNotConfiguredError(ID, 'WOMPI_INTEGRITY_SECRET');
  return { publicKey, privateKey, integritySecret, eventsSecret, baseUrl: baseUrl.replace(/\/$/, '') };
}

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf-8').digest('hex');
}

/** Comparación en tiempo constante: evita filtrar la firma por temporización. */
function igualSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Firma de integridad, obligatoria al crear cualquier transacción:
 * SHA-256(reference + amount_in_cents + currency + [expiration] + secreto).
 */
export function firmaIntegridad(
  reference: string,
  amountInCents: number,
  currency = 'COP',
  expirationTime?: string
): string {
  const { integritySecret } = config();
  const cadena = expirationTime
    ? `${reference}${amountInCents}${currency}${expirationTime}${integritySecret}`
    : `${reference}${amountInCents}${currency}${integritySecret}`;
  return sha256(cadena);
}

async function llamar<T>(
  ruta: string,
  opciones: { method?: string; body?: unknown; auth?: 'private' | 'public' } = {}
): Promise<T> {
  const { baseUrl, privateKey, publicKey } = config();
  const llave = opciones.auth === 'public' ? publicKey : privateKey;

  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method: opciones.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llave}`,
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    cache: 'no-store',
  });

  const json = (await respuesta.json().catch(() => ({}))) as { data?: T; error?: unknown };

  if (!respuesta.ok) {
    throw new Error(
      `[wompi] ${opciones.method ?? 'GET'} ${ruta} → ${respuesta.status} ${JSON.stringify(json.error ?? json).slice(0, 400)}`
    );
  }

  return (json.data ?? json) as T;
}

/**
 * Token de aceptación de términos. Wompi lo exige en cada transacción y expira,
 * así que se pide en el momento y no se cachea.
 */
async function tokenAceptacion(): Promise<string> {
  const { publicKey } = config();
  const comercio = await llamar<{
    presigned_acceptance?: { acceptance_token?: string };
  }>(`/merchants/${publicKey}`, { auth: 'public' });

  const token = comercio.presigned_acceptance?.acceptance_token;
  if (!token) throw new Error('[wompi] el comercio no devolvió acceptance_token.');
  return token;
}

/** Bancos disponibles para PSE. Alimenta el selector del checkout. */
export async function institucionesPse(): Promise<Array<{ code: string; name: string }>> {
  const bancos = await llamar<Array<{ financial_institution_code: string; financial_institution_name: string }>>(
    '/pse/financial_institutions',
    { auth: 'public' }
  );
  return bancos.map((b) => ({
    code: b.financial_institution_code,
    name: b.financial_institution_name,
  }));
}

interface TransaccionWompi {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  payment_method?: { extra?: { async_payment_url?: string } };
}

async function crearTransaccion(
  order: Order,
  paymentMethod: Record<string, unknown>
): Promise<TransaccionWompi> {
  const amountInCents = toCents(order.total);
  const reference = order.payment.reference;

  return llamar<TransaccionWompi>('/transactions', {
    method: 'POST',
    body: {
      acceptance_token: await tokenAceptacion(),
      amount_in_cents: amountInCents,
      currency: 'COP',
      signature: firmaIntegridad(reference, amountInCents),
      customer_email: order.customer.email,
      reference,
      payment_method: paymentMethod,
      redirect_url: `${env.siteUrl}/pedido/${order.reference}`,
      customer_data: {
        phone_number: order.customer.telefono.replace(/\D/g, ''),
        full_name: `${order.customer.nombre} ${order.customer.apellido}`,
      },
      shipping_address: {
        address_line_1: order.address.direccion,
        country: 'CO',
        region: order.address.departamento,
        city: order.address.ciudad,
        phone_number: order.customer.telefono.replace(/\D/g, ''),
      },
    },
  });
}

export const wompiProvider: PaymentProvider = {
  id: ID,
  label: 'Wompi',
  methods: ['NEQUI', 'PSE', 'CARD', 'BREB'],
  requiresManualVerification: false,

  isConfigured() {
    const w = env.payments.wompi;
    return Boolean(w.publicKey && w.privateKey && w.integritySecret && w.eventsSecret);
  },

  async createIntent(order: Order, method: PaymentMethodId, context: PaymentContext = {}): Promise<PaymentIntent> {
    const reference = order.payment.reference;
    const amountInCents = toCents(order.total);

    const base = {
      provider: ID,
      method,
      reference,
      amount: order.total,
      expiresAt: order.expiresAt,
    };

    switch (method) {
      // La tarjeta va por el Widget: así los datos de la tarjeta nunca tocan
      // nuestro servidor y el proyecto se mantiene fuera del alcance de PCI.
      case 'CARD':
        return {
          ...base,
          id: reference,
          status: 'pending',
          instructions: {
            kind: 'widget',
            publicKey: config().publicKey,
            signature: firmaIntegridad(reference, amountInCents),
            reference,
            amountInCents,
            currency: 'COP',
            redirectUrl: `${env.siteUrl}/pedido/${order.reference}`,
          },
        };

      case 'NEQUI': {
        const telefono = (context.nequiPhone ?? order.customer.telefono).replace(/\D/g, '').slice(-10);
        const transaccion = await crearTransaccion(order, {
          type: 'NEQUI',
          phone_number: telefono,
        });

        return {
          ...base,
          id: transaccion.id,
          status: ESTADOS[transaccion.status] ?? 'pending',
          instructions: {
            kind: 'push',
            phone: telefono,
            message: 'Abre tu app Nequi y aprueba la notificación de pago.',
          },
        };
      }

      case 'PSE': {
        if (!context.pseBankCode) {
          throw new Error('[wompi] PSE requiere el código del banco (pseBankCode).');
        }

        const transaccion = await crearTransaccion(order, {
          type: 'PSE',
          user_type: context.userType === 'company' ? 1 : 0,
          user_legal_id_type: context.legalIdType ?? 'CC',
          user_legal_id: context.legalId ?? order.customer.documento ?? '',
          financial_institution_code: context.pseBankCode,
          payment_description: `Pedido ${order.reference}`,
        });

        const url = transaccion.payment_method?.extra?.async_payment_url;
        if (!url) throw new Error('[wompi] PSE no devolvió la URL del banco.');

        return {
          ...base,
          id: transaccion.id,
          status: ESTADOS[transaccion.status] ?? 'pending',
          instructions: { kind: 'redirect', url },
        };
      }

      // Bre-B en recaudo: cuando Wompi lo habilite en checkout, el único
      // cambio es el `type` que se manda aquí. El webhook ya sirve tal cual.
      case 'BREB':
        throw new PaymentMethodNotSupportedError(
          ID,
          'BREB — el recaudo Bre-B en checkout aún no está habilitado en la cuenta. ' +
            'Mientras tanto opera el proveedor breb-manual.'
        );

      default:
        throw new PaymentMethodNotSupportedError(ID, method);
    }
  },

  async getStatus(intentId: string): Promise<PaymentStatus> {
    const transaccion = await llamar<TransaccionWompi>(`/transactions/${intentId}`);
    return ESTADOS[transaccion.status] ?? 'pending';
  },

  parseWebhook(payload): PaymentWebhookEvent | null {
    const { eventsSecret } = config();
    if (!eventsSecret) {
      console.error('[wompi] webhook recibido sin WOMPI_EVENTS_SECRET. Descartado.');
      return null;
    }

    const evento = payload as {
      event?: string;
      data?: { transaction?: TransaccionWompi };
      timestamp?: number;
      sent_at?: string;
      signature?: { properties?: string[]; checksum?: string };
    };

    const transaccion = evento.data?.transaction;
    const firma = evento.signature;

    if (!transaccion || !firma?.checksum || !Array.isArray(firma.properties)) {
      console.error('[wompi] webhook con estructura inesperada. Descartado.');
      return null;
    }

    // Checksum = SHA-256(valores de las propiedades firmadas, en orden +
    // timestamp + secreto de eventos). Las propiedades vienen como rutas
    // punteadas dentro de `data`, p. ej. "transaction.amount_in_cents".
    const valores = firma.properties
      .map((ruta) =>
        ruta.split('.').reduce<unknown>(
          (nodo, llave) => (nodo as Record<string, unknown> | undefined)?.[llave],
          evento.data
        )
      )
      .map((valor) => String(valor ?? ''))
      .join('');

    const esperado = sha256(`${valores}${evento.timestamp ?? ''}${eventsSecret}`);

    if (!igualSeguro(esperado, firma.checksum)) {
      console.error(`[wompi] checksum inválido para la transacción ${transaccion.id}. Descartado.`);
      return null;
    }

    return {
      // Wompi no manda un id de evento propio: la combinación transacción +
      // estado identifica el cambio y basta para no procesarlo dos veces.
      eventId: `${transaccion.id}:${transaccion.status}`,
      reference: transaccion.reference,
      intentId: transaccion.id,
      status: ESTADOS[transaccion.status] ?? 'pending',
      amount: Math.round(transaccion.amount_in_cents / 100),
      occurredAt: evento.sent_at ?? new Date().toISOString(),
    };
  },
};
