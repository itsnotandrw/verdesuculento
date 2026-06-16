// VERDE. — Shared components: Cursor, Nav, Footer, ProductShape, Reveal helpers, MiniCart, QuickView

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

// ============ Format helpers ============
const COP = (n) => `$${n.toLocaleString('es-CO')}`;

// ============ Custom Cursor ============
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    let dotX = 0, dotY = 0, ringX = 0, ringY = 0, mouseX = 0, mouseY = 0;
    const onMove = e => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMove);
    let raf;
    const tick = () => {
      dotX += (mouseX - dotX) * 0.7;
      dotY += (mouseY - dotY) * 0.7;
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    const checkHover = e => {
      const isHover = e.target.closest('a, button, .product-card, .article-card, .chip, [data-cursor-hover]');
      dotRef.current?.classList.toggle('hover', !!isHover);
      ringRef.current?.classList.toggle('hover', !!isHover);
    };
    window.addEventListener('mouseover', checkHover);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', checkHover);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (<><div ref={ringRef} className="cursor-ring" /><div ref={dotRef} className="cursor-dot" /></>);
}

// ============ Reveal on scroll ============
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.add('in');
    };
    const checkVisible = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 && rect.width === 0) return false;
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        reveal();
        return true;
      }
      return false;
    };
    // Try immediately, again after layout, and again after fonts load
    if (checkVisible()) return;
    requestAnimationFrame(() => { checkVisible(); });
    const t1 = setTimeout(checkVisible, 100);
    const t2 = setTimeout(checkVisible, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(checkVisible);
    // Below-the-fold: IntersectionObserver
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) reveal(); });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    obs.observe(el);
    // Backup: scroll listener
    const onScroll = () => checkVisible();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener('scroll', onScroll); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return ref;
}

function Reveal({ children, className = '', as: Tag = 'div', stagger = false, ...rest }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

function SplitText({ text, className = '', tag: Tag = 'span' }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`split-text ${className}`}>{text}</Tag>
  );
}

// ============ Product shape (organic placeholder) ============
// Maps each product category to an organic shape variant
const CATEGORY_SHAPE = {
  frutales: 'fruit',
  citricos: 'fruit',
  berries: 'cluster',
  ornamentales: 'leaf',
  suculentas: 'rosette',
  semillas: 'seed',
  fertilizantes: 'bag',
  sustratos: 'bag',
};

function ProductShape({ product, size }) {
  const variant = CATEGORY_SHAPE[product.category] || 'fruit';
  const color = product.colors?.[0]?.hex || '#7a9a4a';
  return (
    <div
      className={`product-shape ${variant}`}
      style={{ '--shape-color': color, ...(size ? { width: size } : {}) }}
    />
  );
}

// ============ Cart context ============
const CartContext = createContext();
function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [shipping, setShipping] = useState(null); // {dept, city, cost, days}

  const add = useCallback((product, opts = {}) => {
    const variantKey = `${product.id}-${opts.color || ''}-${opts.size || ''}`;
    setItems(prev => {
      const existing = prev.find(i => i.variantKey === variantKey);
      if (existing) {
        return prev.map(i => i.variantKey === variantKey ? { ...i, qty: i.qty + (opts.qty || 1) } : i);
      }
      return [...prev, {
        variantKey, product,
        color: opts.color || product.colors[0],
        size: opts.size || product.sizes[0],
        qty: opts.qty || 1,
      }];
    });
    setOpen(true);
  }, []);

  const updateQty = useCallback((variantKey, delta) => {
    setItems(prev => prev.flatMap(i => {
      if (i.variantKey !== variantKey) return [i];
      const newQty = i.qty + delta;
      if (newQty <= 0) return [];
      return [{ ...i, qty: newQty }];
    }));
  }, []);

  const remove = useCallback(vk => setItems(prev => prev.filter(i => i.variantKey !== vk)), []);
  const clear = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal, count, open, setOpen, shipping, setShipping }}>
      {children}
    </CartContext.Provider>
  );
}
const useCart = () => useContext(CartContext);

