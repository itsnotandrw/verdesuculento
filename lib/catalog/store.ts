/**
 * Repositorio del catálogo de productos. SOLO SERVIDOR.
 *
 * Mismo criterio que lib/orders/store.ts (Redis por REST cuando está
 * configurado), pero MUCHO más simple a propósito: los pedidos necesitan
 * updates atómicos por id porque llegan concurrentes de verdad (webhooks,
 * clientes, cron). El catálogo lo edita una sola persona de vez en cuando —
 * no hay carrera que resolver, así que todo el catálogo vive en UNA sola
 * clave de Redis, como un array JSON. Se lee entero, se edita en memoria, se
 * guarda entero. Si el día que haya varios editores concurrentes esto se
 * vuelve un problema real, ese es el momento de partirlo por producto, no
 * antes.
 *
 * Sin `KV_REST_API_URL`/`KV_REST_API_TOKEN` configurados (desarrollo local
 * típico), el catálogo cae al array estático de `data/catalog.ts`, de solo
 * lectura — el sitio funciona igual sin configurar nada, pero el admin no
 * puede guardar cambios (`catalogoEditable()` lo indica explícito en vez de
 * fallar en silencio).
 */

import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';
import { CATALOG as CATALOGO_ESTATICO } from '@/data/catalog';
import type { Product } from '@/types';

const redis = env.kv.url && env.kv.token ? new Redis({ url: env.kv.url, token: env.kv.token }) : null;

const CLAVE_CATALOGO = 'verde:catalog:v1';

/** ¿Los cambios del admin se guardan de verdad, o el catálogo es de solo lectura? */
export function catalogoEditable(): boolean {
  return redis !== null;
}

// La siembra inicial (copiar el catálogo estático a Redis la primera vez que
// hay credenciales) puede dispararse por varias requests casi a la vez al
// arrancar — esta promesa compartida evita sembrar dos veces en una
// condición de carrera del arranque.
let siembra: Promise<Product[]> | null = null;

async function todosSinFiltrar(): Promise<Product[]> {
  if (!redis) return CATALOGO_ESTATICO;

  const guardado = await redis.get<Product[]>(CLAVE_CATALOGO);
  if (guardado) return guardado;

  if (!siembra) {
    siembra = redis.set(CLAVE_CATALOGO, CATALOGO_ESTATICO).then(() => CATALOGO_ESTATICO);
  }
  return siembra;
}

/**
 * Catálogo completo. `incluirInactivos` solo lo necesita el admin —
 * cualquier listado de cara al comprador (home, categorías, relacionados)
 * debe excluir lo que el negocio desactivó.
 */
export async function getAllProducts(incluirInactivos = false): Promise<Product[]> {
  const todos = await todosSinFiltrar();
  return incluirInactivos ? todos : todos.filter((p) => p.activo !== false);
}

async function guardarCatalogo(productos: Product[]): Promise<void> {
  if (!redis) {
    throw new Error(
      'El catálogo es de solo lectura: falta configurar KV_REST_API_URL/KV_REST_API_TOKEN.'
    );
  }
  await redis.set(CLAVE_CATALOGO, productos);
}

/**
 * Por id se busca SIEMPRE en el catálogo completo, activos e inactivos: un
 * pedido ya existente, o el checkout de alguien que tenía el producto en el
 * carrito antes de que se desactivara, tienen que poder seguir
 * encontrándolo. "Desactivar" oculta de listados, no borra la referencia.
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  const todos = await todosSinFiltrar();
  return todos.find((p) => p.id === id);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const todos = await getAllProducts();
  return todos.filter((p) => p.category === category);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const todos = await getAllProducts();
  return todos.filter((p) => p.badge);
}

export async function getRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  const todos = await getAllProducts();
  return todos.filter((p) => p.category === product.category && p.id !== product.id).slice(0, limit);
}

const CROSS_SELL_MAP: Record<string, string[]> = {
  berries: ['agroinsumos'],
  citricos: ['agroinsumos'],
  'frutales-calido': ['agroinsumos'],
  'frutales-exoticos': ['agroinsumos'],
  'frutales-frio': ['agroinsumos'],
  suculentas: ['agroinsumos'],
  agroinsumos: ['suculentas'],
  especias: ['agroinsumos'],
  otros: ['agroinsumos'],
};

export async function getCrossSellProducts(product: Product): Promise<Product[]> {
  const targets = CROSS_SELL_MAP[product.category] || [];
  const todos = await getAllProducts();
  return todos.filter((p) => targets.includes(p.category)).slice(0, 3);
}

/** Crea (si el id no existe) o reemplaza (si existe) un producto completo. */
export async function upsertProduct(producto: Product): Promise<void> {
  const todos = await todosSinFiltrar();
  const indice = todos.findIndex((p) => p.id === producto.id);
  const siguiente = indice >= 0
    ? todos.map((p, i) => (i === indice ? producto : p))
    : [...todos, producto];
  await guardarCatalogo(siguiente);
}

/**
 * Borrado real, no soft-delete: los pedidos ya creados guardan su propia
 * copia de nombre/precio/talla en OrderLine (ver lib/orders/types.ts), así
 * que no dependen del catálogo para seguir siendo legibles después. Para
 * "ocultarlo pero conservarlo" está el campo `activo`, que es lo que debería
 * usar el admin casi siempre — este borrado es para corregir un error de
 * carga, no para descontinuar un producto.
 */
export async function deleteProduct(id: string): Promise<void> {
  const todos = await todosSinFiltrar();
  await guardarCatalogo(todos.filter((p) => p.id !== id));
}
