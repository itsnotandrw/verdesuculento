'use client';

// Buscador del sitio: panel que se abre con la lupa del menú (o con la tecla "/"), filtra mientras se escribe
// y lleva a la ficha del producto. Sin tildes ni mayúsculas: "arandano" encuentra "Arándano".
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, formatCOP } from '@/data/catalog';
import { useSearch } from '@/context/SearchContext';
import { usePromo } from '@/context/PromoContext';
import PrecioPromo from '@/components/PrecioPromo';
import './SearchOverlay.css';
import { urlImagen } from '@/lib/image-loader';

interface Item {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  tagline: string;
  price: number;
  /** Precio con promoción (calculado por el servidor). */
  unit?: number;
  image: string | null;
}

const normaliza = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function SearchOverlay() {
  const { open, closeSearch, openSearch } = useSearch();
  const router = useRouter();
  const { precio } = usePromo();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo "/" para abrir (si no se está escribiendo en otro campo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const escribiendo = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === '/' && !escribiendo && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  // Pide el índice cada vez que se abre (precios y promociones siempre al día); mientras llega, muestra el anterior
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    fetch('/api/buscar', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { items: Item[] }) => { if (vivo) { setItems(j.items); setError(false); } })
      .catch(() => { if (vivo) setItems((prev) => { if (!prev) setError(true); return prev; }); });
    return () => { vivo = false; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { clearTimeout(t); document.body.style.overflow = prev; };
    }
  }, [open]);

  const tokens = useMemo(() => normaliza(q).split(/\s+/).filter(Boolean), [q]);

  // Categorías que coinciden (por nombre o por lo que dice su descripción: "arándanos", "limones"…)
  const categorias = useMemo(() => {
    if (!items || tokens.length === 0) return [];
    return CATEGORIES
      .filter((c) => items.some((p) => p.category === c.id))
      .map((c) => {
        const nombre = normaliza(c.name);
        const resto = normaliza(c.blurb);
        let score = 0;
        for (const t of tokens) {
          if (nombre.startsWith(t)) score += 4;
          else if (nombre.includes(t)) score += 3;
          else if (resto.includes(t)) score += 1;
          else return null;
        }
        return { c, score, n: items.filter((p) => p.category === c.id).length };
      })
      .filter((x): x is { c: (typeof CATEGORIES)[number]; score: number; n: number } => x !== null)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);
  }, [items, tokens]);

  const resultados = useMemo(() => {
    if (!items || tokens.length === 0) return [];
    return items
      .map((p) => {
        const nombre = normaliza(p.name);
        const resto = normaliza(`${p.categoryName} ${p.tagline} ${p.id}`);
        let score = 0;
        for (const t of tokens) {
          if (nombre.startsWith(t)) score += 4;
          else if (nombre.includes(t)) score += 3;
          else if (resto.includes(t)) score += 1;
          else return null;
        }
        return { p, score };
      })
      .filter((x): x is { p: Item; score: number } => x !== null)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [items, tokens]);

  // Lista única para el teclado: primero categorías, luego productos
  const total = categorias.length + resultados.length;

  useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;

  const irA = (i: number) => {
    closeSearch();
    if (i < categorias.length) router.push(`/catalogo/${categorias[i].c.id}`);
    else router.push(`/producto/${resultados[i - categorias.length].id}`);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, Math.max(0, total - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && total > 0) { e.preventDefault(); irA(Math.min(sel, total - 1)); }
  };

  return (
    <div className="so-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSearch(); }}>
      <div className="so-panel" role="dialog" aria-modal="true" aria-label="Buscar productos" onKeyDown={onKey}>
        <div className="so-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, fruta o categoría…"
            aria-label="Buscar productos"
            autoComplete="off"
            autoFocus
          />
          <button type="button" className="so-close" onClick={closeSearch} aria-label="Cerrar búsqueda">Esc</button>
        </div>

        <div className="so-body">
          {error && <p className="so-msg">No se pudo cargar el buscador. Intenta de nuevo en un momento.</p>}
          {!error && !items && <p className="so-msg">Cargando productos…</p>}

          {items && q.trim() === '' && (
            <div>
              <div className="so-label">Explora por categoría</div>
              <div className="so-chips">
                {CATEGORIES.filter((c) => items.some((p) => p.category === c.id)).map((c) => (
                  <Link key={c.id} href={`/catalogo/${c.id}`} className="chip" onClick={closeSearch}>{c.name}</Link>
                ))}
              </div>
              <p className="so-msg">Escribe para buscar entre {items.length} productos.</p>
            </div>
          )}

          {items && q.trim() !== '' && total === 0 && (
            <p className="so-msg">No encontramos “{q.trim()}”. Prueba con otra palabra o explora una categoría.</p>
          )}

          {categorias.length > 0 && (
            <>
              <div className="so-label">Categorías</div>
              <ul className="so-list" role="listbox">
                {categorias.map(({ c, n }, i) => (
                  <li key={c.id} role="option" aria-selected={i === sel}>
                    <Link href={`/catalogo/${c.id}`} className={`so-item so-cat${i === sel ? ' on' : ''}`} onClick={closeSearch} onMouseEnter={() => setSel(i)}>
                      <span className="so-noimg so-caticon" aria-hidden="true">▦</span>
                      <span className="so-txt">
                        <b>{c.name}</b>
                        <small>Ver toda la categoría</small>
                      </span>
                      <span className="so-price"><small>{n} productos →</small></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {resultados.length > 0 && (
            <>
              {categorias.length > 0 && <div className="so-label">Productos</div>}
              <ul className="so-list" role="listbox">
                {resultados.map((p, j) => {
                  const i = categorias.length + j;
                  return (
                    <li key={p.id} role="option" aria-selected={i === sel}>
                      <Link href={`/producto/${p.id}`} className={`so-item${i === sel ? ' on' : ''}`} onClick={closeSearch} onMouseEnter={() => setSel(i)}>
                        {p.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={urlImagen(p.image, 192)} alt="" loading="lazy" decoding="async" width={48} height={48} /> : <span className="so-noimg" />}
                        <span className="so-txt">
                          <b>{p.name}</b>
                          <small>{p.categoryName}</small>
                        </span>
                        <span className="so-price"><PrecioPromo unit={p.unit ?? precio(p).unit} list={p.price} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
