// VERDE. — Pages: Catalog, Product detail (with specs), Cart (with shipping sim), Checkout

const { useState: useStateP, useMemo: useMemoP, useEffect: useEffectP } = React;

// ============ FACET DEFINITIONS ============
const COLOR_GROUPS = [
  { name: 'Verde', match: ['Verde', 'Jade', 'Translúcida', 'Variegada', 'glauco', 'Hass', 'Patrón'] },
  { name: 'Rojo', match: ['Rojo', 'cereza', 'Albión', 'Monterey', 'Splendens', 'Carinata', 'Roja'] },
  { name: 'Azul', match: ['Biloxi', 'Emerald', 'Sharpblue'] },
  { name: 'Morado', match: ['Mora', 'morado', 'Sin espinas', 'Tradicional', 'Estándar', 'Premium'] },
  { name: 'Naranja', match: ['Valencia', 'Arrayana', 'Amarill'] },
  { name: 'Tierra', match: ['Castillo', 'CCN', 'ICS', 'Granel', 'Tamizado', 'Bloque', 'Suelto'] },
  { name: 'Crema', match: ['Blanco', 'Rosa', 'Lila'] },
];

const PRICE_RANGES = [
  { id: '0-15k', label: 'Hasta $15.000', min: 0, max: 15000 },
  { id: '15-25k', label: '$15.000 — $25.000', min: 15000, max: 25000 },
  { id: '25-40k', label: '$25.000 — $40.000', min: 25000, max: 40000 },
  { id: '40k+', label: 'Más de $40.000', min: 40000, max: Infinity },
];

