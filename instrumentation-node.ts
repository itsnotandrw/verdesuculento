/**
 * Se ejecuta al arrancar el servidor y ante CUALQUIER error no controlado (páginas y APIs).
 *
 *  1) onRequestError: deja el error en el log (Railway) y en una lista de Redis que el admin puede leer
 *     (/api/admin/errores), para enterarse de fallos reales sin tener que revisar ruta por ruta.
 *  2) register: unos segundos después de arrancar, pide refrescar todas las páginas. Durante `next build` no hay
 *     Redis, así que cada despliegue publica páginas con los datos de ejemplo del catálogo estático; sin esto, la
 *     primera visita tras un despliegue las vería hasta que se renovaran solas.
 */

export async function registrarError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routeType?: string },
): Promise<void> {
  try {
    const e = err as { digest?: string; message?: string; stack?: string };
    const digest = typeof e?.digest === 'string' ? e.digest : '';
    const mensaje = e?.message ?? String(err);
    // Next usa errores especiales para redirigir / "no encontrado": no son fallos
    if (digest.startsWith('NEXT_') || digest === 'DYNAMIC_SERVER_USAGE' || /NEXT_REDIRECT|NEXT_NOT_FOUND/.test(mensaje)) return;

    const registro = {
      t: new Date().toISOString(),
      mensaje: mensaje.slice(0, 500),
      ruta: request?.path ?? '',
      metodo: request?.method ?? '',
      tipo: context?.routeType ?? '',
      digest,
      pila: (e?.stack ?? '').split('\n').slice(0, 6).join('\n'),
    };
    console.error('[error-servidor]', JSON.stringify(registro));

    const { redis } = await import('./lib/redis');
    if (redis) {
      await redis.lpush('verde:errores', JSON.stringify(registro));
      await redis.ltrim('verde:errores', 0, 199);
    }
  } catch {
    // El registro de errores nunca puede romper la respuesta
  }
}

export async function iniciar(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    const { firmaRefresco } = await import('./lib/refrescar-arranque');
    const firma = firmaRefresco();
    if (!firma) return;
    const puerto = process.env.PORT || '3000';
    // Se reintenta unas veces: Redis y el servidor pueden tardar unos segundos en estar listos
    for (const espera of [4_000, 12_000, 30_000]) {
      setTimeout(() => {
        fetch(`http://127.0.0.1:${puerto}/api/interno/refrescar`, { method: 'POST', headers: { 'x-refresco': firma }, cache: 'no-store' }).catch(() => undefined);
      }, espera).unref?.();
    }
  } catch {
    // Sin refresco inicial el sitio sigue funcionando: se renueva solo en 60 s
  }
}
