/**
 * Adaptador de Envia.com (agregador multi-transportadora, multi-país).
 *
 * PROBADO CONTRA LA API REAL el 2026-08-07. Lo que se aprendió:
 *
 * 1. **`city` lleva el código DANE en Colombia**, no el nombre del municipio.
 *    Es lo que decide si las transportadoras cotizan o no — ver `envia-geo.ts`,
 *    donde está el detalle de por qué mandar el nombre produce tres errores
 *    distintos que parecen problemas de cuenta y son el mismo campo.
 *
 * 2. **La llave es por ambiente.** Una llave de producción da 401 contra
 *    `api-test.envia.com` y viceversa. El 401 no distingue "llave inválida" de
 *    "ambiente equivocado", así que `ENVIA_BASE_URL` tiene que coincidir con
 *    el ambiente donde se creó la llave.
 *
 * 3. **`shipment.carrier` es obligatorio** y no acepta cadena vacía. Envia no
 *    devuelve todas las transportadoras de una: hay que nombrarlas. Por eso se
 *    cotizan las cuatro en paralelo y se juntan los resultados.
 *
 * 4. **`postalCode` tiene que estar presente pero puede ir vacío** cuando
 *    `city` trae el DANE. El esquema lo exige; su valor no se usa.
 *
 * Docs: https://docs.envia.com/reference/shipping-rates
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { CONTACTO } from '@/data/contacto';
import { env } from '@/lib/env';
import { roundToHundred } from '@/lib/money';
import type { ShippingProvider } from '../provider';
import {
  CancelNotSupportedError,
  ShippingNotConfiguredError,
  SinTarifasError,
  type CancelShipmentInput,
  type CancelShipmentResult,
  type PickupInput,
  type PickupResult,
  type CodCoverage,
  type CreateShipmentInput,
  type CreatedShipment,
  type QuoteRequest,
  type ShipmentStatus,
  type ShippingAddress,
  type ShippingQuote,
  type ShippingWebhookEvent,
  type TrackingEvent,
} from '../types';
import { pesoFacturableKg, zonaDe } from '../zonas';
import { armarPaquete } from '../paquete';
import { resolverUbicacion, type UbicacionEnvia } from './envia-geo';

const ID = 'envia';

/** VERIFICAR: catálogo de estados de `GET /ship/generalTracking`. */
/**
 * Catálogo oficial de Envia: 28 estados, con nombre en inglés y sin guiones
 * bajos (docs.envia.com/reference/track-shipments). Se compara en minúsculas
 * porque la API los devuelve con mayúscula inicial ("Created", "Out for
 * Delivery"), no en el formato `snake_case` que se había asumido antes de
 * probar contra el sandbox.
 */
const ESTADOS: Record<string, ShipmentStatus> = {
  created: 'created',
  pending: 'created',
  'picked up': 'picked_up',
  'out for pickup': 'picked_up',
  shipped: 'in_transit',
  information: 'in_transit',
  redirected: 'in_transit',
  'partially shipped': 'in_transit',
  'out for delivery': 'out_for_delivery',
  delivered: 'delivered',
  'delivered at origin': 'delivered',
  'partially delivered': 'delivered',
  canceled: 'incident',
  lost: 'incident',
  damaged: 'incident',
  'return problem': 'incident',
  'address error': 'incident',
  undeliverable: 'incident',
  delayed: 'incident',
  rejected: 'incident',
  '1 delivery attempt': 'incident',
  '2 delivery attempts': 'incident',
  '3 delivery attempts': 'incident',
  '1 pickup attempt': 'incident',
  'delivery attempt': 'incident',
  'pickup at office': 'incident',
  returned: 'returned',
};

function credenciales(): { token: string; baseUrl: string } {
  const { token, baseUrl } = env.shipping.envia;
  if (!token) throw new ShippingNotConfiguredError(ID, 'ENVIA_TOKEN');
  return { token, baseUrl: baseUrl.replace(/\/$/, '') };
}

/**
 * Tiempo máximo por intento antes de darlo por perdido y reintentar.
 *
 * Coordinadora es bimodal: responde en 1-2s o en ~10s, sin término medio, y
 * esto se midió incluso llamándola sola, una a la vez, sin ninguna carga
 * concurrente — es una característica de su backend, no un efecto de pedir
 * las cuatro transportadoras a la vez.
 *
 * Por eso, solo para la cotización, el timeout es corto y no largo: un solo
 * intento con margen para los 10s gastaría todo el presupuesto de tiempo en
 * la posibilidad lenta. Dos intentos cortos (ver `conReintento`) dan dos
 * oportunidades de caer en el camino rápido por el mismo presupuesto total.
 *
 * Generar guía y consultar tracking son operaciones de un solo intento —no
 * hay "más barata" que perder, es la única guía de ese pedido— así que usan
 * un timeout mucho más largo. Se descubrió probando: con el mismo timeout
 * corto de la cotización, una guía de TCC se cortaba a los 3.5s con "tiempo
 * de espera agotado" cuando la llamada real solo necesitaba unos segundos
 * más. Cortar una cotización temprano cuesta una opción de menos en la
 * lista; cortar una guía temprano deja un pedido ya pagado sin poder
 * despachar.
 */
const TIMEOUT_COTIZACION_MS = 3_500;
const TIMEOUT_CRITICO_MS = 20_000;

