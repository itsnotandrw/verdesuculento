'use client';

import { useState, useMemo } from 'react';
import { CATALOG, CATEGORIES, PRICE_RANGES, DIFFICULTY_LEVELS, SUN_OPTIONS, formatCOP } from '@/data/catalog';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';

const CLIMATE_OPTIONS = [
  { id: 'calido',  label: 'Clima cálido',  test: (c: string) => /tropical|cálido|subtropical/i.test(c) },
  { id: 'humedo',  label: 'Clima húmedo',  test: (c: string) => /húmedo|cafetero|tropical/i.test(c) },
  { id: 'altura',  label: 'Altura media',  test: (c: string) => /altura|cafetero|templado|frío/i.test(c) },
  { id: 'frio',    label: 'Clima frío',    test: (c: string) => /frío/i.test(c) },
];

const OBJECTIVE_OPTIONS = [
  { id: 'fruta',        label: 'Producir fruta',      cats: ['frutales-calido', 'frutales-exoticos', 'frutales-frio', 'citricos', 'berries'] },
  { id: 'sombra',       label: 'Quiero sombra',        cats: ['frutales-calido', 'frutales-exoticos', 'frutales-frio'] },
  { id: 'interior',     label: 'Para interior',         cats: ['suculentas'] },
  { id: 'tropical',     label: 'Jardín tropical',       cats: ['frutales-calido', 'frutales-exoticos'] },
  { id: 'polinizadores',label: 'Atraer polinizadores',  cats: ['berries', 'frutales-calido', 'frutales-exoticos', 'frutales-frio'] },
];

const EDITORIAL_BREAKS: Record<number, { title: string; sub: string; link: string; linkLabel: string }> = {
  6: {
    title: 'Temporada berries colombianos 2026.',
    sub: 'Arándanos, fresas y uchuvas de altura. Genética certificada, lista para plantar.',
    link: '/catalogo/berries',
    linkLabel: 'Ver berries',
  },
  12: {
    title: 'Agroinsumos orgánicos.',
    sub: 'Sin químicos agresivos. Humus de lombriz, sustratos y bioestimulantes para Colombia.',
    link: '/catalogo/agroinsumos',
    linkLabel: 'Ver insumos',
  },
};

