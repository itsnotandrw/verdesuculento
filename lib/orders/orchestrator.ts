/**
 * Orquestador de pedidos. SOLO SERVIDOR.
 *
 * Es la pieza que enlaza las dos máquinas de estado —pago y envío— y la única
 * autorizada a crear guías. Todo lo demás (rutas de API, webhooks, panel de
 * administración) delega aquí.
 *
 * Invariantes que este archivo garantiza:
 *
 *   1. **Ninguna guía sin dinero asegurado.** Solo `aprobarPago()` y el contra
 *      entrega con cobertura confirmada llegan a `crearGuia()`. La redirección
 *      del navegador jamás confirma nada.
 *   2. **Idempotencia doble.** El webhook de pago puede repetirse: la guía se
 *      crea una sola vez porque se condiciona a `!order.shipment`. El de envío
 *      también: los `eventId` procesados quedan guardados en el pedido.
 *   3. **El precio lo pone el servidor.** El navegador manda ids de producto y
 *      de cotización; los montos se recalculan aquí contra el catálogo. Un
 *      total manipulado en el cliente no tiene efecto.
 *   4. **Nada se aprueba solo en el flujo manual.** "Ya pagué" deja el pedido
 *      en `in_review`, nunca en `approved`.
 */

import { getProductById } from '@/data/catalog';
import { nuevaReferenciaPago, nuevaReferenciaPedido, nuevoOrderId } from '@/lib/ids';
import { env } from '@/lib/env';
import { paymentProvider, type PaymentContext } from '@/lib/payments';
import type { PaymentIntent } from '@/lib/payments/types';
import { armarPaquete, logisticaDe, resolverCotizacion, shippingProvider } from '@/lib/shipping';
import type { ShippingQuote } from '@/lib/shipping/types';
import { orders, registrar } from './store';
import {
  derivarEstado,
  type CreateOrderInput,
  type Order,
  type OrderLine,
  type PaymentMethodId,
  type ShipmentStatus,
} from './types';

export class OrderError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'carrito_vacio'
      | 'producto_invalido'
      | 'cotizacion_invalida'
      | 'cod_sin_cobertura'
      | 'pedido_no_encontrado'
      | 'estado_invalido'
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

// ---------------------------------------------------------------- creación

/**
 * Crea el pedido y el intento de pago.
 *
 * El pedido nace `awaiting_payment` (o `paid` si es contra entrega, donde el
 * dinero lo asegura el recaudo). El inventario no se reserva porque el
 * catálogo actual no lo lleva; el día que lo lleve, la reserva con TTL va
 * exactamente aquí, antes de persistir.
 */
