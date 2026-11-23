/** Configuración de reCAPTCHA sin dependencias de servidor: la pueden leer componentes de servidor y de cliente. */
export const recaptchaSiteKey = (): string => process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || '';
