'use client';

import { useState } from 'react';
import { Layers, Navigation } from 'lucide-react';
import { CONTACTO } from '@/data/contacto';
import MapaEmbed from '@/components/MapaEmbed';
import { urlRuta } from '@/lib/mapas';

/**
 * Mapa de las sedes, siempre visible (sin tapa que haya que abrir): mapa interactivo de Google
 * (arrastrable, con zoom y satélite), con una pestaña por sede y el botón "Cómo llegar".
 */
export default function MapaPlegable() {
  const [sede, setSede] = useState<string>(CONTACTO.sedes[0].id);
  const [satelite, setSatelite] = useState(false);

  const sedeActual = CONTACTO.sedes.find((s) => s.id === sede) ?? CONTACTO.sedes[0];
  const consulta = sedeActual.consulta ?? (sedeActual.coords ? `${sedeActual.coords.lat},${sedeActual.coords.lng}` : sedeActual.direccion);
  const rutaUrl = urlRuta(sedeActual.coords ? `${sedeActual.coords.lat},${sedeActual.coords.lng}` : consulta);

  return (
    <div className="mp open">
      <div className="mp-mapa">
        <MapaEmbed consulta={consulta} zoom={satelite ? 17 : 16} satelite={satelite} titulo={`Mapa: ${sedeActual.nombre}`} />
        <div className="mp-tabs">
          {CONTACTO.sedes.map((s) => (
            <button type="button" key={s.id} className={sede === s.id ? 'on' : ''} onClick={() => setSede(s.id)}>{s.corto}</button>
          ))}
        </div>
        <div className="mp-bar">
          <span>{sedeActual.nombre}</span>
          <div>
            <button type="button" onClick={() => setSatelite((v) => !v)}><Layers size={14} aria-hidden="true" /> {satelite ? 'Mapa' : 'Satélite'}</button>
            <a href={rutaUrl} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Cómo llegar</a>
          </div>
        </div>
      </div>
    </div>
  );
}
