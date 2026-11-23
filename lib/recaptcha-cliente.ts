'use client';

/**
 * reCAPTCHA v3 en el navegador. Carga el script de Google SOLO cuando un formulario lo necesita (no en todas las
 * páginas) y pide un token para una acción. Sin llave pública devuelve '' y el servidor decide (ver lib/recaptcha.ts).
 */

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
};

const KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || '';
let cargando: Promise<Grecaptcha | null> | null = null;

function cargarScript(): Promise<Grecaptcha | null> {
  if (cargando) return cargando;
  cargando = new Promise((resolver) => {
    const w = window as unknown as { grecaptcha?: Grecaptcha };
    if (w.grecaptcha?.execute) return resolver(w.grecaptcha);
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(KEY)}`;
    s.async = true;
    s.onload = () => {
      const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
      g ? g.ready(() => resolver(g)) : resolver(null);
    };
    s.onerror = () => {
      cargando = null; // se reintenta en la próxima acción
      resolver(null);
    };
    document.head.appendChild(s);
  });
  return cargando;
}

/** Token para la acción indicada ('checkout', 'admin_login', 'mis_pedidos'…). '' si no hay llave o falla la carga. */
export async function tokenRecaptcha(accion: string): Promise<string> {
  if (!KEY || typeof window === 'undefined') return '';
  const g = await cargarScript();
  if (!g) return '';
  try {
    return await g.execute(KEY, { action: accion });
  } catch {
    return '';
  }
}

export const recaptchaHabilitadoEnCliente = (): boolean => Boolean(KEY);
