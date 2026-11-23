'use client';

/**
 * Botón «Ver mi cupón» → ventana emergente con el código (copiable), sus condiciones y cómo usarlo.
 * Reemplaza la línea de texto suelta que había bajo el título de la oferta.
 */

import { useEffect, useState } from 'react';
import { formatCOP } from '@/data/catalog';
import { bloquearScroll, desbloquearScroll } from '@/lib/scroll-lock';

interface Props { code: string; pct: number; minPurchase?: number; maxDiscount?: number; hasta?: string | null }

export default function CuponAyuda({ code, pct, minPurchase, maxDiscount, hasta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    bloquearScroll();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('keydown', tecla); desbloquearScroll(); };
  }, [abierto]);

  const copiar = async () => {
    try { await navigator.clipboard.writeText(code); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles: se puede copiar a mano */ }
  };

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 18 }} onClick={() => setAbierto(true)}>
        Ver mi cupón y cómo usarlo
      </button>
      {abierto && (
        <div className="modal-overlay open" role="dialog" aria-modal="true" aria-label="Tu cupón" onClick={() => setAbierto(false)}>
          <div className="modal" style={{ maxWidth: 460, display: 'block', padding: 28, overflowY: 'auto', opacity: 1, transform: 'none' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setAbierto(false)} aria-label="Cerrar">×</button>
            <div className="eyebrow" style={{ marginBottom: 10 }}>TU CUPÓN · {pct}% OFF</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent)' }}>{code}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copiar}>{copiado ? '¡Copiado!' : 'Copiar'}</button>
            </div>

            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Cómo usarlo</h3>
            <ol style={{ listStyle: 'decimal', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-dim)', marginBottom: 18 }}>
              <li>Agrega al carrito productos de este catálogo.</li>
              <li>En el carrito, en el recuadro «¿Tienes un cupón?», escribe el código y pulsa <b>Aplicar</b>.</li>
              <li>Verás el ahorro antes de pagar.</li>
            </ol>

            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Condiciones</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-dim)' }}>
              <li><b>Solo para tu primera compra.</b></li>
              {minPurchase ? <li>Compra mínima de {formatCOP(minPurchase)}.</li> : null}
              {maxDiscount ? <li>Descuento máximo de {formatCOP(maxDiscount)}.</li> : null}
              <li>Aplica a los productos de este catálogo.</li>
              <li>No se suma a las promociones: en una compra vale uno solo.</li>
              {hasta ? <li>Disponible hasta el {hasta}.</li> : null}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
