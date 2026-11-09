import { redirect } from 'next/navigation';

/**
 * Ya no hay un catálogo general: cada categoría tiene su propia página (/catalogo/<categoria>) y cada
 * oferta o cupón, su catálogo exclusivo (/ofertas/<slug>). Quien llegue a /catalogo cae en las categorías
 * del inicio. Las rutas /catalogo/<categoria> siguen funcionando.
 */
export default function CatalogoRedirect() {
  redirect('/#categorias');
}
