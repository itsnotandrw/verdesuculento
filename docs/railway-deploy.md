# Despliegue en Railway

Migración desde Vercel. Railway no es serverless — es un contenedor propio de
un solo proceso corriendo todo el tiempo — así que varias cosas que Vercel
resolvía solo (el cron, el disco "efímero") ahora hay que armarlas a mano.
Esta guía es esa lista, una sola vez.

## 1. Crear el servicio

1. En Railway: **New Project → Deploy from GitHub repo** → elegir
   `itsnotandrw/verdesuculento`.
2. Railway detecta Next.js con Nixpacks solo — no hace falta Dockerfile.
   `railway.json` (en la raíz del repo) ya fija el build (`pnpm build`), el
   arranque (`pnpm start`) y el healthcheck (`/`). El proyecto usa pnpm (ver
   `pnpm-lock.yaml` y el campo `packageManager` en `package.json`) — Nixpacks
   lo detecta solo y usa Corepack para instalar la versión exacta, sin nada
   que configurar aparte.
3. Next.js escucha en el puerto que Railway inyecte en `PORT` automáticamente
   — no hay que tocar nada para eso.

## 2. Variables de entorno

Copiar de `.env.example` y llenar en **Settings → Variables** del servicio.
Los valores reales (tokens de Envia, Wompi si aplica, `ADMIN_API_TOKEN`) son
los mismos que ya usa producción hoy en Vercel — cópialos de ahí, no hay que
regenerarlos.

Cambian con la migración:

- `NEXT_PUBLIC_SITE_URL` → el dominio `.co` nuevo, con `https://` (ej.
  `https://verdesuculento.co`). Úsalo desde el primer deploy, aunque el DNS
  del dominio todavía no esté listo (evita tener que redeployar después solo
  por esto).
- `CRON_SECRET` → generar uno **nuevo** con `openssl rand -hex 32`. El de
  Vercel no sirve porque nadie más que Vercel lo mandaba automáticamente —
  ver paso 4.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` / `ADMIN_SESSION_SECRET` → nuevas,
  para el login del panel `/admin` (antes era un token pegado a mano). Ver el
  comentario en `.env.example` para el comando exacto que genera el hash de
  la contraseña — la contraseña real nunca va en una variable de entorno,
  solo su hash.

## 3. Almacenamiento de pedidos: la decisión que no se puede saltar

El código guarda los pedidos en Redis (Upstash) si `KV_REST_API_URL` /
`KV_REST_API_TOKEN` existen, y si no, en un archivo local
(`.data/orders.json`).

En Vercel (serverless), sin Redis el checkout **se niega a crear pedidos** —
es una protección explícita en el código porque ahí cada request es una
función distinta sin disco compartido. Esa protección no se activa en
Railway porque Railway sí es un proceso persistente con disco compartido
entre requests. El problema es otro: **el disco de Railway no sobrevive a un
redeploy** salvo que exista un Volume — así que sin uno, cada vez que se
suba código nuevo (o Railway reinicie el contenedor por lo que sea), el
archivo de pedidos vuelve a nacer vacío. Elegir una de las dos:

**Opción A — Redis (recomendada, es la misma decisión que ya está probada en Vercel):**

1. `upstash.com` → Create Database → Redis → copiar `REST URL` y `REST
   TOKEN`.
2. Pegarlos en Railway como `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. Listo — funciona igual sin importar cuántas veces se redeploye.

Si Vercel ya tenía Upstash conectado (vía la integración de KV), esa misma
base de Upstash es reutilizable: se administra directo desde
`console.upstash.com` con la misma cuenta, sin depender de Vercel para nada.

**Opción B — Volume (más simple, pero atada a este único servicio):**

1. En el servicio de Railway: **Settings → Volumes → New Volume**.
2. Mount path: la carpeta donde vive `ORDERS_FILE` relativa a la raíz del
   proyecto — con el valor por defecto (`.data/orders.json`), el mount path
   es `/app/.data`.
3. Sin `KV_REST_API_URL`/`TOKEN` configurados, el archivo cae ahí y sí
   sobrevive a redeploys.

