'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function Nav() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const navLinksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/catalogo', label: 'Catálogo' },
    { href: '/diario', label: 'Diario' },
    { href: '/asesoria', label: 'Asesoría' },
    { href: '/nosotros', label: 'Nosotros' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Move the pill to a specific anchor element
  const movePill = useCallback((el: Element | null) => {
    const pill = pillRef.current;
    const nav = navLinksRef.current;
    if (!pill || !nav) return;
    if (!el) {
      pill.style.opacity = '0';
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const pad = 10;
    pill.style.left = `${elRect.left - navRect.left - pad}px`;
    pill.style.width = `${elRect.width + pad * 2}px`;
    pill.style.opacity = '1';
  }, []);

  // Snap pill to the active link whenever the route changes
  useEffect(() => {
    const snap = () => {
      const active = navLinksRef.current?.querySelector('.nav-link.active');
      movePill(active ?? null);
    };
    snap();
    // Also run after fonts/layout settle
    const t = setTimeout(snap, 120);
    return () => clearTimeout(t);
  }, [pathname, movePill]);

  const handleMouseLeave = () => {
    const active = navLinksRef.current?.querySelector('.nav-link.active');
    movePill(active ?? null);
  };

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" data-cursor-hover>
        <span className="nav-logo-mark" />
        <span>verde.</span>
      </Link>

      <div
        ref={navLinksRef}
        className="nav-links"
        onMouseLeave={handleMouseLeave}
      >
        {/* Sliding pill indicator */}
        <span ref={pillRef} className="nav-pill" aria-hidden />

        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nav-link ${isActive(l.href) ? 'active' : ''}`}
            onMouseEnter={(e) => movePill(e.currentTarget)}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        <Link href="/catalogo" className="nav-icon-btn" aria-label="Buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </Link>
        <button
          className="nav-icon-btn"
          aria-label="Carrito"
          onClick={() => setOpen(true)}
          style={{ position: 'relative' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7Z" />
            <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          </svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </div>
    </nav>
  );
}
