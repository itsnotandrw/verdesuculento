/**
 * Almacén de promociones, campañas y cupones. SOLO SERVIDOR.
 *
 * Toda la configuración vive en UNA clave de Redis (se lee y se guarda
 * entera, igual que el catálogo: la edita una persona de vez en cuando).
 * Sin REDIS_URL, el sitio usa los valores por defecto de lib/promotions.ts y
 * el admin avisa que es de solo lectura.
 */

import { redis, getJson, setJson } from '@/lib/redis';
import { DEFAULT_PROMO_CONFIG, ofertasDe, vigente, type PromoConfig, type PromoCoupon, type Promotion, type Campaign } from '@/lib/promotions';

const CLAVE = 'verde:promos:v1';

export function promosEditables(): boolean {
  return redis !== null;
}

let siembra: Promise<PromoConfig> | null = null;

/** Completa campos que no existían en versiones anteriores de lo guardado. */
function normalizar(c: Partial<PromoConfig>): PromoConfig {
  const porId = new Map(DEFAULT_PROMO_CONFIG.coupons.map((x) => [x.id, x]));
  const porIdCamp = new Map(DEFAULT_PROMO_CONFIG.campaigns.map((x) => [x.id, x]));
  return {
    promotions: c.promotions ?? DEFAULT_PROMO_CONFIG.promotions,
    // Lo guardado antes de que existieran slug/target recibe los de los cupones y campañas por defecto
    campaigns: (c.campaigns ?? DEFAULT_PROMO_CONFIG.campaigns).map((x) => ({ slug: porIdCamp.get(x.id)?.slug, ...x })),
    coupons: (c.coupons ?? DEFAULT_PROMO_CONFIG.coupons).map((x) => ({ slug: porId.get(x.id)?.slug, target: porId.get(x.id)?.target, ...x })),
    looks: c.looks ?? DEFAULT_PROMO_CONFIG.looks,
  };
}

export async function getPromoConfig(): Promise<PromoConfig> {
  if (!redis) return DEFAULT_PROMO_CONFIG;
  const guardada = await getJson<Partial<PromoConfig>>(CLAVE);
  if (guardada) return normalizar(guardada);
  if (!siembra) siembra = setJson(CLAVE, DEFAULT_PROMO_CONFIG).then(() => DEFAULT_PROMO_CONFIG);
  return siembra;
}

export async function savePromoConfig(config: PromoConfig): Promise<void> {
  if (!redis) throw new Error('Las promociones son de solo lectura: falta configurar REDIS_URL.');
  await setJson(CLAVE, config);
}

export async function getActivePromotions(now = new Date()): Promise<Promotion[]> {
  return (await getPromoConfig()).promotions.filter((p) => vigente(p, now));
}

export async function getActiveCoupons(now = new Date()): Promise<PromoCoupon[]> {
  return (await getPromoConfig()).coupons.filter((c) => vigente(c, now));
}

export async function getOfertas(now = new Date()) {
  return ofertasDe(await getPromoConfig(), now);
}

export async function getActiveCampaigns(now = new Date()): Promise<Campaign[]> {
  return (await getPromoConfig()).campaigns.filter((c) => vigente(c, now));
}
