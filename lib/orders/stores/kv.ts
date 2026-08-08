/**
 * Repositorio de pedidos sobre Redis por API REST (Upstash / Vercel KV).
 *
 * Es el adaptador de producción. En serverless cada ruta es una función
 * distinta —`/api/orders` y `/pedido/[referencia]` no comparten memoria ni
 * disco—, así que guardar en un archivo local significa que el pedido se crea
 * en una función y desaparece para todas las demás.
 *
 * Se habla el protocolo REST directamente con `fetch` en vez de instalar un
 * SDK: son dos endpoints y así el proyecto no gana una dependencia por algo
 * que cabe en 200 líneas.
 *
 * Claves:
 *   pedido:{id}        el pedido completo en JSON
 *   ref:{REFERENCIA}   → id          (índice del código que ve el cliente)
 *   pagoref:{REF}      → id          (índice de la referencia de pago)
 *   guia:{tracking}    → id          (índice del número de guía)
 *   pedidos            lista de ids, más reciente primero
 *   bloqueo:{id}       cerrojo de escritura
 */

import { randomUUID } from 'crypto';
import { env } from '@/lib/env';
import type { Order } from '../types';
import type { OrderRepository } from '../store';

type Comando = (string | number)[];

function credenciales() {
  const { url, token } = env.kv;
  if (!url || !token) {
    throw new Error(
      '[orders/kv] faltan las credenciales de Redis. Configura KV_REST_API_URL y ' +
        'KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN).'
    );
  }
  return { url: url.replace(/\/$/, ''), token };
}

async function pedir<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const { url, token } = credenciales();

  const respuesta = await fetch(`${url}${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    cache: 'no-store',
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`[orders/kv] ${respuesta.status} ${detalle.slice(0, 300)}`);
  }

  return (await respuesta.json()) as T;
}

/** Un solo comando. */
async function cmd<T = unknown>(comando: Comando): Promise<T> {
  const salida = await pedir<{ result?: T; error?: string }>('', comando);
  if (salida.error) throw new Error(`[orders/kv] ${salida.error}`);
  return salida.result as T;
}

/** Varios comandos en una sola ida y vuelta. */
async function tuberia<T = unknown>(comandos: Comando[]): Promise<T[]> {
  if (comandos.length === 0) return [];
  const salida = await pedir<Array<{ result?: T; error?: string }>>('/pipeline', comandos);
  return salida.map((r) => {
    if (r.error) throw new Error(`[orders/kv] ${r.error}`);
    return r.result as T;
  });
}

const clavePedido = (id: string) => `pedido:${id}`;
const claveRef = (ref: string) => `ref:${ref.trim().toUpperCase()}`;
const clavePagoRef = (ref: string) => `pagoref:${ref.trim().toUpperCase()}`;
const claveGuia = (n: string) => `guia:${n}`;
const LISTA = 'pedidos';

/**
 * Escribe los índices secundarios. Se llama en cada escritura porque la
 * referencia de pago cambia al reintentar y el número de guía aparece después.
 * Las claves viejas se dejan apuntando al mismo pedido: no estorban y sirven
 * si el cliente transfiere con una referencia anterior.
 */
function comandosIndice(order: Order): Comando[] {
  const comandos: Comando[] = [
    ['SET', claveRef(order.reference), order.id],
    ['SET', clavePagoRef(order.payment.reference), order.id],
  ];
  if (order.shipment?.trackingNumber) {
    comandos.push(['SET', claveGuia(order.shipment.trackingNumber), order.id]);
  }
  return comandos;
}

async function leer(id: string): Promise<Order | null> {
  const crudo = await cmd<string | null>(['GET', clavePedido(id)]);
  if (!crudo) return null;
  return typeof crudo === 'string' ? (JSON.parse(crudo) as Order) : (crudo as Order);
}

async function porIndice(clave: string): Promise<Order | null> {
  const id = await cmd<string | null>(['GET', clave]);
  return id ? leer(id) : null;
}

/**
 * Cerrojo de escritura.
 *
 * Redis es de un solo hilo, pero un ciclo leer-modificar-escribir no lo es: dos
 * confirmaciones simultáneas podrían leer ambas `shipment: undefined` y generar
 * dos guías, que se pagan las dos. El TTL corto evita que un proceso caído deje
 * el pedido bloqueado para siempre.
 */
async function conBloqueo<T>(id: string, operacion: () => Promise<T>): Promise<T> {
  const clave = `bloqueo:${id}`;
  const propio = randomUUID();

  for (let intento = 0; intento < 30; intento++) {
    const tomado = await cmd<string | null>(['SET', clave, propio, 'NX', 'EX', 10]);

    if (tomado === 'OK') {
      try {
        return await operacion();
      } finally {
        // Solo se libera si el cerrojo sigue siendo nuestro: si ya expiró y lo
        // tomó otro, borrarlo sería quitarle el turno.
        const actual = await cmd<string | null>(['GET', clave]).catch(() => null);
        if (actual === propio) await cmd(['DEL', clave]).catch(() => undefined);
      }
    }

    await new Promise((r) => setTimeout(r, 60 + Math.random() * 90));
  }

  throw new Error(`[orders/kv] no se pudo tomar el cerrojo del pedido ${id}.`);
}

export const kvRepository: OrderRepository = {
  id: 'kv',
  durable: true,

  async create(order) {
    await tuberia([
      ['SET', clavePedido(order.id), JSON.stringify(order)],
      ...comandosIndice(order),
      ['LPUSH', LISTA, order.id],
    ]);
    return order;
  },

  byId: leer,

  byReference: (reference) => porIndice(claveRef(reference)),
  byPaymentReference: (reference) => porIndice(clavePagoRef(reference)),
  byTrackingNumber: (trackingNumber) => porIndice(claveGuia(trackingNumber)),

  async update(id, mutar) {
    return conBloqueo(id, async () => {
      const actual = await leer(id);
      if (!actual) return null;

      const resultado = mutar(actual) ?? actual;
      resultado.updatedAt = new Date().toISOString();

      await tuberia([
        ['SET', clavePedido(id), JSON.stringify(resultado)],
        ...comandosIndice(resultado),
      ]);
      return resultado;
    });
  },

  async list(opciones = {}) {
    const limite = opciones.limite ?? 200;
    const ids = await cmd<string[]>(['LRANGE', LISTA, 0, limite - 1]);
    if (!ids?.length) return [];

    const crudos = await cmd<Array<string | null>>(['MGET', ...ids.map(clavePedido)]);

    return crudos
      .filter((c): c is string => Boolean(c))
      .map((c) => (typeof c === 'string' ? (JSON.parse(c) as Order) : (c as Order)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};

/** Comprobación de conectividad para el diagnóstico del panel. */
export async function kvDisponible(): Promise<boolean> {
  try {
    await cmd(['PING']);
    return true;
  } catch (error) {
    console.error('[orders/kv] sin conexión:', error);
    return false;
  }
}
