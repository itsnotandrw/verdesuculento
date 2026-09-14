// Reels reales de la página de Facebook del vivero (facebook.com/p/Verde-Suculento-100091965755148).
// Vistas/reacciones tomadas el 2026-09-13 — son una foto del momento, no se actualizan solas.
export interface FeaturedVideo {
  id: string;
  url: string;
  title: string;
  stat: string;
}

export const FEATURED_VIDEOS: FeaturedVideo[] = [
  {
    id: 'pimienta-negra',
    url: 'https://www.facebook.com/reel/1519655032979366/',
    title: 'Pimienta negra: cómo cultivarla en casa',
    stat: '269K reproducciones',
  },
  {
    id: 'mangostino',
    url: 'https://www.facebook.com/reel/1259458706310546/',
    title: 'Mangostino, la reina de las frutas',
    stat: '2.7K reproducciones',
  },
  {
    id: 'manzana',
    url: 'https://www.facebook.com/reel/1347888283996739/',
    title: 'Manzano: cosechas abundantes en casa',
    stat: '4.8K reproducciones',
  },
  {
    id: 'kumquat',
    url: 'https://www.facebook.com/reel/922547567150912/',
    title: 'Kumquat: el cítrico que se come con cáscara',
    stat: '2K reproducciones',
  },
];
