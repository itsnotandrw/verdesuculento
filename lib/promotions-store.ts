/**
 * Almacén de promociones, campañas y cupones. SOLO SERVIDOR.
 *
 * Toda la configuración vive en UNA clave de Redis (se lee y se guarda
 * entera, igual que el catálogo: la edita una persona de vez en cuando).
 * Sin REDIS_URL, el sitio usa los valores por defecto de lib/promotions.ts y
 * el admin avisa que es de solo lectura.
 */

import { redis, getJson, setJson, cmd, conCerrojo } from '@/lib/redis';
import { crearCacheTtl } from '@/lib/memoria';
import { refrescarSitio } from '@/lib/refrescar';
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

/** Configuración "sin descuentos": lo seguro si Redis falla y nunca se había leído nada (jamás cupones de ejemplo). */
const SIN_PROMOCIONES: PromoConfig = { rev: 0, promotions: [], campaigns: [], coupons: [], looks: [] };

const claveUso = (id: string) => `verde:cupon-uso:${id}`;

/** Lee de Redis (sin caché) y superpone los contadores de uso de los cupones, que son atómicos. */
async function leerDeRedis(): Promise<PromoConfig> {
  const guardada = await getJson<Partial<PromoConfig>>(CLAVE);
  let config: PromoConfig;
  if (guardada) {
    config = { ...normalizar(guardada), rev: guardada.rev ?? 0 };
  } else {
    if (!siembra) siembra = setJson(CLAVE, DEFAULT_PROMO_CONFIG).then(() => DEFAULT_PROMO_CONFIG);
    config = { ...(await siembra), rev: 0 };
  }
  if (config.coupons.length > 0) {
    const usos = await cmd<Array<string | null>>(['MGET', ...config.coupons.map((c) => claveUso(c.id))]);
    config = { ...config, coupons: config.coupons.map((c, i) => (usos[i] != null ? { ...c, used: Number(usos[i]) } : c)) };
  }
  return config;
}

// Caché de 5 s en memoria; se invalida al guardar. Con Redis caído se sigue con la última copia buena.
const cachePromos = crearCacheTtl(leerDeRedis, 5_000, 'promociones');

export async function getPromoConfig(): Promise<PromoConfig> {
  if (!redis) return DEFAULT_PROMO_CONFIG;
  try {
    return await cachePromos.obtener();
  } catch (error) {
    console.error('[promociones] Redis no respondió y no hay copia previa; sin promociones por seguridad:', error instanceof Error ? error.message : error);
    return SIN_PROMOCIONES;
  }
}

export class ConflictoDeVersionError extends Error {
  constructor() {
    super('Otra persona cambió las promociones mientras editabas. Recarga la página y vuelve a intentarlo.');
    this.name = 'ConflictoDeVersionError';
  }
}

/**
 * Guarda la configuración. Con cerrojo y control de versión: si `config.rev` no coincide con la guardada, alguien
 * más guardó antes y se rechaza en vez de pisar su trabajo. Los usos de cupones no se escriben aquí (son contadores).
 */
export async function savePromoConfig(config: PromoConfig): Promise<PromoConfig> {
  if (!redis) throw new Error('Las promociones son de solo lectura: falta configurar REDIS_URL.');
  const guardada = await conCerrojo('promos', async () => {
    const actual = await getJson<Partial<PromoConfig>>(CLAVE);
    const revActual = actual?.rev ?? 0;
    if (config.rev !== undefined && actual && config.rev !== revActual) throw new ConflictoDeVersionError();
    const siguiente: PromoConfig = { ...config, rev: revActual + 1 };
    await setJson(CLAVE, siguiente);
    return siguiente;
  });
  cachePromos.invalidar();
  refrescarSitio();
  return guardada;
}

/**
 * Reserva un uso del cupón de forma ATÓMICA (INCR): dos compras simultáneas con el último uso disponible no pasan
 * las dos. `usadosGuardados` inicializa el contador la primera vez con lo que ya tenía el cupón.
 */
export async function reservarUsoCupon(id: string, limite: number | undefined, usadosGuardados = 0): Promise<boolean> {
  if (!redis) return true;
  await cmd(['SET', claveUso(id), String(usadosGuardados), 'NX']);
  const n = Number(await cmd<number>(['INCR', claveUso(id)]));
  if (limite != null && n > limite) {
    await cmd(['DECR', claveUso(id)]);
    cachePromos.invalidar(); // el contador pasó un instante por n+1: que nadie guarde esa lectura transitoria
    return false;
  }
  cachePromos.invalidar();
  return true;
}

/** Devuelve un uso reservado (si el pedido no llegó a crearse). */
export async function liberarUsoCupon(id: string): Promise<void> {
  if (!redis) return;
  try {
    await cmd(['DECR', claveUso(id)]);
    cachePromos.invalidar();
  } catch (error) {
    console.error('[cupones] no se pudo liberar el uso de', id, error instanceof Error ? error.message : error);
  }
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
