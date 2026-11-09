'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

const WHATSAPP = 'https://wa.me/573205550102';
// GENÉRICO (pre-lanzamiento): este código aún no existe en el checkout.
const WELCOME_CODE = 'BIENVENIDO10';
const DISMISS_KEY = 'verde-cupon-flotante';

// Botones flotantes: cupón de bienvenida (izquierda, se puede cerrar) y WhatsApp (derecha).
export default function FloatingActions() {
  const pathname = usePathname();
  const [showCoupon, setShowCoupon] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { if (!sessionStorage.getItem(DISMISS_KEY)) setShowCoupon(true); } catch { setShowCoupon(true); }
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(WELCOME_CODE); } catch { /* sin portapapeles */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const dismiss = () => {
    setShowCoupon(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin storage */ }
  };

  // En el panel de administración no se muestran los botones flotantes del sitio.
  if (pathname?.startsWith('/admin')) return null;

  return (
    <>
      <AnimatePresence>
        {showCoupon && (
          <motion.div
            className="fa-coupon"
            initial={{ opacity: 0, scale: 0.4, x: -30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 1.6 }}
          >
            <button type="button" className="fa-coupon-btn" onClick={copy} aria-label={`Copiar cupón de bienvenida ${WELCOME_CODE}`}>
              {copied ? (
                <><strong>¡Copiado!</strong><small>{WELCOME_CODE}</small></>
              ) : (
                <><strong>10%</strong><small>1ª compra</small></>
              )}
            </button>
            <button type="button" className="fa-close" onClick={dismiss} aria-label="Cerrar cupón"><span className="fa-x" aria-hidden="true"><i /><i /></span></button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="fa-wa"
        aria-label="Escríbenos por WhatsApp"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 1.9 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        <span className="fa-wa-ring" aria-hidden="true" />
        <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.13.56 4.2 1.62 6.03L4 29l8.1-1.59a12.02 12.02 0 0 0 3.94.66C22.68 28.07 28 22.67 28 16.03 28 9.4 22.68 3 16.04 3Zm0 22.06c-1.28 0-2.53-.34-3.62-.98l-.26-.15-4.8.94.99-4.68-.17-.27a9.96 9.96 0 0 1-1.53-5.3c0-5.5 4.47-9.97 9.98-9.97 5.5 0 9.97 4.47 9.97 9.97 0 5.5-4.47 9.97-9.97 9.97Zm5.47-7.47c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
        </svg>
      </motion.a>

      <style>{`
        .fa-coupon{position:fixed;left:18px;bottom:22px;z-index:90;display:flex}
        .fa-coupon-btn{width:76px;height:76px;border-radius:50%;border:0;cursor:pointer;display:grid;place-content:center;text-align:center;line-height:1.05;color:#fff;
          background:var(--accent-2);box-shadow:0 10px 30px rgba(0,0,0,.4);animation:fabob 3.4s ease-in-out infinite;transition:scale .2s var(--ease-out)}
        .fa-coupon-btn:hover{scale:1.08}
        .fa-coupon-btn strong{font-family:var(--font-display);font-size:26px;font-weight:400}
        .fa-coupon-btn small{font-size:10px;letter-spacing:.04em;font-family:var(--font-ui)}
        .fa-close{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:0;cursor:pointer;background:#111;padding:0}
        .fa-x{position:absolute;inset:0;rotate:45deg}
        .fa-x i{position:absolute;left:50%;top:50%;width:10px;height:2px;margin:-1px 0 0 -5px;border-radius:2px;background:#fff}
        .fa-x i:last-child{rotate:90deg}
        .fa-wa{position:fixed;right:18px;bottom:22px;z-index:90;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;color:#fff;background:#25d366;box-shadow:0 10px 30px rgba(0,0,0,.4)}
        .fa-wa-ring{position:absolute;inset:0;border-radius:50%;border:2px solid #25d366;animation:fapulse 2.6s ease-out infinite;pointer-events:none}
        @keyframes fabob{0%,100%{translate:0 0}50%{translate:0 -6px}}
        @keyframes fapulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.7);opacity:0}}
        @media (max-width:900px){.fa-coupon,.fa-wa{bottom:calc(86px + env(safe-area-inset-bottom))}.fa-coupon{left:12px}.fa-wa{right:12px;width:52px;height:52px}.fa-coupon-btn{width:64px;height:64px}.fa-coupon-btn strong{font-size:22px}}
        @media (prefers-reduced-motion:reduce){.fa-coupon-btn,.fa-wa-ring{animation:none}}
      `}</style>
    </>
  );
}
