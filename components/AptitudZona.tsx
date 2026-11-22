'use client';

import { MapPin } from 'lucide-react';
import { useZonaCultivo } from '@/hooks/useZonaCultivo';
import { CLIMA_LABEL, climaDeMsnm, type Clima } from '@/lib/clima';
import type { Product } from '@/types';

const fmt = (n: number) => n.toLocaleString('es-CO');

/**
 * ¿Esta planta se da en la zona de cultivo del cliente? Compara la altitud del municipio que eligió (msnm) con la
 * altitud recomendada de la planta; si no tiene altitud definida, con su clima (cálido / frío a templado / los dos).
 */
export default function AptitudZona({ altitud, climas }: { altitud?: Product['altitud']; climas: Clima[] }) {
  const { municipio, msnm } = useZonaCultivo();
  const resumen = altitud ? `${fmt(altitud.min)} a ${fmt(altitud.max)} msnm` : climas.map((c) => CLIMA_LABEL[c]).join(' y ');

  let estado: 'apta' | 'cerca' | 'fuera' | null = null;
  if (msnm !== null) {
    if (altitud) {
      if (msnm >= altitud.min && msnm <= altitud.max) estado = 'apta';
      else if (msnm >= altitud.min - 300 && msnm <= altitud.max + 300) estado = 'cerca';
      else estado = 'fuera';
    } else {
      estado = climas.includes(climaDeMsnm(msnm)) ? 'apta' : 'fuera';
    }
  }

  const texto =
    estado === 'apta' ? `Recomendada para ${municipio!.name} (${fmt(msnm!)} msnm)` :
    estado === 'cerca' ? `En ${municipio!.name} (${fmt(msnm!)} msnm) está cerca del rango ideal: puede darse con cuidados` :
    estado === 'fuera' ? `${municipio!.name} (${fmt(msnm!)} msnm) queda fuera del clima ideal de esta planta` :
    'Elige tu municipio arriba para saber si se da en tu zona';

  const color = estado === 'apta' ? 'var(--accent)' : estado === 'fuera' ? '#c64040' : estado === 'cerca' ? '#b87a1e' : 'var(--fg-dim)';

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: `1px solid ${color}`, borderRadius: 10, fontSize: 13, lineHeight: 1.45 }}>
      <MapPin size={16} aria-hidden="true" style={{ color, flexShrink: 0, marginTop: 2 }} />
      <span>
        <strong style={{ color }}>{texto}.</strong>
        <span style={{ display: 'block', color: 'var(--fg-dim)', fontSize: 12, marginTop: 2 }}>{altitud ? 'Altitud recomendada' : 'Clima'}: {resumen}</span>
      </span>
    </div>
  );
}
