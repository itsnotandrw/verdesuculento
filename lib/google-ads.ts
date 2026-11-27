'use client';

/**
 * Etiqueta de Google Ads: mide qué anuncios terminan en «agregar al carrito», «iniciar pago» y «compra».
 * Los identificadores son públicos (viajan en la página); salen de Google Ads → Objetivos → Conversiones.
 *
 * Privacidad: la referencia de un pedido es la llave para verlo, así que NUNCA se envía a Google — en las páginas de
 * pedido se manda una dirección y un título genéricos, y la compra se identifica con un resumen (hash) de la referencia.
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

type Ventana = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

const activa = () =>
  typeof window !== 'undefined' &&
  !location.pathname.startsWith('/admin') &&
  (/^(www\.)?viveroverdesuculento\.co$/.test(location.hostname) || process.env.NEXT_PUBLIC_GADS_LOCAL === '1');

function datosPagina() {
  return location.pathname.startsWith('/pedido')
    ? { page_location: `${location.origin}/pedido`, page_title: 'Tu pedido', page_referrer: location.origin }
    : { page_location: location.href, page_title: document.title, page_referrer: document.referrer.includes('/pedido') ? location.origin : document.referrer };
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

export function conversionAds(tipo: keyof typeof ETIQUETAS, valor: number, transaccion?: string) {
  try {
    const g = gtag();
    if (!g) return;
    g('set', datosPagina());
    g('event', 'conversion', { send_to: `${ID}/${ETIQUETAS[tipo]}`, value: Math.round(valor), currency: 'COP', ...(transaccion ? { transaction_id: transaccion } : {}) });
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
    conversionAds('compra', total, id);
  } catch { /* medir nunca rompe nada */ }
}