// ============ FilterSection / CheckboxRow ============
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useStateP(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 0 }}
      >
        <span className="mono" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg)' }}>{title}</span>
        <span style={{ fontSize: 18, color: 'var(--fg-dim)', transition: 'transform 0.3s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s var(--ease-out)', overflow: 'hidden' }}>
        <div style={{ minHeight: 0 }}>
          <div style={{ paddingTop: 16 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({ label, count, checked, onChange, swatch }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', cursor: 'none' }} data-cursor-hover>
      <span style={{
        width: 16, height: 16, borderRadius: 3,
        border: checked ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        transition: 'all 0.2s',
      }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="3"><path d="M4 12l5 5L20 6"/></svg>}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {swatch && <span style={{ width: 14, height: 14, borderRadius: '50%', background: swatch, border: '1px solid var(--border-strong)', flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 13, color: checked ? 'var(--fg)' : 'var(--fg-dim)', transition: 'color 0.2s' }}>{label}</span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)' }}>{count}</span>
    </label>
  );
}

// ============ CATALOG PAGE ============
function CatalogPage({ setPage, initialCat }) {
  const [cats, setCats] = useStateP(initialCat ? [initialCat] : []);
  const [colors, setColors] = useStateP([]);
  const [sizes, setSizes] = useStateP([]);
  const [prices, setPrices] = useStateP([]);
  const [sort, setSort] = useStateP('featured');
  const [search, setSearch] = useStateP('');
  const [density, setDensity] = useStateP('3');
  const [sidebarOpen, setSidebarOpen] = useStateP(false);

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const allSizes = useMemoP(() => {
    const set = new Set();
    window.CATALOG.forEach(p => p.sizes.forEach(s => set.add(s)));
    return [...set];
  }, []);

  const counts = useMemoP(() => {
    const c = { cat: {}, color: {}, size: {}, price: {} };
    window.CATALOG.forEach(p => {
      c.cat[p.category] = (c.cat[p.category] || 0) + 1;
      p.colors.forEach(col => {
        COLOR_GROUPS.forEach(g => {
          if (g.match.some(m => col.name.includes(m))) c.color[g.name] = (c.color[g.name] || 0) + 1;
        });
      });
      p.sizes.forEach(s => { c.size[s] = (c.size[s] || 0) + 1; });
      PRICE_RANGES.forEach(r => { if (p.price >= r.min && p.price < r.max) c.price[r.id] = (c.price[r.id] || 0) + 1; });
    });
    return c;
  }, []);

  const filtered = useMemoP(() => {
    let list = window.CATALOG;
    if (cats.length) list = list.filter(p => cats.includes(p.category));
    if (colors.length) {
      list = list.filter(p => p.colors.some(col =>
        colors.some(cg => COLOR_GROUPS.find(g => g.name === cg)?.match.some(m => col.name.includes(m)))
      ));
    }
    if (sizes.length) list = list.filter(p => p.sizes.some(s => sizes.includes(s)));
    if (prices.length) {
      list = list.filter(p => prices.some(id => {
        const r = PRICE_RANGES.find(r => r.id === id);
        return p.price >= r.min && p.price < r.max;
      }));
    }
    if (search) list = list.filter(p => (p.name + p.tagline + p.description).toLowerCase().includes(search.toLowerCase()));
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [cats, colors, sizes, prices, search, sort]);

  const activeFilters = [
    ...cats.map(c => ({ key: `cat-${c}`, label: window.CATEGORIES.find(x => x.id === c)?.name, clear: () => setCats(cats.filter(x => x !== c)) })),
    ...colors.map(c => ({ key: `col-${c}`, label: c, clear: () => setColors(colors.filter(x => x !== c)) })),
    ...sizes.map(s => ({ key: `sz-${s}`, label: s, clear: () => setSizes(sizes.filter(x => x !== s)) })),
    ...prices.map(p => ({ key: `pr-${p}`, label: PRICE_RANGES.find(r => r.id === p)?.label, clear: () => setPrices(prices.filter(x => x !== p)) })),
  ];

  const clearAll = () => { setCats([]); setColors([]); setSizes([]); setPrices([]); };
  const gridCols = density === '2' ? 'repeat(2, 1fr)' : density === '4' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)';

  return (
    <main className="page-section">
      <section style={{ padding: '40px 0 32px' }}>
        <div className="container">
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em', marginBottom: 12 }}>
            <a onClick={() => setPage({ name: 'home' })} style={{ cursor: 'pointer' }}>INICIO</a>
            <span style={{ margin: '0 10px' }}>/</span>
            <span style={{ color: 'var(--fg)' }}>CATÁLOGO</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 130px)', letterSpacing: '-0.025em' }}>
              Catálogo<em style={{ color: 'var(--accent)' }}>.</em>
            </h1>
            <p className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em', marginBottom: 16 }}>
              {filtered.length} {filtered.length === 1 ? 'PRODUCTO' : 'PRODUCTOS'}
            </p>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 240px) 1fr', gap: 48, padding: '0' }} data-catalog-grid>
          <aside data-sidebar className={sidebarOpen ? 'sidebar-open' : ''}
            style={{ padding: '32px 0', borderRight: '1px solid var(--border)', paddingRight: 32, alignSelf: 'start', position: 'sticky', top: 80, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 className="display" style={{ fontSize: 26 }}>Filtrar</h3>
              {activeFilters.length > 0 && (
                <button onClick={clearAll} className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Limpiar ({activeFilters.length})
                </button>
              )}
            </div>

            <div style={{ position: 'relative', marginTop: 16, marginBottom: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-dim)' }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                placeholder="Buscar planta o insumo"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 999, padding: '10px 16px 10px 38px', outline: 'none', color: 'var(--fg)', fontSize: 13 }}
              />
            </div>

            <FilterSection title="Categoría">
              {window.CATEGORIES.map(c => (
                <CheckboxRow key={c.id} label={c.name} count={counts.cat[c.id] || 0} checked={cats.includes(c.id)} onChange={() => toggle(cats, setCats, c.id)} />
              ))}
            </FilterSection>

            <FilterSection title="Color / Variedad">
              {COLOR_GROUPS.filter(g => counts.color[g.name]).map(g => {
                const swatch = window.CATALOG.flatMap(p => p.colors).find(c => g.match.some(m => c.name.includes(m)))?.hex;
                return (
                  <CheckboxRow key={g.name} label={g.name} count={counts.color[g.name]} checked={colors.includes(g.name)} onChange={() => toggle(colors, setColors, g.name)} swatch={swatch} />
                );
              })}
            </FilterSection>

            <FilterSection title="Presentación" defaultOpen={false}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allSizes.map(s => (
                  <button key={s} onClick={() => toggle(sizes, setSizes, s)} className={`chip ${sizes.includes(s) ? 'active' : ''}`} style={{ fontSize: 11, padding: '6px 10px' }}>{s}</button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Precio">
              {PRICE_RANGES.map(r => (
                <CheckboxRow key={r.id} label={r.label} count={counts.price[r.id] || 0} checked={prices.includes(r.id)} onChange={() => toggle(prices, setPrices, r.id)} />
              ))}
            </FilterSection>
          </aside>

          <div style={{ padding: '32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button data-mobile-filter-btn onClick={() => setSidebarOpen(true)} className="chip" style={{ display: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
                  Filtros {activeFilters.length > 0 && `(${activeFilters.length})`}
                </button>
                {activeFilters.slice(0, 6).map(f => (
                  <button key={f.key} className="chip active" onClick={f.clear} style={{ paddingRight: 8 }}>
                    {f.label}<span style={{ fontSize: 14, marginLeft: 4 }}>×</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div data-density-toggle style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 999, padding: 3 }}>
                  {['2', '3', '4'].map(d => (
                    <button key={d} onClick={() => setDensity(d)}
                      style={{ width: 32, height: 28, borderRadius: 999, background: density === d ? 'var(--fg)' : 'transparent', color: density === d ? 'var(--bg)' : 'var(--fg-dim)', display: 'grid', placeItems: 'center', transition: 'all 0.2s' }}
                      aria-label={`${d} columnas`}>
                      <DensityIcon n={parseInt(d)} />
                    </button>
                  ))}
                </div>
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 16px', color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Precio: menor a mayor</option>
                  <option value="price-desc">Precio: mayor a menor</option>
                  <option value="name">Nombre A–Z</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '120px 0', textAlign: 'center', color: 'var(--fg-dim)' }}>
                <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.3 }}>🌱</div>
                <div style={{ marginBottom: 16 }}>Nada coincide con tu búsqueda.</div>
                <button className="btn btn-ghost" onClick={clearAll}>Limpiar filtros</button>
              </div>
            ) : (
              <div data-product-grid style={{ display: 'grid', gridTemplateColumns: gridCols, gap: density === '2' ? 24 : 16 }}>
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onClick={() => setPage({ name: 'product', id: p.id })} compact={density === '4'} />
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em' }}>
                  MOSTRANDO {filtered.length} DE {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip active">1</button>
                  <button className="chip" disabled style={{ opacity: 0.4 }}>2</button>
                  <button className="chip" disabled style={{ opacity: 0.4 }}>→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div data-sidebar-overlay className={sidebarOpen ? 'open' : ''} onClick={() => setSidebarOpen(false)} style={{ display: 'none' }} />
    </main>
  );
}

function DensityIcon({ n }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={i * (12 / n) + 0.5} y="1.5" width={(12 / n) - 1} height="9" rx="0.5" />
      ))}
    </svg>
  );
}

