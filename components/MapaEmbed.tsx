'use client';

import { useEffect, useState } from 'react';
import { urlMapaEmbed, type OpcionesMapa } from '@/lib/mapas';

/**
 * Mapa de Google optimizado: carga diferida, esqueleto animado mientras llega, adaptado al modo oscuro
 * (no se invierte en vista satélite) y sin volver a crearse si no cambia la dirección.
 * El contenedor padre debe tener position: relative y tamaño.
 */
export default function MapaEmbed({ consulta, zoom, satelite = false, titulo }: OpcionesMapa & { titulo: string }) {
  const src = urlMapaEmbed({ consulta, zoom, satelite });
  const [listo, setListo] = useState(false);
  useEffect(() => setListo(false), [src]);
  return (
    <div className={`mapa-embed${satelite ? ' sat' : ''}${listo ? ' listo' : ''}`}>
      <div className="mapa-skel" aria-hidden="true" />
      <iframe
        key={src}
        title={titulo}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        onLoad={() => setListo(true)}
      />
    </div>
  );
}
