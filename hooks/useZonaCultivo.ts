'use client';

import { useEffect, useState } from 'react';
import { MUNICIPIOS, ZONA_KEY, cargarMunicipios, claveZona, pisoDe, type Municipio, type Piso } from '@/data/zonas';

/** Evento que ZoneSelector dispara cuando el cliente elige o quita su municipio (el storage no avisa a la misma pestaña). */
export const EVENTO_ZONA = 'verde-zona-cambio';

/** Zona de cultivo que el cliente eligió en el selector (municipio, su altitud y su piso térmico). */
export function useZonaCultivo(): { municipio: Municipio | null; msnm: number | null; piso: Piso | null } {
  const [municipio, setMunicipio] = useState<Municipio | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () => {
      let guardado: string | null = null;
      try { guardado = localStorage.getItem(ZONA_KEY); } catch { /* sin storage */ }
      if (!guardado) { setMunicipio(null); return; }
      const buscar = (lista: Municipio[]) => lista.find((m) => claveZona(m) === guardado) ?? lista.find((m) => m.name === guardado) ?? null;
      const rapido = buscar(MUNICIPIOS);
      if (rapido) { setMunicipio(rapido); return; }
      cargarMunicipios().then((lista) => { if (vivo) setMunicipio(buscar(lista)); });
    };
    leer();
    window.addEventListener(EVENTO_ZONA, leer);
    window.addEventListener('storage', leer);
    return () => { vivo = false; window.removeEventListener(EVENTO_ZONA, leer); window.removeEventListener('storage', leer); };
  }, []);

  return { municipio, msnm: municipio?.msnm ?? null, piso: municipio ? pisoDe(municipio.msnm) : null };
}
