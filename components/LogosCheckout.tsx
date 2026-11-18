/* eslint-disable @next/next/no-img-element */
/**
 * Logos del checkout: transportadoras y métodos de pago.
 *
 * Los archivos viven en /public/logos (copias locales: sin depender de CDNs ajenos, sin pedir nada a terceros al
 * cargar el checkout y sin que cambie la CSP). Cada logo va sobre un recuadro claro para que se lea igual en tema
 * claro y oscuro. Si una transportadora nueva no tiene logo, se muestra un ícono de camión: nunca queda un hueco.
 */

const ENVIOS: Record<string, { src: string; alt: string }> = {
  tcc: { src: '/logos/envios/tcc.svg', alt: 'TCC' },
  serviEntrega: { src: '/logos/envios/servientrega.svg', alt: 'Servientrega' },
  interRapidisimo: { src: '/logos/envios/interrapidisimo.svg', alt: 'Inter Rapidísimo' },
  coordinadora: { src: '/logos/envios/coordinadora.svg', alt: 'Coordinadora' },
};

const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function IconoCamion() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...trazo} aria-hidden>
      <path d="M2 6h11v10H2z" /><path d="M13 9h4l3 3v4h-7z" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}
function IconoTienda() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...trazo} aria-hidden>
      <path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M10 20v-5h4v5" />
    </svg>
  );
}
function IconoMoto() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...trazo} aria-hidden>
      <circle cx="5.5" cy="16.5" r="3" /><circle cx="18.5" cy="16.5" r="3" /><path d="M5.5 16.5l3-7h4l3 7" /><path d="M12.5 9.5H16l2.5 7" /><path d="M8.5 9.5L7 7H5" />
    </svg>
  );
}
function IconoEfectivo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" {...trazo} aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" />
    </svg>
  );
}

/** Logo de la transportadora de una opción de envío. `codigo` es el `carrierCode` de la cotización. */
export function LogoEnvio({ codigo, nombre }: { codigo?: string; nombre: string }) {
  const logo = codigo ? ENVIOS[codigo] : undefined;
  return (
    <span className="logo-chip logo-chip-cuadrado" title={nombre}>
      {logo ? (
        <img src={logo.src} alt={logo.alt} width={44} height={44} loading="lazy" decoding="async" />
      ) : codigo === 'pickup' ? (
        <IconoTienda />
      ) : codigo === 'indrive' ? (
        <IconoMoto />
      ) : (
        <IconoCamion />
      )}
    </span>
  );
}

/** Logos del método de pago. Wompi muestra además los medios que cubre (Nequi y PSE). */
export function LogoPago({ metodo }: { metodo: string }) {
  if (metodo === 'WOMPI') {
    return (
      <span className="logo-fila" aria-hidden>
        <span className="logo-chip logo-chip-ancho"><img src="/logos/pagos/wompi.svg" alt="" width={74} height={17} loading="lazy" decoding="async" /></span>
        <span className="logo-chip logo-chip-ancho"><img src="/logos/pagos/nequi.svg" alt="" width={58} height={18} loading="lazy" decoding="async" /></span>
        <span className="logo-chip logo-chip-pse"><img src="/logos/pagos/pse.png" alt="" width={30} height={30} loading="lazy" decoding="async" /></span>
      </span>
    );
  }
  if (metodo === 'BREB') {
    return (
      <span className="logo-fila" aria-hidden>
        <span className="logo-chip logo-chip-ancho logo-breb">Bre-B</span>
      </span>
    );
  }
  if (metodo === 'COD') {
    return (
      <span className="logo-fila" aria-hidden>
        <span className="logo-chip logo-chip-cuadrado logo-efectivo"><IconoEfectivo /></span>
      </span>
    );
  }
  return null;
}
