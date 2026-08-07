/**
 * Repositorio de pedidos. SOLO SERVIDOR.
 *
 * La regla del sistema es "la fuente de verdad es la base de datos propia": los
 * webhooks escriben aquí y la UI lee de aquí, nunca de las APIs externas en
 * caliente. Este archivo es esa base de datos.
 *
 * Hoy persiste en un JSON local, que es suficiente para el volumen actual
 * (~320 pedidos/mes) y no obliga a montar infraestructura para salir a
 * producción. Cuando haga falta Postgres, se implementa `OrderRepository` con
 * el cliente de turno y se cambia la línea del final: ni el orquestador ni las
 * rutas de la API se enteran.
 *
 * Sobre concurrencia: las escrituras se serializan en una cola (`cadena`) para
 * que dos webhooks simultáneos no se pisen el archivo. Eso vale en un proceso
 * único. En serverless con varias instancias hay que pasar a una DB real —
 * está anotado en el README del módulo.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { env } from '@/lib/env';
import type { Order, OrderEvent } from './types';

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  byId(id: string): Promise<Order | null>;
  byReference(reference: string): Promise<Order | null>;
  byPaymentReference(reference: string): Promise<Order | null>;
  byTrackingNumber(trackingNumber: string): Promise<Order | null>;
  /** Aplica una mutación sobre el pedido de forma atómica dentro del proceso. */
  update(id: string, mutar: (order: Order) => Order | void): Promise<Order | null>;
  list(opciones?: { limite?: number }): Promise<Order[]>;
  /** Pedidos con pago pendiente cuyo TTL ya venció. */
  vencidos(ahora?: Date): Promise<Order[]>;
}

// --------------------------------------------------------------------------

interface Estado {
  pedidos: Map<string, Order>;
  cargado: boolean;
  /** Se apaga si el sistema de archivos es de solo lectura (serverless). */
  persistible: boolean;
  cadena: Promise<unknown>;
}

// El módulo se re-evalúa en cada recarga en caliente de Next; sin este cache
// global los pedidos en memoria se perderían en cada edición durante el dev.
const global_ = globalThis as typeof globalThis & { __verdeOrders?: Estado };

function estado(): Estado {
  if (!global_.__verdeOrders) {
    global_.__verdeOrders = {
      pedidos: new Map(),
      cargado: false,
      persistible: true,
      cadena: Promise.resolve(),
    };
  }
  return global_.__verdeOrders;
}

function rutaArchivo(): string {
  return path.isAbsolute(env.ordersFile)
    ? env.ordersFile
    : path.join(process.cwd(), env.ordersFile);
}

async function cargar(): Promise<Estado> {
  const st = estado();
  if (st.cargado) return st;

  try {
    const crudo = await fs.readFile(rutaArchivo(), 'utf-8');
    const lista = JSON.parse(crudo) as Order[];
    for (const pedido of lista) st.pedidos.set(pedido.id, pedido);
  } catch (error) {
    const codigo = (error as NodeJS.ErrnoException).code;
    if (codigo !== 'ENOENT') {
      console.warn('[orders] no se pudo leer el archivo de pedidos:', error);
    }
  }

  st.cargado = true;
  return st;
}

async function persistir(st: Estado): Promise<void> {
  if (!st.persistible) return;
  const destino = rutaArchivo();
  try {
    await fs.mkdir(path.dirname(destino), { recursive: true });
    const datos = JSON.stringify([...st.pedidos.values()], null, 2);
    // Escritura atómica: un corte de energía a mitad de camino no puede dejar
    // el archivo de pedidos truncado.
    const temporal = `${destino}.tmp`;
    await fs.writeFile(temporal, datos, 'utf-8');
    await fs.rename(temporal, destino);
  } catch (error) {
    st.persistible = false;
    console.error(
      '[orders] sistema de archivos de solo lectura: los pedidos quedan solo en memoria. ' +
        'Conecta una base de datos real antes de operar así.',
      error
    );
  }
}

/** Encola la operación para que dos escrituras nunca se solapen. */
function enCola<T>(operacion: () => Promise<T>): Promise<T> {
  const st = estado();
  const siguiente = st.cadena.then(operacion, operacion);
  // La cadena nunca debe romperse por un fallo de una operación individual.
  st.cadena = siguiente.catch(() => undefined);
  return siguiente;
}

// --------------------------------------------------------------------------

export const fileOrderRepository: OrderRepository = {
  async create(order) {
    return enCola(async () => {
      const st = await cargar();
      st.pedidos.set(order.id, order);
      await persistir(st);
      return order;
    });
  },

  async byId(id) {
    const st = await cargar();
    return st.pedidos.get(id) ?? null;
  },

  async byReference(reference) {
    const st = await cargar();
    const buscada = reference.trim().toUpperCase();
    for (const pedido of st.pedidos.values()) {
      if (pedido.reference.toUpperCase() === buscada) return pedido;
    }
    return null;
  },

  async byPaymentReference(reference) {
    const st = await cargar();
    const buscada = reference.trim().toUpperCase();
    for (const pedido of st.pedidos.values()) {
      if (pedido.payment.reference.toUpperCase() === buscada) return pedido;
    }
    return null;
  },

  async byTrackingNumber(trackingNumber) {
    const st = await cargar();
    for (const pedido of st.pedidos.values()) {
      if (pedido.shipment?.trackingNumber === trackingNumber) return pedido;
    }
    return null;
  },

  async update(id, mutar) {
    return enCola(async () => {
      const st = await cargar();
      const actual = st.pedidos.get(id);
      if (!actual) return null;

      // Copia profunda: el mutador no puede dejar el estado en memoria a medias
      // si lanza una excepción a mitad de camino.
      const copia = JSON.parse(JSON.stringify(actual)) as Order;
      const resultado = mutar(copia) ?? copia;
      resultado.updatedAt = new Date().toISOString();

      st.pedidos.set(id, resultado);
      await persistir(st);
      return resultado;
    });
  },

  async list(opciones = {}) {
    const st = await cargar();
    const todos = [...st.pedidos.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return opciones.limite ? todos.slice(0, opciones.limite) : todos;
  },

  async vencidos(ahora = new Date()) {
    const st = await cargar();
    const limite = ahora.toISOString();
    return [...st.pedidos.values()].filter(
      (pedido) =>
        pedido.payment.status === 'pending' &&
        pedido.payment.method !== 'COD' &&
        pedido.expiresAt < limite
    );
  },
};

/**
 * Punto único de cambio para migrar a una base de datos real:
 * `export const orders: OrderRepository = new PostgresOrderRepository(...)`.
 */
export const orders: OrderRepository = fileOrderRepository;

/** Agrega una entrada a la bitácora del pedido (muta el objeto recibido). */
export function registrar(
  order: Order,
  evento: Omit<OrderEvent, 'at'> & { at?: string }
): Order {
  order.timeline.push({ at: evento.at ?? new Date().toISOString(), ...evento });
  return order;
}