export async function crearPedido(
  input: CreateOrderInput,
  context: PaymentContext = {}
): Promise<{ order: Order; intent: PaymentIntent }> {
  if (!input.lines?.length) {
    throw new OrderError('El carrito está vacío.', 'carrito_vacio');
  }

  // --- líneas y subtotal, siempre con el precio del catálogo del servidor
  const lines: OrderLine[] = input.lines.map((linea) => {
    const producto = getProductById(linea.productId);
    if (!producto) {
      throw new OrderError(`El producto ${linea.productId} ya no está disponible.`, 'producto_invalido');
    }

    const qty = Math.max(1, Math.min(99, Math.floor(linea.qty)));

    return {
      productId: producto.id,
      name: producto.name,
      color: linea.color || producto.colors[0]?.name || '',
      size: linea.size || producto.sizes[0] || '',
      qty,
      unitPrice: producto.price,
      weightGrams: logisticaDe(producto.id).weightGrams,
    };
  });

  const subtotal = lines.reduce((suma, l) => suma + l.unitPrice * l.qty, 0);

  // --- envío: se re-cotiza en el servidor y se busca la opción elegida
  const destination = {
    departamento: input.address.departamento,
    ciudad: input.address.ciudad,
    direccion: input.address.direccion,
    barrio: input.address.barrio,
    codigoPostal: input.address.codigoPostal,
  };

  const esContraEntrega = input.method === 'COD';
  const parcel = armarPaquete(lines, subtotal);
  const quote = await resolverCotizacion(input.quoteId, destination, parcel, subtotal, esContraEntrega);

  if (!quote) {
    throw new OrderError(
      'La opción de envío ya no está disponible. Vuelve a cotizar.',
      'cotizacion_invalida'
    );
  }

  // --- contra entrega: la cobertura se valida ANTES de aceptar el pedido
  let codFee = 0;
  if (esContraEntrega) {
    const cobertura = await shippingProvider().codCoverage(destination, subtotal + quote.cost);
    if (!cobertura.available) {
      throw new OrderError(
        cobertura.reason ?? `No hay contra entrega para ${input.address.ciudad}.`,
        'cod_sin_cobertura'
      );
    }
    codFee = cobertura.fee;
  }

  const total = subtotal + quote.cost + codFee;
  const ahora = new Date();
  const reference = nuevaReferenciaPedido();

  const order: Order = {
    id: nuevoOrderId(),
    reference,
    createdAt: ahora.toISOString(),
    updatedAt: ahora.toISOString(),
    expiresAt: new Date(ahora.getTime() + env.payments.intentTtlMinutes * 60_000).toISOString(),
    status: 'awaiting_payment',
    customer: input.customer,
    address: input.address,
    lines,
    subtotal,
    shippingCost: quote.cost + codFee,
    discount: quote.listCost - quote.cost,
    total,
    selectedQuote: {
      id: quote.id,
      provider: quote.provider,
      carrier: quote.carrier,
      service: quote.service,
      cost: quote.cost,
      etaLabel: quote.etaLabel,
    },
    payment: {
      provider: esContraEntrega ? 'cod' : paymentProvider().id,
      method: input.method,
      status: 'pending',
      reference: nuevaReferenciaPago(reference),
      amount: total,
    },
    tracking: [],
    timeline: [],
    processedEventIds: [],
  };

  registrar(order, {
    type: 'pedido_creado',
    actor: 'cliente',
    message: `Pedido creado por ${total.toLocaleString('es-CO')} COP · ${quote.carrier} ${quote.service}.`,
    meta: { metodo: input.method, envio: quote.id },
  });

  // --- intento de pago
  let intent: PaymentIntent;

  if (esContraEntrega) {
    // No pasa por pasarela: el dinero lo asegura el recaudo de la
    // transportadora, así que la guía puede crearse de una vez.
    order.payment.status = 'approved';
    order.payment.approvedAt = ahora.toISOString();
    intent = {
      id: order.payment.reference,
      provider: 'cod',
      method: 'COD',
      reference: order.payment.reference,
      amount: total,
      status: 'approved',
      expiresAt: order.expiresAt,
      instructions: {
        kind: 'cod',
        amount: total,
        note: `Paga ${total.toLocaleString('es-CO')} COP en efectivo al recibir el pedido.`,
      },
    };
    registrar(order, {
      type: 'contra_entrega',
      actor: 'sistema',
      message: 'Contra entrega con cobertura confirmada: el recaudo asegura el pago.',
    });
  } else {
    intent = await paymentProvider().createIntent(order, input.method, context);
    order.payment.intentId = intent.id;
    order.payment.status = intent.status;
  }

  order.status = derivarEstado(order.payment, order.shipment);
  await orders.create(order);

  // El contra entrega despacha inmediatamente; el resto espera el pago.
  if (esContraEntrega) {
    await crearGuia(order.id, total);
  }

  const guardado = (await orders.byId(order.id)) ?? order;
  return { order: guardado, intent };
}

// ------------------------------------------------------------------- guía

/**
 * Crea la guía. **Idempotente**: si el pedido ya tiene una, no crea otra.
 *
 * Cada guía cuesta dinero, y un webhook repetido es lo normal, no la
 * excepción. Esta condición es lo único que separa un reintento inocente de
 * una factura duplicada con la transportadora.
 */
