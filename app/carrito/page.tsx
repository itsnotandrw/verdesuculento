'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { SHIPPING_RATES, formatCOP } from '@/data/catalog';
import ProductShape from '@/components/ProductShape';

export default function CartPage() {
  const { items, subtotal, count, updateQty, remove, shipping, setShipping } = useCart();
  const [selectedCity, setSelectedCity] = useState('');

  const ship = shipping ? shipping.cost : subtotal > 150000 ? 0 : 10000;
  const total = subtotal + ship;

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const rate = SHIPPING_RATES.find((r) => r.city === city);
    setShipping(rate ?? null);
  };

  if (count === 0) {
    return (
      <div className="page-section" style={{ paddingTop: 160, textAlign: 'center' }}>
        <div style={{ width: 64, height: 80, background: 'var(--border-strong)', borderRadius: '50% 0 50% 50%', transform: 'rotate(-15deg)', margin: '0 auto 24px', opacity: 0.25 }} />
        <h1 className="display" style={{ fontSize: 'clamp(48px, 6vw, 88px)', marginBottom: 20 }}>
          Tu carrito está <em style={{ color: 'var(--accent)' }}>vacío.</em>
        </h1>
        <p style={{ color: 'var(--fg-dim)', marginBottom: 32 }}>Explora nuestro catálogo y encuentra la planta perfecta para ti.</p>
        <Link href="/catalogo" className="btn btn-primary">Ver catálogo <span className="btn-arrow">→</span></Link>
      </div>
    );
  }

  return (
    <div className="page-section" style={{ paddingTop: 120 }}>
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 16 }}>CARRITO</div>
        <h1 className="display" style={{ fontSize: 'clamp(48px, 7vw, 100px)', marginBottom: 56 }}>
          {count} {count === 1 ? 'producto' : 'productos'}<em style={{ color: 'var(--accent)' }}>.</em>
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'start' }} className="cart-layout">
          {/* Items */}
          <div>
            {items.map((item) => (
              <div key={item.variantKey} style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 20, padding: '24px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <Link href={`/producto/${item.product.id}`} style={{ width: 88, height: 88, background: 'var(--bg-elev)', borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <ProductShape product={item.product} activeColorHex={item.color.hex} />
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <Link href={`/producto/${item.product.id}`} style={{ fontSize: 18, fontWeight: 500, display: 'block', marginBottom: 4 }}>{item.product.name}</Link>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', marginBottom: 12 }}>{item.color.name} · {item.size}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-strong)', borderRadius: 999, padding: '4px 6px' }}>
                      <button onClick={() => updateQty(item.variantKey, -1)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 16 }}>−</button>
                      <span className="mono" style={{ minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.variantKey, 1)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--bg-elev)', fontSize: 16 }}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 18, marginBottom: 8 }}>{formatCOP(item.product.price * item.qty)}</div>
                    <button onClick={() => remove(item.variantKey)} style={{ fontSize: 11, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quitar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <aside style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 32, border: '1px solid var(--border)' }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>Resumen del pedido</div>

            {/* Shipping calculator */}
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', marginBottom: 10, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Calcular envío</div>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px', color: 'var(--fg)', fontSize: 14, outline: 'none' }}
              >
                <option value="">Selecciona tu ciudad</option>
                {SHIPPING_RATES.map((r) => (
                  <option key={r.city} value={r.city}>{r.city} — {r.dept}</option>
                ))}
              </select>
              {shipping && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--fg-dim)' }}>Envío a {shipping.city}</span>
                    <span className="mono">{formatCOP(shipping.cost)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{shipping.days} días hábiles</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Subtotal</span>
              <span className="mono">{formatCOP(subtotal)}</span>
            </div>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--fg-dim)' }}>Envío</span>
              <span className="mono">{!shipping && subtotal > 150000 ? 'GRATIS' : !shipping ? 'Selecciona ciudad' : formatCOP(ship)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, paddingTop: 20, borderTop: '1px solid var(--border)', alignItems: 'baseline' }}>
              <span className="display" style={{ fontSize: 24 }}>Total</span>
              <span className="display" style={{ fontSize: 32 }}>{formatCOP(total)}</span>
            </div>

            <Link href="/checkout" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Finalizar compra <span className="btn-arrow">→</span>
            </Link>

            {/* Trust signals */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { text: 'Pago seguro cifrado SSL' },
                { text: 'Garantía de planta viva' },
                { text: 'Cambios sin preguntas' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--fg-dim)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent)', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) { .cart-layout { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
