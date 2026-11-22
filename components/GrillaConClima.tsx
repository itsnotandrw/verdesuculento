'use client';

import { useMemo, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { CLIMA_LABEL, climasDe, type Clima } from '@/lib/clima';
import type { Product } from '@/types';

type Filtro = 'todos' | Clima | 'ambos';

/**
 * Productos de una categoría con filtro por clima (cálido / frío a templado / los dos). El filtro solo aparece si
 * hay plantas con clima en la lista; es del lado del cliente para no perder la página estática de la categoría.
 */
export default function GrillaConClima({ products }: { products: Product[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const conteo = useMemo(() => {
    const c = { todos: products.length, calido: 0, frio: 0, ambos: 0 };
    for (const p of products) {
      const cl = climasDe(p);
      if (cl.includes('calido')) c.calido++;
      if (cl.includes('frio')) c.frio++;
      if (cl.length === 2) c.ambos++;
    }
    return c;
  }, [products]);

  const visibles = useMemo(
    () => products.filter((p) => {
      const cl = climasDe(p);
      if (filtro === 'todos') return true;
      if (filtro === 'ambos') return cl.length === 2;
      return cl.includes(filtro);
    }),
    [products, filtro],
  );

  const hayClima = conteo.calido + conteo.frio > 0;
  const opciones: { id: Filtro; label: string; n: number }[] = [
    { id: 'todos', label: 'Todos', n: conteo.todos },
    { id: 'calido', label: CLIMA_LABEL.calido, n: conteo.calido },
    { id: 'frio', label: CLIMA_LABEL.frio, n: conteo.frio },
    { id: 'ambos', label: 'Sirven en los dos', n: conteo.ambos },
  ];

  return (
    <>
      {hayClima && (
        <div role="group" aria-label="Filtrar por clima" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {opciones.filter((o) => o.id === 'todos' || o.n > 0).map((o) => (
            <button key={o.id} type="button" className="chip" data-active={filtro === o.id ? 'true' : 'false'} aria-pressed={filtro === o.id} onClick={() => setFiltro(o.id)}>
              {o.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{o.n}</span>
            </button>
          ))}
        </div>
      )}
      <div data-product-grid style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {visibles.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {visibles.length === 0 && <p style={{ color: 'var(--fg-dim)', marginTop: 24 }}>No hay plantas de esta categoría con ese clima todavía.</p>}
    </>
  );
}
