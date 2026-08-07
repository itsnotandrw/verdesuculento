/**
 * Zonificación de Colombia para tarifas y tiempos de entrega.
 *
 * Las transportadoras no cotizan por departamento sino por código de municipio
 * (DANE). Mientras no haya agregador conectado, el departamento es suficiente
 * para una tarifa honesta; cuando lo haya, `codigoDane()` da el código que
 * esperan sus catálogos.
 *
 * Nota de negocio: aquí viajan plantas vivas. El tiempo en tránsito no es solo
 * una expectativa de servicio, es supervivencia del producto — por eso las
 * zonas lentas llevan un aviso explícito en la cotización.
 */

export type ZonaId = 'z1' | 'z2' | 'z3' | 'z4';

export interface Zona {
  id: ZonaId;
  nombre: string;
  /** Tarifa que cubre hasta `kilosIncluidos`. */
  base: number;
  /**
   * Kilos que entran en la tarifa base. Se fija en 2 porque el pedido típico
   * —una o dos plantas— pesa entre 1 y 2 kg volumétricos, y así la tarifa que
   * ve el cliente coincide con la que el sitio publica en el carrito.
   */
  kilosIncluidos: number;
  /** Recargo por cada kilo adicional (o fracción). */
  porKiloAdicional: number;
  etaMin: number;
  etaMax: number;
  /** Aviso al cliente cuando el tránsito pone en riesgo la planta. */
  aviso?: string;
  /** Cobertura de recaudo contra entrega en la zona. */
  contraEntrega: boolean;
}

export const ZONAS: Record<ZonaId, Zona> = {
  z1: {
    id: 'z1',
    nombre: 'Bogotá y Sabana',
    base: 10_000,
    kilosIncluidos: 2,
    porKiloAdicional: 2_000,
    etaMin: 1,
    etaMax: 3,
    contraEntrega: true,
  },
  z2: {
    id: 'z2',
    nombre: 'Región Andina y Eje Cafetero',
    base: 14_000,
    kilosIncluidos: 2,
    porKiloAdicional: 2_500,
    etaMin: 2,
    etaMax: 4,
    contraEntrega: true,
  },
  z3: {
    id: 'z3',
    nombre: 'Caribe y Pacífico',
    base: 19_000,
    kilosIncluidos: 2,
    porKiloAdicional: 3_500,
    etaMin: 3,
    etaMax: 5,
    contraEntrega: true,
  },
  z4: {
    id: 'z4',
    nombre: 'Orinoquía, Amazonía e Insular',
    base: 29_000,
    kilosIncluidos: 2,
    porKiloAdicional: 7_000,
    etaMin: 5,
    etaMax: 9,
    aviso: 'Ruta larga: la planta viaja empacada para resistir el tránsito y la garantía de planta viva se mantiene.',
    contraEntrega: false,
  },
};

const DEPARTAMENTO_ZONA: Record<string, ZonaId> = {
  'bogota d.c.': 'z1',
  'bogota': 'z1',
  'cundinamarca': 'z1',

  'antioquia': 'z2',
  'valle del cauca': 'z2',
  'santander': 'z2',
  'risaralda': 'z2',
  'caldas': 'z2',
  'quindio': 'z2',
  'tolima': 'z2',
  'boyaca': 'z2',
  'huila': 'z2',
  'norte de santander': 'z2',
  'cauca': 'z2',
  'meta': 'z2',

  'atlantico': 'z3',
  'bolivar': 'z3',
  'magdalena': 'z3',
  'cesar': 'z3',
  'cordoba': 'z3',
  'sucre': 'z3',
  'la guajira': 'z3',
  'narino': 'z3',
  'choco': 'z3',

  'arauca': 'z4',
  'casanare': 'z4',
  'caqueta': 'z4',
  'putumayo': 'z4',
  'amazonas': 'z4',
  'guainia': 'z4',
  'guaviare': 'z4',
  'vaupes': 'z4',
  'vichada': 'z4',
  'san andres y providencia': 'z4',
  'san andres': 'z4',
  'archipielago de san andres': 'z4',
};

/** Quita tildes y normaliza para comparar nombres escritos a mano. */
export function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function zonaDe(departamento: string): Zona {
  const clave = normalizar(departamento);
  const id = DEPARTAMENTO_ZONA[clave];
  if (id) return ZONAS[id];

  // Coincidencia parcial: "Valle" → "Valle del Cauca", "N. de Santander", etc.
  for (const [nombre, zona] of Object.entries(DEPARTAMENTO_ZONA)) {
    if (clave.includes(nombre) || nombre.includes(clave)) return ZONAS[zona];
  }

  // Sin coincidencia se cobra la zona intermedia, nunca la más barata: un
  // departamento mal escrito no puede costarnos un envío subsidiado.
  return ZONAS.z3;
}

export const DEPARTAMENTOS: string[] = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar',
  'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó',
  'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
  'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
  'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
];

/**
 * Códigos DANE de las ciudades con más volumen. Los agregadores exigen el
 * código del municipio, no el nombre. Este mapa cubre el grueso de los pedidos;
 * para el resto hay que cachear el catálogo completo del agregador elegido
 * (`GET /cities` en Mipaquete, `/queries/location` en Envía) — está pendiente
 * hasta la fase de sandbox.
 */
const CIUDAD_DANE: Record<string, string> = {
  'bogota': '11001000',
  'medellin': '05001000',
  'cali': '76001000',
  'barranquilla': '08001000',
  'cartagena': '13001000',
  'bucaramanga': '68001000',
  'cucuta': '54001000',
  'pereira': '66001000',
  'manizales': '17001000',
  'armenia': '63001000',
  'ibague': '73001000',
  'santa marta': '47001000',
  'villavicencio': '50001000',
  'pasto': '52001000',
  'neiva': '41001000',
  'monteria': '23001000',
  'valledupar': '20001000',
  'popayan': '19001000',
  'tunja': '15001000',
  'sincelejo': '70001000',
  'riohacha': '44001000',
  'quibdo': '27001000',
  'florencia': '18001000',
  'yopal': '85001000',
  'arauca': '81001000',
  'mocoa': '86001000',
  'leticia': '91001000',
  'san andres': '88001000',
  'soacha': '25754000',
  'bello': '05088000',
  'envigado': '05266000',
  'itagui': '05360000',
  'palmira': '76520000',
  'soledad': '08758000',
  'chia': '25175000',
  'zipaquira': '25899000',
  'girardot': '25307000',
  'facatativa': '25269000',
  'fusagasuga': '25290000',
};

export function codigoDane(ciudad: string): string | undefined {
  return CIUDAD_DANE[normalizar(ciudad)];
}

/**
 * Peso a cobrar = el mayor entre el peso real y el volumétrico.
 * Las plantas pesan poco y ocupan mucho, así que en este negocio casi siempre
 * manda el volumétrico: cotizar solo por peso real subfacturaría cada envío.
 */
export const DIVISOR_VOLUMETRICO = 6000;

export function pesoFacturableKg(
  weightGrams: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  const real = weightGrams / 1000;
  const volumetrico = (lengthCm * widthCm * heightCm) / DIVISOR_VOLUMETRICO;
  return Math.max(real, volumetrico);
}
