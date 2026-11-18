# Seguridad del admin — mapa para endurecerla después

Estado actual: funcional, con login de un solo usuario (correo + contraseña con hash) y cookie de sesión firmada.
El objetivo de este documento es que, cuando llegue el momento (IDP, 2FA, roles), el cambio se haga en pocos lugares
y sin tocar las pantallas ni los endpoints de negocio.

## Dónde vive hoy la autenticación (los únicos 4 puntos)

| Punto | Archivo | Qué hace |
|---|---|---|
| Páginas `/admin/*` | `middleware.ts` | Corta antes de renderizar: sin cookie válida → 307 a `/admin/login`. |
| APIs `/api/admin/*` | `lib/api.ts` → `autorizarAdmin()` | Sesión de cookie, o `Authorization: Bearer ADMIN_API_TOKEN`. Devuelve 401/403/503. |
| Sesión | `lib/admin/session.ts` | Crea y verifica el token `base64url({email,exp}).hmacSha256`. Dura 7 días. |
| Login | `app/api/admin/login/route.ts` + `lib/admin/store.ts` | Verifica correo/contraseña (hash), historial de ingresos, límite de intentos. |

Todo endpoint de negocio solo llama a `autorizarAdmin(request)` en su primera línea. Si se cambia por un IDP, basta con
reemplazar la implementación de esas 4 piezas; el resto no se entera.

## Lista de pendientes para "buena seguridad" (en orden de valor)

1. **IDP / SSO** (Google Workspace, Auth0, Clerk…): sustituir login+sesión; mantener el nombre `autorizarAdmin`.
2. **2FA** (TOTP o llave de acceso) para el rol dueño.
3. **Roles**: `dueño` (todo), `operador` (pedidos, catálogo, promociones), `solo lectura`. Hoy todos los endpoints exigen
   "estar dentro"; añadir un segundo parámetro `autorizarAdmin(request, 'catalogo:escribir')`.
4. **Quitar `ADMIN_API_TOKEN`** (token fijo) o limitarlo a integraciones concretas y rotarlo.
5. **Rotar `ADMIN_SESSION_SECRET`** y acortar la sesión (7 días → 8 h con renovación).
6. **Límite de intentos y bloqueo** por IP + correo (ya hay base en `lib/ratelimit.ts`; añadir bloqueo progresivo y aviso).
7. **Auditoría**: registrar quién cambió qué (precio, promoción, cupón, producto) con fecha. Hoy solo hay historial de ingresos.
8. **Cabeceras**: CSP estricta, `frame-ancestors 'none'`, cookies `SameSite=Strict` en `/admin`.
9. **Ocultar** el panel (ruta no obvia o acceso solo desde IPs de la tienda) como capa extra, no como única defensa.
10. **Copias de seguridad** de Redis (catálogo, promociones, pedidos) y prueba de restauración.

## Reglas que ya cumplen y que no deben perderse al endurecer

- El servidor es la fuente de verdad: precios, promociones, cupones y medidas de envío se recalculan en el servidor;
  lo que mande el navegador es informativo.
- Las promociones y los cupones no se pueden cruzar (`lib/promo-conflictos.ts`); lo valida el API, no solo la pantalla.
- Las rutas `/api/admin/*` devuelven 401 sin sesión; el middleware cubre las páginas (probado: 307).
- `ADMIN_DEV_OPEN=1` solo funciona fuera de producción.

## Pruebas rápidas después de cualquier cambio de seguridad

1. Sin sesión: `GET /api/admin/products` → 401 y `GET /admin` → 307.
2. Con sesión: crear/editar/borrar un producto de prueba y ver el cambio en la ficha pública.
3. Crear dos promociones que se crucen → 409 con el mensaje de qué cambiar.
