# Arquitectura de datos y robustez (noviembre 2026)

## Cómo viaja un dato del admin al sitio
1. El admin guarda (producto, precio, promoción, cupón) → la API toma un **cerrojo** en Redis, lee lo último, aplica el cambio y guarda **una vez**.
2. Se invalida el **caché de memoria** del servidor (5 s de vida) y se **renuevan las páginas** (`refrescarSitio`).
3. El visitante ve el cambio en la siguiente carga. Las fichas y ofertas se generan al primer pedido y duran 60 s; el panel las renueva al instante.
4. Al **arrancar** el servidor (despliegue) se piden páginas nuevas a los pocos segundos, porque durante el `build` no hay Redis y las páginas nacen con datos de ejemplo.

Reglas que no se rompen:
- El navegador nunca decide un precio: pedido, cupón y envío se **recalculan en el servidor**.
- Si Redis falla, se sigue sirviendo el **último valor bueno** (nunca datos de ejemplo ni cupones de ejemplo). Si nunca se leyó nada, promociones = ninguna.
- Dos personas en el admin no se pisan: promociones llevan **versión** (409 "recarga"), el catálogo se escribe con cerrojo.
- El uso de cupones es un **contador atómico** (INCR): con 1 uso disponible, solo una compra simultánea lo logra.

## Puntos de entrada de la API
- Públicas con límite por IP (429): cupón, cotización, cobertura, buscador, sincronía del carrito, estado de pago, lectura y aviso de pedido, rastreo, métodos de pago; además crear pedido, confirmar Wompi y buscar pedidos.
- Cuerpo JSON máximo 64 KB (600 KB en el admin). JSON inválido / tipos equivocados → 4xx, nunca 500.
- Webhooks (Wompi, transportadora): firma obligatoria, anti-replay de 5 min, idempotentes, monto exacto.
- Admin: 401 sin sesión en **todas** las rutas (probado); páginas con redirección 307.
- IP del cliente: no se confía en la primera entrada de `x-forwarded-for` (la inventa el cliente). Ver `TRUSTED_PROXY_HOPS`.
- Cabeceras: CSP (solo scripts/datos propios; mapas de Google permitidos), HSTS, nosniff, frame-ancestors.

## Imágenes y peso
- Fotos de productos: 3 tamaños WebP precalculados (`scripts/optimizar-imagenes.mjs`), elegidos por `lib/image-loader.ts`. Sin trabajo del servidor, caché de 30 días.
- Subidas del admin: validadas con `sharp`, convertidas a WebP (1600 px y 640 px).
- Al agregar productos nuevos con fotos locales: copiar `N.jpg` a `public/images/productos/<id>/` y correr `node scripts/optimizar-imagenes.mjs --borrar-originales`.
- HTML de la portada: ~160 KB (28 KB comprimido); antes 355 KB.

## ¿Redis o Postgres?
Hoy Redis guarda catálogo (1 clave JSON), promociones (1 clave), pedidos (JSON por clave + lista) y contadores. Para el volumen actual funciona.
Recomendación: **no migrar antes del lunes**. Después de salir a producción:
1. Verificar persistencia: `GET /api/admin/diagnostico` (AOF o último guardado RDB). Sin volumen persistente, un reinicio puede borrar pedidos.
2. Bajar un respaldo con `GET /api/admin/respaldo` (semanal, o antes de cambios grandes).
3. Añadir **Postgres** (plugin de Railway) como sistema de registro de **pedidos, clientes, pagos, comisión y auditoría** (consultas, reportes, facturación). Redis queda para caché, límites y contadores.
   La interfaz `OrderRepository` ya aísla el almacenamiento: se implementa `stores/postgres.ts`, se copia lo existente y se cambia el repositorio.
