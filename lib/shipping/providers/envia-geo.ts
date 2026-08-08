/**
 * Resolución de direcciones colombianas contra la Geocodes API de Envia.
 *
 * Envia no acepta el nombre del departamento: quiere su código de 2 letras. Y
 * ahí está la trampa — **Envia publica dos catálogos que se contradicen**:
 *
 *   departamento    /state dice   geocodes dice
 *   Cauca           CU            CA
 *   Cundinamarca    CN            CU
 *   Caquetá         CA            CQ
 *   Santander       SN            ST
 *   Quindío         QU            QD
 *   … y 4 más
 *
 * `CA` es Caquetá en un catálogo y Cauca en el otro. Un mapa hardcodeado con
 * el catálogo equivocado no falla: despacha al departamento equivocado, en
 * silencio. Por eso el código de departamento **se resuelve por código postal
 * contra geocodes**, que es la misma fuente que consumen las transportadoras.
 *
 * De paso, geocodes devuelve el código DANE del municipio, que Servientrega
 * exige y sin el cual rechaza la cotización.
 *
 * Verificado el 2026-08-07 contra la API en producción.
 */

const GEOCODES = 'https://geocodes.envia.com';

export interface UbicacionResuelta {
  postalCode: string;
  /** Código de 2 letras del departamento, tal como lo espera /ship/rate/. */
  estado: string;
  /** Municipio según Envia. */
  ciudad: string;
  /** Código DANE de 8 dígitos. Servientrega lo exige. */
  dane?: string;
}

/**
 * Códigos postales de las ciudades que más despachamos, para cuando el cliente
 * no escribe el suyo — el campo es opcional en el checkout y casi nadie lo
 * llena.
 *
 * Verificados uno por uno contra geocodes: de 40 códigos que puse de memoria,
 * 7 estaban mal (680001 no es Bucaramanga sino Los Santos, 660001 no es
 * Pereira sino Crucero de Combia). Los de esta tabla resuelven al municipio
 * correcto, confirmado por la API.
 *
 * Solo se guarda el CP: el departamento y el DANE salen de geocodes, para no
 * volver a introducir el problema de los catálogos contradictorios.
 */
const CIUDAD_CP: Record<string, string> = {
  bogota: '110111',
  medellin: '050021',
  cali: '760001',
  barranquilla: '080001',
  cartagena: '130001',
  bucaramanga: '680004',
  pereira: '660006',
  ibague: '730004',
  monteria: '230003',
  armenia: '630001',
  cucuta: '540001',
  'santa marta': '470001',
  villavicencio: '500001',
  pasto: '520001',
  neiva: '410001',
  sincelejo: '700001',
  valledupar: '200001',
  popayan: '190001',
  tunja: '150001',
  riohacha: '440001',
  quibdo: '270001',
  florencia: '180001',
  yopal: '850001',
  leticia: '910001',
  mocoa: '860001',
  'san andres': '880001',
  'puerto carreno': '990001',
  mitu: '970001',
  inirida: '940001',
  'san jose del guaviare': '950001',
  soacha: '250051',
  bello: '051050',
  envigado: '055422',
  itagui: '055412',
  soledad: '083001',
  buenaventura: '764501',
  tulua: '763021',
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Código postal conocido para una ciudad, si lo tenemos. */
export function cpDeCiudad(ciudad: string): string | undefined {
  return CIUDAD_CP[normalizar(ciudad)];
}

// Un código postal siempre resuelve a lo mismo, así que se cachea en el proceso
// y no se vuelve a pedir. Evita una llamada extra por cotización.
const cache = new Map<string, UbicacionResuelta | null>();

async function consultar(cp: string, token: string): Promise<UbicacionResuelta | null> {
  const respuesta = await fetch(`${GEOCODES}/zipcode/CO/${encodeURIComponent(cp)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!respuesta.ok) return null;

  const datos = (await respuesta.json().catch(() => null)) as Array<{
    zip_code?: string;
    locality?: string;
    state?: { code?: { '2digit'?: string } };
    info?: { stat_8digit?: string };
  }> | null;

  const primero = Array.isArray(datos) ? datos[0] : null;
  const estado = primero?.state?.code?.['2digit'];
  if (!primero || !estado) return null;

  return {
    postalCode: primero.zip_code ?? cp,
    estado,
    ciudad: primero.locality ?? '',
    dane: primero.info?.stat_8digit,
  };
}

/**
 * Resuelve una dirección a lo que `/ship/rate/` necesita.
 *
 * Prefiere el código postal que escribió el cliente; si no lo dio, cae a la
 * tabla de ciudades. Si no hay forma de resolverlo, lanza un error que nombra
 * el problema: es mejor que cotizar contra un departamento inventado.
 */
export async function resolverUbicacion(
  ciudad: string,
  codigoPostal: string | undefined,
  token: string
): Promise<UbicacionResuelta> {
  const cp = (codigoPostal ?? '').trim() || cpDeCiudad(ciudad);

  if (!cp) {
    throw new Error(
      `[envia] no conocemos el código postal de "${ciudad}". ` +
        'Pídelo en el checkout o agrégalo a CIUDAD_CP en envia-geo.ts.'
    );
  }

  if (cache.has(cp)) {
    const guardado = cache.get(cp)!;
    if (guardado) return guardado;
    throw new Error(`[envia] el código postal ${cp} no resuelve a ningún municipio.`);
  }

  const resuelto = await consultar(cp, token);
  cache.set(cp, resuelto);

  if (!resuelto) {
    throw new Error(`[envia] el código postal ${cp} no resuelve a ningún municipio.`);
  }
  return resuelto;
}
