/**
 * Id sintético de la opción "recoger en tienda". Compartido entre el
 * checkout (componente cliente) y el orquestador (servidor) — vive en su
 * propio archivo, sin importar `env` ni ningún adaptador, para que un
 * componente cliente lo pueda importar sin arrastrar código de servidor.
 */
export const RECOGER_TIENDA_QUOTE_ID = 'pickup:tienda:recoger';

/**
 * Dirección de recogida, para mostrarle al cliente en el checkout. Mismo
 * lugar que `SHIPPING_ORIGIN_*` en lib/env.ts (Cl. 1 #10, Soacha,
 * Cundinamarca) — duplicado a mano porque el checkout es un componente
 * cliente y no puede leer variables de entorno de servidor. Si la bodega se
 * muda, actualizar los dos lugares.
 */
export const DIRECCION_RECOGIDA = {
  direccion: 'Cl. 1 #10',
  ciudad: 'Soacha',
  departamento: 'Cundinamarca',
};
