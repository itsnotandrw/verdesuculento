/** Utilidades de Google Maps (visor embebido sin clave): una sola fuente para URLs y precalentado de conexión. */

export interface OpcionesMapa {
  /** Dirección o "lat,lng". */
  consulta: string;
  zoom?: number;
  satelite?: boolean;
}

export const urlMapaEmbed = ({ consulta, zoom = 16, satelite = false }: OpcionesMapa) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(consulta)}&z=${zoom}&t=${satelite ? 'k' : 'm'}&hl=es&output=embed`;

export const urlRuta = (consulta: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consulta)}`;

export const urlAbrirMapa = (consulta: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;

let calentado = false;
/** Abre la conexión con Google antes de que el visitante pida el mapa (se llama al acercar el cursor al botón). */
export function precalentarMapas() {
  if (calentado || typeof document === 'undefined') return;
  calentado = true;
  for (const href of ['https://www.google.com', 'https://maps.gstatic.com']) {
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    l.crossOrigin = '';
    document.head.appendChild(l);
  }
}