async function llamar<T>(ruta: string, body: unknown, timeoutMs = TIMEOUT_CRITICO_MS): Promise<T> {
  const { token, baseUrl } = credenciales();

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), timeoutMs);

  try {
    const respuesta = await fetch(`${baseUrl}${ruta}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: control.signal,
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '');
      throw new Error(`[envia] ${ruta} → ${respuesta.status} ${detalle.slice(0, 300)}`);
    }

    const json = (await respuesta.json()) as { meta?: string; data?: T; error?: unknown };
    if (json.error) throw new Error(`[envia] ${ruta} → ${JSON.stringify(json.error).slice(0, 300)}`);
    return (json.data ?? json) as T;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`[envia] ${ruta} → tiempo de espera agotado (${timeoutMs}ms).`);
    }
    throw error;
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Reintenta fallas transitorias.
 *
 * Probando la integración se vio que Coordinadora e Inter Rapidísimo fallan
 * de forma intermitente bajo carga concurrente: "Too Many Requests", "Bad
 * Gateway", tiempos de 9 a 18 segundos, o incluso 200 con `data: []` para una
 * ruta que segundos antes sí tenía tarifa. Nada de eso significa que la
 * transportadora no cubra la ruta — es la infraestructura de Envia
 * tropezando bajo las cuatro llamadas simultáneas que dispara cada
 * cotización. Sin reintento, cuál de las cuatro se cae es una lotería: el
 * cliente ve un checkout distinto en cada visita a la misma dirección.
 */
async function conReintento<T>(fn: () => Promise<T>, intentos = 1): Promise<T> {
  let ultimoError: unknown;

  for (let intento = 0; intento <= intentos; intento++) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;
      if (intento < intentos) {
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));
      }
    }
  }

  throw ultimoError;
}

/**
 * Transportadoras de Envia que se cotizan. Salen de `ENVIA_CARRIERS` (códigos de Envia separados por coma) para poder
 * sumar o quitar una sin desplegar. Cada transportadora se consulta por separado y la que no cubra la ruta (o falle)
 * simplemente no aparece: nunca tumba al resto.
 *
 * Por defecto las cuatro nacionales de paquetería: TCC, Inter Rapidísimo, Servientrega y Coordinadora. Verificado en
 * producción (2026-11-23, panel /admin/envios) que son las que cubren el país; J&T Express no existe en el catálogo de
 * Envia para Colombia. Quedan fuera a propósito el carrier propio `envia` (servicios type 3: tractomula, rechazan cajas),
 * la mensajería urbana inmediata (cabify, 99minutos, lastMile, welivery, mensajerosUrbanos: solo ciudades puntuales) y
 * DHL (cubre, pero ≈ $49.000 por un paquete que otras llevan en ≈ $21.000); si se quisieran, basta añadirlas a la variable.
 */
const POR_DEFECTO = 'tcc,interRapidisimo,serviEntrega,coordinadora';

/** Transportadoras que Envia no deja anular por API. */
const SIN_CANCELACION = new Set(['interRapidisimo']);

/** Código postal de la bodega (Soacha). Solo lo exige agendar recogida; configurable con SHIPPING_ORIGIN_POSTAL_CODE. */
const CODIGO_POSTAL_ORIGEN = '250051';

function transportadoras(): string[] {
  const lista = (env.shipping.envia.carriers || POR_DEFECTO)
    .split(',')
    .map((c) => c.trim())
    .filter((c) => /^[A-Za-z0-9]{2,30}$/.test(c) && c !== 'envia');
  return lista.length ? [...new Set(lista)] : POR_DEFECTO.split(',');
}

/**
 * Envia.com describe origen y destino con el mismo objeto.
 *
 * Confirmado contra `GET /generic-form?country_code=CO&form=address_info`
 * —el formulario real que usa su propio dashboard— que en Colombia la
 * dirección va completa en un solo campo `street`, sin un campo de número
 * separado: por eso `numero` siempre queda en 'S/N' y no es un dato que
 * falte, es como se representa una dirección colombiana en un esquema
 * pensado para países que sí separan calle y número.
 *
 * `district` y `reference` sí son campos distintos y con propósitos
 * distintos, según la referencia de /ship/generate/: `district` es el
 * barrio, `reference` son instrucciones de entrega —su propio ejemplo es
 * "Edificio azul, piso 3"—. Antes el checkout juntaba "Barrio, Apto 101" en
 * un solo campo de texto que se mandaba entero como `district`, así que el
 * número de apartamento nunca llegaba al campo que el mensajero realmente
 * lee para encontrar la puerta.
 */
function ubicacion(
  datos: {
    calle: string;
    numero?: string;
    barrio?: string;
    referencia?: string;
    documento?: string;
    geo: UbicacionEnvia;
  },
  nombre: string,
  contacto?: { telefono: string; email: string }
) {
  return {
    name: nombre,
    company: 'Vivero Verde Suculento',
    // Sin contacto propio (el origen): el del vivero. Antes salía un teléfono de relleno que la transportadora no podía llamar.
    email: contacto?.email ?? CONTACTO.email,
    phone: contacto?.telefono ?? CONTACTO.telefonoTel.replace(/^\+57/, ''),
    street: datos.calle,
    number: datos.numero ?? 'S/N',
    district: datos.barrio ?? '',
    reference: datos.referencia ?? '',
    // TCC lo exige en el destino ("NIT/CC destino no puede ser vacío",
    // probado contra su API real); las demás transportadoras no lo piden
    // pero lo aceptan sin problema. Se manda siempre, no solo para TCC.
    identificationNumber: datos.documento ?? '',
    // En Colombia `city` lleva el código DANE, no el nombre. Ver envia-geo.ts.
    city: datos.geo.city,
    state: datos.geo.state,
    country: 'CO',
    // El esquema lo exige, pero con el DANE presente su valor no se usa:
    // cotiza igual vacío, y así no hace falta una tabla de códigos postales.
    postalCode: '',
  };
}

/** Origen: la bodega. Se resuelve una vez y se reutiliza. */
async function origenResuelto() {
  const o = env.shipping.origin;
  const geo = await resolverUbicacion(o.ciudad, o.departamento);
  return ubicacion({ calle: o.direccion, barrio: o.barrio, geo }, 'Vivero Verde Suculento');
}

function paquete(request: QuoteRequest) {
  const { weightGrams, lengthCm, widthCm, heightCm, declaredValue } = request.parcel;
  return [
    {
      content: 'Plantas vivas',
      amount: 1,
      type: 'box',
      dimensions: { length: lengthCm, width: widthCm, height: heightCm },
      weight: Math.max(1, pesoFacturableKg(weightGrams, lengthCm, widthCm, heightCm)),
      insurance: 0,
      declaredValue,
      weightUnit: 'KG',
      lengthUnit: 'CM',
    },
  ];
}

interface TarifaEnvia {
  carrier?: string;
  service?: string;
  serviceDescription?: string;
  totalPrice?: number;
  basePrice?: number;
  deliveryEstimate?: string;
  deliveryDate?: { date_from?: number; date_to?: number };
  /** Siempre vienen; en 0 si no se pidió recaudo o el servicio no recauda. Con recaudo la comisión incluye IVA. */
  cashOnDeliveryCommission?: number | string;
  cashOnDeliveryAmount?: number | string;
}

/** Cómo se escriben los nombres de las transportadoras en Colombia. */
const NOMBRE_CARRIER: Record<string, string> = {
  tcc: 'TCC',
  serviEntrega: 'Servientrega',
  interRapidisimo: 'Inter Rapidísimo',
  coordinadora: 'Coordinadora',
  jtexpress: 'J&T Express',
  mensajerosUrbanos: 'Mensajeros Urbanos',
  noventa9Minutos: '99 Minutos',
  lastMile: 'Lastmile',
  cabify: 'Cabify',
  welivery: 'Welivery',
  dhl: 'DHL',
  fedex: 'FedEx',
};

/**
 * El plazo real lo trae `deliveryEstimate` como texto libre en español
 * ("Día siguiente", "1-2 días", "2-5 días"), no como fechas. Sin parsearlo,
 * todas las opciones caen al plazo genérico de la zona y el checkout muestra
 * "2 — 4 días hábiles" para un servicio que llega mañana.
 */
function plazo(tarifa: TarifaEnvia, zona: { etaMin: number; etaMax: number }) {
  const desde = tarifa.deliveryDate?.date_from;
  const hasta = tarifa.deliveryDate?.date_to;
  if (typeof desde === 'number' && typeof hasta === 'number') {
    return { min: desde, max: hasta };
  }

  const texto = (tarifa.deliveryEstimate ?? '').toLowerCase();

  if (/d[ií]a siguiente|next day|24 ?h/.test(texto)) return { min: 1, max: 1 };
  if (/mismo d[ií]a|same day/.test(texto)) return { min: 0, max: 1 };

  const rango = texto.match(/(\d+)\s*[-–a]\s*(\d+)/);
  if (rango) return { min: Number(rango[1]), max: Number(rango[2]) };

  const uno = texto.match(/(\d+)/);
  if (uno) return { min: Number(uno[1]), max: Number(uno[1]) };

  return { min: zona.etaMin, max: zona.etaMax };
}

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

/**
 * Quita el nombre de la transportadora del servicio para no repetirlo: la
 * tarjeta ya muestra "Inter Rapidísimo", sobra "Interrapidisimo Mensajería".
 *
 * Se compara sin tildes ni espacios porque Envia escribe el mismo nombre de
 * varias formas — "Interrapidisimo" en la descripción del servicio,
 * "interRapidisimo" como código.
 */
function nombreServicio(descripcion: string, carrier: string): string {
  const objetivo = sinTildes(NOMBRE_CARRIER[carrier] ?? carrier);
  const palabras = descripcion.trim().split(/\s+/);

  // Descarta las primeras palabras mientras sigan formando el nombre.
  let acumulado = '';
  let corte = 0;
  for (let i = 0; i < palabras.length; i++) {
    acumulado += sinTildes(palabras[i]);
    if (!objetivo.startsWith(acumulado)) break;
    if (acumulado === objetivo) {
      corte = i + 1;
      break;
    }
  }

  const limpio = palabras.slice(corte).join(' ').replace(/^[-–]\s*/, '').trim();
  const nombre = limpio || descripcion;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/** "1 día hábil" y no "1 días hábiles". */
function etiquetaPlazo(min: number, max: number): string {
  if (min === max) return max === 1 ? '1 día hábil' : `${max} días hábiles`;
  return `${min} — ${max} días hábiles`;
}

/**
 * Elige qué opciones ve el cliente: TODAS las transportadoras que cotizaron, cada una con su mejor precio.
 *
 * Antes se aplicaba una «frontera de Pareto» que ocultaba cualquier transportadora más cara que otra igual de rápida;
 * el cliente del vivero quiere ver a todas con sus precios, así que ahora se muestra la opción más barata de cada una y,
 * además, el servicio más rápido de esa misma transportadora si llega antes y no cuesta más de 1,6 veces. Envia devuelve
 * hasta siete servicios por ruta, con duplicados al mismo precio y servicios «industriales» que no ayudan a decidir:
 * eso sí se sigue descartando. Se marca la más barata y la más rápida del conjunto.
 */
function seleccionar(opciones: ShippingQuote[]): ShippingQuote[] {
  const porTransportadora = new Map<string, ShippingQuote[]>();
  for (const o of opciones) porTransportadora.set(o.carrierCode, [...(porTransportadora.get(o.carrierCode) ?? []), o]);

  const elegidas: ShippingQuote[] = [];
  for (const lista of porTransportadora.values()) {
    const ordenadas = [...lista].sort((a, b) => a.cost - b.cost || a.etaMaxDays - b.etaMaxDays);
    const barata = ordenadas[0];
    elegidas.push(barata);
    const rapida = ordenadas
      .slice(1)
      .filter((o) => o.etaMaxDays < barata.etaMaxDays && o.listCost <= barata.listCost * 1.6)
      .sort((a, b) => a.etaMaxDays - b.etaMaxDays || a.cost - b.cost)[0];
    if (rapida) elegidas.push(rapida);
  }

  const resultado = elegidas.sort((a, b) => a.cost - b.cost || a.etaMaxDays - b.etaMaxDays).slice(0, 8);
  if (resultado.length > 1) {
    const masRapida = [...resultado].sort((a, b) => a.etaMaxDays - b.etaMaxDays || a.cost - b.cost)[0];
    resultado[0] = { ...resultado[0], etiqueta: 'Más barata' };
    if (masRapida.id !== resultado[0].id) {
      const i = resultado.findIndex((o) => o.id === masRapida.id);
      resultado[i] = { ...masRapida, etiqueta: 'Más rápida' };
    }
  }
  return resultado;
}

// ----------------------------------------------------------------------------- recaudo (contra entrega)

/**
 * Servientrega solo recauda con su servicio `premier_cod`: el `premier` normal no lleva recaudo. Para emparejar una
 * tarifa normal con su variante de recaudo se compara sin ese sufijo.
 */
const sinSufijoCod = (servicio: string) => servicio.replace(/_cod$/i, '');
const claveServicio = (carrier: string, servicio: string) => `${carrier}:${sinSufijoCod(servicio)}`;

/**
 * Tarifas ya consultadas durante 20 s. El checkout cotiza dos veces seguidas para la misma dirección y carrito (la
 * normal y la que pregunta por recaudo); sin esto, cada pantalla dispararía el doble de llamadas a Envia, que ya se
 * ha visto tropezar bajo carga concurrente. Una promesa fallida se descarta para no cachear el error.
 */
const TTL_TARIFAS_MS = 20_000;
const cacheTarifas = new Map<string, { vence: number; tarifas: Promise<TarifaEnvia[]> }>();

function llaveTarifas(request: QuoteRequest, recaudo: number): string {
  const { weightGrams, lengthCm, widthCm, heightCm, declaredValue } = request.parcel;
  const { departamento, ciudad } = request.destination;
  return [departamento, ciudad, weightGrams, lengthCm, widthCm, heightCm, declaredValue, recaudo].join('|').toLowerCase();
}

/** Monto que se manda a Envia al preguntar por recaudo: el subtotal (el envío aún no se conoce al cotizar). */
const recaudoEstimado = (request: QuoteRequest) => Math.max(10_000, Math.round(request.merchandiseValue));

/**
 * Códigos reales (carrier y servicio) con los que Envia genera la guía.
 *
 * Salen del `id` de la cotización (`envia:<carrier>:<servicio>`), que es determinista y viaja congelado en el pedido.
 * Los campos `carrierCode`/`serviceCode` de una cotización congelada pueden traer el nombre para mostrar ("Servientrega",
 * "Premier") en vez del código, y mandarlo así rompe la guía. Con recaudo se prefiere el servicio que Envia devolvió
 * para recaudar, y Servientrega pasa de `premier` a `premier_cod`.
 */
function codigosDe(quote: ShippingQuote, conRecaudo: boolean): { carrier: string; service: string } {
  const partes = quote.id.split(':');
  const deId = partes[0] === ID && partes.length >= 3 ? { carrier: partes[1], service: partes.slice(2).join(':') } : null;
  const parecidoACodigo = (t: string) => /^[A-Za-z0-9_]+$/.test(t);

  const carrier = deId?.carrier ?? quote.carrierCode;
  let service = deId?.service ?? quote.serviceCode;

  if (conRecaudo) {
    if (deId && parecidoACodigo(quote.serviceCode) && sinSufijoCod(quote.serviceCode) === sinSufijoCod(deId.service)) {
      service = quote.serviceCode;
    } else if (carrier === 'serviEntrega' && !/_cod$/i.test(service)) {
      service = `${service}_cod`;
    }
  }

  if (!carrier || !service) throw new Error(`[envia] no se pudo determinar la transportadora de la cotización "${quote.id}".`);
  return { carrier, service };
}

/** Consulta tarifas a Envia (una llamada por transportadora, en paralelo). `recaudo > 0` pregunta con `cash_on_delivery`. */
async function consultarEnvia(request: QuoteRequest, recaudo: number, exigir: boolean): Promise<TarifaEnvia[]> {
  const [origen, destinoGeo] = await Promise.all([
    origenResuelto(),
    resolverUbicacion(request.destination.ciudad, request.destination.departamento),
  ]);

  const destino = ubicacion(
    {
      calle: request.destination.direccion ?? 'Sin dirección',
      barrio: request.destination.barrio,
      geo: destinoGeo,
    },
    'Cliente'
  );

  const bultos: Array<Record<string, unknown>> = paquete(request);
  if (recaudo > 0) {
    bultos[0] = { ...bultos[0], additionalServices: [{ service: 'cash_on_delivery', data: { amount: String(recaudo) } }] };
  }

  // Una llamada por transportadora: `carrier` es obligatorio y no acepta vacío. Se lanzan en paralelo y las que
  // fallen no tumban al resto — es normal que alguna esté caída o sin cobertura en cierta ruta, y perder una
  // opción es mejor que quedarse sin ninguna. Con reintento (ver `conReintento`): Coordinadora e Inter fallan de
  // forma intermitente bajo carga. Con recaudo no se reintenta: que un servicio no recaude es una respuesta normal.
  const consultarTodas = () =>
    Promise.all(
      transportadoras().map(async (carrier) => {
        try {
          const tarifas = await conReintento(
            async () => {
              const resultado = await llamar<TarifaEnvia[]>(
                '/ship/rate/',
                {
                  origin: origen,
                  destination: destino,
                  packages: bultos,
                  shipment: { carrier, type: 1 },
                  settings: { currency: 'COP' },
                },
                TIMEOUT_COTIZACION_MS
              );
              if (!resultado?.length) throw new Error('respuesta vacía');
              return resultado;
            },
            recaudo > 0 ? 0 : 1
          );
          return tarifas.map((t) => ({ ...t, carrier: t.carrier ?? carrier }));
        } catch (error) {
          console.warn(`[envia] ${carrier}${recaudo > 0 ? ' (con recaudo)' : ''} no cotizó: ${(error as Error).message.slice(0, 160)}`);
          return [] as TarifaEnvia[];
        }
      })
    );

  let tarifas = (await consultarTodas()).flat();

  // Que TODAS fallen a la vez es poco frecuente pero se ha visto pasar (verificado en vivo): antes de decirle al
  // comprador que no hay opciones se intenta la ronda completa una vez más.
  if (tarifas.length === 0 && exigir) {
    await new Promise((r) => setTimeout(r, 400));
    tarifas = (await consultarTodas()).flat();
  }

  if (tarifas.length === 0 && exigir) throw new SinTarifasError();
  return tarifas;
}

function tarifasConCache(request: QuoteRequest, recaudo: number, exigir: boolean): Promise<TarifaEnvia[]> {
  const llave = llaveTarifas(request, recaudo);
  const ahora = Date.now();
  const previa = cacheTarifas.get(llave);
  if (previa && previa.vence > ahora) return previa.tarifas;

  if (cacheTarifas.size > 200) {
    for (const [k, v] of cacheTarifas) if (v.vence <= ahora) cacheTarifas.delete(k);
    if (cacheTarifas.size > 200) cacheTarifas.clear();
  }

  const tarifas = consultarEnvia(request, recaudo, exigir);
  cacheTarifas.set(llave, { vence: ahora + TTL_TARIFAS_MS, tarifas });
  tarifas.catch(() => {
    if (cacheTarifas.get(llave)?.tarifas === tarifas) cacheTarifas.delete(llave);
  });
  return tarifas;
}

export const enviaProvider: ShippingProvider = {
  id: ID,
  label: 'Envia.com',

  isConfigured() {
    return Boolean(env.shipping.envia.token);
  },

  /**
   * Cotiza. Sin `cashOnDelivery` devuelve las opciones normales. Con `cashOnDelivery` devuelve SOLO las que Envia
   * confirma con recaudo (la cotización con `cash_on_delivery` trae `cashOnDeliveryCommission`; si un servicio no lo
   * trae, no recauda), con el cargo fijo del cliente en `cashOnDeliveryFee`.
   *
   * El precio que ve el cliente sale siempre de la cotización normal del mismo servicio, nunca de la que lleva
   * recaudo: así no depende de cómo Envia reparta la comisión dentro de `totalPrice`.
   */
  async quote(request: QuoteRequest): Promise<ShippingQuote[]> {
    credenciales();

    const normales = await tarifasConCache(request, 0, true);

    const envioGratis =
      env.shipping.freeShippingFrom > 0 &&
      request.merchandiseValue >= env.shipping.freeShippingFrom;
    const zona = zonaDe(request.destination.departamento);

    const todas = normales
      .map((tarifa): ShippingQuote => {
        const carrier = tarifa.carrier ?? 'transportadora';
        const servicio = tarifa.service ?? 'estandar';
        const listCost = roundToHundred(tarifa.totalPrice ?? tarifa.basePrice ?? 0);
        const { min, max } = plazo(tarifa, zona);

        return {
          id: `${ID}:${carrier}:${servicio}`,
          provider: ID,
          carrier: NOMBRE_CARRIER[carrier] ?? carrier,
          carrierCode: carrier,
          service: nombreServicio(tarifa.serviceDescription ?? servicio, carrier),
          serviceCode: servicio,
          listCost,
          cost: envioGratis ? 0 : listCost,
          currency: 'COP',
          etaMinDays: min,
          etaMaxDays: max,
          etaLabel: etiquetaPlazo(min, max),
          cashOnDeliveryAvailable: false,
          cashOnDeliveryFee: 0,
        };
      })
      .sort((a, b) => a.cost - b.cost || a.etaMaxDays - b.etaMaxDays);

    // Una misma clave (carrier + servicio sin `_cod`) puede venir dos veces; se queda la normal.
    const unicas = new Map<string, ShippingQuote>();
    for (const o of todas) {
      const clave = claveServicio(o.carrierCode, o.serviceCode);
      const previa = unicas.get(clave);
      if (!previa || (/_cod$/i.test(previa.serviceCode) && !/_cod$/i.test(o.serviceCode))) unicas.set(clave, o);
    }
    const candidatas = [...unicas.values()].sort((a, b) => a.cost - b.cost || a.etaMaxDays - b.etaMaxDays);

    if (!request.cashOnDelivery) {
      // Un servicio de recaudo nunca se ofrece como envío normal: sin monto a recaudar no tiene sentido.
      return seleccionar(candidatas.filter((o) => !/_cod$/i.test(o.serviceCode)));
    }

    // Si la consulta con recaudo falla, simplemente no hay contra entrega: no se tumba la cotización.
    const conRecaudo = await tarifasConCache(request, recaudoEstimado(request), false).catch((error) => {
      console.warn(`[envia] cotización con recaudo falló: ${(error as Error).message.slice(0, 160)}`);
      return [] as TarifaEnvia[];
    });

    // VERIFICADO contra la API real (2026-11-19): Envia devuelve `cashOnDeliveryCommission` en TODA cotización, en 0
    // cuando no se pidió recaudo o el servicio no recauda. Solo una comisión > 0 prueba que el servicio recauda. La
    // comisión ya trae IVA y está dominada por los mínimos de cada transportadora (≈ $4.760–$5.660 en un pedido de $70.000).
    const conComision = new Map<string, { servicio: string; comision: number }>();
    for (const t of conRecaudo) {
      const comision = Number(t.cashOnDeliveryCommission);
      if (!Number.isFinite(comision) || comision <= 0) continue;
      conComision.set(claveServicio(t.carrier ?? '', t.service ?? ''), { servicio: t.service ?? '', comision });
    }

    const capaces = candidatas
      .filter((o) => conComision.has(claveServicio(o.carrierCode, o.serviceCode)))
      .map((o) => {
        const recaudo = conComision.get(claveServicio(o.carrierCode, o.serviceCode))!;
        return {
          ...o,
          serviceCode: recaudo.servicio || o.serviceCode,
          cashOnDeliveryAvailable: true,
          // Al cliente se le suma lo que cobra la transportadora por recaudar (redondeado hacia arriba a $100); el cargo
          // fijo configurado es el piso, para que nunca quede por debajo de lo que el vivero paga.
          cashOnDeliveryFee: Math.max(env.shipping.codFeeFlat, Math.ceil(recaudo.comision / 100) * 100),
        };
      });

    return seleccionar(capaces);
  },

  /**
   * Cobertura de recaudo: aquí solo se aplican las reglas del negocio (habilitado, pedido mínimo y máximo). Qué
   * transportadoras recaudan en el destino lo decide la cotización con recaudo (`quote` con `cashOnDelivery`).
   */
  async codCoverage(_destination: ShippingAddress, amount = 0): Promise<CodCoverage> {
    const { codEnabled, codMinOrder, codMaxOrder, codFeeFlat } = env.shipping;
    const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

    if (!codEnabled) {
      return { available: false, fee: 0, settlementDays: 0, reason: 'El contra entrega no está habilitado por ahora.' };
    }
    if (codMinOrder > 0 && amount > 0 && amount < codMinOrder) {
      return { available: false, fee: 0, settlementDays: 0, reason: `El contra entrega aplica desde ${cop(codMinOrder)}.` };
    }
    if (codMaxOrder > 0 && amount > codMaxOrder) {
      return {
        available: false,
        fee: 0,
        settlementDays: 0,
        reason: `El contra entrega aplica hasta ${cop(codMaxOrder)}. Para pedidos más grandes usa Wompi o Bre-B.`,
      };
    }
    // Envia acredita el recaudo al marcarse "Entregado"; el retiro a banco se procesa martes y viernes.
    return { available: true, fee: codFeeFlat, settlementDays: 4 };
  },

  async createShipment({ order, quote, cashOnDelivery }: CreateShipmentInput): Promise<CreatedShipment> {
    credenciales();

    // Contra entrega: el MISMO servicio de recaudo y monto en la cotización y en la guía. Envia vuelve a calcular el
    // precio al generar y solo compra los servicios que se envían aquí: uno cotizado y no enviado no se aplica.
    const recaudo = cashOnDelivery && cashOnDelivery > 0 ? Math.round(cashOnDelivery) : 0;
    const codigos = codigosDe(quote, recaudo > 0);

    const [origen, destinoGeo] = await Promise.all([
      origenResuelto(),
      resolverUbicacion(order.address.ciudad, order.address.departamento),
    ]);

    // El mismo cálculo que se usó para cotizar, no una caja genérica: si la
    // guía sale con otras dimensiones, la transportadora puede recalcular el
    // cobro y ya no coincide con lo que se le mostró al cliente.
    const paquete = armarPaquete(order.lines, order.subtotal);

    // La respuesta de /ship/generate/ trae `data` como ARRAY —igual que
    // /ship/rate/—, no como objeto plano. Probado en sandbox: sin esto, la
    // guía se generaba y se cobraba en la cuenta de Envia, pero el pedido
    // quedaba marcado como fallido porque `guia.trackingNumber` leía el campo
    // en el array en vez de en data[0].
    const [guia] = await llamar<
      Array<{
        trackingNumber?: string;
        label?: string;
        shipmentId?: number | string;
        totalPrice?: number;
        currentBalance?: number;
      }>
    >('/ship/generate/', {
      origin: origen,
      destination: ubicacion(
        {
          calle: order.address.direccion,
          barrio: order.address.barrio,
          referencia: order.address.notas,
          documento: order.customer.documento,
          geo: destinoGeo,
        },
        `${order.customer.nombre} ${order.customer.apellido}`,
        { telefono: order.customer.telefono, email: order.customer.email }
      ),
      packages: [
        {
          content: 'Plantas vivas',
          amount: 1,
          type: 'box',
          dimensions: { length: paquete.lengthCm, width: paquete.widthCm, height: paquete.heightCm },
          weight: Math.max(1, pesoFacturableKg(paquete.weightGrams, paquete.lengthCm, paquete.widthCm, paquete.heightCm)),
          insurance: 0,
          declaredValue: order.subtotal,
          weightUnit: 'KG',
          lengthUnit: 'CM',
          ...(recaudo > 0 ? { additionalServices: [{ service: 'cash_on_delivery', data: { amount: String(recaudo) } }] } : {}),
        },
      ],
      shipment: { carrier: codigos.carrier, service: codigos.service, type: 1 },
      settings: { printFormat: 'PDF', printSize: 'STOCK_4X6', comments: `Pedido ${order.reference}. PLANTAS VIVAS.` },
    });

    if (!guia?.trackingNumber) {
      throw new Error('[envia] la respuesta no trajo número de guía.');
    }

    return {
      provider: ID,
      carrier: quote.carrier,
      service: quote.service,
      trackingNumber: guia.trackingNumber,
      labelUrl: guia.label,
      cost: quote.cost,
      ...(recaudo > 0 ? { codAmount: recaudo } : {}),
      status: 'created',
      externalId: String(guia.shipmentId ?? guia.trackingNumber),
      actualCost: guia.totalPrice,
      providerBalance: guia.currentBalance,
    };
  },

  /**
   * Anula una guía (POST /ship/cancel/). Solo se puede mientras la transportadora no haya recogido ni escaneado el
   * paquete. Inter Rapidísimo no trae la acción `cancel` en Envia (confirmado con carrier-action/152): hay que pedírselo
   * a ella directamente, y se avisa antes de gastar una llamada que sabemos que falla.
   */
  async cancelShipment({ trackingNumber, carrierCode }: CancelShipmentInput): Promise<CancelShipmentResult> {
    credenciales();
    if (SIN_CANCELACION.has(carrierCode)) throw new CancelNotSupportedError(NOMBRE_CARRIER[carrierCode] ?? carrierCode);

    const resultado = await llamar<unknown>('/ship/cancel/', { carrier: carrierCode, trackingNumber });
    const dato = (Array.isArray(resultado) ? resultado[0] : resultado) as { balanceReturned?: boolean } | undefined;
    return {
      balanceReturned: dato?.balanceReturned,
      message: dato?.balanceReturned ? 'Guía anulada y valor devuelto al saldo.' : 'Guía anulada.',
    };
  },

  /**
   * Agenda la recogida a domicilio (POST /ship/pickup/) de varias guías de la MISMA transportadora en una sola
   * solicitud. Tiene tarifa propia (se descuenta del saldo) y exige saldo suficiente. El código postal del origen es
   * obligatorio aquí (3-10 caracteres), a diferencia de cotizar.
   */
  async schedulePickup(input: PickupInput): Promise<PickupResult> {
    credenciales();
    const origen = await origenResuelto();
    const [respuesta] = await llamar<
      Array<{ pickupNumber?: string; pickupDate?: string; pickupTimeFrom?: string; pickupTimeTo?: string; pickupFee?: number }>
    >('/ship/pickup/', {
      origin: { ...origen, postalCode: env.shipping.origin.postalCode || CODIGO_POSTAL_ORIGEN },
      shipment: {
        type: 1,
        carrier: input.carrierCode,
        pickup: {
          weightUnit: 'KG',
          totalWeight: Math.max(0.01, Math.round(input.totalWeightKg * 100) / 100),
          totalPackages: input.trackingNumbers.length,
          date: input.date,
          timeFrom: input.timeFrom,
          timeTo: input.timeTo,
          carrier: input.carrierCode,
          trackingNumbers: input.trackingNumbers,
          ...(input.instructions ? { instructions: input.instructions.slice(0, 200) } : {}),
        },
      },
    });

    if (!respuesta?.pickupNumber) throw new Error('[envia] la recogida no devolvió número de confirmación.');
    return {
      pickupNumber: respuesta.pickupNumber,
      date: respuesta.pickupDate ?? input.date,
      timeFrom: respuesta.pickupTimeFrom ?? `${String(input.timeFrom).padStart(2, '0')}:00`,
      timeTo: respuesta.pickupTimeTo ?? `${String(input.timeTo).padStart(2, '0')}:00`,
      fee: typeof respuesta.pickupFee === 'number' ? respuesta.pickupFee : undefined,
    };
  },

  async track(trackingNumber: string): Promise<TrackingEvent[]> {
    // POST /ship/generaltrack/ (minúsculas, no /generalTracking/{numero} como
    // GET) con un array de guías en el body — probado en sandbox. Acepta
    // varias guías a la vez, aunque aquí siempre se manda una.
    const [envio] = await llamar<
      Array<{
        status?: string;
        estimatedDelivery?: string;
        createdAt?: string;
        shippedAt?: string;
        deliveredAt?: string;
        eventHistory?: Array<{ status?: string; date?: string; description?: string; location?: string }>;
      }>
    >('/ship/generaltrack/', { trackingNumbers: [trackingNumber] });

    if (!envio) return [];

    // Recién creada, `eventHistory` viene vacío: la transportadora todavía no
    // ha escaneado el paquete. Se sintetiza al menos el evento de creación con
    // el estado actual, para que el cliente no vea la guía como si no existiera.
    if (!envio.eventHistory?.length) {
      return [
        {
          status: ESTADOS[(envio.status ?? '').toLowerCase()] ?? 'created',
          description: envio.status ?? 'Guía generada',
          occurredAt: envio.shippedAt ?? envio.createdAt ?? new Date().toISOString(),
        },
      ];
    }

    return envio.eventHistory.map((evento) => ({
      status: ESTADOS[(evento.status ?? '').toLowerCase()] ?? 'in_transit',
      description: evento.description ?? evento.status ?? 'Actualización de la transportadora',
      occurredAt: evento.date ?? new Date().toISOString(),
      location: evento.location,
    }));
  },

  /**
   * Webhooks de Envia (docs.envia.com/docs/webhooks): headers X-Webhook-Signature (`v1=<firma>`), X-Webhook-Timestamp,
   * X-Webhook-Id y X-Webhook-Event. La guía oficial indica `firma = HMAC-SHA256(timestamp + "." + evento + "." + cuerpo, secreto)`
   * pero no aclara si el cuerpo es el texto crudo, si la salida va en hex o base64, ni la unidad del timestamp (la guía
   * dice milisegundos y su ejemplo parece segundos). Por eso se aceptan, en tiempo constante, las variantes plausibles
   * —con y sin el nombre del evento, hex y base64— y SIEMPRE se exige que el timestamp esté firmado: una variante que no lo
   * incluya dejaría reenviar un cuerpo viejo con un timestamp nuevo. Un secreto o algoritmo que no coincida descarta el
   * evento (fallo seguro: el seguimiento sigue disponible consultando /ship/generaltrack/ desde el panel).
   * El secreto no sale de la API (crear el webhook no lo devuelve): se pide a Envia y va en SHIPPING_WEBHOOK_SECRET.
   */
  parseWebhook(payload, headers, rawBody): ShippingWebhookEvent | null {
    const secreto = env.shipping.envia.webhookSecret;
    if (!secreto) {
      console.error('[envia] webhook recibido sin SHIPPING_WEBHOOK_SECRET configurado. Descartado.');
      return null;
    }

    const firmaRecibida = (headers['x-webhook-signature'] ?? '').replace(/^v1=/, '').trim();
    const timestamp = (headers['x-webhook-timestamp'] ?? '').trim();
    const evento = (headers['x-webhook-event'] ?? '').trim();

    if (!firmaRecibida || !timestamp) {
      console.error('[envia] webhook sin X-Webhook-Signature o X-Webhook-Timestamp. Descartado.');
      return null;
    }

    const candidatas = [`${timestamp}.${evento}.${rawBody}`, `${timestamp}.${rawBody}`];
    const recibida = Buffer.from(firmaRecibida, 'utf-8');
    const valida = candidatas.some((texto) =>
      (['hex', 'base64'] as const).some((codificacion) => {
        const calculada = Buffer.from(createHmac('sha256', secreto).update(texto).digest(codificacion), 'utf-8');
        return calculada.length === recibida.length && timingSafeEqual(calculada, recibida);
      })
    );
    if (!valida) {
      console.error('[envia] firma de webhook inválida. Descartado.');
      return null;
    }

    // Anti-replay: se rechaza cualquier evento con más de 5 minutos de antigüedad, aunque la firma sea perfecta.
    // El timestamp puede venir en segundos o en milisegundos.
    const crudo = Number(timestamp);
    const segundos = crudo > 1e12 ? crudo / 1000 : crudo;
    const diferencia = Math.abs(Date.now() / 1000 - segundos);
    if (!Number.isFinite(diferencia) || diferencia > 300) {
      console.error(`[envia] webhook con timestamp fuera de rango (${timestamp}). Descartado por posible replay.`);
      return null;
    }

    const cuerpo = payload as {
      type?: string;
      created_at?: string;
      data?: {
        shipment_id?: number | string;
        tracking_number?: string;
        status?: string;
        carrier_name?: string;
      };
    };

    const datos = cuerpo.data;
    if (!datos?.tracking_number || !datos.status) return null;

    return {
      eventId: headers['x-webhook-id'] || `${datos.tracking_number}:${datos.status}:${cuerpo.created_at ?? ''}`,
      trackingNumber: datos.tracking_number,
      status: ESTADOS[datos.status.toLowerCase()] ?? 'in_transit',
      description: `${datos.status}${datos.carrier_name ? ` · ${datos.carrier_name}` : ''}`,
      occurredAt: cuerpo.created_at ?? new Date().toISOString(),
    };
  },
};

// ----------------------------------------------------------------------------- diagnóstico y administración

/** Host de consultas/webhooks de Envia según el ambiente de la llave (la API de envíos y la de consultas son hosts distintos). */
function hostConsultas(): string {
  const { baseUrl } = credenciales();
  return /api-test|test\./i.test(baseUrl) ? 'https://queries-test.envia.com' : 'https://queries.envia.com';
}

async function consultas<T>(ruta: string, metodo: 'GET' | 'POST', body?: unknown): Promise<T> {
  const { token } = credenciales();
  const respuesta = await fetch(`${hostConsultas()}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_CRITICO_MS),
  });
  if (!respuesta.ok) throw new Error(`[envia] ${ruta} → ${respuesta.status} ${(await respuesta.text().catch(() => '')).slice(0, 200)}`);
  const json = (await respuesta.json()) as { data?: T };
  return (json.data ?? json) as T;
}

