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

import { env } from '@/lib/env';
import { roundToHundred } from '@/lib/money';
import type { ShippingProvider } from '../provider';
import {
  ShippingNotConfiguredError,
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
 * Transportadoras de Envia en Colombia con las que tiene sentido cotizar.
 *
 * La lista sale de `GET queries.envia.com/carrier?country_code=CO`, quitando
 * las de mensajería urbana inmediata (cabify, 99minutos, lastMile, welivery) y
 * las internacionales caras (dhl, fedex). Estas cinco son las que mueven
 * paquetes nacionales.
 */
// Se excluye el carrier propio `envia`: sus servicios son type 3 (tractomula,
// mula, sencillo) y rechazan cajas con "shipment type: box not supported".
// Es transporte de carga, no paquetería.
const TRANSPORTADORAS = ['tcc', 'interRapidisimo', 'serviEntrega', 'coordinadora'];

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
    email: contacto?.email ?? 'hola@verde.co',
    phone: contacto?.telefono ?? '3000000000',
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
  return ubicacion({ calle: o.direccion, geo }, 'Vivero Verde Suculento');
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
}

/** Cómo se escriben los nombres de las transportadoras en Colombia. */
const NOMBRE_CARRIER: Record<string, string> = {
  tcc: 'TCC',
  serviEntrega: 'Servientrega',
  interRapidisimo: 'Inter Rapidísimo',
  coordinadora: 'Coordinadora',
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
 * Se queda solo con las opciones que valen la pena mostrar.
 *
 * Envia devuelve hasta siete por ruta, con duplicados al mismo precio y
 * servicios "industriales" que cuestan el triple sin llegar antes. Una lista
 * así no ayuda a decidir: la paraliza.
 *
 * Sobre la lista ordenada por precio, se conserva una opción solo si llega
 * **estrictamente antes** que todas las más baratas. Es la frontera de Pareto:
 * lo que queda son las que ganan en precio, en tiempo, o en el equilibrio — y
 * lo que se descarta es siempre peor en ambas cosas que alguna que sí quedó.
 */
function frontera(opciones: ShippingQuote[]): ShippingQuote[] {
  const elegidas: ShippingQuote[] = [];
  let mejorPlazo = Infinity;

  for (const opcion of opciones) {
    if (opcion.etaMaxDays < mejorPlazo) {
      elegidas.push(opcion);
      mejorPlazo = opcion.etaMaxDays;
    }
  }

  // La más barata siempre va, aunque sea la más lenta: es la que más gente elige.
  if (elegidas.length === 0 && opciones.length > 0) elegidas.push(opciones[0]);

  return elegidas.slice(0, 4);
}

export const enviaProvider: ShippingProvider = {
  id: ID,
  label: 'Envia.com',

  isConfigured() {
    return Boolean(env.shipping.envia.token);
  },

  async quote(request: QuoteRequest): Promise<ShippingQuote[]> {
    credenciales();

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

    const bultos = paquete(request);

    // Una llamada por transportadora: `carrier` es obligatorio y no acepta
    // vacío. Se lanzan en paralelo y las que fallen no tumban al resto — es
    // normal que alguna esté caída o sin cobertura en cierta ruta, y perder
    // una opción es mejor que quedarse sin ninguna.
    //
    // Cada llamada va con reintento: ver el comentario de `conReintento` sobre
    // por qué Coordinadora e Inter Rapidísimo necesitan esto. Un `data: []`
    // sin error cuenta como fallo transitorio también — es exactamente lo que
    // se observó que devuelven bajo carga para rutas que sí tienen cobertura.
    const respuestas = await Promise.all(
      TRANSPORTADORAS.map(async (carrier) => {
        try {
          const tarifas = await conReintento(async () => {
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
          });
          return tarifas.map((t) => ({ ...t, carrier: t.carrier ?? carrier }));
        } catch (error) {
          console.warn(`[envia] ${carrier} no cotizó tras reintentos: ${(error as Error).message.slice(0, 160)}`);
          return [];
        }
      })
    );

    const tarifas = respuestas.flat();

    if (tarifas.length === 0) {
      throw new Error('[envia] ninguna transportadora devolvió tarifa para esta ruta.');
    }

    const envioGratis =
      env.shipping.freeShippingFrom > 0 &&
      request.merchandiseValue >= env.shipping.freeShippingFrom;
    const zona = zonaDe(request.destination.departamento);

    const opciones = tarifas
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

    return frontera(opciones);
  },

  async codCoverage(destination: ShippingAddress): Promise<CodCoverage> {
    // El catálogo confirma que el recaudo existe: `cash_on_delivery: 1` en TCC
    // (ambos servicios), Coordinadora (los cuatro), InterRapidísimo (los cinco)
    // y el servicio `premier_cod` de Servientrega. La comisión sale de
    // `additional_services`: 5% del recaudo con mínimo $4.760, más 1,3% de
    // seguro (mínimo $650) si se asegura.
    //
    // Aun así se responde "no disponible" hasta probar el flujo completo con
    // una llave de sandbox: ofrecer contra entrega y descubrir después que el
    // recaudo no se pidió bien es despachar producto que nadie cobra. El
    // default seguro se mantiene a propósito.
    return {
      available: false,
      fee: 0,
      settlementDays: 0,
      reason: `Cobertura de recaudo pendiente de verificar para ${destination.ciudad}.`,
    };
  },

  async createShipment({ order, quote }: CreateShipmentInput): Promise<CreatedShipment> {
    credenciales();

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
      Array<{ trackingNumber?: string; label?: string; shipmentId?: number | string }>
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
        },
      ],
      shipment: { carrier: quote.carrierCode, service: quote.serviceCode, type: 1 },
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
      status: 'created',
      externalId: String(guia.shipmentId ?? guia.trackingNumber),
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

  parseWebhook(payload, headers): ShippingWebhookEvent | null {
    const secreto = env.shipping.envia.webhookSecret;
    if (!secreto) {
      console.error('[envia] webhook recibido sin SHIPPING_WEBHOOK_SECRET configurado. Descartado.');
      return null;
    }

    // VERIFICAR: header y esquema de firma.
    if ((headers['x-envia-signature'] ?? headers['x-signature'] ?? '') !== secreto) {
      console.error('[envia] firma de webhook inválida. Descartado.');
      return null;
    }

    const cuerpo = payload as {
      id?: string;
      trackingNumber?: string;
      status?: string;
      date?: string;
      description?: string;
      location?: string;
    };

    if (!cuerpo.trackingNumber || !cuerpo.status) return null;

    return {
      eventId: cuerpo.id ?? `${cuerpo.trackingNumber}:${cuerpo.status}:${cuerpo.date}`,
      trackingNumber: cuerpo.trackingNumber,
      status: ESTADOS[cuerpo.status.toLowerCase()] ?? 'in_transit',
      description: cuerpo.description ?? cuerpo.status,
      occurredAt: cuerpo.date ?? new Date().toISOString(),
      location: cuerpo.location,
    };
  },
};
