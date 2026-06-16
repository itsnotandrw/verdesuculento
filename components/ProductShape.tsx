import { CATEGORY_SHAPE } from '@/data/catalog';
import type { Product } from '@/types';

interface ProductShapeProps {
  product: Product;
  size?: string;
  activeColorHex?: string;
}

export default function ProductShape({ product, size, activeColorHex }: ProductShapeProps) {
  const variant = CATEGORY_SHAPE[product.category] || 'fruit';
  const color = activeColorHex ?? product.colors[0]?.hex ?? '#7a9a4a';

  return (
    <div
      className={`product-shape ${variant}`}
      style={{
        ['--shape-color' as string]: color,
        ...(size ? { width: size } : {}),
      }}
    />
  );
}