// ============ Nav ============
function Nav({ page, setPage }) {
  const { count, setOpen } = useCart();
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => setPage({ name: 'home' })} data-cursor-hover style={{ cursor: 'none' }}>
        <span className="nav-logo-mark"></span>
        <span>verde.</span>
      </div>
      <div className="nav-links">
        <a className={`nav-link ${page.name === 'home' ? 'active' : ''}`} onClick={() => setPage({ name: 'home' })}>Inicio</a>
        <a className={`nav-link ${page.name === 'catalog' || page.name === 'category' ? 'active' : ''}`} onClick={() => setPage({ name: 'catalog' })}>Catálogo</a>
        <a className={`nav-link ${page.name === 'blog' || page.name === 'article' ? 'active' : ''}`} onClick={() => setPage({ name: 'blog' })}>Diario</a>
        <a className="nav-link">Asesoría</a>
        <a className="nav-link">Nosotros</a>
      </div>
      <div className="nav-actions">
        <button className="nav-icon-btn" aria-label="Buscar" onClick={() => setPage({ name: 'catalog' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
        <button className="nav-icon-btn" aria-label="Cuenta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
        </button>
        <button className="nav-icon-btn" aria-label="Carrito" onClick={() => setOpen(true)} style={{ position: 'relative' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </div>
    </nav>
  );
}

// ============ Footer ============
function Footer({ setPage }) {
  return (
    <footer className="footer">
      <div className="container">
        <Reveal className="footer-grid">
          <div className="footer-col">
            <div className="display" style={{ fontSize: 72, marginBottom: 16, letterSpacing: '-0.025em' }}>verde<em style={{ color: 'var(--accent)' }}>.</em></div>
            <p style={{ color: 'var(--fg-dim)', maxWidth: 360, marginBottom: 24, lineHeight: 1.55 }}>
              Vivero especializado en frutales, ornamentales y agricultura moderna. Envíos a toda Colombia.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <a className="chip">Instagram</a>
              <a className="chip">WhatsApp</a>
              <a className="chip">YouTube</a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Catálogo</h4>
            <ul>
              <li><a onClick={() => setPage({ name: 'category', cat: 'frutales' })}>Frutales</a></li>
              <li><a onClick={() => setPage({ name: 'category', cat: 'citricos' })}>Cítricos</a></li>
              <li><a onClick={() => setPage({ name: 'category', cat: 'berries' })}>Berries</a></li>
              <li><a onClick={() => setPage({ name: 'category', cat: 'ornamentales' })}>Ornamentales</a></li>
              <li><a onClick={() => setPage({ name: 'category', cat: 'suculentas' })}>Suculentas</a></li>
              <li><a onClick={() => setPage({ name: 'category', cat: 'semillas' })}>Semillas</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Servicio</h4>
            <ul>
              <li><a>Envíos a Colombia</a></li>
              <li><a>Garantía de plantas</a></li>
              <li><a>Política de cambios</a></li>
              <li><a>Asesoría agronómica</a></li>
              <li><a>Mayoristas</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contacto</h4>
            <ul>
              <li><a>+57 320 555 0102</a></li>
              <li><a>hola@verde.co</a></li>
              <li><a>Lun—Sáb · 8 — 6 pm</a></li>
              <li><a>Km 3 vía La Ceja, Antioquia</a></li>
            </ul>
          </div>
        </Reveal>
        <div className="footer-bottom">
          <span>© 2026 VERDE. Vivero & agricultura moderna.</span>
          <span>BOGOTÁ · MEDELLÍN · CALI</span>
        </div>
      </div>
    </footer>
  );
}

// ============ Mini cart ============
function MiniCart({ setPage }) {
  const { items, open, setOpen, updateQty, remove, subtotal, count } = useCart();
  const ship = subtotal > 150000 ? 0 : 10000;
  return (
    <>
      <div className={`minicart-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`minicart ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="minicart-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Carrito</div>
            <div className="display" style={{ fontSize: 32 }}>{count} {count === 1 ? 'producto' : 'productos'}</div>
          </div>
          <button className="nav-icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="minicart-body">
          {items.length === 0 ? (
            <div className="minicart-empty">
              <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.3 }}>🌱</div>
              <div>Tu carrito aún está vacío.</div>
              <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => { setOpen(false); setPage({ name: 'catalog' }); }}>
                Explorar catálogo →
              </button>
            </div>
          ) : items.map(item => (
            <div className="minicart-item" key={item.variantKey}>
              <div className="minicart-item-img"><ProductShape product={item.product} /></div>
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
                <div className="minicart-item-price">{COP(item.product.price * item.qty)}</div>
                <button onClick={() => remove(item.variantKey)} style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="minicart-footer">
            <div className="minicart-row"><span style={{ color: 'var(--fg-dim)' }}>Subtotal</span><span className="mono">{COP(subtotal)}</span></div>
            <div className="minicart-row"><span style={{ color: 'var(--fg-dim)' }}>Envío estimado</span><span className="mono">{ship === 0 ? 'GRATIS' : COP(ship)}</span></div>
            <div className="minicart-row total"><span>Total</span><span>{COP(subtotal + ship)}</span></div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setOpen(false); setPage({ name: 'checkout' }); }}>
              Finalizar compra <span className="btn-arrow">→</span>
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => { setOpen(false); setPage({ name: 'cart' }); }}>
              Ver carrito completo
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

// ============ QuickView modal ============
const QuickViewContext = createContext();
function QuickViewProvider({ children }) {
  const [product, setProduct] = useState(null);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const open = (p) => { setProduct(p); setColor(p.colors[0]); setSize(p.sizes[0]); };
  const close = () => setProduct(null);
  const { add } = useCart();

  return (
    <QuickViewContext.Provider value={{ open }}>
      {children}
      <div className={`modal-overlay ${product ? 'open' : ''}`} onClick={close}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
          <button className="modal-close" onClick={close} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          {product && (
            <>
              <div className="modal-img">
                <ProductShape product={{ ...product, colors: [color || product.colors[0]] }} />
              </div>
              <div className="modal-info">
                <div className="eyebrow" style={{ marginBottom: 10 }}>{product.category}</div>
                <h2 className="display" style={{ fontSize: 44, marginBottom: 8 }}>{product.name}</h2>
                <div className="mono" style={{ fontSize: 18, marginBottom: 18 }}>{COP(product.price)}</div>
                <p style={{ color: 'var(--fg-dim)', marginBottom: 24, lineHeight: 1.6 }}>{product.description}</p>

                <div style={{ marginBottom: 18 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Variedad: <span style={{ color: 'var(--fg)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-ui)' }}>{color?.name}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {product.colors.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setColor(c)}
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: c.hex,
                          border: color?.hex === c.hex ? '2px solid var(--accent)' : '2px solid var(--border)',
                          padding: 2,
                          backgroundClip: 'content-box',
                        }}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Presentación</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {product.sizes.map(s => (
                      <button key={s} onClick={() => setSize(s)} className={`chip ${size === s ? 'active' : ''}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { add(product, { color, size }); close(); }}>
                    Añadir — {COP(product.price)}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </QuickViewContext.Provider>
  );
}
const useQuickView = () => useContext(QuickViewContext);

// ============ Product card ============
function ProductCard({ product, onClick, compact }) {
  const { open } = useQuickView();
  const { add } = useCart();
  const [activeColor, setActiveColor] = React.useState(product.colors[0]);

  return (
    <article className="product-card" onClick={onClick} data-compact={compact ? 'true' : 'false'}>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <div className="product-card-media">
        <ProductShape product={{ ...product, colors: [activeColor] }} />
        <div className="product-card-actions">
          <button
            className="product-card-quickview"
            onClick={e => { e.stopPropagation(); open(product); }}
          >Vista rápida</button>
          <button
            className="product-card-add"
            onClick={e => { e.stopPropagation(); add(product, { color: activeColor }); }}
            aria-label="Añadir al carrito"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div className="product-card-info">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="product-card-title">{product.name}</div>
          {!compact && <div className="product-card-tag">{product.tagline}</div>}
          {product.colors.length > 1 && (
            <div className="product-card-swatches" onClick={e => e.stopPropagation()}>
              {product.colors.slice(0, 5).map(c => (
                <button
                  key={c.hex}
                  onMouseEnter={() => setActiveColor(c)}
                  onClick={e => { e.stopPropagation(); setActiveColor(c); }}
                  className={`swatch ${activeColor.hex === c.hex ? 'active' : ''}`}
                  style={{ background: c.hex }}
                  aria-label={c.name}
                />
              ))}
              {product.colors.length > 5 && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-mute)', marginLeft: 2 }}>+{product.colors.length - 5}</span>}
            </div>
          )}
        </div>
        <div className="product-card-price">{COP(product.price)}</div>
      </div>
    </article>
  );
}

Object.assign(window, {
  CustomCursor, Nav, Footer, MiniCart, QuickViewProvider, useQuickView,
  CartProvider, useCart, ProductCard, ProductShape, Reveal, SplitText, useReveal,
  COP, CATEGORY_SHAPE,
});
