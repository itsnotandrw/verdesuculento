'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function MobileNav() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-nav">
      <Link href="/" className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Inicio</span>
      </Link>

      <Link href="/catalogo" className={`mobile-nav-item ${isActive('/catalogo') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>Catálogo</span>
      </Link>

      <Link href="/catalogo" className="mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <span>Buscar</span>
      </Link>

      <button
        className={`mobile-nav-item ${count > 0 ? 'active' : ''}`}
        onClick={() => setOpen(true)}
        style={{ position: 'relative' }}
      >
        <span style={{ position: 'relative' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          {count > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              width: 16, height: 16,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              borderRadius: '50%', fontSize: 9, fontWeight: 700,
              display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)',
            }}>
              {count}
            </span>
          )}
        </span>
        <span>Carrito</span>
      </button>

      <button className="mobile-nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
        <span>Cuenta</span>
      </button>
    </nav>
  );
}
