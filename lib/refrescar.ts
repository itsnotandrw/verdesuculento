/**
 * Refresca las páginas públicas después de un cambio hecho en el admin.
 *
 * Las páginas del sitio se generan y se guardan en caché (se renuevan solas cada 60 s). Sin esto, un cupón,
 * una promoción, un precio o un producto oculto desde el admin tardaría hasta un minuto —o dos recargas— en verse.
 * Llamarlo justo después de guardar. SOLO SERVIDOR.
 */

import { revalidatePath } from 'next/cache';

export function refrescarSitio(): void {
  try {
    revalidatePath('/', 'layout');
  } catch {
    // Fuera de una petición (un script, por ejemplo) no hay caché de páginas que refrescar.
  }
}