// ============ PRODUCT DETAIL ============
function ProductPage({ setPage, productId }) {
  const product = window.CATALOG.find(p => p.id === productId) || window.CATALOG[0];
  const [color, setColor] = useStateP(product.colors[0]);
  const [size, setSize] = useStateP(product.sizes[0]);
  const [qty, setQty] = useStateP(1);
  const { add } = useCart();

  useEffectP(() => { window.scrollTo(0, 0); }, [productId]);

  const related = window.CATALOG.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);
  const specs = product.specs || {};

  return (
    <main className="page-section">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.08em' }}>
          <a onClick={() => setPage({ name: 'home' })} style={{ cursor: 'pointer' }}>INICIO</a>
          <span style={{ margin: '0 10px' }}>/</span>
          <a onClick={() => setPage({ name: 'category', cat: product.category })} style={{ cursor: 'pointer' }}>{product.category.toUpperCase()}</a>
          <span style={{ margin: '0 10px' }}>/</span>
          <span style={{ color: 'var(--fg)' }}>{product.name.toUpperCase()}</span>
        </div>
      </div>

      <section style={{ padding: '20px 0 80px' }}>
        <div className="container product-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 60 }}>
          <div style={{ position: 'sticky', top: 100, height: 'fit-content' }}>
            <div style={{
              background: 'linear-gradient(155deg, var(--bg-elev), var(--bg-elev-2))',
              borderRadius: 'var(--radius-lg)', aspectRatio: '4/5', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%)`, opacity: 0.7 }} />
              <ProductShape product={{ ...product, colors: [color] }} size="58%" />
              <div style={{ position: 'absolute', top: 24, left: 24, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)', letterSpacing: '0.15em' }}>
                REF / {product.id.toUpperCase()}
              </div>
              {product.badge && <span className="product-badge" style={{ top: 24, right: 24, left: 'auto' }}>{product.badge}</span>}
            </div>

            {/* Thumbnails (visual placeholder) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  aspectRatio: '1',
                  background: 'var(--bg-elev)',
                  borderRadius: 10,
                  border: i === 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                  display: 'grid', placeItems: 'center',
                  cursor: 'none',
                }} data-cursor-hover>
                  <div style={{ transform: 'scale(0.5)' }}>
                    <ProductShape product={{ ...product, colors: [product.colors[i % product.colors.length]] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Reveal>
              <div className="eyebrow" style={{ marginBottom: 16 }}>{product.category}</div>
              <h1 className="display" style={{ fontSize: 'clamp(48px, 6vw, 88px)', marginBottom: 16, letterSpacing: '-0.025em' }}>{product.name}</h1>
              <p style={{ color: 'var(--fg-dim)', fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>{product.tagline}</p>
              <div className="mono" style={{ fontSize: 32, marginBottom: 8 }}>{COP(product.price)}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 36, letterSpacing: '0.1em' }}>● DISPONIBLE PARA ENVÍO INMEDIATO</div>
            </Reveal>

            <div style={{ marginBottom: 32 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                Variedad: <span style={{ color: 'var(--fg)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-ui)' }}>{color.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {product.colors.map(c => (
                  <button key={c.hex} onClick={() => setColor(c)} aria-label={c.name}
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: c.hex,
                      border: color.hex === c.hex ? '2px solid var(--accent)' : '2px solid var(--border)',
                      padding: 3, backgroundClip: 'content-box', transition: 'transform 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 36 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Presentación</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSize(s)} className={`chip ${size === s ? 'active' : ''}`}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-strong)', borderRadius: 999, padding: '4px 10px' }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 32, height: 32, borderRadius: '50%' }}>−</button>
                <span className="mono" style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)} style={{ width: 32, height: 32, borderRadius: '50%' }}>+</button>
              </div>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => add(product, { color, size, qty })}>
                Añadir al carrito — {COP(product.price * qty)}
              </button>
            </div>

            {/* DESCRIPTION */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
              <h3 className="eyebrow" style={{ marginBottom: 14 }}>Descripción</h3>
              <p style={{ color: 'var(--fg-dim)', lineHeight: 1.7, marginBottom: 36 }}>{product.description}</p>
            </div>

            {/* FICHA TÉCNICA */}
            {Object.keys(specs).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <h3 className="eyebrow" style={{ marginBottom: 16 }}>Ficha técnica</h3>
                <div className="spec-grid">
                  {[
                    ['Clima', specs.clima],
                    ['Exposición solar', specs.sol],
                    ['Riego', specs.riego],
                    ['Producción', specs.produccion],
                    ['Altura adulta', specs.altura],
                    ['Dificultad', specs.dificultad],
                  ].filter(([, v]) => v).map(([k, v], i) => (
                    <div className="spec-row" key={i}>
                      <span className="spec-label">{k}</span>
                      <span className="spec-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHIPPING / GUARANTEE */}
            <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
              {[
                ['Envío', '2 — 5 días hábiles'],
                ['Garantía', 'Planta viva al recibir'],
                ['Embalaje', 'Especial plantas vivas'],
                ['Asesoría', 'Agrónomo incluido'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="eyebrow" style={{ marginBottom: 16 }}>TAMBIÉN TE PUEDE INTERESAR</div>
            <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginBottom: 40, letterSpacing: '-0.02em' }}>
              Más de <em style={{ color: 'var(--accent)' }}>{product.category}</em>.
            </h2>
            <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {related.map(p => (
                <ProductCard key={p.id} product={p} onClick={() => setPage({ name: 'product', id: p.id })} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 900px) {
          .product-detail-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .product-detail-grid > div:first-child { position: static !important; }
        }
      `}</style>
    </main>
  );
}

