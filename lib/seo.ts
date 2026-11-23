/** SEO: datos estructurados del negocio (sitio + tienda local) y utilidades de URL. */
import { CONTACTO } from '@/data/contacto';
import { env } from '@/lib/env';

export const SITE_NAME = 'Vivero Verde Suculento';
export const baseUrl = () => env.siteUrl.replace(/\/$/, '');

export function negocioJsonLd() {
  const base = baseUrl();
  const sede = CONTACTO.sedes[0];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: base,
      name: SITE_NAME,
      inLanguage: 'es-CO',
      publisher: { '@id': `${base}/#negocio` },
    },
    {
      '@context': 'https://schema.org',
      '@type': ['Store', 'GardenStore'],
      '@id': `${base}/#negocio`,
      name: SITE_NAME,
      url: base,
      logo: `${base}/logo-full.png`,
      image: `${base}/logo-full.png`,
      description: 'Vivero colombiano de frutales, ornamentales y suculentas. Envíos a toda Colombia con garantía de plantas vivas.',
      telephone: CONTACTO.telefonoTel,
      email: CONTACTO.email,
      priceRange: '$$',
      areaServed: { '@type': 'Country', name: 'Colombia' },
      address: { '@type': 'PostalAddress', streetAddress: sede.direccion.split(',')[0], addressLocality: 'Soacha', addressRegion: 'Cundinamarca', addressCountry: 'CO' },
      ...(sede.coords ? { geo: { '@type': 'GeoCoordinates', latitude: sede.coords.lat, longitude: sede.coords.lng } } : {}),
      openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '08:00', closes: '17:00' }],
      sameAs: [CONTACTO.whatsappUrl],
    },
  ];
}
