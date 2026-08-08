/**
 * Repositorio de pedidos en archivo JSON. Para desarrollo y servidor propio.
 *
 * Asume **un solo proceso**: las escrituras se serializan en una cola interna.
 * Eso vale corriendo `next start` en una máquina, y no vale en serverless,
 * donde cada ruta es una función distinta con su propia memoria y su propio
 * disco efímero. Para eso está `kv.ts`.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { env } from '@/lib/env';
import type { Order } from '../types';
import type { OrderRepository } from '../store';

interface Estado {
  pedidos: Map<string, Order>;
  cargado: boolean;
  /** Se apaga si el sistema de archivos es de solo lectura. */
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
    for (const pedido of JSON.parse(crudo) as Order[]) st.pedidos.set(pedido.id, pedido);
  } catch (error) {
    const codigo = (error as NodeJS.ErrnoException).code;
    if (codigo !== 'ENOENT') {
      console.warn('[orders/archivo] no se pudo leer el archivo de pedidos:', error);
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
    // Escritura atómica: un corte a mitad de camino no puede dejar el archivo
    // de pedidos truncado.
    const temporal = `${destino}.tmp`;
    await fs.writeFile(temporal, JSON.stringify([...st.pedidos.values()], null, 2), 'utf-8');
    await fs.rename(temporal, destino);
  } catch (error) {
    st.persistible = false;
    console.error('[orders/archivo] sistema de archivos de solo lectura:', error);
  }
}

/** Encola la operación para que dos escrituras nunca se solapen. */
function enCola<T>(operacion: () => Promise<T>): Promise<T> {
  const st = estado();
  const siguiente = st.cadena.then(operacion, operacion);
  st.cadena = siguiente.catch(() => undefined);
  return siguiente;
}

function buscar(st: Estado, predicado: (o: Order) => boolean): Order | null {
  for (const pedido of st.pedidos.values()) {
    if (predicado(pedido)) return pedido;
  }
  return null;
}

export const archivoRepository: OrderRepository = {
  id: 'archivo',
  durable: false,

  async create(order) {
    return enCola(async () => {
      const st = await cargar();
      st.pedidos.set(order.id, order);
      await persistir(st);
      return order;
    });
  },

  async byId(id) {
    return (await cargar()).pedidos.get(id) ?? null;
  },

  async byReference(reference) {
    const buscada = reference.trim().toUpperCase();
    return buscar(await cargar(), (o) => o.reference.toUpperCase() === buscada);
  },

  async byPaymentReference(reference) {
    const buscada = reference.trim().toUpperCase();
    return buscar(await cargar(), (o) => o.payment.reference.toUpperCase() === buscada);
  },

  async byTrackingNumber(trackingNumber) {
    return buscar(await cargar(), (o) => o.shipment?.trackingNumber === trackingNumber);
  },

  async update(id, mutar) {
    return enCola(async () => {
      const st = await cargar();
      const actual = st.pedidos.get(id);
      if (!actual) return null;

      // Copia profunda: si el mutador lanza a mitad de camino, el estado en
      // memoria no queda a medias.
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
};
