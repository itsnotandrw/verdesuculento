'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get('next') || '/admin/pedidos';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo iniciar sesión.');
      // Recarga completa (no router.push): así el layout server-side vuelve a
      // leer la cookie recién puesta y deja pasar en el primer intento, en
      // vez de depender de que el cache del router ya sepa que cambió algo.
      window.location.href = destino;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  };

  return (
    <div className="page-section" style={{ paddingTop: 140 }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>PANEL INTERNO</div>
        <h1 className="display" style={{ fontSize: 'clamp(34px, 7vw, 48px)', marginBottom: 28 }}>Ingresar</h1>

        <form onSubmit={entrar}>
          <label className="checkout-label" htmlFor="admin-email">Correo</label>
          <input
            id="admin-email"
            type="email"
            className="checkout-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@dominio.com"
            autoComplete="username"
            style={{ marginBottom: 16 }}
            required
          />

          <label className="checkout-label" htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            className="checkout-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />

          {error && <p style={{ marginTop: 14, fontSize: 13, color: '#ef4444' }}>{error}</p>}

          <button className="btn btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }} disabled={enviando}>
            {enviando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginForm() {
  // useSearchParams exige un boundary de Suspense en App Router.
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}
