export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductSpecs {
  clima: string;
  sol: string;
  riego: string;
  produccion: string;
  altura: string;
  dificultad: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  tagline: string;
  description: string;
  colors: ProductColor[];
  sizes: string[];
  badge?: string;
  accent?: string;
  specs: ProductSpecs;
  images: string[];
}

export interface Category {
  id: string;
  name: string;
  count: number;
  blurb: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
}

export interface Article {
  slug: string;
  title: string;
  category: string;
  minutes: number;
  excerpt: string;
  image: string;
  body?: string;
}

export interface CartItem {
  variantKey: string;
  product: Product;
  color: ProductColor;
  size: string;
  qty: number;
}

export type CategoryShape = 'fruit' | 'cluster' | 'leaf' | 'rosette' | 'seed' | 'bag';

export interface ProductReview {
  rating: number;
  titulo: string;
  contenido: string;
  fecha: string;
  likes: number;
}

export interface ProductQna {
  pregunta: string;
  respuesta: string;
}

export interface ProductRating {
  rating: number | null;
  reviewCount: number;
  soldCount: number;
  bestsellerRank: number | null;
}

/** Distribución de calificaciones en % sobre la muestra de reseñas disponible. */
export interface RatingBreakdown {
  stars: number;
  pct: number;
}

export interface SocialProof {
  rating: number | null;
  /** 'ml' = promedio oficial del listado; 'sample' = promedio de las reseñas que tenemos. */
  ratingSource: 'ml' | 'sample';
  reviewCount: number;
  soldCount: number;
  breakdown: RatingBreakdown[];
  reviews: ProductReview[];
  qna: ProductQna[];
  bestsellerRank: number | null;
}

export interface SellerStats {
  nickname: string;
  powerSellerStatus: string;
  medal: string;
  motto: string;
  /** Nivel del termómetro de reputación de ML: 1_red … 5_green. */
  level: string;
  points: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  totalTransactions: number;
  completedTransactions: number;
  canceledTransactions: number;
  sales60d: number;
  claimsRate: number;
  delayedRate: number;
  cancellationRate: number;
  followersLabel: string;
  profileUrl: string;
}

/** Peso y dimensiones del paquete declarados en Mercado Libre. Solo servidor. */
export interface ProductLogistics {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}
