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

interface Item {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  tagline: string;
  price: number;
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

  // Carga el índice la primera vez que se abre
  useEffect(() => {
    if (!open || items || error) return;
    fetch('/api/buscar')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { items: Item[] }) => setItems(j.items))
      .catch(() => setError(true));
  }, [open, items, error]);

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

  const resultados = useMemo(() => {
    if (!items) return [];
    const tokens = normaliza(q).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return items
      .map((p) => {
        const nombre = normaliza(p.name);
        const resto = normaliza(`${p.categoryName} ${p.tagline}`);
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
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [items, q]);

  useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;

  const ir = (id: string) => { closeSearch(); router.push(`/producto/${id}`); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, Math.max(0, resultados.length - 1))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && resultados[sel]) { e.preventDefault(); ir(resultados[sel].id); }
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

          {items && q.trim() !== '' && resultados.length === 0 && (
            <p className="so-msg">No encontramos “{q.trim()}”. Prueba con otra palabra o explora una categoría.</p>
          )}

          {resultados.length > 0 && (
            <ul className="so-list" role="listbox">
              {resultados.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === sel}>
                  <Link href={`/producto/${p.id}`} className={`so-item${i === sel ? ' on' : ''}`} onClick={closeSearch} onMouseEnter={() => setSel(i)}>
                    {p.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.image} alt="" loading="lazy" /> : <span className="so-noimg" />}
                    <span className="so-txt">
                      <b>{p.name}</b>
                      <small>{p.categoryName}</small>
                    </span>
                    <span className="so-price"><PrecioPromo unit={precio(p).unit} list={p.price} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
