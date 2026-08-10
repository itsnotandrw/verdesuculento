'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCOP, FREE_SHIPPING_FROM } from '@/data/catalog';
import { useRemoveAnimation } from '@/lib/useRemoveAnimation';
import ProductShape from './ProductShape';

export default function MiniCart() {
  const { items, open, setOpen, updateQty, remove, subtotal, count } = useCart();
  const { removingKeys, registrarFila, handleRemove } = useRemoveAnimation(remove);
  // Sin destino todavía no hay forma de saber el costo real de envío — se
  // calcula en el checkout con las dimensiones exactas del pedido. Aquí solo
  // se muestra el umbral de envío gratis, que sí es un dato cierto sin
  // necesitar dirección.
  const faltaParaEnvioGratis = Math.max(0, FREE_SHIPPING_FROM - subtotal);
  const envioGratisAplicado = faltaParaEnvioGratis === 0;

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, setOpen]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => document.body.classList.remove('scroll-locked');
  }, [open]);

  return (
    <>
      <div className={`minicart-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`minicart ${open ? 'open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Carrito de compras">
        <div className="minicart-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Carrito</div>
            <div className="display" style={{ fontSize: 32 }}>
              {count} {count === 1 ? 'producto' : 'productos'}
            </div>
          </div>
          <button className="nav-icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar carrito">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="minicart-body">
          {items.length === 0 ? (
            <div className="minicart-empty">
              <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.3 }}>🌱</div>
              <div>Tu carrito aún está vacío.</div>
              <Link
                href="/catalogo"
                className="btn btn-ghost"
                style={{ marginTop: 24 }}
                onClick={() => setOpen(false)}
              >
                Explorar catálogo →
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                className={`minicart-item ${removingKeys.has(item.variantKey) ? 'removing' : ''}`}
                key={item.variantKey}
                ref={registrarFila(item.variantKey)}
              >
                <div className="minicart-item-img">
                  <ProductShape product={item.product} activeColorHex={item.color.hex} />
                </div>
                <div>
                  <div className="minicart-item-name">{item.product.name}</div>
                  <div className="minicart-item-meta">{item.color.name} · {item.size}</div>
                  <div className="minicart-qty">
                    <button onClick={() => updateQty(item.variantKey, -1)} aria-label={`Reducir cantidad de ${item.product.name}`}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.variantKey, 1)} aria-label={`Aumentar cantidad de ${item.product.name}`}>+</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="minicart-item-price">{formatCOP(item.product.price * item.qty)}</div>
                  <button
                    onClick={() => handleRemove(item.variantKey)}
                    aria-label={`Quitar ${item.product.name} del carrito`}
                    style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="minicart-footer">
            <div className="minicart-row total">
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
              + envío, calculado en el checkout según tu dirección
            </div>
            <div style={{ fontSize: 12.5, color: envioGratisAplicado ? 'var(--accent)' : 'var(--fg-dim)', marginBottom: 16, lineHeight: 1.5 }}>
              {envioGratisAplicado
                ? '✓ Envío gratis aplicado'
                : `Te faltan ${formatCOP(faltaParaEnvioGratis)} para envío gratis`}
            </div>
            <Link
              href="/checkout"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setOpen(false)}
            >
              Finalizar compra <span className="btn-arrow">→</span>
            </Link>
            <Link
              href="/catalogo"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => setOpen(false)}
            >
              Seguir comprando
            </Link>
            <Link
              href="/carrito"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => setOpen(false)}
            >
              Ver carrito completo
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
