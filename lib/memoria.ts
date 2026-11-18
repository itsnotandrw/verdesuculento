/**
 * Caché en memoria con vida corta, para no leer Redis (y volver a interpretar 230 KB de JSON) en cada petición.
 *
 *  - Vida corta (segundos): un cambio del admin se ve de inmediato en este mismo proceso (se invalida al guardar) y
 *    en cualquier otro a lo sumo tras `ttlMs`.
 *  - Una sola carga a la vez: si llegan 50 peticiones juntas, solo una va a Redis; las demás esperan ese resultado.
 *  - "Último valor bueno": si Redis falla, se sigue sirviendo lo último que se leyó bien (y se reintenta pronto) en
 *    vez de caer a datos viejos de ejemplo o dar error. Si nunca se leyó nada, la excepción sube a quien llama.
 */

export interface CacheTtl<T> {
  obtener(): Promise<T>;
  /** Fuerza que la próxima lectura vaya a Redis (se llama justo después de guardar). */
  invalidar(): void;
  /** Último valor leído bien, si lo hay. */
  ultimo(): T | undefined;
}

export function crearCacheTtl<T>(cargar: () => Promise<T>, ttlMs: number, nombre = 'cache'): CacheTtl<T> {
  let valor: T | undefined;
  let tieneValor = false;
  let venceEn = 0;
  let enVuelo: Promise<T> | null = null;
  let version = 0;

  async function obtener(): Promise<T> {
    if (tieneValor && Date.now() < venceEn) return valor as T;
    if (enVuelo) return enVuelo;

    const miVersion = version;
    enVuelo = cargar()
      .then((v) => {
        // Si alguien invalidó mientras se cargaba, este valor ya puede estar viejo: se usa pero no se retiene.
        if (miVersion === version) {
          valor = v;
          tieneValor = true;
          venceEn = Date.now() + ttlMs;
        }
        return v;
      })
      .catch((error) => {
        if (tieneValor) {
          console.error(`[${nombre}] Redis falló; sigo con el último valor bueno:`, error instanceof Error ? error.message : error);
          venceEn = Date.now() + Math.min(ttlMs, 5_000); // reintenta pronto
          return valor as T;
        }
        throw error;
      })
      .finally(() => {
        enVuelo = null;
      });
    return enVuelo;
  }

  return {
    obtener,
    invalidar() {
      version++;
      venceEn = 0;
    },
    ultimo: () => (tieneValor ? valor : undefined),
  };
}
