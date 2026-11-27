/**
 * Tráfico del sitio, propio y sin cookies. SOLO SERVIDOR.
 *
 * Cuenta visitas sin guardar datos personales: no se guarda la IP ni el navegador, solo contadores por día y un
 * contador aproximado de visitantes únicos (HyperLogLog sobre un identificador que mezcla IP+navegador+día+secreto y
 * que cambia cada día, así que no sirve para seguir a una persona). Sin Redis no se registra nada.
 *
 * Por día (hora de Bogotá) se guarda un hash `verde:tr:<fecha>` con contadores:
 *   pv · páginas vistas · ses · visitas (sesiones nuevas) · ev:<evento> · p:<ruta> · r:<fuente> · d:<dispositivo>
 * y un HyperLogLog `verde:tru:<fecha>` con los visitantes únicos. Se conservan 400 días.
 */

import { createHash } from 'crypto';
import { env } from '@/lib/env';
import { redis } from '@/lib/redis';

const DIAS_GUARDADOS = 400;
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pagespeed|monitor|uptime|curl|wget|python-requests|axios|go-http|postman/i;

export const fechaBogota = (d: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Rutas que se cuentan (lista cerrada: evita que rutas inventadas llenen la base). */
const RUTA = /^\/(producto\/[A-Za-z0-9_-]{1,40}|catalogo(\/[a-z0-9-]{1,40})?|ofertas(\/[a-z0-9-]{1,60})?|diario(\/[a-z0-9-]{1,80})?|nosotros|asesoria|carrito|checkout|pedido|mis-pedidos|buscar|privacidad)?$/;

export function rutaValida(ruta: unknown): string | null {
  if (typeof ruta !== 'string') return null;
  const limpia = ruta.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (limpia.length > 120 || !RUTA.test(limpia)) return null;
  return limpia;
}

export const esBot = (ua: string) => !ua || BOT.test(ua);

export function dispositivoDe(ua: string): 'movil' | 'tablet' | 'escritorio' {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'movil';
  return 'escritorio';
}

const FUENTES: [RegExp, string][] = [
  [/doubleclick\.net|googleadservices|googlesyndication/i, 'Google Ads'],
  [/google\./i, 'Google'], [/bing\.|duckduckgo|yahoo\./i, 'Otros buscadores'],
  [/instagram|^l\.instagram/i, 'Instagram'], [/facebook|fb\.com|fb\.me|^l\.facebook/i, 'Facebook'],
  [/tiktok/i, 'TikTok'], [/whatsapp|wa\.me/i, 'WhatsApp'], [/youtube|youtu\.be/i, 'YouTube'],
  [/mercadolibre|mercadolivre/i, 'Mercado Libre'], [/t\.co$|twitter|^x\.com/i, 'X (Twitter)'], [/pinterest/i, 'Pinterest'],
];

/** Fuente de una visita nueva: utm_source, o el dominio de donde vino; vacío = directo. */
export function fuenteDe(referrer: unknown, utm: unknown, hostPropio: string, deAnuncio = false): string {
  if (deAnuncio) return 'Google Ads';
  const u = typeof utm === 'string' ? utm.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) : '';
  if (u) {
    const conocida = FUENTES.find(([re]) => re.test(u));
    return conocida ? conocida[1] : `utm:${u}`;
  }
  if (typeof referrer !== 'string' || !referrer) return 'Directo';
  let host = '';
  try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch { return 'Directo'; }
  if (!host || host === hostPropio.replace(/^www\./, '')) return 'Directo';
  const conocida = FUENTES.find(([re]) => re.test(host));
  return conocida ? conocida[1] : host.slice(0, 40);
}

export interface Medicion {
  tipo: 'pv' | 'evento';
  ruta?: string | null;
  evento?: string;
  nueva?: boolean;
  fuente?: string;
  ua: string;
  ip: string;
}

const EVENTOS = new Set(['carrito']);
export const eventoValido = (e: unknown): e is string => typeof e === 'string' && EVENTOS.has(e);

export async function registrar(m: Medicion): Promise<void> {
  if (!redis) return;
  const dia = fechaBogota();
  const clave = `verde:tr:${dia}`;
  const visitante = createHash('sha256').update(`${m.ip}|${m.ua}|${dia}|${env.authSecret}`).digest('hex').slice(0, 16);
  const p = redis.pipeline();
  if (m.tipo === 'evento' && m.evento) {
    p.hincrby(clave, `ev:${m.evento}`, 1);
  } else if (m.ruta) {
    p.hincrby(clave, 'pv', 1);
    p.hincrby(clave, `p:${m.ruta}`, 1);
    p.pfadd(`verde:tru:${dia}`, visitante);
    p.expire(`verde:tru:${dia}`, DIAS_GUARDADOS * 86400);
    if (m.nueva) {
      p.hincrby(clave, 'ses', 1);
      p.hincrby(clave, `d:${dispositivoDe(m.ua)}`, 1);
      p.hincrby(clave, `r:${m.fuente ?? 'Directo'}`, 1);
    }
  }
  p.expire(clave, DIAS_GUARDADOS * 86400);
  await p.exec();
}

export interface DiaTrafico { fecha: string; pv: number; ses: number; unicos: number; campos: Record<string, number> }

/** Lee los últimos `dias` días (el más antiguo primero). */
export async function leerTrafico(dias = 30): Promise<DiaTrafico[]> {
  if (!redis) return [];
  const fechas = Array.from({ length: dias }, (_, i) => fechaBogota(new Date(Date.now() - (dias - 1 - i) * 86400000)));
  const p = redis.pipeline();
  for (const f of fechas) { p.hgetall(`verde:tr:${f}`); p.pfcount(`verde:tru:${f}`); }
  const res = (await p.exec()) ?? [];
  return fechas.map((fecha, i) => {
    const hash = (res[i * 2]?.[1] ?? {}) as Record<string, string>;
    const campos: Record<string, number> = {};
    for (const [k, v] of Object.entries(hash)) campos[k] = Number(v) || 0;
    return { fecha, pv: campos.pv ?? 0, ses: campos.ses ?? 0, unicos: Number(res[i * 2 + 1]?.[1] ?? 0) || 0, campos };
  });
}

/** Suma de los campos que empiezan por `prefijo` en los días dados, de mayor a menor. */
export function sumarPorPrefijo(dias: DiaTrafico[], prefijo: string): { nombre: string; n: number }[] {
  const acc = new Map<string, number>();
  for (const d of dias) for (const [k, v] of Object.entries(d.campos)) if (k.startsWith(prefijo)) acc.set(k.slice(prefijo.length), (acc.get(k.slice(prefijo.length)) ?? 0) + v);
  return [...acc.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n);
}
