/**
 * Entrega el mismo día en Bogotá, Chía y Soacha (mensajería local, p. ej. InDrive), solo para compras hechas antes de
 * la hora de corte (SHIPPING_SAME_DAY_CUTOFF_HOUR, por defecto las 12:00 m., hora de Bogotá).
 *
 * No es una transportadora con API: el vivero coordina el domicilio por WhatsApp. Por eso la guía es interna y,
 * mientras SHIPPING_SAME_DAY_FEE sea 0, el costo se muestra como "Se confirma por WhatsApp" en vez de "Gratis".
 */

import { MISMO_DIA_MUNICIPIOS } from '@/data/contacto';
import { env } from '@/lib/env';
import type { ShippingAddress, ShippingQuote } from './types';

export const MISMO_DIA_QUOTE_ID = 'local:indrive:mismo-dia';

const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const MUNICIPIOS = MISMO_DIA_MUNICIPIOS.map(norm);

/** Hora actual en Bogotá (0-23), sin depender de la zona horaria del servidor (Railway corre en UTC). */
export function horaEnBogota(ahora: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Bogota' }).format(ahora)) % 24;
}

/** ¿Todavía se puede pedir entrega para hoy? Solo antes de la hora de corte. */
export function mismoDiaAbierto(ahora: Date = new Date()): boolean {
  return horaEnBogota(ahora) < env.shipping.sameDayCutoffHour;
}

/** ¿El destino tiene entrega el mismo día y todavía es hora de pedirla? (Mosquera de Nariño, por ejemplo, no.) */
export function aplicaMismoDia(destino: Pick<ShippingAddress, 'ciudad' | 'departamento'>, ahora: Date = new Date()): boolean {
  if (!mismoDiaAbierto(ahora)) return false;
  const ciudad = norm(destino.ciudad);
  const depto = norm(destino.departamento);
  const enZona = depto.includes('cundinamarca') || depto.includes('bogota');
  return enZona && MUNICIPIOS.some((m) => ciudad === m || ciudad.startsWith(m));
}

export function cotizacionMismoDia(): ShippingQuote {
  const costo = env.shipping.sameDayFee;
  return {
    id: MISMO_DIA_QUOTE_ID,
    provider: 'local',
    carrier: 'Mensajería local (InDrive)',
    carrierCode: 'indrive',
    service: 'Entrega el mismo día',
    serviceCode: 'mismo-dia',
    cost: costo,
    listCost: costo,
    costLabel: costo > 0 ? undefined : 'Se confirma por WhatsApp',
    currency: 'COP',
    etaMinDays: 0,
    etaMaxDays: 0,
    etaLabel: 'Hoy mismo',
    cashOnDeliveryAvailable: false,
    cashOnDeliveryFee: 0,
    note: 'Pedido hecho antes de las 12:00 m.: te escribimos por WhatsApp para confirmar la hora y el valor del domicilio antes de despachar.',
  };
}