export async function crearGuia(orderId: string, cashOnDelivery?: number): Promise<Order | null> {
  const pedido = await orders.byId(orderId);
  if (!pedido) return null;

  if (pedido.shipment) return pedido;

  if (pedido.payment.status !== 'approved') {
    // Salvaguarda: aunque ninguna ruta llegue aquí sin pago, la invariante se
    // defiende en el punto donde importa.
    console.error(`[orchestrator] intento de crear guía para ${pedido.reference} sin pago aprobado.`);
    return pedido;
  }

  const proveedor = shippingProvider();

  try {
    const parcel = armarPaquete(pedido.lines, pedido.subtotal);
    const quote = await resolverCotizacion(
      pedido.selectedQuote.id,
      pedido.address,
      parcel,
      pedido.subtotal,
      Boolean(cashOnDelivery)
    );

    const guia = await proveedor.createShipment({
      order: pedido,
      // Si la cotización original ya no existe, se usa la congelada en el
      // pedido: el cliente no puede pagar un precio y recibir otro servicio.
      quote: quote ?? ({
        ...pedido.selectedQuote,
        carrierCode: pedido.selectedQuote.carrier,
        serviceCode: pedido.selectedQuote.service,
        listCost: pedido.selectedQuote.cost,
        currency: 'COP',
        etaMinDays: 0,
        etaMaxDays: 0,
        cashOnDeliveryAvailable: false,
        cashOnDeliveryFee: 0,
      } as ShippingQuote),
      cashOnDelivery,
    });

    return orders.update(orderId, (order) => {
      // Segunda verificación dentro de la escritura serializada: dos webhooks
      // simultáneos podrían haber pasado juntos la comprobación de arriba.
      if (order.shipment) return order;

      order.shipment = {
        provider: guia.provider,
        status: guia.status,
        carrier: guia.carrier,
        service: guia.service,
        cost: guia.cost,
        trackingNumber: guia.trackingNumber,
        labelUrl: guia.labelUrl,
        codAmount: guia.codAmount,
        createdAt: new Date().toISOString(),
        externalId: guia.externalId,
      };
      order.tracking.push({
        status: 'created',
        description: `Guía generada con ${guia.carrier}.`,
        occurredAt: new Date().toISOString(),
      });
      order.status = derivarEstado(order.payment, order.shipment);

      registrar(order, {
        type: 'guia_creada',
        actor: 'sistema',
        message: `Guía ${guia.trackingNumber} · ${guia.carrier} ${guia.service}.`,
        meta: { trackingNumber: guia.trackingNumber },
      });
      return order;
    });
  } catch (error) {
    // El pago ya está confirmado: que falle la transportadora no puede tumbar
    // el pedido. Queda pagado y sin guía, visible en el panel para reintentar.
    console.error(`[orchestrator] no se pudo crear la guía de ${pedido.reference}:`, error);

    return orders.update(orderId, (order) => {
      registrar(order, {
        type: 'guia_fallida',
        actor: 'sistema',
        message: `No se pudo generar la guía: ${(error as Error).message}. Reintentar desde el panel.`,
      });
      return order;
    });
  }
}

// ------------------------------------------------------------------ pagos

/**
 * El cliente avisa que ya transfirió. **No confirma nada.**
 *
 * Deja el pedido en `in_review` para que aparezca en la bandeja del panel. Lo
 * único que aprueba un pago es ver el dinero en la cuenta.
 */
export async function declararPago(reference: string, nota?: string): Promise<Order | null> {
  const pedido = await orders.byReference(reference);
  if (!pedido) throw new OrderError('Pedido no encontrado.', 'pedido_no_encontrado');

  if (pedido.payment.status !== 'pending') return pedido;

  return orders.update(pedido.id, (order) => {
    order.payment.status = 'in_review';
    order.payment.declaredAt = new Date().toISOString();
    if (nota) order.payment.notes = nota.slice(0, 500);
    order.status = derivarEstado(order.payment, order.shipment);

    registrar(order, {
      type: 'pago_declarado',
      actor: 'cliente',
      message: 'El cliente reporta haber hecho la transferencia. Pendiente de verificar el abono.',
    });
    return order;
  });
}

