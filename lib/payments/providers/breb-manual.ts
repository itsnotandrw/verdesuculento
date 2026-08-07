/**
 * Bre-B con verificación manual del abono. **Activo hoy.**
 *
 * Cómo funciona: el cliente transfiere a la llave Bre-B del negocio desde
 * cualquier banco o billetera, escribiendo en la descripción una referencia
 * única que generamos nosotros. El pedido queda en `in_review` hasta que el
 * operador ve el abono en su cuenta y lo aprueba desde `/admin/pedidos`.
 * Recién ahí se dispara la guía.
 *
 * Lo que este flujo cuesta, dicho sin adornos: un humano por pedido, despacho
 * más lento y pedidos en limbo si nadie revisa. A ~320 pedidos/mes es
 * manejable; el día que duplique, deja de serlo.
 *
 * Tres decisiones que lo hacen menos frágil que el "mándame el pantallazo por
 * WhatsApp" del que se parte:
 *
 *   1. **No se acepta comprobante como prueba.** Un pantallazo se edita en dos
 *      minutos. Lo único que aprueba un pago aquí es que el operador vea el
 *      dinero en la cuenta. El botón "ya pagué" del cliente solo avisa, no
 *      confirma — por eso el estado se llama `in_review` y no `approved`.
 *   2. **Referencia única por intento.** Sin ella, dos pedidos del mismo monto
 *      el mismo día son indistinguibles en el extracto.
 *   3. **TTL.** El pedido expira solo si nadie paga, en vez de acumularse para
 *      siempre en la bandeja.
 *
 * La migración a confirmación automática ya está resuelta a nivel de
 * arquitectura: `wompi.ts` implementa la misma interfaz, y el orquestador
 * decide por `requiresManualVerification`. Cambiar es poner las llaves en
 * `.env.local` y `PAYMENT_PROVIDER=wompi`.
 */

import { env } from '@/lib/env';
import type { Order, PaymentMethodId, PaymentStatus } from '@/lib/orders/types';
import type { PaymentProvider } from '../provider';
import { PaymentMethodNotSupportedError, type PaymentIntent, type PaymentWebhookEvent } from '../types';

const ID = 'breb-manual';

export const brebManualProvider: PaymentProvider = {
  id: ID,
  label: 'Bre-B (transferencia a llave)',
  methods: ['BREB'],
  requiresManualVerification: true,

  isConfigured() {
    return Boolean(env.payments.breb.key);
  },

  async createIntent(order: Order, method: PaymentMethodId): Promise<PaymentIntent> {
    if (method !== 'BREB') throw new PaymentMethodNotSupportedError(ID, method);

    const { breb } = env.payments;

    return {
      // Sin pasarela no hay id externo: la referencia es el identificador.
      id: order.payment.reference,
      provider: ID,
      method: 'BREB',
      reference: order.payment.reference,
      amount: order.total,
      status: 'pending',
      expiresAt: order.expiresAt,
      instructions: {
        kind: 'manual_transfer',
        brebKey: breb.key,
        keyType: breb.keyType,
        holder: breb.holder,
        bank: breb.bank,
        nequi: breb.nequi || undefined,
        reference: order.payment.reference,
        amount: order.total,
        deadline: order.expiresAt,
      },
    };
  },

  async getStatus(): Promise<PaymentStatus> {
    // No hay a quién preguntarle: la verdad vive en nuestra base de datos y la
    // escribe el operador al verificar. Quien llama debe leer el pedido.
    return 'pending';
  },

  parseWebhook(): PaymentWebhookEvent | null {
    // Este proveedor no recibe webhooks. Cualquier cuerpo que llegue a
    // /api/webhooks/payments mientras esté activo se descarta.
    return null;
  },
};
