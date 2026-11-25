'use client';

/**
 * Subida de imágenes desde el panel (navegador). Una foto de celular pesa 4–12 MB y de eso dependía que «no se pudiera
 * subir»: antes de enviarla se reduce a un máximo de 2.200 px en su lado largo (sobra para el sitio, que la vuelve a
 * convertir a WebP en 640 y 1.600 px) y casi siempre queda por debajo de 1 MB. También corrige la orientación y convierte
 * formatos que el servidor no lee (por ejemplo HEIC de iPhone) cuando el navegador los puede abrir.
 */

const MAX_LADO = 2200;
const ACEPTADOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function reducir(file: File): Promise<File> {
  try {
    const mapa = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const escala = Math.min(1, MAX_LADO / Math.max(mapa.width, mapa.height));
    const ancho = Math.max(1, Math.round(mapa.width * escala));
    const alto = Math.max(1, Math.round(mapa.height * escala));
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(mapa, 0, 0, ancho, alto);
    mapa.close?.();

    const aBlob = (tipo: string, calidad: number) => new Promise<Blob | null>((r) => lienzo.toBlob(r, tipo, calidad));
    let blob = await aBlob('image/webp', 0.88);
    if (!blob || blob.type !== 'image/webp') {
      // Safari antiguo no codifica WebP: JPEG sobre fondo blanco.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, ancho, alto);
      blob = await aBlob('image/jpeg', 0.88);
    }
    if (!blob) return file;

    // Si la original ya es chica y de un tipo válido, se manda tal cual (no se recomprime sin necesidad).
    if (ACEPTADOS.has(file.type) && file.size <= 1.5 * 1024 * 1024 && escala === 1) return file;
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, { type: blob.type });
  } catch {
    return file; // el navegador no pudo abrirla: se manda la original y el servidor decide
  }
}

/** Sube una imagen al sitio y devuelve su dirección (`/api/media/<id>`). Lanza un Error con mensaje para mostrar. */
export async function subirImagen(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(archivo.name)) {
    throw new Error('Ese archivo no es una imagen. Usa JPG, PNG o WebP.');
  }
  const listo = await reducir(archivo);
  const form = new FormData();
  form.append('file', listo);

  let respuesta: Response;
  try {
    respuesta = await fetch('/api/admin/media', { method: 'POST', body: form });
  } catch {
    throw new Error('No se pudo subir: revisa tu conexión e intenta de nuevo.');
  }
  const datos = (await respuesta.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (respuesta.status === 401) throw new Error('Tu sesión venció. Recarga la página e ingresa de nuevo.');
  if (!respuesta.ok || !datos?.url) {
    throw new Error(datos?.error ?? (respuesta.status === 413 ? 'La imagen es demasiado pesada.' : 'No se pudo subir la imagen. Intenta de nuevo.'));
  }
  return datos.url;
}
