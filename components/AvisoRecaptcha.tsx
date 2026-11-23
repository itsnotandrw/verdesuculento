import { recaptchaSiteKey } from '@/lib/recaptcha-config';

/**
 * Aviso que Google pide cuando se oculta la insignia de reCAPTCHA. Solo aparece si la protección está configurada.
 */
export default function AvisoRecaptcha({ className }: { className?: string }) {
  if (!recaptchaSiteKey()) return null;
  return (
    <p className={className} style={{ fontSize: 11.5, color: 'var(--fg-mute)', lineHeight: 1.5, marginTop: 10 }}>
      Este formulario está protegido por reCAPTCHA y aplican la{' '}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Política de privacidad</a>{' '}
      y los{' '}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Términos de servicio</a>{' '}
      de Google.
    </p>
  );
}
