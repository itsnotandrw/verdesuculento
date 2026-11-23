/**
 * POST /api/trafico — recibe una visita o un evento del navegador (ver components/Trafico.tsx).
 * Siempre responde 204 y nunca falla hacia el visitante: medir no puede afectar la tienda.
 */

import { NextResponse } from 'next/server';
import { ipDe, limitar } from '@/lib/ratelimit';
import { esBot, eventoValido, fuenteDe, registrar, rutaValida } from '@/lib/trafico';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ua = request.headers.get('user-agent') ?? '';
    if (esBot(ua)) return new NextResponse(null, { status: 204 });
    const ip = ipDe(request);
    if (!(await limitar('trafico', ip))) return new NextResponse(null, { status: 204 });

    const texto = await request.text();
    if (texto.length > 2000) return new NextResponse(null, { status: 204 });
    const b = JSON.parse(texto) as Record<string, unknown>;

    if (b.tipo === 'evento' && eventoValido(b.evento)) {
      await registrar({ tipo: 'evento', evento: b.evento, ua, ip });
    } else if (b.tipo === 'pv') {
      const ruta = rutaValida(b.ruta);
      if (ruta) {
        const host = new URL(request.url).hostname;
        await registrar({ tipo: 'pv', ruta, nueva: b.nueva === true, fuente: b.nueva === true ? fuenteDe(b.ref, b.utm, host) : undefined, ua, ip });
      }
    }
  } catch {
    /* medir nunca rompe nada */
  }
  return new NextResponse(null, { status: 204 });
}
