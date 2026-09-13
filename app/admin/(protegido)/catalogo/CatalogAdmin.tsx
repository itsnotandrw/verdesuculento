'use client';

/**
 * Lista del catálogo, con búsqueda y borrado — la edición de cada producto
 * vive en /admin/catalogo/[id] (mismo formulario que "nuevo producto").
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES, formatCOP } from '@/data/catalog';
import type { Product } from '@/types';

export default function CatalogAdmin() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [editable, setEditable] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/admin/products', { cache: 'no-store' });
      if (respuesta.status === 401) {
        router.push('/admin/login?next=/admin/catalogo');
        return;
      }
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo cargar el catálogo.');
      setProducts(datos.products ?? []);
      setEditable(Boolean(datos.editable));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setCargando(false);
    }
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [products, busqueda]);

  const nombreCategoria = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

  const borrar = async (producto: Product) => {
    if (!confirm(`¿Borrar "${producto.name}" del catálogo? Esto no se puede deshacer.`)) return;
    setBorrando(producto.id);
    setError(null);
    try {
      const respuesta = await fetch(`/api/admin/products/${producto.id}`, { method: 'DELETE' });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo borrar.');
      setProducts((prev) => prev.filter((p) => p.id !== producto.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar.');
    } finally {
      setBorrando(null);
    }
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
          <h1 className="display" style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>Catálogo</h1>
        </div>
        <Link href="/admin/catalogo/nuevo" className="btn btn-primary btn-sm">+ Nuevo producto</Link>
      </div>

      {!editable && (
        <div className="admin-alerta" role="alert" style={{ marginBottom: 24 }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>El catálogo es de solo lectura</strong>
          Falta configurar Redis (KV_REST_API_URL/KV_REST_API_TOKEN) — ver .env.example. Los productos que ves
          son el catálogo estático; cualquier cambio que intentes guardar va a fallar hasta que eso esté configurado.
        </div>
      )}

      <input
        className="checkout-input"
        placeholder="Buscar por nombre o id…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 400 }}
      />

      {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 20 }}>{error}</p>}

      {cargando && products.length === 0 && <p style={{ color: 'var(--fg-dim)' }}>Cargando…</p>}
      {!cargando && filtrados.length === 0 && <p style={{ color: 'var(--fg-dim)' }}>Ningún producto coincide.</p>}

      <div style={{ display: 'grid', gap: 10 }}>
        {filtrados.map((p) => (
          <div
            key={p.id}
            className="pay-panel"
            style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.activo === false ? 0.55 : 1 }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                {p.activo === false && <span className="status-pill" data-tone="bad">Inactivo</span>}
                {p.badge && <span className="status-pill" data-tone="ok">{p.badge}</span>}
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)', marginTop: 4 }}>
                {p.id} · {nombreCategoria(p.category)}
              </div>
            </div>
            <span className="mono" style={{ fontSize: 14, flexShrink: 0 }}>{formatCOP(p.price)}</span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link href={`/admin/catalogo/${p.id}`} className="btn btn-ghost btn-sm">Editar</Link>
              <button
                className="btn btn-ghost btn-sm"
                disabled={borrando === p.id}
                onClick={() => borrar(p)}
                style={{ color: '#ef4444' }}
              >
                {borrando === p.id ? 'Borrando…' : 'Borrar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
