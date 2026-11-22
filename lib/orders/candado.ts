/**
 * Candado por clave con vencimiento. SOLO SERVIDOR.
 *
 * Sirve para trabajos que cuestan dinero y no pueden correr dos veces a la vez (comprar una guía a la
 * transportadora): el cerrojo de escritura de los pedidos solo protege el guardado, no la llamada externa.
 * Con Redis es global entre procesos; sin Redis (desarrollo, un solo proceso) es un candado en memoria.
 */

import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';

const enMemoria = new Map<string, number>();

/** Devuelve la función que libera el candado, o `null` si otro ya lo tiene. */
export async function tomarCandado(clave: string, segundos: number): Promise<(() => Promise<void>) | null> {
  if (redis) {
    const k = `candado:${clave}`;
    const propio = randomUUID();
    const tomado = await redis.set(k, propio, 'EX', segundos, 'NX');
    if (tomado !== 'OK') return null;
    return async () => {
      // Solo se libera si sigue siendo nuestro (si venció y lo tomó otro, no se le quita).
      const actual = await redis!.get(k).catch(() => null);
      if (actual === propio) await redis!.del(k).catch(() => undefined);
    };
  }
  const vence = enMemoria.get(clave);
  if (vence && vence > Date.now()) return null;
  enMemoria.set(clave, Date.now() + segundos * 1000);
  return async () => {
    enMemoria.delete(clave);
  };
}
