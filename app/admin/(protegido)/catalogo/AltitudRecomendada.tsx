'use client';

/**
 * Altitud recomendada de una planta (metros sobre el nivel del mar), con un deslizable de dos extremos.
 * Sirve para dos cosas en la tienda: sugerir la planta cuando el cliente elige su zona de cultivo (el municipio trae su msnm)
 * y decidir a qué altura queda el punto de la planta en las imágenes interactivas del inicio.
 */

import { PISO_INFO, pisoDe } from '@/data/zonas';
import { ALTITUD_MAX, type RangoAltitud } from './InteraccionInicio';

const PASO = 50;
const fmt = (n: number) => n.toLocaleString('es-CO');

export default function AltitudRecomendada({ valor, onChange }: { valor: RangoAltitud | null; onChange: (v: RangoAltitud | null) => void }) {
  const pctMin = valor ? (valor.min / ALTITUD_MAX) * 100 : 0;
  const pctMax = valor ? (valor.max / ALTITUD_MAX) * 100 : 100;
  const pisos = valor ? Array.from(new Set([pisoDe(valor.min), pisoDe(valor.max)])) : [];

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', width: 'fit-content' }}>
        <input type="checkbox" checked={Boolean(valor)} onChange={(e) => onChange(e.target.checked ? { min: 1000, max: 2000 } : null)} />
        Definir la altitud recomendada (msnm)
      </label>

      {valor && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="dual-range" style={{ ['--a' as string]: `${pctMin}%`, ['--b' as string]: `${pctMax}%` }}>
            <div className="dual-range-pista"><i /></div>
            <input
              type="range" min={0} max={ALTITUD_MAX} step={PASO} value={valor.min}
              aria-label="Altitud mínima recomendada (msnm)"
              onChange={(e) => onChange({ min: Math.min(Number(e.target.value), valor.max - PASO), max: valor.max })}
            />
            <input
              type="range" min={0} max={ALTITUD_MAX} step={PASO} value={valor.max}
              aria-label="Altitud máxima recomendada (msnm)"
              onChange={(e) => onChange({ min: valor.min, max: Math.max(Number(e.target.value), valor.min + PASO) })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            <span className="mono"><b>{fmt(valor.min)}</b> a <b>{fmt(valor.max)}</b> msnm</span>
            <span style={{ color: 'var(--fg-mute)' }}>
              {pisos.map((p) => PISO_INFO[p].label).join(' + ')}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
            Cálido: menos de 1.000 · Templado: 1.000 a 2.000 · Frío: más de 2.000 msnm. Cuando un cliente elige su municipio, esta planta se le
            recomienda si su altitud cae dentro de este rango.
          </p>
        </div>
      )}
    </div>
  );
}
