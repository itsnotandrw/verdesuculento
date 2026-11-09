/**
 * Sincronización del catálogo con Mercado Libre. SOLO SERVIDOR.
 *
 * Usa la API oficial (token de aplicación, solo lectura de publicaciones).
 * Compara precio y disponibilidad de cada producto con la publicación de
 * Mercado Libre y, si se pide, lo aplica al catálogo. Equivalente en el
 * servidor de `scripts/ml-sync.mjs`.
 */

import { env } from '@/lib/env';
import { getAllProducts, upsertProduct } from '@/lib/catalog/store';

export interface CambioML {
  id: string;
  name: string;
  price?: { antes: number; despues: number };
  activo?: { antes: boolean; despues: boolean };
}

export interface ResultadoSync {
  consultados: number;
  cambios: CambioML[];
  /** Saltos de precio sospechosos (>3x o <1/3): no se aplican. */
  revisar: { id: string; name: string; antes: number; despues: number }[];
  aplicado: boolean;
}

export function mlConfigurado(): boolean {
  return Boolean(env.mercadolibre.appId && env.mercadolibre.clientSecret);
}

async function token(): Promise<string> {
  const r = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.mercadolibre.appId,
      client_secret: env.mercadolibre.clientSecret,
    }),
    cache: 'no-store',
  });
  const j = (await r.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('Mercado Libre no entregó token. Revisa ML_APP_ID y ML_CLIENT_SECRET.');
  return j.access_token;
}

interface ItemML {
  id: string;
  price: number;
  available_quantity: number;
  status: string;
}

export async function sincronizarConML(aplicar: boolean): Promise<ResultadoSync> {
  if (!mlConfigurado()) throw new Error('Faltan ML_APP_ID y ML_CLIENT_SECRET.');
  const access = await token();

  const productos = await getAllProducts(true);
  const ids = productos.filter((p) => /^MCO\d+$/.test(p.id)).map((p) => p.id);

  const remoto = new Map<string, ItemML>();
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const r = await fetch(
      `https://api.mercadolibre.com/items?ids=${chunk.join(',')}&attributes=id,price,available_quantity,status`,
      { headers: { authorization: `Bearer ${access}` }, cache: 'no-store' },
    );
    const filas = (await r.json()) as { code: number; body: ItemML }[];
    for (const f of filas) if (f.code === 200) remoto.set(f.body.id, f.body);
  }

  const cambios: CambioML[] = [];
  const revisar: ResultadoSync['revisar'] = [];

  for (const p of productos) {
    const r = remoto.get(p.id);
    if (!r) continue;
    const cambio: CambioML = { id: p.id, name: p.name };

    if (r.price !== p.price) {
      const ratio = r.price / p.price;
      if (ratio > 3 || ratio < 1 / 3) revisar.push({ id: p.id, name: p.name, antes: p.price, despues: r.price });
      else cambio.price = { antes: p.price, despues: r.price };
    }
    const activo = r.status === 'active' && r.available_quantity > 0;
    if (activo !== (p.activo !== false)) cambio.activo = { antes: p.activo !== false, despues: activo };

    if (cambio.price || cambio.activo) {
      cambios.push(cambio);
      if (aplicar) {
        const siguiente = { ...p };
        if (cambio.price) siguiente.price = cambio.price.despues;
        if (cambio.activo) {
          if (cambio.activo.despues) delete siguiente.activo;
          else siguiente.activo = false;
        }
        await upsertProduct(siguiente);
      }
    }
  }

  return { consultados: remoto.size, cambios, revisar, aplicado: aplicar };
}