/**
 * Aprueba el pago y dispara la guía. Es el punto donde el dinero pasa a estar
 * asegurado, sea porque un humano lo vio en el extracto o porque la pasarela
 * lo confirmó por webhook.
 */
export async function aprobarPago(
  orderId: string,
  actor: 'admin' | 'webhook',
  quien?: string
): Promise<Order | null> {
  const pedido = await orders.byId(orderId);
  if (!pedido) throw new OrderError('Pedido no encontrado.', 'pedido_no_encontrado');

  if (pedido.payment.status === 'approved') {
    // Ya estaba aprobado: puede que falte la guía si la transportadora falló
    // en el intento anterior.
    return pedido.shipment ? pedido : crearGuia(orderId);
  }

  await orders.update(orderId, (order) => {
    order.payment.status = 'approved';
    order.payment.approvedAt = new Date().toISOString();
    if (quien) order.payment.verifiedBy = quien;
    order.status = derivarEstado(order.payment, order.shipment);

    registrar(order, {
      type: 'pago_aprobado',
      actor,
      message:
        actor === 'admin'
          ? `Abono verificado en cuenta${quien ? ` por ${quien}` : ''}.`
          : 'Pago confirmado por la pasarela.',
    });
    return order;
  });

  return crearGuia(orderId, pedido.payment.method === 'COD' ? pedido.total : undefined);
}

export async function rechazarPago(
  orderId: string,
  actor: 'admin' | 'webhook',
  motivo: string
): Promise<Order | null> {
  return orders.update(orderId, (order) => {
    if (order.payment.status === 'approved') return order;

    order.payment.status = 'declined';
    order.payment.notes = motivo.slice(0, 500);
    order.status = derivarEstado(order.payment, order.shipment);

    registrar(order, { type: 'pago_rechazado', actor, message: motivo });
    return order;
  });
}

/**
 * Vuelve a poner el pedido en espera de pago, con una referencia nueva.
 *
 * Sirve cuando el cliente dijo "ya pagué" y el abono nunca apareció: en vez de
 * cancelar, se le da otra oportunidad sin ensuciar la conciliación (la
 * referencia vieja queda inutilizada).
 */
export async function reintentarPago(orderId: string): Promise<Order | null> {
  return orders.update(orderId, (order) => {
    if (order.payment.status === 'approved') return order;

    order.payment.status = 'pending';
    order.payment.reference = nuevaReferenciaPago(order.reference);
    order.payment.declaredAt = undefined;
    order.expiresAt = new Date(Date.now() + env.payments.intentTtlMinutes * 60_000).toISOString();
    order.status = derivarEstado(order.payment, order.shipment);

    registrar(order, {
      type: 'pago_reintentado',
      actor: 'admin',
      message: `Nueva referencia de pago: ${order.payment.reference}.`,
    });
    return order;
  });
}

/** Webhook de la pasarela ya validado por el adaptador. */
export async function onPaymentWebhook(evento: {
  eventId: string;
  reference: string;
  intentId: string;
  status: string;
  amount: number;
}): Promise<{ procesado: boolean; motivo?: string }> {
  const pedido = await orders.byPaymentReference(evento.reference);
  if (!pedido) return { procesado: false, motivo: 'referencia desconocida' };

  if (pedido.processedEventIds.includes(evento.eventId)) {
    return { procesado: false, motivo: 'evento ya procesado' };
  }

  // El monto tiene que cuadrar. Un pago parcial no despacha.
  if (evento.status === 'approved' && evento.amount !== pedido.total) {
    await orders.update(pedido.id, (order) => {
      order.processedEventIds.push(evento.eventId);
      registrar(order, {
        type: 'pago_monto_no_coincide',
        actor: 'webhook',
        message: `Se recibieron ${evento.amount.toLocaleString('es-CO')} COP y el pedido vale ${order.total.toLocaleString('es-CO')}. Revisar a mano.`,
      });
      return order;
    });
    return { procesado: false, motivo: 'monto no coincide' };
  }

  await orders.update(pedido.id, (order) => {
    order.processedEventIds.push(evento.eventId);
    order.payment.intentId = evento.intentId;
    return order;
  });

  if (evento.status === 'approved') {
    await aprobarPago(pedido.id, 'webhook');
  } else if (evento.status === 'declined') {
    await rechazarPago(pedido.id, 'webhook', 'La pasarela rechazó el pago.');
  }

  return { procesado: true };
}

