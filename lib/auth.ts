/**
 * Autenticación del panel /admin con Better Auth. SOLO SERVIDOR.
 *
 * Entradas: "Continuar con Google" y enlace mágico al correo. Sin contraseñas.
 * No hay base de datos relacional: las sesiones y los enlaces viven en Redis (`secondaryStorage`) y, sin Redis (solo
 * desarrollo), en memoria. Cuando llegue Postgres basta con añadir `database:` aquí; nada más del sitio cambia.
 *
 * La LISTA BLANCA es `ADMIN_EMAILS` y se aplica en tres lugares, para que ninguno dependa de los otros:
 *   1. Antes de mandar un enlace mágico (no se envía correo a desconocidos, y la respuesta es la misma para todos).
 *   2. `user.validateUserInfo`: Better Auth lo llama antes de admitir a alguien por Google o por enlace.
 *   3. `sesionActual()` (lib/admin/session.ts): en CADA petición se vuelve a comprobar que el correo de la sesión
 *      siga en la lista. Quitar un correo de ADMIN_EMAILS corta su acceso al instante, aunque conserve la cookie.
 */

import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { captcha, magicLink } from 'better-auth/plugins';
import { recaptchaActivo, recaptchaMinScore } from '@/lib/recaptcha';
import { env } from '@/lib/env';
import { redis } from '@/lib/redis';
import { limitar } from '@/lib/ratelimit';
import { registrarIntentoLogin } from '@/lib/admin/store';
import { enviarEnlaceMagico } from '@/lib/admin/correo';

export const esCorreoAdmin = (correo: unknown): boolean =>
  typeof correo === 'string' && env.adminEmails.includes(correo.trim().toLowerCase());

/** Redis como almacén secundario de Better Auth (sesiones, enlaces, límites). Sin Redis: memoria, solo desarrollo. */
function almacen() {
  if (redis) {
    const r = redis;
    return {
      get: async (k: string) => r.get(`ba:${k}`),
      getAndDelete: async (k: string) => r.getdel(`ba:${k}`),
      set: async (k: string, v: string, ttl?: number) => {
        if (ttl && ttl > 0) await r.set(`ba:${k}`, v, 'EX', Math.ceil(ttl));
        else await r.set(`ba:${k}`, v);
      },
      delete: async (k: string) => {
        await r.del(`ba:${k}`);
      },
      increment: async (k: string, ttl: number) =>
        Number(
          await r.eval(
            "local c=redis.call('INCR',KEYS[1]) if c==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end return c",
            1,
            `ba:${k}`,
            Math.max(1, Math.ceil(ttl))
          )
        ),
    };
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[auth] SIN Redis en producción: las sesiones no sobreviven a un reinicio. Configura REDIS_URL.');
  }
  const mem = new Map<string, { v: string; exp: number }>();
  const vivo = (k: string) => {
    const e = mem.get(k);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      mem.delete(k);
      return null;
    }
    return e;
  };
  return {
    get: async (k: string) => vivo(k)?.v ?? null,
    getAndDelete: async (k: string) => {
      const e = vivo(k);
      mem.delete(k);
      return e?.v ?? null;
    },
    set: async (k: string, v: string, ttl?: number) => {
      mem.set(k, { v, exp: ttl ? Date.now() + ttl * 1000 : 0 });
    },
    delete: async (k: string) => {
      mem.delete(k);
    },
    increment: async (k: string, ttl: number) => {
      const e = vivo(k);
      const n = (e ? Number(e.v) : 0) + 1;
      mem.set(k, { v: String(n), exp: e?.exp ?? Date.now() + ttl * 1000 });
      return n;
    },
  };
}

const ipDeCtx = (headers?: Headers | null) => headers?.get('x-real-ip') ?? 'desconocida';

