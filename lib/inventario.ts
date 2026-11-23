/**
 * Inventario por producto con reserva atómica. SOLO SERVIDOR.
 *
 * Un producto SIN número aquí no tiene control (se vende sin límite, como hasta ahora). Con número, crear un pedido
 * descuenta las unidades en una sola operación atómica de Redis (script Lua): dos compras a la vez nunca se llevan la
 * última planta las dos. Las unidades vuelven al inventario si el pedido expira o no llega a crearse.
 *
 * El número vive en un hash propio (`verde:inventario`), no dentro del JSON del catálogo, justamente para poder
 * descontarlo sin carreras. Se edita desde el formulario del producto en el panel. Sin Redis (solo desarrollo) usa memoria.
 */

import { ValidationError } from '@/lib/api';
import { redis } from '@/lib/redis';

const CLAVE = 'verde:inventario';

const memoria = new Map<string, number>();

export interface LineaInventario {
  productId: string;
  qty: number;
}

/** Suma las líneas repetidas del mismo producto (color/talla distintos) para reservarlas juntas. */
function agrupar(lineas: LineaInventario[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lineas) m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty);
  return m;
}

// Para cada producto con control: si no alcanza, falla SIN tocar nada; si alcanza para todos, descuenta todos.
// Devuelve '' si salió bien, o "id|disponible" del primer producto que no alcanzó.
const LUA_RESERVAR = `
for i = 1, #ARGV, 2 do
  local d = redis.call('HGET', KEYS[1], ARGV[i])
  if d and tonumber(d) < tonumber(ARGV[i+1]) then return ARGV[i] .. '|' .. d end
end
for i = 1, #ARGV, 2 do
  if redis.call('HEXISTS', KEYS[1], ARGV[i]) == 1 then redis.call('HINCRBY', KEYS[1], ARGV[i], -tonumber(ARGV[i+1])) end
end
return ''`;

export async function reservar(
  lineas: LineaInventario[]
): Promise<{ ok: true } | { ok: false; productId: string; disponible: number }> {
  const grupos = agrupar(lineas);
  if (redis) {
    const args: (string | number)[] = [];
    grupos.forEach((qty, id) => args.push(id, qty));
    const r = (await redis.eval(LUA_RESERVAR, 1, CLAVE, ...args)) as string;
    if (!r) return { ok: true };
    const [productId, disp] = r.split('|');
    return { ok: false, productId, disponible: Math.max(0, Number(disp)) };
  }
  for (const [id, qty] of grupos) {
    const d = memoria.get(id);
    if (d !== undefined && d < qty) return { ok: false, productId: id, disponible: Math.max(0, d) };
  }
  for (const [id, qty] of grupos) if (memoria.has(id)) memoria.set(id, memoria.get(id)! - qty);
  return { ok: true };
}

/** Devuelve unidades (pedido que no llegó a existir o que expiró sin pagarse). Solo a productos con control. */
export async function liberar(lineas: LineaInventario[]): Promise<void> {
  const grupos = agrupar(lineas);
  for (const [id, qty] of grupos) {
    try {
      if (redis) {
        if ((await redis.hexists(CLAVE, id)) === 1) await redis.hincrby(CLAVE, id, qty);
      } else if (memoria.has(id)) memoria.set(id, memoria.get(id)! + qty);
    } catch (error) {
      console.error(`[inventario] no se pudieron devolver ${qty} unidad(es) de ${id}:`, error);
    }
  }
}

/** `null` = sin control de inventario. */
export async function obtenerStock(id: string): Promise<number | null> {
  if (redis) {
    const v = await redis.hget(CLAVE, id);
    return v === null ? null : Number(v);
  }
  return memoria.get(id) ?? null;
}

/** Fija las unidades disponibles. `null` quita el control (vende sin límite). */
export async function fijarStock(id: string, unidades: number | null): Promise<void> {
  if (unidades === null) {
    if (redis) await redis.hdel(CLAVE, id);
    else memoria.delete(id);
    return;
  }
  const n = Math.max(0, Math.floor(unidades));
  if (redis) await redis.hset(CLAVE, id, n);
  else memoria.set(id, n);
}

/** Convierte lo que llega del formulario ("", "12", 12, null) en número o null. `undefined` = no se tocó. */
export function leerStock(valor: unknown): number | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    throw new ValidationError('Las unidades disponibles deben ser un número entre 0 y 100000, o vacío para no controlar.');
  }
  return Math.floor(n);
}

/** Ids de los productos con control de inventario y 0 unidades (públicamente es lo único que se expone del inventario). */
export async function listarAgotados(): Promise<string[]> {
  if (redis) {
    const todo = await redis.hgetall(CLAVE);
    return Object.entries(todo).filter(([, v]) => Number(v) <= 0).map(([id]) => id);
  }
  return [...memoria.entries()].filter(([, v]) => v <= 0).map(([id]) => id);
}