export interface ResultadoDiagnostico {
  carrier: string;
  nombre: string;
  ok: boolean;
  ms: number;
  opciones: Array<{ servicio: string; precio: number; plazo: string }>;
  error?: string;
  /** ¿Está en la lista que usa el checkout? */
  enCheckout: boolean;
}

/**
 * Cotiza con TODAS las transportadoras de Envia en Colombia (no solo las del checkout) para una ruta, con un paquete
 * típico. Sirve para ver en producción cuáles cubren de verdad y a qué precio, y decidir qué sumar a `ENVIA_CARRIERS`.
 */
export async function diagnosticoTransportadoras(destino: { departamento: string; ciudad: string }): Promise<ResultadoDiagnostico[]> {
  const catalogo = await consultas<Array<{ name: string }>>('/carrier?country_code=CO', 'GET');
  const codigos = [...new Set(catalogo.map((c) => c.name))].filter((c) => c !== 'envia');
  const activas = new Set(transportadoras());

  const [origen, geo] = await Promise.all([origenResuelto(), resolverUbicacion(destino.ciudad, destino.departamento)]);
  const bultos = paquete({
    destination: { departamento: destino.departamento, ciudad: destino.ciudad },
    parcel: { weightGrams: 2000, lengthCm: 40, widthCm: 20, heightCm: 12, declaredValue: 60_000 },
    merchandiseValue: 60_000,
  });

  return Promise.all(
    codigos.map(async (carrier): Promise<ResultadoDiagnostico> => {
      const t0 = Date.now();
      const base = { carrier, nombre: NOMBRE_CARRIER[carrier] ?? carrier, enCheckout: activas.has(carrier) };
      try {
        const tarifas = await llamar<TarifaEnvia[]>(
          '/ship/rate/',
          {
            origin: origen,
            destination: ubicacion({ calle: 'Sin dirección', geo }, 'Cliente'),
            packages: bultos,
            shipment: { carrier, type: 1 },
            settings: { currency: 'COP' },
          },
          12_000
        );
        if (!tarifas?.length) throw new Error('sin tarifas para esta ruta');
        return {
          ...base,
          ok: true,
          ms: Date.now() - t0,
          opciones: tarifas.map((t) => ({ servicio: t.service ?? '', precio: roundToHundred(t.totalPrice ?? t.basePrice ?? 0), plazo: t.deliveryEstimate ?? '' })),
        };
      } catch (error) {
        return { ...base, ok: false, ms: Date.now() - t0, opciones: [], error: (error as Error).message.replace(/^\[envia\]\s*/, '').slice(0, 160) };
      }
    })
  );
}

/** Webhooks registrados en la cuenta de Envia. */
export async function listarWebhooksEnvia(): Promise<unknown> {
  return consultas<unknown>('/webhooks', 'GET');
}

/** Registra el webhook de seguimiento (tipo 3 = tracking.simple, el que va firmado). */
export async function registrarWebhookEnvia(url: string): Promise<unknown> {
  return consultas<unknown>('/webhooks', 'POST', { type_id: 3, url, active: 1 });
}
