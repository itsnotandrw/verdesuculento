/**
 * Resolución de direcciones colombianas para Envia.
 *
 * **Colombia es un caso especial en la API de Envia y esto es lo que decide si
 * las transportadoras cotizan o no.** De la documentación del endpoint de
 * tarifas:
 *
 *   > Colombia only: the `city` field must contain the 8-digit DANE municipal
 *   > code, not a human-readable city name.
 *
 * Mandar `city: "Medellín"` en vez de `city: "05001000"` no da un error de
 * validación: da errores confusos por transportadora. TCC lo tolera y cotiza
 * igual; Servientrega responde "No se ha encontrado el Codigo DANE de la
 * Ciudad Origen", Coordinadora "Error in call to Coordinadora ws" e
 * InterRapidísimo "Unknown error". Tres mensajes que parecen problemas de
 * cuenta o de las transportadoras, y son todos el mismo campo mal enviado.
 *
 * Con el DANE correcto cotizan las cuatro.
 *
 * El código DANE se resuelve con `POST /locate`, que acepta cualquier
 * municipio del país —no solo las capitales— y no requiere autenticación.
 *
 * OJO con los códigos de departamento: Envia publica dos catálogos que se
 * contradicen. `GET queries/state?country_code=CO` dice que Cundinamarca es
 * `CN` y Santander `SN`; la Geocodes API dice `CU` y `ST`. **El bueno es el de
 * `/state`** — verificado contra `/locate`, que rechaza los otros. Usar el
 * catálogo equivocado en un departamento donde `CA` significa Caquetá en uno y
 * Cauca en el otro no falla: despacha al departamento equivocado, en silencio.
 *
 * Verificado el 2026-08-07 contra la API de producción: los 33 departamentos
 * resuelven la capital correctamente.
 */

import { DestinoNoResueltoError } from '../types';

const LOCATE = 'https://api.envia.com/locate';

/**
 * Departamento → código de 2 letras que espera Envia.
 *
 * Del catálogo `GET queries.envia.com/state?country_code=CO`. Los 33 se
 * validaron resolviendo su capital con `/locate`.
 */
const ESTADO: Record<string, string> = {
  amazonas: 'AM',
  antioquia: 'AN',
  arauca: 'AR',
  atlantico: 'AT',
  bogota: 'DC',
  'bogota dc': 'DC',
  'bogota d c': 'DC',
  'distrito capital': 'DC',
  bolivar: 'BL',
  boyaca: 'BY',
  caldas: 'CL',
  caqueta: 'CA',
  casanare: 'CS',
  cauca: 'CU',
  cesar: 'CE',
  choco: 'CH',
  cordoba: 'CO',
  cundinamarca: 'CN',
  guainia: 'GU',
  guaviare: 'GA',
  huila: 'HU',
  'la guajira': 'LG',
  guajira: 'LG',
  magdalena: 'MA',
  meta: 'ME',
  narino: 'NA',
  'norte de santander': 'NS',
  putumayo: 'PU',
  quindio: 'QU',
  risaralda: 'RI',
  'san andres y providencia': 'SA',
  'san andres': 'SA',
  santander: 'SN',
  sucre: 'SU',
  tolima: 'TO',
  'valle del cauca': 'VC',
  valle: 'VC',
  vaupes: 'VA',
  vichada: 'VI',
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function codigoEstado(departamento: string): string | undefined {
  return ESTADO[normalizar(departamento)];
}

export interface UbicacionEnvia {
  /** Código DANE de 8 dígitos. Va en el campo `city` de la dirección. */
  city: string;
  /** Código de departamento de 2 letras. */
  state: string;
  /** Nombre normalizado que devolvió Envia, para la bitácora. */
  nombre: string;
}

// Un municipio siempre resuelve al mismo DANE, así que se cachea en el proceso.
const cache = new Map<string, UbicacionEnvia>();

/**
 * Resuelve ciudad + departamento al código DANE que exigen las
 * transportadoras colombianas.
 *
 * Si no resuelve, lanza en vez de continuar: cotizar con un municipio
 * equivocado produce una tarifa que después no se puede honrar.
 */
export async function resolverUbicacion(
  ciudad: string,
  departamento: string
): Promise<UbicacionEnvia> {
  const state = codigoEstado(departamento);
  if (!state) throw new DestinoNoResueltoError(ciudad, departamento);

  const llave = `${state}:${normalizar(ciudad)}`;
  const guardado = cache.get(llave);
  if (guardado) return guardado;

  const respuesta = await fetch(LOCATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city: ciudad, state, country: 'CO' }),
    cache: 'no-store',
  });

  const datos = (await respuesta.json().catch(() => null)) as {
    city?: string;
    name?: string;
    state?: string;
  } | null;

  // Devuelve 200 incluso al fallar; lo que confirma el acierto es que `city`
  // venga con los 8 dígitos del DANE.
  if (!datos?.city || !/^\d{8}$/.test(String(datos.city))) {
    throw new DestinoNoResueltoError(ciudad, departamento);
  }

  const resuelto: UbicacionEnvia = {
    city: String(datos.city),
    state: datos.state ?? state,
    nombre: datos.name ?? ciudad,
  };

  cache.set(llave, resuelto);
  return resuelto;
}
