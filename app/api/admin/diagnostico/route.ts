/**
 * GET /api/admin/diagnostico — estado de salud del sistema para revisar desde el panel (solo admin).
 * Dice si Redis responde y si GUARDA EN DISCO de verdad (persistencia), cuánta memoria usa, cuántos datos hay y
 * cuántos errores recientes registró el servidor. No devuelve contraseñas ni llaves.
 */

import { autorizarAdmin, fallo, ok } from '@/lib/api';
import { getAllProducts } from '@/lib/catalog/store';
import { getPromoConfig } from '@/lib/promotions-store';
import { orders } from '@/lib/orders/store';
import { redis } from '@/lib/redis';
import { wompiProvider } from '@/lib/payments/providers/wompi';
import { ipDe } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

function campo(info: string, nombre: string): string | undefined {
  const m = new RegExp(`^${nombre}:(.*)$`, 'm').exec(info);
  return m ? m[1].trim() : undefined;
}

export async function GET(request: Request) {
  const noAutorizado = await autorizarAdmin(request);
  if (noAutorizado) return noAutorizado;
  try {
    const salida: Record<string, unknown> = {
      servidor: { node: process.version, activoSegundos: Math.round(process.uptime()), memoriaMB: Math.round(process.memoryUsage().rss / 1048576), zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone },
      red: {
        ipDetectada: ipDe(request),
        xForwardedFor: request.headers.get('x-forwarded-for'),
        xRealIp: request.headers.get('x-real-ip'),
        forwarded: request.headers.get('forwarded'),
        cabecerasDeProxy: [...request.headers.keys()].filter((k) => /^(x-|cf-|fly-|forwarded|via|true-client)/i.test(k)),
        saltosConfigurados: process.env.TRUSTED_PROXY_HOPS ?? '(sin definir, 1)',
      },
      pagos: { wompiConfigurado: wompiProvider.isConfigured(), urlWompi: process.env.WOMPI_BASE_URL || 'https://sandbox.wompi.co/v1 (por defecto: sandbox)' },
    };

    if (!redis) {
      salida.redis = { configurado: false, aviso: 'Sin REDIS_URL: el sitio usa datos de ejemplo y el panel no puede guardar.' };
    } else {
      const t0 = Date.now();
      let responde = false;
      try { responde = (await redis.ping()) === 'PONG'; } catch { /* queda en false */ }
      const latenciaMs = Date.now() - t0;
      let persistencia: Record<string, unknown> = {};
      let memoria: Record<string, unknown> = {};
      try {
        const info = String(await redis.info());
        const aof = campo(info, 'aof_enabled');
        persistencia = {
          aofActivo: aof === '1',
          ultimoGuardadoRdb: campo(info, 'rdb_last_save_time') ? new Date(Number(campo(info, 'rdb_last_save_time')) * 1000).toISOString() : undefined,
          estadoUltimoGuardadoRdb: campo(info, 'rdb_last_bgsave_status'),
          cambiosSinGuardar: campo(info, 'rdb_changes_since_last_save'),
        };
        memoria = { usada: campo(info, 'used_memory_human'), clientes: campo(info, 'connected_clients'), politica: campo(info, 'maxmemory_policy') };
      } catch { /* INFO puede estar restringido */ }
      const duradero = Boolean((persistencia as { aofActivo?: boolean }).aofActivo) || (persistencia as { estadoUltimoGuardadoRdb?: string }).estadoUltimoGuardadoRdb === 'ok';
      const errores = await redis.llen('verde:errores').catch(() => 0);
      salida.redis = {
        configurado: true, responde, latenciaMs, persistencia, memoria, errores_registrados: errores,
        aviso: duradero ? undefined : 'No pude confirmar que Redis guarde en disco. Si es el plugin de Railway, revisa que tenga volumen y persistencia activa; sin ella un reinicio puede borrar pedidos.',
      };
    }

    const [productos, promos, pedidos] = await Promise.all([getAllProducts(true), getPromoConfig(), orders.list({ limite: 5000 }).catch(() => [])]);
    salida.datos = { productos: productos.length, ocultos: productos.filter((p) => p.activo === false).length, promociones: promos.campaigns.length, cupones: promos.coupons.length, versionPromociones: promos.rev ?? 0, pedidos: pedidos.length };
    return ok(salida);
  } catch (error) {
    return fallo(error, 'GET /api/admin/diagnostico');
  }
}
