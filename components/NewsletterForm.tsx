'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setErrorMsg('Ingresa tu correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorMsg('Ingresa un correo válido.');
      return;
    }
    setStatus('loading');
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 24px', background: 'color-mix(in oklab, var(--accent) 10%, var(--bg-elev))', border: '1px solid var(--accent)', borderRadius: 999, textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--accent)' }}>✓ Te suscribiste correctamente.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', maxWidth: 480, margin: '0 auto', border: `1px solid ${status === 'error' ? '#ef4444' : 'var(--border)'}`, borderRadius: 999, padding: 6 }}
    >
      <label htmlFor="newsletter-email" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        Correo electrónico
      </label>
      <input
        id="newsletter-email"
        type="email"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
        aria-invalid={status === 'error'}
        aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
        style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 20px', outline: 'none', color: 'var(--fg)' }}
      />
      <button className="btn btn-primary btn-sm" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando...' : 'Suscribirme'}
      </button>
      {status === 'error' && (
        <div id="newsletter-error" role="alert" style={{ position: 'absolute', bottom: -24, left: 20, fontSize: 12, color: '#ef4444' }}>
          {errorMsg}
        </div>
      )}
    </form>
  );
}