function crear() {
  return betterAuth({
    appName: 'Verde Suculento · Panel',
    baseURL: env.siteUrl,
    secret: env.authSecret || undefined,
    secondaryStorage: almacen(),
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 días
      updateAge: 60 * 60 * 24, // se renueva si hubo actividad en el último día
      // Sin caché de cookie: cada petición consulta Redis, así cerrar sesión (o quitar un correo) corta el acceso al instante.
    },
    // Límites propios de Better Auth (guardados en Redis).
    rateLimit: { enabled: true, storage: 'secondary-storage', window: 60, max: 30 },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === 'production',
      defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
      // Railway: la IP real llega en x-real-ip. x-forwarded-for lo puede escribir el cliente y su última entrada es
      // el proxy (cambia en cada petición), así que no sirve para limitar intentos (ver lib/ratelimit.ts).
      ipAddress: { ipAddressHeaders: ['x-real-ip'] },
    },
    socialProviders:
      env.googleClientId && env.googleClientSecret
        ? { google: { clientId: env.googleClientId, clientSecret: env.googleClientSecret, prompt: 'select_account' } }
        : {},
    user: {
      validateUserInfo: ({ user }) => {
        if (!esCorreoAdmin(user.email)) {
          return { error: 'no_autorizado', errorDescription: 'Este correo no tiene acceso al panel.' };
        }
        if (user.emailVerified === false) {
          return { error: 'correo_sin_verificar', errorDescription: 'El correo no está verificado.' };
        }
      },
    },
    plugins: [
      // reCAPTCHA v3 en la entrada del panel (lib/recaptcha.ts). Sin llaves configuradas no se activa.
      ...(recaptchaActivo()
        ? [captcha({ provider: 'google-recaptcha', secretKey: process.env.RECAPTCHA_SECRET_KEY as string, minScore: recaptchaMinScore(), expectedAction: 'admin_login', endpoints: ['/sign-in/magic-link', '/sign-in/social'] })]
        : []),
      magicLink({
        expiresIn: 60 * 10, // el enlace vale 10 minutos
        allowedAttempts: 1, // y se usa una sola vez
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => {
          await enviarEnlaceMagico(email, url);
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Enlace mágico: a un correo fuera de la lista NO se le manda nada, pero la respuesta es idéntica (no se
        // revela quién es administrador).
        const demasiados = () => new APIError('TOO_MANY_REQUESTS', { message: 'Demasiados intentos. Espera unos minutos.' });
        const ip = ipDeCtx(ctx.headers);
        if (ctx.path === '/sign-in/social' && !(await limitar('admin-social', ip))) throw demasiados();
        if (ctx.path.startsWith('/magic-link/verify') && !(await limitar('admin-verificar', ip))) throw demasiados();

        if (ctx.path === '/sign-in/magic-link') {
          const correo = (ctx.body as { email?: unknown } | undefined)?.email;
          if (!(await limitar('admin-enlace-ip', ip))) throw demasiados();
          if (!esCorreoAdmin(correo)) {
            // Quien insiste con correos ajenos queda bloqueado un rato, aunque cambie de correo en cada intento.
            if (!(await limitar('admin-intruso', ip))) throw demasiados();
            console.warn(`[admin] enlace mágico NO enviado (correo fuera de la lista): ${String(correo).slice(0, 80)}`);
            await registrarIntentoLogin({
              email: String(correo ?? '').slice(0, 160),
              ip: ipDeCtx(ctx.headers),
              exito: false,
            });
            return ctx.json({ status: true });
          }
          if (!(await limitar('admin-enlace-correo', String(correo).trim().toLowerCase()))) throw demasiados();
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        // Rastro de ingresos (visible en Preferencias): solo cuando se abrió sesión de verdad.
        const sesion = ctx.context.newSession;
        if (sesion?.user?.email) {
          const ip = ipDeCtx(ctx.headers);
          console.log(`[admin] login ok — ${sesion.user.email} desde ${ip}`);
          await registrarIntentoLogin({ email: sesion.user.email, ip, exito: true });
        }
      }),
    },
  });
}

const globalAuth = globalThis as unknown as { __verdeAuth?: ReturnType<typeof crear> };

export const auth = (globalAuth.__verdeAuth ??= crear());
