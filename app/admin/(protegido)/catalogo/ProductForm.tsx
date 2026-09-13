'use client';

/**
 * Formulario de producto, compartido entre crear (/admin/catalogo/nuevo) y
 * editar (/admin/catalogo/[id]) — la única diferencia real es si `id` se
 * puede escribir o ya viene fijo, y si el POST va a la colección o el PATCH
 * a un id puntual.
 *
 * Fotos: solo se pueden reordenar/quitar las que ya existen o pegar una URL
 * ya alojada en otro lado — no hay subida de archivos todavía (ver
 * docs/railway-deploy.md o la conversación que decidió esto: requiere un
 * servicio de imágenes aparte, deliberadamente fuera de este alcance).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/data/catalog';
import type { Product, ProductColor, ProductSpecs } from '@/types';

const SPECS_VACIAS: ProductSpecs = { clima: '', sol: '', riego: '', produccion: '', altura: '', dificultad: '' };

interface Props {
  modo: 'crear' | 'editar';
  inicial?: Product;
}

export default function ProductForm({ modo, inicial }: Props) {
  const router = useRouter();
  const [id, setId] = useState(inicial?.id ?? '');
  const [name, setName] = useState(inicial?.name ?? '');
  const [tagline, setTagline] = useState(inicial?.tagline ?? '');
  const [category, setCategory] = useState(inicial?.category ?? CATEGORIES[0]?.id ?? '');
  const [price, setPrice] = useState(inicial ? String(inicial.price) : '');
  const [badge, setBadge] = useState(inicial?.badge ?? '');
  const [activo, setActivo] = useState(inicial?.activo !== false);
  const [description, setDescription] = useState(inicial?.description ?? '');
  const [specs, setSpecs] = useState<ProductSpecs>(inicial?.specs ?? SPECS_VACIAS);
  const [sizes, setSizes] = useState<string[]>(inicial?.sizes?.length ? inicial.sizes : ['']);
  const [colors, setColors] = useState<ProductColor[]>(
    inicial?.colors?.length ? inicial.colors : [{ name: '', hex: '#7a9a8a' }]
  );
  const [images, setImages] = useState<string[]>(inicial?.images ?? []);
  const [nuevaImagen, setNuevaImagen] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizarSize = (i: number, valor: string) =>
    setSizes((prev) => prev.map((s, idx) => (idx === i ? valor : s)));
  const actualizarColor = (i: number, campo: keyof ProductColor, valor: string) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  const moverImagen = (i: number, dir: -1 | 1) =>
    setImages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        id,
        name,
        tagline,
        category,
        price: Number(price),
        badge: badge.trim() || undefined,
        activo,
        description,
        specs,
        sizes: sizes.map((s) => s.trim()).filter(Boolean),
        colors: colors.filter((c) => c.name.trim() && c.hex.trim()),
        images,
      };

      const url = modo === 'crear' ? '/api/admin/products' : `/api/admin/products/${inicial!.id}`;
      const method = modo === 'crear' ? 'POST' : 'PATCH';

      const respuesta = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo guardar.');

      router.push('/admin/catalogo');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingTop: 20, paddingBottom: 80 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 28 }}>
        {modo === 'crear' ? 'Nuevo producto' : `Editar: ${inicial?.name}`}
      </h1>

      <form onSubmit={guardar} style={{ maxWidth: 640, display: 'grid', gap: 20 }}>
        <div>
          <label className="checkout-label" htmlFor="p-id">
            Id {modo === 'editar' && '(no se puede cambiar)'}
          </label>
          <input
            id="p-id"
            className="checkout-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={modo === 'editar'}
            placeholder="ej. MCO1234567890"
            required
          />
        </div>

        <div>
          <label className="checkout-label" htmlFor="p-name">Nombre</label>
          <input id="p-name" className="checkout-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="checkout-label" htmlFor="p-tagline">Eslogan corto</label>
          <input id="p-tagline" className="checkout-input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="checkout-label" htmlFor="p-category">Categoría</label>
            <select id="p-category" className="checkout-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="checkout-label" htmlFor="p-price">Precio (COP)</label>
            <input
              id="p-price"
              type="number"
              min={0}
              step={100}
              className="checkout-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="checkout-label" htmlFor="p-badge">Insignia (vacío = sin destacar)</label>
            <input id="p-badge" className="checkout-input" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="ej. Más vendido" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Visible en la tienda
            </label>
          </div>
        </div>

        <div>
          <label className="checkout-label" htmlFor="p-description">Descripción</label>
          <textarea
            id="p-description"
            className="checkout-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* --- Presentaciones --- */}
        <div>
          <div className="checkout-label" style={{ marginBottom: 8 }}>Presentaciones (tallas/packs)</div>
          {sizes.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="checkout-input" value={s} onChange={(e) => actualizarSize(i, e.target.value)} placeholder="ej. Pack de 5 unidades" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSizes((prev) => prev.filter((_, idx) => idx !== i))} disabled={sizes.length <= 1}>×</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSizes((prev) => [...prev, ''])}>+ Agregar presentación</button>
        </div>

        {/* --- Variedades/colores --- */}
        <div>
          <div className="checkout-label" style={{ marginBottom: 8 }}>Variedades</div>
          {colors.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="checkout-input" value={c.name} onChange={(e) => actualizarColor(i, 'name', e.target.value)} placeholder="ej. Estándar" style={{ flex: 1 }} />
              <input type="color" value={c.hex} onChange={(e) => actualizarColor(i, 'hex', e.target.value)} style={{ width: 44, height: 40, padding: 2, border: '1px solid var(--border-strong)', borderRadius: 8 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColors((prev) => prev.filter((_, idx) => idx !== i))} disabled={colors.length <= 1}>×</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColors((prev) => [...prev, { name: '', hex: '#7a9a8a' }])}>+ Agregar variedad</button>
        </div>

        {/* --- Ficha técnica --- */}
        <div>
          <div className="checkout-label" style={{ marginBottom: 8 }}>Ficha técnica</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(Object.keys(SPECS_VACIAS) as (keyof ProductSpecs)[]).map((campo) => (
              <input
                key={campo}
                className="checkout-input"
                value={specs[campo]}
                onChange={(e) => setSpecs((prev) => ({ ...prev, [campo]: e.target.value }))}
                placeholder={ETIQUETAS_SPECS[campo]}
              />
            ))}
          </div>
        </div>

        {/* --- Fotos: reordenar/quitar las existentes, pegar URL nueva --- */}
        <div>
          <div className="checkout-label" style={{ marginBottom: 8 }}>
            Fotos ({images.length}) — reordenar o quitar las existentes; para una foto nueva, pega la URL de donde ya está alojada
          </div>
          {images.map((img, i) => (
            <div key={img + i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: 'var(--bg-elev)' }} />
              <input className="checkout-input mono" value={img} readOnly style={{ flex: 1, fontSize: 12 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moverImagen(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moverImagen(i, 1)} disabled={i === images.length - 1}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="checkout-input"
              value={nuevaImagen}
              onChange={(e) => setNuevaImagen(e.target.value)}
              placeholder="https://… o /images/productos/…"
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (!nuevaImagen.trim()) return;
                setImages((prev) => [...prev, nuevaImagen.trim()]);
                setNuevaImagen('');
              }}
            >
              + Agregar
            </button>
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" disabled={guardando}>
            {guardando ? 'Guardando…' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push('/admin/catalogo')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

const ETIQUETAS_SPECS: Record<keyof ProductSpecs, string> = {
  clima: 'Clima',
  sol: 'Exposición solar',
  riego: 'Riego',
  produccion: 'Producción',
  altura: 'Altura adulta',
  dificultad: 'Dificultad',
};
