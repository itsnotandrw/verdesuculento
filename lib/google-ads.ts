'use client';

/**
 * Etiqueta de Google Ads: mide qué anuncios terminan en «agregar al carrito», «iniciar pago» y «compra».
 * Los identificadores son públicos (viajan en la página); salen de Google Ads → Objetivos → Conversiones.
 *
 * Privacidad: la referencia de un pedido es la llave para verlo, así que no debe llegar a Google. La etiqueta lee la
 * dirección real por su cuenta, por eso en /pedido NO se carga; solo para contar una compra se cambia un momento la
 * dirección visible por una genérica, y la compra se identifica con un resumen (hash) de la referencia.
 * Solo funciona en el dominio público (o en desarrollo con NEXT_PUBLIC_GADS_LOCAL=1) y nunca en el panel.
 */

const ID = 'AW-18597886663';
const ETIQUETAS = {
  compra: '7WvACN-I4cAdEMf1lKRF',
  carrito: 'mX37CNqJ4cAdEMf1lKRF',
  pago: '4jSECIXW5sAdEMf1lKRF',
} as const;
/** Pedidos creados en este navegador que aún no se han contado como compra. */
const CLAVE_PEDIDOS = 'verde-compras-por-medir';

const RUTA_COMPRA = '/compra-confirmada';

type Ventana = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const activa = () =>
  typeof window !== 'undefined' &&
  !location.pathname.startsWith('/admin') &&
  !location.pathname.startsWith('/pedido') &&
  (/^(www\.)?viveroverdesuculento\.co$/.test(location.hostname) || process.env.NEXT_PUBLIC_GADS_LOCAL === '1');

function datosPagina() {
  return {
    page_location: location.href,
    page_title: location.pathname === RUTA_COMPRA ? 'Compra confirmada' : document.title,
    page_referrer: document.referrer.includes('/pedido') ? location.origin : document.referrer,
  };
}

function gtag(): ((...args: unknown[]) => void) | null {
  if (!activa()) return null;
  const w = window as Ventana;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer || [];
    // La etiqueta de Google exige el objeto `arguments`, no un arreglo.
    w.gtag = function () { w.dataLayer!.push(arguments); } as (...args: unknown[]) => void;
    w.gtag('js', new Date());
    w.gtag('set', datosPagina());
    w.gtag('config', ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
    document.head.appendChild(s);
  }
  return w.gtag;
}

/** Se llama en cada cambio de página: carga la etiqueta y actualiza la dirección que ve Google. */
export function paginaAds() {
  try { gtag()?.('set', datosPagina()); } catch { /* medir nunca rompe nada */ }
}

export function conversionAds(tipo: keyof typeof ETIQUETAS, valor: number, transaccion?: string, alEnviar?: () => void) {
  try {
    const g = gtag();
    if (!g) return;
    g('set', datosPagina());
    g('event', 'conversion', { send_to: `${ID}/${ETIQUETAS[tipo]}`, value: Math.round(valor), currency: 'COP', ...(transaccion ? { transaction_id: transaccion } : {}), ...(alEnviar ? { event_callback: alEnviar } : {}) });
  } catch { /* medir nunca rompe nada */ }
}

const pendientes = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** El checkout anota el pedido recién creado: solo esos se cuentan como compra (abrir un pedido viejo no suma). */
export function anotarPedidoPorMedir(referencia: string) {
  try { localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify([...pendientes().filter((r) => r !== referencia), referencia].slice(-10))); } catch { /* sin almacenamiento */ }
}

/** Con el pago aprobado, cuenta la compra una sola vez. */
export async function medirCompra(referencia: string, total: number) {
  try {
    if (!pendientes().includes(referencia)) return;
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(pendientes().filter((r) => r !== referencia)));
    const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(referencia));
    const id = Array.from(new Uint8Array(resumen).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
    // Se llama al método original: así Next no navega ni la etiqueta lo registra como página nueva.
    const real = location.pathname + location.search;
    const mostrar = (ruta: string) => History.prototype.replaceState.call(history, history.state, '', ruta);
    let restaurada = false;
    const restaurar = () => { if (!restaurada) { restaurada = true; mostrar(real); } };
    mostrar(RUTA_COMPRA);
    conversionAds('compra', total, id, () => setTimeout(restaurar, 1500));
    setTimeout(restaurar, 6000); // respaldo si un bloqueador impide el envío
  } catch { /* medir nunca rompe nada */ }
}