// ============ SHIPPING SIMULATOR (used in cart & checkout) ============
function ShippingSimulator({ onSelect, value }) {
  const [dept, setDept] = useStateP(value?.dept || '');
  const [city, setCity] = useStateP(value?.city || '');

  const cityData = window.SHIPPING_RATES.find(r => r.city === city);
  const cities = window.SHIPPING_RATES.filter(r => !dept || r.dept === dept);
  const departments = [...new Set(window.SHIPPING_RATES.map(r => r.dept))];

  React.useEffect(() => {
    if (cityData) onSelect(cityData);
  }, [city]);

  return (
    <div style={{ background: 'color-mix(in oklab, var(--accent) 6%, var(--bg-elev))', border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--border))', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>SIMULADOR DE ENVÍO</div>
      </div>
      <h4 className="display" style={{ fontSize: 24, marginBottom: 18, letterSpacing: '-0.01em' }}>¿A dónde enviamos?</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <select value={dept} onChange={e => { setDept(e.target.value); setCity(''); }}
          style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', color: 'var(--fg)', fontSize: 14, outline: 'none' }}>
          <option value="">Departamento</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={city} onChange={e => setCity(e.target.value)}
          style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', color: 'var(--fg)', fontSize: 14, outline: 'none' }}>
          <option value="">Ciudad</option>
          {cities.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
        </select>
      </div>

      {cityData ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Costo estimado</div>
            <div className="display" style={{ fontSize: 22 }}>{COP(cityData.cost)}</div>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Entrega</div>
            <div className="display" style={{ fontSize: 22 }}>{cityData.days} días hábiles</div>
          </div>
        </div>
      ) : (
        <p className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', letterSpacing: '0.05em' }}>
          Selecciona ciudad para ver costo y tiempo de entrega.
        </p>
      )}
    </div>
  );
}

