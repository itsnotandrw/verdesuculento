'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Acceso {
  email: string;
  ip: string;
  exito: boolean;
  at: string;
}

export default function CuentaAdmin() {
  const router = useRouter();
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [editable, setEditable] = useState(true);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    const respuesta = await fetch('/api/admin/login-history', { cache: 'no-store' });
    if (respuesta.status === 401) {
      router.push('/admin/login?next=/admin/cuenta');
      return;
    }
    const datos = await respuesta.json();
    if (respuesta.ok) {
      setAccesos(datos.accesos ?? []);
      setEditable(Boolean(datos.passwordEditable));
    }
  }, [router]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (nueva !== confirmar) {
      setError('La confirmación no coincide con la contraseña nueva.');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: actual, newPassword: nueva }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo cambiar la contraseña.');
      setExito('Contraseña actualizada.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingTop: 20, paddingBottom: 80 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 28 }}>Cuenta</h1>

      <div style={{ maxWidth: 440, marginBottom: 56 }}>
        <div className="checkout-label" style={{ marginBottom: 14 }}>Cambiar contraseña</div>

        {!editable && (
          <div className="admin-alerta" role="alert" style={{ marginBottom: 20 }}>
            Falta configurar Redis (KV_REST_API_URL/KV_REST_API_TOKEN) — sin eso, la contraseña
            solo se puede cambiar actualizando ADMIN_PASSWORD_HASH directo en Railway.
          </div>
        )}

        <form onSubmit={cambiarPassword} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label className="checkout-label" htmlFor="c-actual">Contraseña actual</label>
            <input
              id="c-actual" type="password" className="checkout-input"
              value={actual} onChange={(e) => setActual(e.target.value)}
              autoComplete="current-password" required disabled={!editable}
            />
          </div>
          <div>
            <label className="checkout-label" htmlFor="c-nueva">Contraseña nueva (mínimo 10 caracteres)</label>
            <input
              id="c-nueva" type="password" className="checkout-input"
              value={nueva} onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password" minLength={10} required disabled={!editable}
            />
          </div>
          <div>
            <label className="checkout-label" htmlFor="c-confirmar">Confirmar contraseña nueva</label>
            <input
              id="c-confirmar" type="password" className="checkout-input"
              value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password" required disabled={!editable}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>}
          {exito && <p style={{ fontSize: 13, color: 'var(--accent)' }}>{exito}</p>}

          <button className="btn btn-primary" disabled={guardando || !editable} style={{ justifyContent: 'center' }}>
            {guardando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      <div>
        <div className="checkout-label" style={{ marginBottom: 14 }}>Últimos accesos al panel</div>
        {accesos.length === 0 && (
          <p style={{ color: 'var(--fg-dim)', fontSize: 13.5 }}>
            Sin registro todavía (o Redis no está configurado — sin eso no se guarda historial).
          </p>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {accesos.map((a, i) => (
            <div key={i} className="pay-panel" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span className="status-pill" data-tone={a.exito ? 'ok' : 'bad'}>{a.exito ? 'Correcto' : 'Fallido'}</span>
              <span style={{ fontSize: 13.5, minWidth: 0, flex: 1 }}>{a.email}</span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>{a.ip}</span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-mute)' }}>{new Date(a.at).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
