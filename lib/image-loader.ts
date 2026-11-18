/**
 * Cargador de imágenes propio (sin optimizador en el servidor).
 *
 * Las fotos de productos ya están preparadas en tres tamaños (scripts/optimizar-imagenes.mjs): este cargador solo
 * elige el archivo correcto, así que servir una imagen no gasta CPU ni depende de una caché que se pierde en cada
 * despliegue (con el optimizador de Next, cada despliegue empezaba con la caché vacía y las primeras visitas
 * recortaban fotos en vivo). Funciona igual en el servidor y en el navegador.
 */

const ANCHOS_PRODUCTO = [384, 768, 1280] as const;
const FOTO_PRODUCTO = /^\/images\/productos\/([^/]+)\/(\d+)\.(?:jpe?g|png)$/i;
const SUBIDA_ADMIN = /^\/api\/media\/([a-f0-9]{18})$/;

/** URL de la imagen en el tamaño que hace falta (para etiquetas <img> normales, el admin y los buscadores). */
export function urlImagen(src: string | null | undefined, ancho = 768): string {
  if (!src) return '';
  const foto = FOTO_PRODUCTO.exec(src);
  if (foto) {
    const w = ANCHOS_PRODUCTO.find((a) => a >= ancho) ?? ANCHOS_PRODUCTO[ANCHOS_PRODUCTO.length - 1];
    return `/images/productos/${foto[1]}/${foto[2]}-w${w}.webp`;
  }
  const subida = SUBIDA_ADMIN.exec(src);
  if (subida) return `${src}?w=${ancho <= 640 ? 640 : 1600}`;
  return src;
}

/** Foto para compartir en redes (JPG de 1200 px): WhatsApp y Facebook la leen mejor que un WebP. */
export function urlCompartir(src: string): string {
  const foto = FOTO_PRODUCTO.exec(src);
  if (foto && foto[2] === '1') return `/images/productos/${foto[1]}/1-og.jpg`;
  return urlImagen(src, 1280);
}

export default function cargadorImagen({ src, width }: { src: string; width: number; quality?: number }): string {
  const mapeada = urlImagen(src, width);
  if (mapeada !== src) return mapeada;
  // Otras imágenes ya vienen del tamaño adecuado: se sirven tal cual (el ?w= solo identifica la variante pedida)
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}
