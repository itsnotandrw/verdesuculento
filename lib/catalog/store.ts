/**
 * Repositorio del catálogo de productos. SOLO SERVIDOR.
 *
 * Mismo criterio que lib/orders/store.ts (Redis propio cuando está
 * configurado), pero MUCHO más simple a propósito: los pedidos necesitan
 * updates atómicos por id porque llegan concurrentes de verdad (webhooks,
 * clientes, cron). El catálogo lo edita una sola persona de vez en cuando —
 * no hay carrera que resolver, así que todo el catálogo vive en UNA sola
 * clave de Redis, como un array JSON. Se lee entero, se edita en memoria, se
 * guarda entero. Si el día que haya varios editores concurrentes esto se
 * vuelve un problema real, ese es el momento de partirlo por producto, no
 * antes.
 *
 * Sin `REDIS_URL` configurado (desarrollo local
 * típico), el catálogo cae al array estático de `data/catalog.ts`, de solo
 * lectura — el sitio funciona igual sin configurar nada, pero el admin no
 * puede guardar cambios (`catalogoEditable()` lo indica explícito en vez de
 * fallar en silencio).
 */

import { redis, getJson, setJson, conCerrojo } from '@/lib/redis';
import { crearCacheTtl } from '@/lib/memoria';
import { CATALOG as CATALOGO_ESTATICO } from '@/data/catalog';
import { refrescarSitio } from '@/lib/refrescar';
import type { Product } from '@/types';

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

/** Lee el catálogo de Redis (sin caché). Si Redis falla, lanza: el caché de memoria decide qué hacer. */
async function leerDeRedis(): Promise<Product[]> {
  const guardado = await getJson<Product[]>(CLAVE_CATALOGO);
  if (guardado) return guardado;
  if (!siembra) siembra = setJson(CLAVE_CATALOGO, CATALOGO_ESTATICO).then(() => CATALOGO_ESTATICO);
  return siembra;
}

// Caché de 5 s en memoria: una página llama al catálogo varias veces y cada llamada leía y analizaba 230 KB de Redis.
// Se invalida al guardar, así que en este proceso un cambio del admin se ve al instante.
const cacheCatalogo = crearCacheTtl(leerDeRedis, 5_000, 'catalogo');

async function todosSinFiltrar(): Promise<Product[]> {
  if (!redis) return CATALOGO_ESTATICO;
  try {
    return await cacheCatalogo.obtener();
  } catch (error) {
    // Solo si NUNCA se pudo leer (arranque con Redis caído): se sigue vendiendo con el catálogo de respaldo.
    console.error('[catalogo] Redis no respondió y no hay copia previa; usando el catálogo estático:', error instanceof Error ? error.message : error);
    return CATALOGO_ESTATICO;
  }
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

/**
 * Cambia el catálogo de forma segura: toma el cerrojo, lee lo ÚLTIMO de Redis (no la copia de memoria), aplica el
 * cambio, guarda UNA vez y refresca el sitio. Así dos ediciones simultáneas no se pisan y una acción masiva no
 * reescribe el catálogo entero una vez por producto.
 */
export async function modificarCatalogo(mutador: (actual: Product[]) => Product[]): Promise<void> {
  if (!redis) {
    throw new Error('El catálogo es de solo lectura: falta configurar REDIS_URL.');
  }
  await conCerrojo('catalogo', async () => {
    const actual = (await getJson<Product[]>(CLAVE_CATALOGO)) ?? CATALOGO_ESTATICO;
    const siguiente = mutador(actual);
    await setJson(CLAVE_CATALOGO, siguiente);
  });
  cacheCatalogo.invalidar();
  refrescarSitio();
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
  await modificarCatalogo((todos) => {
    const indice = todos.findIndex((p) => p.id === producto.id);
    return indice >= 0 ? todos.map((p, i) => (i === indice ? producto : p)) : [...todos, producto];
  });
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
  await modificarCatalogo((todos) => todos.filter((p) => p.id !== id));
}