// ------------------------------------------------------------------ envío

/** Webhook de la transportadora ya validado por el adaptador. */
export async function onShippingWebhook(evento: {
  eventId: string;
  trackingNumber: string;
  status: ShipmentStatus;
  description: string;
  occurredAt: string;
  location?: string;
}): Promise<{ procesado: boolean; motivo?: string }> {
  const pedido = await orders.byTrackingNumber(evento.trackingNumber);
  if (!pedido) return { procesado: false, motivo: 'guía desconocida' };

  if (pedido.processedEventIds.includes(evento.eventId)) {
    return { procesado: false, motivo: 'evento ya procesado' };
  }

  await orders.update(pedido.id, (order) => {
    order.processedEventIds.push(evento.eventId);
    if (!order.shipment) return order;

    order.shipment.status = evento.status;
    order.tracking.push({
      status: evento.status,
      description: evento.description,
      occurredAt: evento.occurredAt,
      location: evento.location,
    });
    order.status = derivarEstado(order.payment, order.shipment);

    // Una entrega fallida en contra entrega es producto en la calle y dinero
    // que no existe: se marca para que salte en el panel antes que el resto.
    const critico = evento.status === 'incident' && order.payment.method === 'COD';

    registrar(order, {
      type: critico ? 'novedad_contra_entrega' : 'envio_actualizado',
      actor: 'webhook',
      message: critico
        ? `PRIORIDAD: novedad en un contra entrega — ${evento.description}`
        : evento.description,
    });
    return order;
  });

  return { procesado: true };
}

/**
 * Marca como girado el recaudo de un contra entrega.
 *
 * El agregador gira entre 4 y 11 días hábiles después de entregar, así que la
 * conciliación es un cruce aparte: entregados contra girados.
 */
export async function conciliarRecaudo(orderId: string, quien: string): Promise<Order | null> {
  return orders.update(orderId, (order) => {
    if (!order.shipment) return order;
    order.shipment.codSettledAt = new Date().toISOString();
    registrar(order, {
      type: 'recaudo_conciliado',
      actor: 'admin',
      message: `Giro del recaudo recibido y conciliado por ${quien}.`,
    });
    return order;
  });
}

// -------------------------------------------------------------- expiración

/**
 * Expira los pedidos cuyo pago nunca llegó.
 *
 * Antes de expirar uno consulta el estado real en la pasarela: PSE puede
 * quedarse en `PENDING` varios minutos y matar un pedido que sí se pagó sería
 * peor que dejarlo abierto de más.
 */
export async function expirarPendientes(): Promise<{ expirados: number; rescatados: number }> {
  const vencidos = await orders.vencidos();
  const proveedor = paymentProvider();

  let expirados = 0;
  let rescatados = 0;

  for (const pedido of vencidos) {
    if (!proveedor.requiresManualVerification && pedido.payment.intentId) {
      try {
        const estado = await proveedor.getStatus(pedido.payment.intentId);
        if (estado === 'approved') {
          await aprobarPago(pedido.id, 'webhook');
          rescatados++;
          continue;
        }
        if (estado === 'pending') continue; // sigue vivo, se revisa después
      } catch (error) {
        console.error(`[orchestrator] no se pudo consultar el pago de ${pedido.reference}:`, error);
        continue; // ante la duda, no se expira
      }
    }

    await orders.update(pedido.id, (order) => {
      order.payment.status = 'expired';
      order.status = derivarEstado(order.payment, order.shipment);
      registrar(order, {
        type: 'pedido_expirado',
        actor: 'sistema',
        message: 'Expiró el plazo de pago sin recibir el abono.',
      });
      return order;
    });
    expirados++;
  }

  return { expirados, rescatados };
}

export type { PaymentMethodId };
