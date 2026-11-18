/**
 * Puntos de entrada de Next (se ejecutan al arrancar y ante cualquier error no controlado). La lógica vive en
 * instrumentation-node.ts porque usa Node (crypto, Redis) y este archivo también se compila para el entorno edge.
 */

export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routeType?: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registrarError } = await import('./instrumentation-node');
    await registrarError(err, request, context);
  }
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciar } = await import('./instrumentation-node');
    await iniciar();
  }
}
