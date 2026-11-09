'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useCallback, useState } from 'react';
import { useCart } from '@/context/CartContext';
import ThemeToggle from '@/components/ThemeToggle';
import ZoneSelector from '@/components/ZoneSelector';
import { CATEGORIES } from '@/data/catalog';
import { useCategoryCounts } from '@/context/CategoryCountsContext';
import { useOffers } from '@/context/OffersContext';

export default function Nav() {
  const pathname = usePathname();
  const counts = useCategoryCounts();
  const offers = useOffers();
  const { count, setOpen } = useCart();
  const navLinksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCatalogMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setCatalogOpen(true);
  };
  const scheduleCloseCatalogMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setCatalogOpen(false), 150);
  };

  useEffect(() => {
    setCatalogOpen(false);
  }, [pathname]);

  const links = [
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
        <Image src="/logo-icon.png" alt="" width={36} height={36} priority className="nav-logo-mark" />
        <span className="nav-logo-text">Vivero Verde Suculento</span>
      </Link>

      <div
        ref={navLinksRef}
        className="nav-links"
        onMouseLeave={handleMouseLeave}
      >
        {/* Sliding pill indicator */}
        <span ref={pillRef} className="nav-pill" aria-hidden />

        <Link
          href="/"
          className={`nav-link ${isActive('/') ? 'active' : ''}`}
          onMouseEnter={(e) => movePill(e.currentTarget)}
        >
          Inicio
        </Link>

        <div
          className="nav-dropdown"
          onMouseEnter={openCatalogMenu}
          onMouseLeave={scheduleCloseCatalogMenu}
        >
          <button
            type="button"
            className={`nav-link nav-dropdown-trigger ${isActive('/catalogo') || isActive('/ofertas') ? 'active' : ''}`}
            onMouseEnter={(e) => movePill(e.currentTarget)}
            onClick={openCatalogMenu}
            aria-haspopup="true"
            aria-expanded={catalogOpen}
            style={{ background: 'none', border: 0, cursor: 'pointer' }}
          >
            Catálogo
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="nav-dropdown-caret">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div className={`nav-dropdown-panel ${catalogOpen ? 'open' : ''}`}>
            {CATEGORIES.filter((cat) => (counts[cat.id] ?? cat.count) > 0).map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo/${cat.id}`}
                className="nav-dropdown-item"
                onClick={() => setCatalogOpen(false)}
              >
                <span>{cat.name}</span>
                <span className="nav-dropdown-count">{counts[cat.id] ?? cat.count}</span>
              </Link>
            ))}
            {offers.length > 0 && (
              <>
                <div className="nav-dropdown-group">Ofertas y cupones</div>
                {offers.map((o) => (
                  <Link key={o.slug} href={`/ofertas/${o.slug}`} className="nav-dropdown-item" onClick={() => setCatalogOpen(false)}>
                    <span>{o.label}</span>
                    <span className="nav-dropdown-count nav-dropdown-offer">{o.pct}% OFF</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

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
        <ZoneSelector />
        <ThemeToggle />
        <Link href="/catalogo" className="nav-icon-btn nav-search-btn" aria-label="Buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </Link>
        <button
          className="nav-icon-btn nav-cart-btn"
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
