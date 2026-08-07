/**
 * Modelo de dominio del pedido.
 *
 * Un pedido tiene **dos máquinas de estado enlazadas** (pago y envío) y un
 * estado agregado que resume ambas para la UI. El evento que las conecta es la
 * confirmación del pago: ninguna guía se crea sin dinero asegurado.
 *
 *   pago:   pending → in_review → approved | declined | expired
 *   envío:  not_created → created → picked_up → in_transit → out_for_delivery
 *                       → delivered | incident | returned
 */

export type PaymentMethodId = 'BREB' | 'NEQUI' | 'PSE' | 'CARD' | 'COD';

export type PaymentStatus =
  | 'pending'
  /** Solo flujo manual: el cliente declara haber pagado, falta ver el abono. */
  | 'in_review'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'refunded';

export type ShipmentStatus =
  | 'not_created'
  | 'created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'incident'
  | 'returned';

/** Estado agregado: lo único que la UI necesita mirar. */
export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_in_review'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export interface OrderCustomer {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento?: string;
}

export interface OrderAddress {
  departamento: string;
  ciudad: string;
  direccion: string;
  barrio?: string;
  codigoPostal?: string;
  notas?: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
  /** Peso del paquete declarado en ML, por unidad. */
  weightGrams: number;
}

export interface OrderPayment {
  /** Id del adaptador que la creó: 'breb-manual' | 'wompi' | 'cod'. */
  provider: string;
  method: PaymentMethodId;
  status: PaymentStatus;
  /**
   * Referencia única **por intento de pago**, no por pedido: si el cliente
   * reintenta, nace una referencia nueva. Es la que el cliente escribe en la
   * transferencia y la que buscamos en el extracto.
   */
  reference: string;
  /** Id de la transacción en la pasarela (nulo en el flujo manual). */
  intentId?: string;
  amount: number;
  /** Cuándo el cliente dijo "ya pagué" (flujo manual). No prueba nada. */
  declaredAt?: string;
  /** Cuándo se confirmó el dinero de verdad. */
  approvedAt?: string;
  /** Quién lo verificó a mano, si aplica. */
  verifiedBy?: string;
  notes?: string;
}

export interface OrderShipment {
  provider: string;
  status: ShipmentStatus;
  carrier: string;
  service: string;
  cost: number;
  trackingNumber: string;
  labelUrl?: string;
  /** Monto a recaudar si es contra entrega. */
  codAmount?: number;
  /** Si el recaudo ya fue girado por el agregador. */
  codSettledAt?: string;
  createdAt: string;
  externalId?: string;
}

export interface TrackingEvent {
  status: ShipmentStatus;
  description: string;
  occurredAt: string;
  location?: string;
}

/** Bitácora del pedido: qué pasó, cuándo y quién lo provocó. */
export interface OrderEvent {
  at: string;
  type: string;
  message: string;
  actor: 'cliente' | 'sistema' | 'admin' | 'webhook';
  meta?: Record<string, unknown>;
}

export interface Order {
  id: string;
  /** Código corto que ve el cliente: VS-A7K4M2. */
  reference: string;
  createdAt: string;
  updatedAt: string;
  /** Si no hay pago confirmado antes de esta fecha, el pedido expira. */
  expiresAt: string;

  status: OrderStatus;
  customer: OrderCustomer;
  address: OrderAddress;
  lines: OrderLine[];

  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;

  /** Cotización elegida en el checkout, congelada al crear el pedido. */
  selectedQuote: {
    id: string;
    provider: string;
    carrier: string;
    service: string;
    cost: number;
    etaLabel: string;
  };

  payment: OrderPayment;
  shipment?: OrderShipment;
  tracking: TrackingEvent[];
  timeline: OrderEvent[];

  /** Ids de webhook ya procesados. Base de la idempotencia. */
  processedEventIds: string[];
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  address: OrderAddress;
  lines: Array<{
    productId: string;
    color: string;
    size: string;
    qty: number;
  }>;
  quoteId: string;
  method: PaymentMethodId;
}

/** Vista pública del pedido: lo que puede leer cualquiera con la referencia. */
export interface PublicOrder {
  reference: string;
  createdAt: string;
  expiresAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodId;
  paymentReference: string;
  shipmentStatus: ShipmentStatus;
  carrier?: string;
  trackingNumber?: string;
  etaLabel: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  lines: Array<{ name: string; qty: number; unitPrice: number; color: string; size: string }>;
  destino: string;
  tracking: TrackingEvent[];
}

const ETIQUETAS_ESTADO: Record<OrderStatus, string> = {
  awaiting_payment: 'Esperando pago',
  payment_in_review: 'Verificando pago',
  paid: 'Pago confirmado',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const ETIQUETAS_ENVIO: Record<ShipmentStatus, string> = {
  not_created: 'Pendiente de despacho',
  created: 'Guía generada',
  picked_up: 'Recogido por la transportadora',
  in_transit: 'En tránsito',
  out_for_delivery: 'En reparto',
  delivered: 'Entregado',
  incident: 'Con novedad',
  returned: 'Devuelto',
};

export function etiquetaEstado(status: OrderStatus): string {
  return ETIQUETAS_ESTADO[status] ?? status;
}

export function etiquetaEnvio(status: ShipmentStatus): string {
  return ETIQUETAS_ENVIO[status] ?? status;
}

/** Recalcula el estado agregado a partir de las dos máquinas de estado. */
export function derivarEstado(payment: OrderPayment, shipment?: OrderShipment): OrderStatus {
  if (shipment?.status === 'delivered') return 'delivered';
  if (shipment && shipment.status !== 'not_created') return 'shipped';

  switch (payment.status) {
    case 'approved':
      return 'paid';
    case 'in_review':
      return 'payment_in_review';
    case 'declined':
      return 'cancelled';
    case 'expired':
      return 'expired';
    default:
      // Contra entrega no espera pago online: el dinero lo asegura el recaudo.
      return payment.method === 'COD' ? 'paid' : 'awaiting_payment';
  }
}

export function toPublicOrder(order: Order): PublicOrder {
  return {
    reference: order.reference,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    status: order.status,
    paymentStatus: order.payment.status,
    paymentMethod: order.payment.method,
    paymentReference: order.payment.reference,
    shipmentStatus: order.shipment?.status ?? 'not_created',
    carrier: order.shipment?.carrier,
    trackingNumber: order.shipment?.trackingNumber,
    etaLabel: order.selectedQuote.etaLabel,
    total: order.total,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    lines: order.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      color: l.color,
      size: l.size,
    })),
    destino: `${order.address.ciudad}, ${order.address.departamento}`,
    tracking: order.tracking,
  };
}