No dejar ninguna de las dos sin configurar: es la diferencia entre perder
pedidos reales en el primer redeploy o no.

## 4. El cron de expiración de pedidos

`vercel.json` (ya no existe en el repo) le decía a Vercel que llamara
`GET /api/admin/expirar` una vez al día. Ese endpoint no cambió — sigue
esperando `Authorization: Bearer $CRON_SECRET` — pero ahora hay que ser
quien programa esa llamada. Dos formas, de más a menos simple:

**Opción A — cron-job.org (gratis, cero infraestructura propia):**

1. Crear cuenta, **Create cronjob**.
2. URL: `https://<tu-dominio>/api/admin/expirar`.
3. Método `GET`, header `Authorization: Bearer <el mismo CRON_SECRET de Railway>`.
4. Horario: una vez al día (ej. `0 10 * * *`, 10 UTC = 5 a.m. Bogotá — el
   mismo horario que traía `vercel.json`).

**Opción B — un segundo servicio en el mismo proyecto de Railway:**

1. **New → Empty Service** dentro del mismo proyecto.
2. Sin repo — solo un comando. **Settings → Cron Schedule**: `0 10 * * *`.
3. Comando de arranque:
   ```
   curl -sf -X GET "https://<tu-dominio>/api/admin/expirar" -H "Authorization: Bearer $CRON_SECRET"
   ```
4. Copiar `CRON_SECRET` como variable de entorno de este servicio también
   (Railway no comparte variables entre servicios del mismo proyecto salvo
   que se referencien explícitamente).

Cualquiera de las dos sirve — la única diferencia es dónde vive el
programador. Verificar que corrió: revisar el timeline de un pedido vencido
en `/admin/pedidos`, o pegarle manualmente con `curl` usando `ADMIN_API_TOKEN`
(ver el comentario en `app/api/admin/expirar/route.ts`).

## 5. Dominio propio (`.co`)

1. Railway → servicio → **Settings → Networking → Custom Domain** → escribir
   el dominio.
2. Railway da un valor `CNAME` (algo como `xxxx.up.railway.app`).
3. En el panel del registrador donde se compró el `.co`: crear un registro
   `CNAME` con ese valor, apuntando el dominio (o el subdominio, ej. `www`)
   ahí. Para el dominio raíz (`verdesuculento.co` sin `www`) algunos
   registradores no aceptan CNAME en la raíz — Railway también soporta
   verificación por `A record`; seguir la instrucción exacta que muestre el
   panel de Railway para ese caso, cambia según el registrador.
4. Esperar la propagación (minutos a un par de horas) — Railway marca el
   dominio como verificado solo.
5. Actualizar `NEXT_PUBLIC_SITE_URL` en las variables de entorno si no
   quedó puesto desde el paso 2.

## 6. Después de que el dominio esté en vivo

Dos cosas que viven en paneles de terceros, no en el código, y que quedan
apuntando al dominio viejo si no se actualizan a mano:

- **Webhooks de Envia**: si hay uno registrado, actualizar la URL al dominio
  nuevo (`https://<dominio>/api/webhooks/shipping`).
- **Wompi** (si se activa en el futuro): la URL de eventos en su dashboard,
  a `https://<dominio>/api/webhooks/payments`.

## 7. Checklist final antes de anunciar el cambio

- [ ] Variables de entorno copiadas y `NEXT_PUBLIC_SITE_URL` con el dominio real.
- [ ] `CRON_SECRET` nuevo generado, puesto en Railway y en el programador externo.
- [ ] `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH`/`ADMIN_SESSION_SECRET` configurados y probado el login en `/admin/login`.
- [ ] Redis configurado (Opción A) o Volume montado (Opción B) — no ambas vacías.
- [ ] Un pedido de prueba de punta a punta: checkout → cotización de envío → pago manual → panel admin.
- [ ] Dominio verificado y sirviendo por HTTPS.
- [ ] Webhooks de transportadora/pasarela actualizados al dominio nuevo, si aplica.
- [ ] El proyecto de Vercel se puede pausar/borrar solo después de confirmar que Railway lleva unos días estables.
