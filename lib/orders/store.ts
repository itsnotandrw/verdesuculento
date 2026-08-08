/**
 * Repositorio de pedidos. SOLO SERVIDOR.
 *
 * La regla del sistema es "la fuente de verdad es la base de datos propia":
 * los webhooks escriben aquí y la UI lee de aquí, nunca de las APIs externas
 * en caliente.
 *
 * Hay dos adaptadores y el que se use lo decide la configuración:
 *
 *   kv       Redis por REST (Upstash / Vercel KV). **Producción.** Es el único
 *            que sirve en serverless, donde cada ruta corre en una función
 *            distinta con su propia memoria y su propio disco efímero.
 *   archivo  JSON local. Desarrollo y servidor propio de un solo proceso.
 *
 * Si no hay Redis configurado se usa el archivo, que en serverless significa
 * perder los pedidos. Por eso `almacenamiento().durable` existe: la ruta que
 * crea pedidos lo consulta y se niega a cobrar algo que no va a poder recordar.
 */

import { env } from '@/lib/env';
import type { Order, OrderEvent } from './types';
import { archivoRepository } from './stores/archivo';
import { kvRepository } from './stores/kv';

export interface OrderRepository {
  readonly id: string;
  /** ¿Sobrevive a que el proceso se muera o a que otra función lo lea? */
  readonly durable: boolean;

  create(order: Order): Promise<Order>;
  byId(id: string): Promise<Order | null>;
  byReference(reference: string): Promise<Order | null>;
  byPaymentReference(reference: string): Promise<Order | null>;
  byTrackingNumber(trackingNumber: string): Promise<Order | null>;
  /** Aplica una mutación sobre el pedido de forma atómica. */
  update(id: string, mutar: (order: Order) => Order | void): Promise<Order | null>;
  list(opciones?: { limite?: number }): Promise<Order[]>;
}

/**
 * Punto único de cambio para migrar a otra base:
 * implementar `OrderRepository` y devolverlo aquí.
 */
export const orders: OrderRepository = env.kv.url && env.kv.token ? kvRepository : archivoRepository;

export interface EstadoAlmacenamiento {
  id: string;
  durable: boolean;
  /** `true` cuando corremos donde el disco local no se comparte entre rutas. */
  serverless: boolean;
  /** Se puede recibir pedidos sin perderlos. */
  apto: boolean;
  motivo?: string;
}

export function almacenamiento(): EstadoAlmacenamiento {
  const serverless = env.serverless;
  const durable = orders.durable;

  // En un servidor propio el archivo alcanza. En serverless no: el pedido se
  // crea en una función y ninguna otra lo vuelve a ver.
  const apto = durable || !serverless;

  return {
    id: orders.id,
    durable,
    serverless,
    apto,
    motivo: apto
      ? undefined
      : 'Los pedidos se están guardando en disco local, pero esta plataforma no comparte ' +
        'disco entre rutas: el pedido se crearía y desaparecería. Configura KV_REST_API_URL ' +
        'y KV_REST_API_TOKEN (ver lib/README.md).',
  };
}

/** Pedidos con pago pendiente cuyo plazo ya venció. */
export async function pedidosVencidos(ahora = new Date()): Promise<Order[]> {
  const limite = ahora.toISOString();
  const todos = await orders.list({ limite: 500 });

  return todos.filter(
    (pedido) =>
      pedido.payment.status === 'pending' &&
      pedido.payment.method !== 'COD' &&
      pedido.expiresAt < limite
  );
}

/** Agrega una entrada a la bitácora del pedido (muta el objeto recibido). */
export function registrar(
  order: Order,
  evento: Omit<OrderEvent, 'at'> & { at?: string }
): Order {
  order.timeline.push({ at: evento.at ?? new Date().toISOString(), ...evento });
  return order;
}