// ============ CART PAGE ============
function CartPage({ setPage }) {
  const { items, updateQty, remove, subtotal, count, shipping, setShipping } = useCart();
  const ship = shipping?.cost ?? 0;
  const total = subtotal + ship;

  if (items.length === 0) {
    return (
      <main className="page-section">
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 96, opacity: 0.3, marginBottom: 16 }}>🌱</div>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 7vw, 96px)', marginBottom: 16, letterSpacing: '-0.025em' }}>Tu carrito está vacío.</h1>
          <p style={{ color: 'var(--fg-dim)', marginBottom: 32 }}>Hay plantas esperando salir del vivero.</p>
          <button className="btn btn-primary" onClick={() => setPage({ name: 'catalog' })}>Explorar catálogo →</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-section">
      <section style={{ padding: '40px 0 80px' }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 16 }}>CARRITO · {count} {count === 1 ? 'PRODUCTO' : 'PRODUCTOS'}</div>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 9vw, 130px)', marginBottom: 56, letterSpacing: '-0.025em' }}>
            Tu <em style={{ color: 'var(--accent)' }}>carrito.</em>
          </h1>

          <div className="cart-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60 }}>
            <div>
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {items.map(item => (
                  <div key={item.variantKey} className="cart-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 24, padding: '24px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ width: 120, height: 120, background: 'var(--bg-elev)', borderRadius: 12, display: 'grid', placeItems: 'center' }}>
                      <ProductShape product={item.product} size="60%" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 6 }}>{item.product.name}</h3>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)', marginBottom: 14 }}>{item.color.name} · {item.size}</div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1px solid var(--border-strong)', borderRadius: 999, padding: '2px 6px' }}>
                          <button onClick={() => updateQty(item.variantKey, -1)} style={{ width: 28, height: 28, borderRadius: '50%' }}>−</button>
                          <span className="mono" style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.variantKey, 1)} style={{ width: 28, height: 28, borderRadius: '50%' }}>+</button>
                        </div>
                        <button onClick={() => remove(item.variantKey)} className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quitar</button>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 17, fontWeight: 500 }}>{COP(item.product.price * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 40 }}>
                <ShippingSimulator onSelect={setShipping} value={shipping} />
              </div>
            </div>

            <aside style={{ position: 'sticky', top: 100, height: 'fit-content', background: 'var(--bg-elev)', padding: 32, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h2 className="display" style={{ fontSize: 32, marginBottom: 24 }}>Resumen</h2>
              <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--fg-dim)' }}>Subtotal</span><span className="mono">{COP(subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--fg-dim)' }}>Envío {shipping ? `(${shipping.city})` : ''}</span>
                  <span className="mono">{shipping ? COP(ship) : 'Por calcular'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 24, alignItems: 'baseline' }}>
                <span className="display" style={{ fontSize: 26 }}>Total</span>
                <span className="display" style={{ fontSize: 32 }}>{COP(total)}</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPage({ name: 'checkout' })}>
                Finalizar compra <span className="btn-arrow">→</span>
              </button>
              <p className="mono" style={{ fontSize: 11, color: 'var(--fg-mute)', textAlign: 'center', marginTop: 16, letterSpacing: '0.05em' }}>
                PAGO SEGURO · ENVÍO A TODA COLOMBIA
              </p>
            </aside>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .cart-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .cart-row { grid-template-columns: 80px 1fr auto !important; }
        }
      `}</style>
    </main>
  );
}

// ============ CHECKOUT ============
function CheckoutPage({ setPage }) {
  const { items, subtotal, clear, shipping, setShipping } = useCart();
  const [step, setStep] = useStateP(1);
  const [done, setDone] = useStateP(false);
  const [method, setMethod] = useStateP('estandar');
  const ship = method === 'recogida' ? 0 : (shipping?.cost ?? 0);
  const total = subtotal + ship;

  if (done) {
    return (
      <main className="page-section">
        <div className="container" style={{ padding: '80px 0', maxWidth: 720, textAlign: 'center' }}>
          <div className="eyebrow reveal in" style={{ marginBottom: 24 }}>PEDIDO #ORD-{String(Math.floor(Math.random() * 9000 + 1000)).padStart(4, '0')}</div>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', margin: '0 auto 32px', fontSize: 40 }}>✓</div>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', marginBottom: 20, letterSpacing: '-0.025em' }}>
            Gracias por <em style={{ color: 'var(--accent)' }}>tu compra.</em>
          </h1>
          <p style={{ color: 'var(--fg-dim)', fontSize: 18, lineHeight: 1.6, marginBottom: 36, maxWidth: 540, margin: '0 auto 36px' }}>
            Pronto nos pondremos en contacto contigo. Te enviamos un correo con el seguimiento del pedido. {shipping && <>Llegará a <strong style={{ color: 'var(--fg)' }}>{shipping.city}</strong> en {shipping.days} días hábiles.</>}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { clear(); setShipping(null); setPage({ name: 'home' }); }}>Volver al inicio →</button>
            <button className="btn btn-ghost" onClick={() => { clear(); setShipping(null); setPage({ name: 'catalog' }); }}>Seguir explorando</button>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="page-section">
        <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <h1 className="display" style={{ fontSize: 64, marginBottom: 24 }}>Carrito vacío.</h1>
          <button className="btn btn-primary" onClick={() => setPage({ name: 'catalog' })}>Explorar catálogo →</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-section">
      <section style={{ padding: '40px 0 80px' }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 16 }}>CHECKOUT</div>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 110px)', marginBottom: 40, letterSpacing: '-0.025em' }}>
            Finalizar <em style={{ color: 'var(--accent)' }}>compra.</em>
          </h1>

          <div style={{ display: 'flex', gap: 12, marginBottom: 48, paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {['Datos', 'Dirección', 'Envío', 'Pago'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, color: i + 1 <= step ? 'var(--fg)' : 'var(--fg-mute)' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: i + 1 <= step ? 'var(--accent)' : 'var(--bg-elev)', color: i + 1 <= step ? 'var(--accent-fg)' : 'var(--fg-mute)', display: 'grid', placeItems: 'center', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                <span className="mono" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s}</span>
                {i < 3 && <span style={{ width: 24, height: 1, background: 'var(--border)' }} />}
              </div>
            ))}
          </div>

          <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 60 }}>
            <div>
              {step === 1 && (
                <div>
                  <h2 className="display" style={{ fontSize: 36, marginBottom: 24, letterSpacing: '-0.01em' }}>Tus datos</h2>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <Field label="Nombre completo" placeholder="María López Rojas" />
                    <Field label="Correo electrónico" placeholder="maria@email.com" />
                    <Field label="Teléfono" placeholder="+57 320 555 0000" />
                    <Field label="Cédula" placeholder="1.234.567.890" />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div>
                  <h2 className="display" style={{ fontSize: 36, marginBottom: 24, letterSpacing: '-0.01em' }}>Dirección de envío</h2>
                  <ShippingSimulator onSelect={setShipping} value={shipping} />
                  <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                    <Field label="Dirección" placeholder="Calle 80 #25-30, Apto 502" />
                    <Field label="Barrio" placeholder="El Poblado" />
                    <Field label="Indicaciones adicionales" placeholder="Edificio Verde, portería principal..." />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h2 className="display" style={{ fontSize: 36, marginBottom: 24, letterSpacing: '-0.01em' }}>Método de envío</h2>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <ShipOption title="Envío estándar" days={shipping ? `${shipping.days} días hábiles · ${shipping.city}` : 'Selecciona ciudad'} price={shipping?.cost ?? 0} selected={method === 'estandar'} onClick={() => setMethod('estandar')} disabled={!shipping} />
                    <ShipOption title="Recogida en punto" days="Vivero La Ceja, Antioquia · Lun-Sáb 8-6pm" price={0} selected={method === 'recogida'} onClick={() => setMethod('recogida')} />
                  </div>
                </div>
              )}
              {step === 4 && (
                <div>
                  <h2 className="display" style={{ fontSize: 36, marginBottom: 24, letterSpacing: '-0.01em' }}>Pago</h2>
                  <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                    {[
                      { id: 'tarjeta', label: 'Tarjeta de crédito o débito', sub: 'Visa · Mastercard · Amex' },
                      { id: 'pse', label: 'PSE — Débito bancario', sub: 'Todos los bancos del país' },
                      { id: 'contraentrega', label: 'Pago contraentrega', sub: 'Efectivo o transferencia al recibir' },
                    ].map((opt) => (
                      <div key={opt.id} style={{ padding: 16, borderRadius: 12, border: opt.id === 'tarjeta' ? '1px solid var(--accent)' : '1px solid var(--border)', background: opt.id === 'tarjeta' ? 'color-mix(in oklab, var(--accent) 6%, transparent)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>{opt.sub}</div>
                        </div>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--accent)', background: opt.id === 'tarjeta' ? 'var(--accent)' : 'transparent' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 16, paddingTop: 8 }}>
                    <Field label="Número de tarjeta" placeholder="4242 4242 4242 4242" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <Field label="Caducidad" placeholder="MM / YY" />
                      <Field label="CVC" placeholder="123" />
                    </div>
                    <Field label="Titular" placeholder="MARÍA LÓPEZ" />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
                {step > 1 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>← Atrás</button>}
                {step < 4 && <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={step === 2 && !shipping && method !== 'recogida'}>Continuar →</button>}
                {step === 4 && <button className="btn btn-primary" onClick={() => setDone(true)}>Pagar {COP(total)} →</button>}
              </div>
            </div>

            <aside style={{ position: 'sticky', top: 100, height: 'fit-content', background: 'var(--bg-elev)', padding: 28, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h3 className="display" style={{ fontSize: 26, marginBottom: 20 }}>Tu pedido</h3>
              <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                {items.map(item => (
                  <div key={item.variantKey} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 50, height: 50, background: 'var(--bg-elev-2)', borderRadius: 8, display: 'grid', placeItems: 'center' }}>
                      <ProductShape product={item.product} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>×{item.qty} · {item.size}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 13 }}>{COP(item.product.price * item.qty)}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--fg-dim)' }}>Subtotal</span><span className="mono">{COP(subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--fg-dim)' }}>Envío</span>
                  <span className="mono">{ship === 0 && method === 'recogida' ? 'GRATIS' : (shipping ? COP(ship) : '—')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <span className="display" style={{ fontSize: 22 }}>Total</span>
                  <span className="display" style={{ fontSize: 28 }}>{COP(total)}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .checkout-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          }
        `}</style>
      </section>
    </main>
  );
}

function Field({ label, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'block' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <input
        type={type}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '14px 16px',
          background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10,
          color: 'var(--fg)', outline: 'none', fontSize: 14,
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </label>
  );
}

function ShipOption({ title, days, price, selected, onClick, disabled }) {
  return (
    <div onClick={!disabled ? onClick : undefined}
      style={{
        padding: 18, borderRadius: 12,
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'transparent',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'none', opacity: disabled ? 0.4 : 1,
      }} data-cursor-hover={!disabled}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>{days}</div>
      </div>
      <div className="mono" style={{ fontSize: 14 }}>{price === 0 ? 'GRATIS' : COP(price)}</div>
    </div>
  );
}

window.CatalogPage = CatalogPage;
window.ProductPage = ProductPage;
window.CartPage = CartPage;
window.CheckoutPage = CheckoutPage;
