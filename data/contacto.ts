/**
 * Datos de contacto del vivero: única fuente para WhatsApp, teléfono, horario y sedes.
 * Cambiarlos aquí los actualiza en todo el sitio (pie de página, Nosotros, botones de WhatsApp, etc.).
 */

export interface Sede { id: string; nombre: string; direccion: string; mapa: string; /** Coordenadas exactas del pin (clic derecho en Google Maps > copiar). Si faltan, el mapa busca por dirección (menos preciso). */ coords?: { lat: number; lng: number } }

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
      nombre: 'Centro de envíos y entregas',
      direccion: 'Calle 6 # 13-08, Soacha, Cundinamarca',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Calle+6+%2313-08%2C+Soacha%2C+Cundinamarca',
    },
    {
      id: 'produccion',
      nombre: 'Centro de producción vegetal',
      direccion: 'Vereda Castalia, Santandercito, Cundinamarca',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Vereda+Castalia%2C+Santandercito%2C+Cundinamarca',
    },
  ],
};

/** Municipios con entrega el mismo día (mensajería local). */
export const MISMO_DIA_MUNICIPIOS = ['Soacha', 'Bogotá', 'Mosquera'] as const;

/** Tiempo de entrega publicado en el sitio. */
export const TIEMPO_ENTREGA = '1 a 3 días hábiles';
