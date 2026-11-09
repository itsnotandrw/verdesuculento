// "Zona de cultivo" para Colombia (equivalente al Growing Zone de Trees.com).
// En Colombia el clima de cultivo lo define la altitud (piso térmico), no las
// heladas, así que la zona se calcula por msnm del municipio.
// Altitudes aproximadas de la cabecera municipal.

export type Piso = 'calido' | 'templado' | 'frio';

export interface Municipio {
  name: string;
  dept: string;
  msnm: number;
  /** Coordenadas aproximadas (solo para "usar mi ubicación", se calcula en el navegador). */
  lat: number;
  lng: number;
}

export const MUNICIPIOS: Municipio[] = [
  { name: 'Bogotá D.C.', dept: 'Cundinamarca', msnm: 2640, lat: 4.711, lng: -74.072 },
  { name: 'Soacha', dept: 'Cundinamarca', msnm: 2565, lat: 4.579, lng: -74.217 },
  { name: 'Zipaquirá', dept: 'Cundinamarca', msnm: 2650, lat: 5.022, lng: -74.004 },
  { name: 'Chía', dept: 'Cundinamarca', msnm: 2562, lat: 4.861, lng: -74.033 },
  { name: 'Facatativá', dept: 'Cundinamarca', msnm: 2586, lat: 4.814, lng: -74.354 },
  { name: 'Fusagasugá', dept: 'Cundinamarca', msnm: 1728, lat: 4.337, lng: -74.364 },
  { name: 'Girardot', dept: 'Cundinamarca', msnm: 289, lat: 4.303, lng: -74.803 },
  { name: 'Medellín', dept: 'Antioquia', msnm: 1495, lat: 6.244, lng: -75.581 },
  { name: 'Envigado', dept: 'Antioquia', msnm: 1575, lat: 6.171, lng: -75.591 },
  { name: 'Rionegro', dept: 'Antioquia', msnm: 2125, lat: 6.155, lng: -75.374 },
  { name: 'Santa Fe de Antioquia', dept: 'Antioquia', msnm: 550, lat: 6.556, lng: -75.828 },
  { name: 'Apartadó', dept: 'Antioquia', msnm: 25, lat: 7.883, lng: -76.626 },
  { name: 'Cali', dept: 'Valle del Cauca', msnm: 1018, lat: 3.452, lng: -76.532 },
  { name: 'Palmira', dept: 'Valle del Cauca', msnm: 1001, lat: 3.539, lng: -76.303 },
  { name: 'Tuluá', dept: 'Valle del Cauca', msnm: 960, lat: 4.085, lng: -76.195 },
  { name: 'Cartago', dept: 'Valle del Cauca', msnm: 917, lat: 4.746, lng: -75.912 },
  { name: 'Buenaventura', dept: 'Valle del Cauca', msnm: 7, lat: 3.88, lng: -77.031 },
  { name: 'Barranquilla', dept: 'Atlántico', msnm: 18, lat: 10.964, lng: -74.796 },
  { name: 'Cartagena', dept: 'Bolívar', msnm: 2, lat: 10.391, lng: -75.479 },
  { name: 'Santa Marta', dept: 'Magdalena', msnm: 2, lat: 11.241, lng: -74.199 },
  { name: 'Montería', dept: 'Córdoba', msnm: 18, lat: 8.75, lng: -75.881 },
  { name: 'Sincelejo', dept: 'Sucre', msnm: 213, lat: 9.304, lng: -75.398 },
  { name: 'Valledupar', dept: 'Cesar', msnm: 169, lat: 10.463, lng: -73.253 },
  { name: 'Riohacha', dept: 'La Guajira', msnm: 5, lat: 11.544, lng: -72.907 },
  { name: 'Bucaramanga', dept: 'Santander', msnm: 959, lat: 7.119, lng: -73.123 },
  { name: 'Floridablanca', dept: 'Santander', msnm: 925, lat: 7.062, lng: -73.086 },
  { name: 'San Gil', dept: 'Santander', msnm: 1109, lat: 6.556, lng: -73.134 },
  { name: 'Barrancabermeja', dept: 'Santander', msnm: 75, lat: 7.065, lng: -73.855 },
  { name: 'Cúcuta', dept: 'Norte de Santander', msnm: 320, lat: 7.894, lng: -72.507 },
  { name: 'Pamplona', dept: 'Norte de Santander', msnm: 2342, lat: 7.376, lng: -72.648 },
  { name: 'Pereira', dept: 'Risaralda', msnm: 1411, lat: 4.813, lng: -75.696 },
  { name: 'Dosquebradas', dept: 'Risaralda', msnm: 1450, lat: 4.839, lng: -75.668 },
  { name: 'Manizales', dept: 'Caldas', msnm: 2150, lat: 5.068, lng: -75.517 },
  { name: 'Armenia', dept: 'Quindío', msnm: 1483, lat: 4.534, lng: -75.681 },
  { name: 'Calarcá', dept: 'Quindío', msnm: 1500, lat: 4.529, lng: -75.641 },
  { name: 'Ibagué', dept: 'Tolima', msnm: 1285, lat: 4.438, lng: -75.232 },
  { name: 'Neiva', dept: 'Huila', msnm: 442, lat: 2.927, lng: -75.282 },
  { name: 'Pitalito', dept: 'Huila', msnm: 1318, lat: 1.853, lng: -76.05 },
  { name: 'Villavicencio', dept: 'Meta', msnm: 467, lat: 4.142, lng: -73.627 },
  { name: 'Yopal', dept: 'Casanare', msnm: 350, lat: 5.337, lng: -72.395 },
  { name: 'Arauca', dept: 'Arauca', msnm: 125, lat: 7.085, lng: -70.759 },
  { name: 'Florencia', dept: 'Caquetá', msnm: 242, lat: 1.614, lng: -75.606 },
  { name: 'Mocoa', dept: 'Putumayo', msnm: 604, lat: 1.149, lng: -76.648 },
  { name: 'Leticia', dept: 'Amazonas', msnm: 96, lat: -4.215, lng: -69.941 },
  { name: 'Quibdó', dept: 'Chocó', msnm: 43, lat: 5.692, lng: -76.658 },
  { name: 'Pasto', dept: 'Nariño', msnm: 2527, lat: 1.214, lng: -77.281 },
  { name: 'Ipiales', dept: 'Nariño', msnm: 2898, lat: 0.83, lng: -77.644 },
  { name: 'Popayán', dept: 'Cauca', msnm: 1737, lat: 2.444, lng: -76.614 },
  { name: 'Tunja', dept: 'Boyacá', msnm: 2782, lat: 5.535, lng: -73.367 },
  { name: 'Duitama', dept: 'Boyacá', msnm: 2530, lat: 5.827, lng: -73.034 },
  { name: 'Sogamoso', dept: 'Boyacá', msnm: 2569, lat: 5.714, lng: -72.927 },
  { name: 'San Andrés', dept: 'San Andrés y Providencia', msnm: 2, lat: 12.585, lng: -81.701 },
];

