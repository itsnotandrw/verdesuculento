'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { CATEGORIES } from '@/data/catalog';

export default function MobileNav() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    setCatalogOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (catalogOpen) document.body.classList.add('scroll-locked');
    else document.body.classList.remove('scroll-locked');
    return () => document.body.classList.remove('scroll-locked');
  }, [catalogOpen]);

  // Mide la altura real del tab bar (varia por safe-area entre dispositivos)
  // para que el panel de catalogo y la barra sticky de "anadir" encajen justo encima.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty('--mobile-nav-height', `${el.offsetHeight}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => { ro.disconnect(); window.removeEventListener('resize', setVar); };
  }, []);

  return (
    <>
      <div className={`mobile-catalog-overlay ${catalogOpen ? 'open' : ''}`} onClick={() => setCatalogOpen(false)} />
      <div className={`mobile-catalog-panel ${catalogOpen ? 'open' : ''}`} aria-hidden={!catalogOpen}>
        <div className="mobile-catalog-panel-header">
          <span className="eyebrow">Catálogo</span>
          <button className="nav-icon-btn" onClick={() => setCatalogOpen(false)} aria-label="Cerrar catálogo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="mobile-catalog-panel-list">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogo/${cat.id}`}
              className="nav-dropdown-item"
              onClick={() => setCatalogOpen(false)}
            >
              <span>{cat.name}</span>
              <span className="nav-dropdown-count">{cat.count}</span>
            </Link>
          ))}
          <Link href="/catalogo" className="nav-dropdown-item nav-dropdown-all" onClick={() => setCatalogOpen(false)}>
            Ver todo el catálogo →
          </Link>
        </div>
      </div>

      <nav className="mobile-nav" ref={navRef}>
      <Link href="/" className={`mobile-nav-item ${isActive('/') ? 'active' : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Inicio</span>
      </Link>

      <button
        className={`mobile-nav-item ${isActive('/catalogo') || catalogOpen ? 'active' : ''}`}
        onClick={() => setCatalogOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={catalogOpen}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>Catálogo</span>
      </button>

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
    </>
  );
}
