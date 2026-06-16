'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatCOP } from '@/data/catalog';
import ProductShape from './ProductShape';

export default function MiniCart() {
  const { items, open, setOpen, updateQty, remove, subtotal, count } = useCart();
  const ship = subtotal > 150000 ? 0 : 10000;

  return (
    <>
      <div className={`minicart-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`minicart ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="minicart-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Carrito</div>
            <div className="display" style={{ fontSize: 32 }}>
              {count} {count === 1 ? 'producto' : 'productos'}
            </div>
          </div>
          <button className="nav-icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar">
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
              <button
                className="btn btn-ghost"
                style={{ marginTop: 24 }}
                onClick={() => setOpen(false)}
              >
                Explorar catálogo →
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div className="minicart-item" key={item.variantKey}>
                <div className="minicart-item-img">
                  <ProductShape product={item.product} activeColorHex={item.color.hex} />
                </div>
                <div>
                  <div className="minicart-item-name">{item.product.name}</div>
                  <div className="minicart-item-meta">{item.color.name} · {item.size}</div>
                  <div className="minicart-qty">
                    <button onClick={() => updateQty(item.variantKey, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.variantKey, 1)}>+</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="minicart-item-price">{formatCOP(item.product.price * item.qty)}</div>
                  <button
                    onClick={() => remove(item.variantKey)}
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
            <div className="minicart-row">
              <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
              <span className="mono">{formatCOP(subtotal)}</span>
            </div>
            <div className="minicart-row">
              <span style={{ color: 'var(--fg-dim)' }}>Envío estimado</span>
              <span className="mono">{ship === 0 ? 'GRATIS' : formatCOP(ship)}</span>
            </div>
            <div className="minicart-row total">
              <span>Total</span>
              <span>{formatCOP(subtotal + ship)}</span>
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
