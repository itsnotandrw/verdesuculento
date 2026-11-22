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

  const cargarHistorial = useCallback(async () => {
    const respuesta = await fetch('/api/admin/login-history', { cache: 'no-store' });
    if (respuesta.status === 401) {
      router.push('/admin/login?next=/admin/cuenta');
      return;
    }
    const datos = await respuesta.json();
    if (respuesta.ok) {
      setAccesos(datos.accesos ?? []);
    }
  }, [router]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  return (
    <div style={{ paddingTop: 20, paddingBottom: 80 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>PANEL INTERNO</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 28 }}>Cuenta</h1>

      <div style={{ maxWidth: 520, marginBottom: 48 }}>
        <div className="checkout-label" style={{ marginBottom: 10 }}>Cómo se entra al panel</div>
        <p style={{ color: 'var(--fg-dim)', fontSize: 13.5, lineHeight: 1.6 }}>
          El acceso es con Google o con un enlace que llega al correo; no hay contraseñas que recordar ni cambiar. Solo
          entran los correos autorizados. Para dar o quitar acceso a alguien se edita la lista de administradores
          (<span className="mono">ADMIN_EMAILS</span>) en Railway: el cambio corta o abre el acceso de inmediato.
        </p>
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
