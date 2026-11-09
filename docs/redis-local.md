# Redis propio (sin Upstash)

El sitio guarda **pedidos, catálogo editable, promociones/cupones, imágenes del admin,
contraseña del admin y el rate limiting** en un Redis propio por TCP (`ioredis`, variable
`REDIS_URL`). No hay límites de comandos ni de memoria de un servicio administrado.

Sin `REDIS_URL` el sitio sigue funcionando (pedidos en archivo, catálogo estático) pero el
admin queda de solo lectura y avisa.

## Desarrollo (Docker)

```bash
docker run -d --name verde-redis --restart unless-stopped \
  -p 127.0.0.1:6379:6379 -v verde-redis-data:/data \
  redis:7-alpine redis-server --appendonly yes --maxmemory 0
```

En `.env.local`:

```
REDIS_URL=redis://127.0.0.1:6379
```

- `--appendonly yes` → los datos sobreviven a reinicios (volumen `verde-redis-data`).
- `--maxmemory 0` → sin tope de memoria.
- Escucha solo en `127.0.0.1`: no se expone a la red.

Comandos útiles: `docker exec verde-redis redis-cli --scan --pattern 'verde:*'`
(claves del sitio: `verde:catalog:v1`, `verde:promos:v1`, `verde:media:*`, `pedido:*`…).

## Producción (Railway)

Agregar el servicio **Redis** al proyecto y en el servicio web definir
`REDIS_URL=${{Redis.REDIS_URL}}`. Activar el volumen del Redis para que persista.
Cualquier Redis autoalojado sirve mientras `REDIS_URL` apunte a él (con contraseña/TLS si
sale de la red privada: `rediss://:clave@host:puerto`).

## Copia de seguridad

```bash
docker exec verde-redis redis-cli SAVE && docker cp verde-redis:/data/dump.rdb ./backup-redis.rdb
```
