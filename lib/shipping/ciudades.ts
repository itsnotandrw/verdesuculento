/**
 * Municipios por departamento, para el desplegable de ciudad del checkout.
 *
 * Antes era un campo de texto libre, y un cliente que escribía "Bogota" sin
 * tilde o "Medellin" con errores de dedo se topaba con un rechazo de
 * cotización que no entendía. Un desplegable elimina esa clase de error de
 * raíz — no hay nada que escribir mal.
 *
 * No es lista exhaustiva de los ~1.122 municipios de Colombia: es la capital
 * de cada departamento (siempre presente, la validó `/locate` de Envia contra
 * el catálogo real) más los municipios de mayor volumen de pedidos por
 * departamento. Para el resto, la última opción de cada desplegable es
 * "Otro municipio…", que revela un campo de texto — así nadie que viva en un
 * pueblo pequeño queda bloqueado por no aparecer en la lista.
 */

export const OTRO_MUNICIPIO = 'Otro municipio…';

export const CIUDADES_POR_DEPARTAMENTO: Record<string, string[]> = {
  Amazonas: ['Leticia', 'Puerto Nariño'],
  Antioquia: [
    'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella',
    'Copacabana', 'Rionegro', 'Apartadó', 'Turbo', 'La Ceja', 'Marinilla',
  ],
  Arauca: ['Arauca', 'Saravena', 'Tame'],
  Atlántico: ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Sabanalarga'],
  'Bogotá D.C.': ['Bogotá'],
  Bolívar: ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar'],
  Boyacá: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa'],
  Caldas: ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría', 'Riosucio'],
  Caquetá: ['Florencia', 'San Vicente del Caguán'],
  Casanare: ['Yopal', 'Aguazul', 'Villanueva'],
  Cauca: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
  Cesar: ['Valledupar', 'Aguachica', 'Codazzi'],
  Chocó: ['Quibdó', 'Istmina'],
  Córdoba: ['Montería', 'Cereté', 'Lorica', 'Sahagún'],
  Cundinamarca: [
    'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Fusagasugá', 'Girardot',
    'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'La Calera',
  ],
  Guainía: ['Inírida'],
  Guaviare: ['San José del Guaviare'],
  Huila: ['Neiva', 'Pitalito', 'Garzón'],
  'La Guajira': ['Riohacha', 'Maicao', 'Uribia'],
  Magdalena: ['Santa Marta', 'Ciénaga', 'Fundación'],
  Meta: ['Villavicencio', 'Acacías', 'Granada'],
  Nariño: ['Pasto', 'Ipiales', 'Tumaco'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
  Putumayo: ['Mocoa', 'Puerto Asís'],
  Quindío: ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro'],
  Risaralda: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'],
  Sucre: ['Sincelejo', 'Corozal'],
  Tolima: ['Ibagué', 'Espinal', 'Melgar'],
  'Valle del Cauca': [
    'Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Yumbo', 'Jamundí',
  ],
  Vaupés: ['Mitú'],
  Vichada: ['Puerto Carreño'],
};

/** Ciudades disponibles para un departamento, con la opción de escape al final. */
export function ciudadesDe(departamento: string): string[] {
  const lista = CIUDADES_POR_DEPARTAMENTO[departamento] ?? [];
  return [...lista, OTRO_MUNICIPIO];
}
