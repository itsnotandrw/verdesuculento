# reCAPTCHA v3 en Verde Suculento

Protege tres puntos del sitio contra bots:

| Dónde | Acción de reCAPTCHA | Qué pasa sin token válido |
|---|---|---|
| Login del panel `/admin/login` (enlace al correo y «Continuar con Google») | `admin_login` | Better Auth responde 403 y no envía ningún correo |
| Checkout (`POST /api/orders`) | `checkout` | Se rechaza el pedido con 403 y mensaje para recargar |
| «Mis pedidos» (`POST /api/orders/lookup`) | `mis_pedidos` | Se rechaza la búsqueda con 403 |

Se verifica en el servidor (`lib/recaptcha.ts`) y se acepta si `success`, la acción coincide y `score >= 0.5`.
El login del panel usa el plugin de captcha de Better Auth (`lib/auth.ts`).

## Estado actual

El código está listo y **no bloquea nada hasta que pongas las llaves**. Sin llaves el sitio funciona igual que antes.
Con las dos llaves, el sistema pasa a ser estricto: si Google no responde, se rechaza (no se deja pasar).

## Activar (5 minutos)

1. Entra a https://www.google.com/recaptcha/admin y crea un sitio:
   - Tipo: **reCAPTCHA v3**.
   - Dominios: `viveroverdesuculento.co` (y `localhost` si quieres probar en tu PC).
   - Acepta los términos y guarda. Te dará una **clave del sitio** y una **clave secreta**.
2. En Railway (servicio del sitio → Variables) agrega:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` = clave del sitio
   - `RECAPTCHA_SECRET_KEY` = clave secreta
   - (opcional) `RECAPTCHA_MIN_SCORE` = `0.5`
3. Aplica los cambios y despliega. **La clave pública se incrusta al compilar**: si la cambias, hay que redesplegar.
4. Prueba: haz una compra de prueba y pide un enlace de acceso al panel. Si algo falla, mira los logs de Railway (`[recaptcha] …`).

## Qué ver en los logs

- `[recaptcha] sin configurar…` → faltan variables (el sitio no protege nada).
- `[recaptcha] rechazado (checkout): ['invalid-keys']` → la clave no corresponde al dominio o es de otro sitio.
- `[recaptcha] score bajo (checkout): 0.2` → Google lo marca como probable bot. Si hay falsos positivos, baja `RECAPTCHA_MIN_SCORE` a `0.3`.

## Notas

- La insignia de reCAPTCHA queda oculta por CSS; cada formulario muestra el aviso de Google (`components/AvisoRecaptcha.tsx`), que es lo que Google exige cuando se oculta.
- `next.config.mjs` permite `www.google.com` y `www.gstatic.com` en la CSP. No quitar.
- El script de Google solo se carga en las páginas que lo necesitan (login, checkout y «Mis pedidos»).
- Los límites de peticiones de `lib/ratelimit.ts` siguen activos: reCAPTCHA no los reemplaza.
