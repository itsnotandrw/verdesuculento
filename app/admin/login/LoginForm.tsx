'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { tokenRecaptcha } from '@/lib/recaptcha-cliente';
import AvisoRecaptcha from '@/components/AvisoRecaptcha';

const cabeceraCaptcha = async () => {
  const token = await tokenRecaptcha('admin_login');
  return { headers: { 'x-captcha-response': token } };
};

const MENSAJES: Record<string, string> = {
  no_autorizado: 'Ese correo no tiene acceso al panel.',
  correo_sin_verificar: 'Google no tiene verificado ese correo.',
  INVALID_TOKEN: 'El enlace ya se usó o venció. Pide uno nuevo.',
  EXPIRED_TOKEN: 'El enlace venció. Pide uno nuevo.',
};

function Formulario({ google }: { google: boolean }) {
  const params = useSearchParams();
  const siguiente = params.get('next');
  const destino = siguiente && siguiente.startsWith('/admin') && !siguiente.startsWith('//') ? siguiente : '/admin/pedidos';
  const codigoError = params.get('error');

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(codigoError ? (MENSAJES[codigoError] ?? 'No se pudo iniciar sesión.') : null);
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const conGoogle = async () => {
    setOcupado(true);
    setError(null);
    const r = await authClient.signIn.social({ provider: 'google', callbackURL: destino, errorCallbackURL: '/admin/login' }, await cabeceraCaptcha());
    if (r.error) {
      setError('No se pudo iniciar con Google.');
      setOcupado(false);
    }
  };

  const conEnlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setError(null);
    const r = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: destino, errorCallbackURL: '/admin/login' }, await cabeceraCaptcha());
    setOcupado(false);
    if (r.error) setError(r.error.status === 429 ? 'Demasiados intentos. Espera un minuto.' : (r.error.status === 403 || r.error.code === 'MISSING_RESPONSE' || r.error.code === 'VERIFICATION_FAILED') ? 'No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo.' : 'No se pudo enviar el enlace.');
    else setEnviado(true);
  };

  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>PANEL INTERNO</div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 7vw, 48px)', marginBottom: 28 }}>Ingresar</h1>

        {google && (
          <>
            <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={conGoogle} disabled={ocupado}>
              Continuar con Google
            </button>
            <p style={{ textAlign: 'center', margin: '18px 0', fontSize: 12.5, color: 'var(--fg-mute)' }}>o con un enlace a tu correo</p>
          </>
        )}

        <AvisoRecaptcha />
        {enviado ? (
          <p role="status" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Si ese correo tiene acceso, te llegará un enlace para entrar. Vale 10 minutos y se usa una sola vez. Revisa también el correo no deseado.
          </p>
        ) : (
          <form onSubmit={conEnlace}>
            <label className="checkout-label" htmlFor="admin-email">Correo</label>
            <input
              id="admin-email"
              type="email"
              className="checkout-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@dominio.com"
              autoComplete="email"
              required
            />
            <button className="btn btn-primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Enviarme un enlace'}
            </button>
          </form>
        )}

        {error && <p role="alert" style={{ marginTop: 14, fontSize: 13, color: '#ef4444' }}>{error}</p>}
      </div>
    </div>
  );
}

export default function LoginForm({ google }: { google: boolean }) {
  // useSearchParams exige un boundary de Suspense en App Router.
  return (
    <Suspense fallback={null}>
      <Formulario google={google} />
    </Suspense>
  );
}
