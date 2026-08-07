# Pagos y envíos

Backend de pedidos: cotización de envío, cobro y generación de guía. Escrito
para que cambiar de proveedor sea cambiar una variable de entorno.

## Estado actual

| Módulo | Activo hoy | Listo para conectar |
|---|---|---|
| Pagos | `breb-manual` — transferencia a llave Bre-B, verificación humana | `wompi` (Nequi, PSE, tarjeta) |
| Envíos | `tarifa-propia` — tarifa por zona con peso volumétrico real | `mipaquete`, `envia` |

Se cambia en `.env.local` con `PAYMENT_PROVIDER` y `SHIPPING_PROVIDER`. Si el
proveedor elegido no tiene credenciales, el sistema **degrada al manual y lo
avisa en el log** en vez de tumbar el checkout.

## Mapa

```
lib/
├── env.ts                configuración tipada, con defaults que funcionan sin .env
├── money.ts              COP ↔ centavos (las pasarelas cobran en centavos)
├── ids.ts                referencias sin caracteres confundibles (0/O, 1/I/L)
├── api.ts                helpers de los route handlers + auth del panel
├── orders/
│   ├── types.ts          modelo del pedido y sus dos máquinas de estado
│   ├── store.ts          repositorio — HOY EN ARCHIVO, ver limitaciones abajo
│   └── orchestrator.ts   ← la pieza clave: enlaza pago ↔ guía
├── payments/
│   ├── provider.ts       interfaz PaymentProvider
│   ├── providers/breb-manual.ts   activo
│   ├── providers/wompi.ts         firma e2e implementada, falta llaves
│   └── index.ts          factory + catálogo de métodos del checkout
└── shipping/
    ├── provider.ts       interfaz ShippingProvider
    ├── zonas.ts          zonificación de Colombia, DANE, peso volumétrico
    ├── providers/{tarifa-propia,mipaquete,envia}.ts
    └── index.ts          factory + armado del paquete desde el carrito
```

## Invariantes

Están implementadas en `orders/orchestrator.ts` y no deberían relajarse:

1. **Ninguna guía sin dinero asegurado.** Solo `aprobarPago()` o un contra
   entrega con cobertura confirmada llegan a `crearGuia()`. La redirección de
   éxito del navegador nunca confirma un pago.
2. **Idempotencia doble.** La guía se condiciona a `!order.shipment` (dos
   veces: antes y dentro de la escritura serializada). Los webhooks guardan
   `eventId` en `processedEventIds`.
3. **El precio lo pone el servidor.** El navegador manda ids de producto y de
   cotización; los montos se recalculan contra el catálogo. Un total manipulado
   en el cliente no tiene efecto — hay una prueba de esto en el historial.
4. **Nada se aprueba solo en el flujo manual.** "Ya pagué" deja el pedido en
   `in_review`. Aprobar exige `confirmoAbono: true` explícito.
5. **La fuente de verdad es la base propia.** La UI lee de la base, nunca de
   las APIs externas en caliente.

## Rutas

| Ruta | Qué hace |
|---|---|
| `POST /api/shipping/quote` | Opciones de envío para un destino y carrito |
| `POST /api/shipping/coverage` | ¿Hay recaudo contra entrega en este destino? |
| `GET /api/shipping/track/[guia]` | Estado del envío |
| `POST /api/orders` | Crea pedido + intento de pago |
| `GET /api/orders/[ref]` | Vista pública (sin datos personales) |
| `POST /api/orders/[ref]/declarar-pago` | El cliente avisa. No confirma nada |
| `GET /api/payments/methods` | Métodos que el proveedor activo soporta |
| `GET /api/payments/status/[id]` | Respaldo del webhook (polling) |
| `POST /api/webhooks/payments` | Eventos de la pasarela — valida firma |
| `POST /api/webhooks/shipping` | Eventos de la transportadora — valida firma |
| `GET /api/admin/orders` | Bandeja del panel |
| `POST /api/admin/orders/[id]` | aprobar / rechazar / reintentar / conciliar |
| `POST /api/admin/expirar` | Job de expiración (cron 1-2 veces al día) |

Las de `/api/admin/*` exigen `Authorization: Bearer $ADMIN_API_TOKEN`. Sin el
token configurado responden **503**, no 200: un endpoint que marca pedidos como
pagados no puede tener autenticación opcional.

## Limitaciones conocidas

**El repositorio de pedidos guarda en un archivo JSON** (`.data/orders.json`).
Alcanza para el volumen actual (~320 pedidos/mes) y evita montar
infraestructura para salir a producción, pero asume **un solo proceso**: las
escrituras se serializan en una cola dentro del proceso. En serverless con
varias instancias (Vercel) hay que migrar a Postgres antes de operar. El cambio
es implementar `OrderRepository` y cambiar una línea al final de `store.ts`;
nada más en el sistema se entera.

**Los adaptadores `mipaquete` y `envia` están escritos contra la documentación
pública, sin probar en sandbox.** La estructura, el manejo de errores y el
mapeo de estados están terminados; los nombres exactos de los campos de
request/response se confirman en la Fase 0 y están marcados con `VERIFICAR` en
cada archivo. El adaptador de Wompi sí tiene la criptografía real implementada
(firma de integridad y checksum de webhooks con comparación en tiempo
constante) — solo le faltan las llaves.

**El catálogo de ciudades está incompleto.** `zonas.ts` trae los códigos DANE
de ~40 municipios. Los agregadores exigen el código, no el nombre, y esa es la
falla #1 al integrarlos: hay que cachear su catálogo completo y mapear el
autocompletado del checkout contra él.

**No hay reserva de inventario.** El catálogo actual no lleva stock. Cuando lo
lleve, la reserva con TTL va en `crearPedido()`, justo antes de persistir.

## Camino a confirmación automática

El flujo manual cuesta un humano por pedido y se rompe con el volumen. Para
migrar:

1. Crear cuenta en Wompi, pedir llaves de **test** desde el día 1.
2. Llenar las cuatro variables de Wompi en `.env.local`.
3. Apuntar la URL de eventos del dashboard a `/api/webhooks/payments`.
4. `PAYMENT_PROVIDER=wompi`.

El checkout muestra Nequi, PSE y tarjeta solo, sin tocar una línea de UI: la
lista de métodos sale de `metodosDisponibles()`, que la pide al proveedor
activo.
