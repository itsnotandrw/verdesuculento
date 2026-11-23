'use client';

/**
 * Botón «Ver catálogo»: en vez de navegar (antes mandaba al inicio), ABRE el menú de catálogo donde está el cliente.
 * Nav (escritorio) y MobileNav (celular) escuchan el evento. Sin JavaScript queda un enlace normal a las categorías.
 */

export const EVENTO_ABRIR_CATALOGO = 'verde:abrir-catalogo';

export const abrirCatalogo = () => window.dispatchEvent(new Event(EVENTO_ABRIR_CATALOGO));

export default function BotonCatalogo({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Se ejecuta antes de abrir el menú (por ejemplo, cerrar el carrito). */
  onClick?: () => void;
}) {
  return (
    <a
      href="/#categorias"
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        abrirCatalogo();
      }}
    >
      {children}
    </a>
  );
}