export default function CatalogContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedSun, setSelectedSun] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [selectedClimate, setSelectedClimate] = useState<string[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string[]>([]);
  const [sort, setSort] = useState<'relevance' | 'price-asc' | 'price-desc'>('relevance');
  const [density, setDensity] = useState<2 | 3 | 4>(3);
  const [search, setSearch] = useState('');

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  const toggleDifficulty = (d: string) =>
    setSelectedDifficulty((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  const toggleSun = (s: string) =>
    setSelectedSun((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const toggleClimate = (id: string) =>
    setSelectedClimate((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleObjective = (id: string) =>
    setSelectedObjective((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const priceRange = PRICE_RANGES.find((r) => r.id === selectedPrice) ?? null;

  const filtered = useMemo(() => {
    let list = [...CATALOG];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.tagline.toLowerCase().includes(search.toLowerCase()));
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.category));
    if (selectedDifficulty.length) list = list.filter((p) => selectedDifficulty.includes(p.specs.dificultad));
    if (selectedSun.length) list = list.filter((p) => selectedSun.some((s) => p.specs.sol.toLowerCase().includes(s.toLowerCase())));
    if (priceRange) list = list.filter((p) => p.price >= priceRange.min && p.price <= priceRange.max);
    if (selectedClimate.length) {
      list = list.filter((p) =>
        selectedClimate.some((cid) => {
          const opt = CLIMATE_OPTIONS.find((o) => o.id === cid);
          return opt ? opt.test(p.specs.clima) : false;
        })
      );
    }
    if (selectedObjective.length) {
      list = list.filter((p) =>
        selectedObjective.some((oid) => {
          const opt = OBJECTIVE_OPTIONS.find((o) => o.id === oid);
          return opt ? opt.cats.includes(p.category) : false;
        })
      );
    }
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [search, selectedCats, selectedDifficulty, selectedSun, priceRange, selectedClimate, selectedObjective, sort]);

  const activeFilterCount = selectedCats.length + selectedDifficulty.length + selectedSun.length + (selectedPrice ? 1 : 0) + selectedClimate.length + selectedObjective.length;

  const clearAll = () => {
    setSelectedCats([]);
    setSelectedDifficulty([]);
    setSelectedSun([]);
    setSelectedPrice(null);
    setSelectedClimate([]);
    setSelectedObjective([]);
    setSearch('');
  };

  const cols = density;
  // El sizes de la imagen debe reflejar el ancho real de la tarjeta segun la
  // densidad elegida (2/3/4 columnas) — si no, el navegador pide una resolucion
  // mas chica de la necesaria y la foto sale pixelada al ampliarla con CSS.
  const productSizes = `(max-width: 480px) 94vw, (max-width: 720px) 47vw, ${{ 2: 54, 3: 36, 4: 27 }[cols]}vw`;

  return (
    <div className="page-section" style={{ paddingTop: 100 }}>
      <div
        data-sidebar-overlay
        className={sidebarOpen ? 'open' : ''}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>CATÁLOGO VERDE.</div>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 7vw, 110px)' }}>
            Todo para <em style={{ color: 'var(--accent)' }}>tu cultivo.</em>
          </h1>
        </div>

        {/* Marquee — categorías reales del vivero */}
        <div className="marquee" aria-label="Categorías del catálogo" style={{ marginBottom: 40, width: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
          <div className="marquee-track">
            {[...CATEGORIES, ...CATEGORIES].map((cat, i) => (
              <span className="marquee-item" key={i}>
                {cat.name}<span className="dot" />
              </span>
            ))}
          </div>
        </div>

        {/* Search + Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-dim)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plantas, semillas..."
              aria-label="Buscar productos"
              style={{ width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 999, padding: '11px 16px 11px 40px', color: 'var(--fg)', outline: 'none', fontSize: 14 }}
            />
          </div>

          <button
            data-mobile-filter-btn
            className="chip"
            onClick={() => setSidebarOpen(true)}
            style={{ display: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="9" y2="18" />
            </svg>
            Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Ordenar productos"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 999, padding: '11px 20px', color: 'var(--fg)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="relevance">Relevancia</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>

          <div data-density-toggle style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }} role="group" aria-label="Densidad de cuadrícula">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setDensity(n)}
                aria-label={`Mostrar ${n} columnas`}
                aria-pressed={density === n}
                style={{
                  width: 38, height: 38, display: 'grid', placeItems: 'center',
                  background: density === n ? 'var(--accent)' : 'transparent',
                  color: density === n ? 'var(--accent-fg)' : 'var(--fg-dim)',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters */}
        {activeFilterCount > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>Filtros activos:</span>
            {selectedCats.map((c) => (
              <button key={c} className="chip active" onClick={() => toggleCat(c)}>
                {CATEGORIES.find((cat) => cat.id === c)?.name} ✕
              </button>
            ))}
            {selectedDifficulty.map((d) => (
              <button key={d} className="chip active" onClick={() => toggleDifficulty(d)}>{d} ✕</button>
            ))}
            {selectedSun.map((s) => (
              <button key={s} className="chip active" onClick={() => toggleSun(s)}>{s} ✕</button>
            ))}
            {selectedPrice && (
              <button className="chip active" onClick={() => setSelectedPrice(null)}>
                {PRICE_RANGES.find((r) => r.id === selectedPrice)?.label} ✕
              </button>
            )}
            {selectedClimate.map((cid) => (
              <button key={cid} className="chip active" onClick={() => toggleClimate(cid)}>
                {CLIMATE_OPTIONS.find((c) => c.id === cid)?.label} ✕
              </button>
            ))}
            {selectedObjective.map((oid) => (
              <button key={oid} className="chip active" onClick={() => toggleObjective(oid)}>
                {OBJECTIVE_OPTIONS.find((o) => o.id === oid)?.label} ✕
              </button>
            ))}
            <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--fg-mute)', fontFamily: 'var(--font-mono)', textDecoration: 'underline' }}>
              Limpiar todo
            </button>
          </div>
        )}

        {/* Grid: sidebar + products */}
        <div data-catalog-grid style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 48 }}>
          {/* Sidebar */}
          <aside data-sidebar className={sidebarOpen ? 'sidebar-open' : ''} style={{ alignSelf: 'start', position: 'sticky', top: 100, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span className="eyebrow">Filtros</span>
              <button className="nav-icon-btn" style={{ display: 'none' }} onClick={() => setSidebarOpen(false)} data-sidebar-close aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <FilterSection title="Categoría">
              {CATEGORIES.map((cat) => (
                <CheckboxRow
                  key={cat.id}
                  label={cat.name}
                  count={cat.count}
                  checked={selectedCats.includes(cat.id)}
                  onChange={() => toggleCat(cat.id)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Dificultad">
              {DIFFICULTY_LEVELS.map((d) => (
                <CheckboxRow key={d} label={d} checked={selectedDifficulty.includes(d)} onChange={() => toggleDifficulty(d)} />
              ))}
            </FilterSection>

            <FilterSection title="Exposición solar">
              {SUN_OPTIONS.map((s) => (
                <CheckboxRow key={s} label={s} checked={selectedSun.includes(s)} onChange={() => toggleSun(s)} />
              ))}
            </FilterSection>

            <FilterSection title="Precio">
              {PRICE_RANGES.map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="price" checked={selectedPrice === r.id} onChange={() => setSelectedPrice(r.id === selectedPrice ? null : r.id)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  {r.label}
                </label>
              ))}
            </FilterSection>

            <FilterSection title="Clima">
              {CLIMATE_OPTIONS.map((c) => (
                <CheckboxRow
                  key={c.id}
                  label={c.label}
                  checked={selectedClimate.includes(c.id)}
                  onChange={() => toggleClimate(c.id)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Objetivo">
              {OBJECTIVE_OPTIONS.map((o) => (
                <CheckboxRow
                  key={o.id}
                  label={o.label}
                  checked={selectedObjective.includes(o.id)}
                  onChange={() => toggleObjective(o.id)}
                />
              ))}
            </FilterSection>
          </aside>

          {/* Products */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--fg-dim)' }}>
                <div style={{ width: 48, height: 64, background: 'var(--border-strong)', borderRadius: '50% 0 50% 50%', transform: 'rotate(-15deg)', margin: '0 auto 16px', opacity: 0.4 }} />
                <p>Sin resultados para esta combinación de filtros.</p>
                <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={clearAll}>Limpiar filtros</button>
              </div>
            ) : (
              <div
                data-product-grid
                style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}
              >
                {filtered.flatMap((p, i) => {
                  const breakData = EDITORIAL_BREAKS[i];
                  const items = [];
                  if (breakData) {
                    items.push(
                      <div key={`break-${i}`} className="catalog-editorial-break">
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div className="eyebrow" style={{ marginBottom: 12 }}>COLECCIÓN VERDE.</div>
                          <h3 className="display" style={{ fontSize: 'clamp(28px, 3vw, 48px)', marginBottom: 12 }}>
                            {breakData.title}
                          </h3>
                          <p style={{ color: 'var(--fg-dim)', maxWidth: 560, marginBottom: 24, fontSize: 15, lineHeight: 1.6 }}>
                            {breakData.sub}
                          </p>
                          <a href={breakData.link} className="btn btn-primary btn-sm">
                            {breakData.linkLabel} <span className="btn-arrow">→</span>
                          </a>
                        </div>
                      </div>
                    );
                  }
                  items.push(<ProductCard key={p.id} product={p} compact={cols > 3} sizes={productSizes} />);
                  return items;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 0 }}
      >
        <span className="mono" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg)' }}>{title}</span>
        <span style={{ fontSize: 18, color: 'var(--fg-dim)', transition: 'transform 0.3s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-block' }}>+</span>
      </button>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

function CheckboxRow({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{count}</span>}
    </label>
  );
}
