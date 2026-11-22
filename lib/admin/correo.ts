/**
 * Correo del enlace mágico, por Resend (API HTTP, sin librería). SOLO SERVIDOR.
 * Sin RESEND_API_KEY: en desarrollo el enlace se imprime en la consola; en producción falla (no hay forma de entrar).
 */

import { env } from '@/lib/env';

export async function enviarEnlaceMagico(para: string, url: string): Promise<void> {
  if (!env.resendApiKey || !env.resendFrom) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[admin] (sin RESEND_API_KEY) enlace mágico para ${para}: ${url}`);
      return;
    }
    throw new Error('Falta RESEND_API_KEY / RESEND_FROM: no se puede enviar el enlace de acceso.');
  }

  const respuesta = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.resendFrom,
      to: [para],
      subject: 'Tu enlace para entrar al panel de Verde Suculento',
      text: `Entra al panel con este enlace (vale 10 minutos y se usa una sola vez):\n\n${url}\n\nSi no lo pediste tú, ignora este correo: nadie entra sin pulsarlo.`,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
        <h2 style="color:#0b4f2c">Verde Suculento · Panel</h2>
        <p>Pulsa el botón para entrar. El enlace vale <b>10 minutos</b> y se usa una sola vez.</p>
        <p style="margin:24px 0"><a href="${url}" style="background:#0b4f2c;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Entrar al panel</a></p>
        <p style="font-size:12px;color:#5f6368">Si no lo pediste tú, ignora este correo: nadie entra sin pulsarlo.</p></div>`,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Resend respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 200)}`);
  }
}
