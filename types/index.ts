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
}

export interface Category {
  id: string;
  name: string;
  count: number;
  blurb: string;
}

export interface ShippingRate {
  dept: string;
  city: string;
  cost: number;
  days: string;
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