export function pisoDe(msnm: number): Piso {
  if (msnm < 1000) return 'calido';
  if (msnm <= 2000) return 'templado';
  return 'frio';
}

export const PISO_INFO: Record<Piso, { label: string; rango: string; blurb: string; categorias: string[] }> = {
  calido: {
    label: 'Clima cálido',
    rango: 'Menos de 1.000 msnm',
    blurb: 'Tu zona es ideal para frutales tropicales y exóticos.',
    categorias: ['frutales-calido', 'frutales-exoticos', 'citricos'],
  },
  templado: {
    label: 'Clima templado',
    rango: '1.000 a 2.000 msnm',
    blurb: 'Zona versátil: cítricos, berries y frutales de templado a frío.',
    categorias: ['citricos', 'frutales-frio', 'berries'],
  },
  frio: {
    label: 'Clima frío',
    rango: 'Más de 2.000 msnm',
    blurb: 'Tu zona favorece manzanos, perales, durazneros y berries.',
    categorias: ['frutales-frio', 'berries'],
  },
};

export const ZONA_KEY = 'verde-zona';

/** Municipio de la lista más cercano a unas coordenadas (distancia haversine, en km). */
export function masCercano(lat: number, lng: number): { municipio: Municipio; km: number } {
  const rad = (g: number) => (g * Math.PI) / 180;
  let mejor = MUNICIPIOS[0];
  let km = Infinity;
  for (const m of MUNICIPIOS) {
    const dLat = rad(m.lat - lat);
    const dLng = rad(m.lng - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(m.lat)) * Math.sin(dLng / 2) ** 2;
    const d = 12742 * Math.asin(Math.sqrt(a));
    if (d < km) { km = d; mejor = m; }
  }
  return { municipio: mejor, km };
}
