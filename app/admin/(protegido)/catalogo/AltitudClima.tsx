'use client';

/**
 * Altitud recomendada de la publicación (msnm) — OBLIGATORIA. Es el único dato de clima del producto y manda en
 * todo el sitio: clima de la planta, filtros y etiquetas del catálogo, recomendación por zona de cultivo y categorías.
 * Los checks de clima no se guardan aparte: reflejan la altitud, y marcarlos solo mueve el rango.
 */

import { PISO_INFO, pisoDe } from '@/data/zonas';
import { ALTITUD_FRONTERA, ALTITUD_MAX, ALTITUD_PASO, CLIMA_LABEL, climasDeAltitud, type RangoAltitud } from '@/lib/clima';

const fmt = (n: number) => n.toLocaleString('es-CO');

export default function AltitudClima({
  valor,
  confirmada,
  onChange,
}: {
  valor: RangoAltitud;
  /** false = publicación antigua sin altitud: se muestra una sugerencia que hay que confirmar tocando el rango o un clima. */
  confirmada: boolean;
  onChange: (v: RangoAltitud) => void;
}) {
  const climas = climasDeAltitud(valor);
  const calido = climas.includes('calido');
  const frio = climas.includes('frio');
  const pctMin = (valor.min / ALTITUD_MAX) * 100;
  const pctMax = (valor.max / ALTITUD_MAX) * 100;
  const pisos = Array.from(new Set([pisoDe(valor.min), pisoDe(valor.max)]));

  const alternarCalido = () => {
    if (!calido) return onChange({ min: 0, max: valor.max });
    if (!frio) return onChange({ ...valor }); // siempre queda al menos un clima
    onChange({ min: Math.max(valor.min, ALTITUD_FRONTERA), max: valor.max });
  };
  const alternarFrio = () => {
    if (!frio) return onChange({ min: valor.min, max: 2500 });
    if (!calido) return onChange({ ...valor });
    onChange({ min: valor.min, max: Math.min(valor.max, ALTITUD_FRONTERA - ALTITUD_PASO) });
  };

  const pill = (activo: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', padding: '8px 14px', borderRadius: 999,
    border: `1px solid ${activo ? 'var(--accent)' : 'var(--border-strong)'}`,
  });

  return (
    <div style={{ display: 'grid', gap: 12, padding: 16, border: `1px solid ${confirmada ? 'var(--border)' : '#c64040'}`, borderRadius: 12 }}>
      <div>
        <div className="checkout-label" style={{ marginBottom: 4 }}>Altitud recomendada (msnm) · obligatorio</div>
        <p style={{ fontSize: 12.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
          Es el dato que manda en todo el sitio: el clima de la planta, los filtros y etiquetas del catálogo, las categorías y la recomendación cuando el cliente elige su zona de cultivo.
        </p>
        {!confirmada && (
          <p role="alert" style={{ fontSize: 12.5, color: '#c64040', marginTop: 6 }}>
            Esta publicación todavía no tiene altitud. Mueve el rango o elige un clima para confirmarla; sin eso no se puede guardar.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={pill(calido)}>
          <input type="checkbox" checked={calido} onChange={alternarCalido} />
          {CLIMA_LABEL.calido}
        </label>
        <label style={pill(frio)}>
          <input type="checkbox" checked={frio} onChange={alternarFrio} />
          {CLIMA_LABEL.frio}
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ min: 0, max: 2500 })}>Los dos climas</button>
      </div>

      <div className="dual-range" style={{ ['--a' as string]: `${pctMin}%`, ['--b' as string]: `${pctMax}%` }}>
        <div className="dual-range-pista"><i /></div>
        <input
          type="range" min={0} max={ALTITUD_MAX} step={ALTITUD_PASO} value={valor.min}
          aria-label="Altitud mínima recomendada (msnm)"
          onChange={(e) => onChange({ min: Math.min(Number(e.target.value), valor.max - ALTITUD_PASO), max: valor.max })}
        />
        <input
          type="range" min={0} max={ALTITUD_MAX} step={ALTITUD_PASO} value={valor.max}
          aria-label="Altitud máxima recomendada (msnm)"
          onChange={(e) => onChange({ min: valor.min, max: Math.max(Number(e.target.value), valor.min + ALTITUD_PASO) })}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
        <span className="mono"><b>{fmt(valor.min)}</b> a <b>{fmt(valor.max)}</b> msnm</span>
        <span style={{ color: 'var(--fg-mute)' }}>{pisos.map((p) => PISO_INFO[p].label).join(' + ')}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
        Cálido: menos de 1.000 · Templado: 1.000 a 2.000 · Frío: más de 2.000 msnm. A un cliente se le recomienda esta planta si la altitud de su municipio cae dentro de este rango.
      </p>
    </div>
  );
}
