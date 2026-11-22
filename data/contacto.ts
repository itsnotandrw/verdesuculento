/**
 * Datos de contacto del vivero: única fuente para WhatsApp, teléfono, horario y sedes.
 * Cambiarlos aquí los actualiza en todo el sitio (pie de página, Nosotros, botones de WhatsApp, etc.).
 */

export interface Sede { id: string; nombre: string; /** Nombre corto para las pestañas del mapa. */ corto: string; direccion: string; mapa: string; /** Texto que se busca en el mapa embebido (nombre del lugar + dirección); más preciso que solo la dirección. */ consulta?: string; /** Coordenadas exactas del pin (clic derecho en Google Maps > copiar). Si faltan, el mapa busca por dirección (menos preciso). */ coords?: { lat: number; lng: number } }

export const CONTACTO = {
  /** Número de WhatsApp en formato internacional, sin signos. */
  whatsappNumero: '573203354821',
  whatsappUrl: 'https://wa.me/573203354821',
  /** Cómo se muestra el teléfono. */
  telefono: '+57 320 335 4821',
  telefonoTel: '+573203354821',
  email: 'fabianlds2019@gmail.com',
  horario: 'Lunes a sábado de 8:00 a. m. a 5:00 p. m.',
  horarioCorto: 'Lun – Sáb · 8:00 a. m. – 5:00 p. m.',
  sedes: <Sede[]>[
    {
      id: 'envios',
      nombre: 'Centro de entregas Soacha',
      corto: 'Entregas Soacha',
      direccion: 'Cl. 1 #10, Soacha, Cundinamarca',
      mapa: 'https://maps.app.goo.gl/MqiZVGRsVHoixDKbA',
      consulta: 'Vivero Verde Suculento, Cl. 1 #10, Soacha, Cundinamarca',
    },
    {
      id: 'produccion',
      nombre: 'Vivero de propagación',
      corto: 'Vivero de propagación',
      direccion: 'Vereda Castalia, Santandercito, San Antonio del Tequendama, Cundinamarca',
      mapa: 'https://maps.app.goo.gl/q3SZaT9ZSaLWeQfXA',
      // Código Plus HMHH+67 del pin de Google Maps, convertido a coordenadas.
      coords: { lat: 4.57806, lng: -74.32181 },
    },
  ],
};

/** Municipios con entrega el mismo día (mensajería local). */
export const MISMO_DIA_MUNICIPIOS = ['Bogotá', 'Chía', 'Soacha'] as const;

/** Para que llegue hoy, la compra tiene que hacerse antes de esta hora (hora de Bogotá, 24 h). 12 = mediodía. */
export const MISMO_DIA_HORA_CORTE = 12;
/** Cómo se dice en el sitio. */
export const MISMO_DIA_CORTE_TEXTO = 'antes de las 12:00 m.';

/** Tiempo de entrega publicado en el sitio. */
export const TIEMPO_ENTREGA = '1 a 3 días hábiles';
