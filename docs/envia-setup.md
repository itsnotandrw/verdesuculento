# Envia.com — estado de la integración

**Probado contra la API real el 2026-08-07.** El adaptador cotiza de verdad.
Este documento registra lo que se descubrió probando, no lo que dice la
documentación.

## Estado

| | |
|---|---|
| Cotización (`/ship/rate/`) | ✅ Funciona. TCC devuelve tarifas reales |
| Resolución de direcciones | ✅ Funciona vía Geocodes API |
| Generar guía (`/ship/generate/`) | ⚠️ Implementado, **sin probar a propósito** |
| Tracking | ⚠️ Implementado, sin probar |
| Webhooks | ⚠️ Sin probar. Falta confirmar el esquema de firma |
| Contra entrega | ❌ Sin verificar cobertura |

## ⚠️ La llave que tenemos es de PRODUCCIÓN

Esto es lo primero que hay que entender:

- `api-test.envia.com` (sandbox) → **401** con esta llave
- `api.envia.com` (producción) → **200**

La documentación lo dice: *"Each key works only in the environment where it was
created. A sandbox key cannot authenticate production requests, and vice
versa."* El 401 no explica cuál es el problema, así que es fácil perder tiempo
creyendo que la llave está mala cuando lo que está mal es la URL.

**Consecuencia:** `/ship/generate/` con esta llave crearía un **envío real y
facturable**. Por eso no se probó y por eso `.env.local` quedó en
`SHIPPING_PROVIDER=tarifa-propia`.

Para pedir una llave de sandbox: dashboard → Developer → API Keys, creándola
desde el ambiente sandbox.

## Cómo activarlo

```bash
# .env.local
SHIPPING_PROVIDER=envia
ENVIA_TOKEN=<la llave>
ENVIA_BASE_URL=https://api.envia.com      # producción — debe coincidir con la llave
SHIPPING_ORIGIN_POSTAL_CODE=110111        # Bogotá. Envia lo exige
```

Cotizar (lectura, no factura nada):

```bash
curl -X POST http://localhost:3000/api/shipping/quote \
  -H "Content-Type: application/json" \
  -d '{"departamento":"Antioquia","ciudad":"Medellín","lines":[{"productId":"MCO2178557170","qty":1}]}'
```

> Si pruebas desde Git Bash en Windows, los acentos se corrompen en el camino y
> "Medellín" llega como "Medell?n", que no resuelve. No es un bug de la app: el
> navegador y Node mandan UTF-8 correcto. Prueba desde Node o desde el sitio.

## Tarifas reales medidas

Paquete: 1 arándano, 40×20×12 cm, 2 kg cobrables, declarado $46.990.
Origen Bogotá.

| Destino | Transportadora | Servicio | Precio | Entrega |
|---|---|---|---|---|
| Medellín | TCC | Mensajería | $21.700 | Día siguiente |
| Cali | TCC | Mensajería | $21.700 | Día siguiente |
| Barranquilla | TCC | Mensajería | $21.700 | 1–2 días |
| Bucaramanga | TCC | Mensajería | $21.700 | 2–4 días |
| Sincelejo | TCC | Mensajería | $32.020 | 1–2 días |

**Comparación con la tarifa propia actual:** hoy cobramos $14.000 a Medellín y
$19.000 a Barranquilla. TCC por Envia cuesta $21.700. Es decir, **la tarifa
propia está por debajo del costo real en varias rutas** — se está subsidiando
el envío sin haberlo decidido. Vale la pena revisarlo aparte de esta
integración.

## Solo TCC cotiza. Las otras cuatro fallan

De las cinco transportadoras nacionales, únicamente TCC responde:

| Transportadora | Error | Qué significa |
|---|---|---|
| `serviEntrega` | "No se ha encontrado el Código DANE de la Ciudad Origen" | Servientrega exige el DANE del origen y no lo está recibiendo |
| `coordinadora` | "Error in call to Coordinadora ws" / "Bad Gateway" | Falla del lado de Coordinadora o cuenta sin habilitar |
| `interRapidisimo` | "Unknown error in InterRapidisimo" | Igual: upstream o cuenta |
| `envia` | "Service provided not available or incorrect" | Requiere nombrar un `service` además del carrier |

**Esto hay que preguntárselo a Envia**, no se arregla desde el código. La
pregunta concreta para su soporte:

> Con la cuenta [tu id], cotizando Bogotá (110111) → Medellín (050021), solo
> TCC devuelve tarifas. Servientrega pide el código DANE de la ciudad origen,
> Coordinadora e InterRapidísimo dan error de upstream. ¿Están habilitadas
> esas transportadoras en la cuenta? ¿Qué campo debo enviar para el DANE del
> origen?

Mientras tanto el adaptador **degrada bien**: cotiza las cinco en paralelo, las
que fallan se registran en el log y no tumban al resto. Con una sola que
responda, el checkout funciona.

## Lo que se corrigió en el adaptador

Cuatro cosas que estaban mal y que solo se ven probando:

1. **`shipment.carrier` es obligatorio** y no acepta cadena vacía. Envia no
   devuelve todas las transportadoras de una: hay que nombrarlas. El adaptador
   ahora hace cinco llamadas en paralelo y junta los resultados.

2. **`state` es el código de 2 letras, no el nombre.** "Cundinamarca" da
   `String is too long`.

3. **`postalCode` es obligatorio** en origen y destino. El adaptador mandaba
   cadena vacía.

4. **Los dos catálogos de Envia se contradicen.** `GET /state?country_code=CO`
   y la Geocodes API dan códigos distintos para el mismo departamento:

   | Departamento | `/state` | geocodes |
   |---|---|---|
   | Cauca | CU | CA |
   | Cundinamarca | CN | CU |
   | Caquetá | CA | CQ |
   | Santander | SN | ST |
   | Quindío | QU | QD |

   `CA` es Caquetá en uno y Cauca en el otro. Un mapa hardcodeado con el
   catálogo equivocado no da error: **despacha al departamento equivocado, en
   silencio**. Por eso `envia-geo.ts` resuelve el código por API en vez de
   hardcodearlo.

## Códigos postales

`envia-geo.ts` tiene 37 ciudades porque el checkout no exige código postal y
casi nadie lo llena. Se verificaron uno por uno contra geocodes: **de 40 que
puse de memoria, 7 estaban mal** (680001 no es Bucaramanga sino Los Santos;
660001 no es Pereira sino Crucero de Combia).

Faltan tres por confirmar: **Manizales, Arauca y Palmira** — no aparecieron en
el rango que escaneé. Si un cliente de esas ciudades compra, la cotización
falla con un mensaje claro en vez de cotizar mal.

Para agregar una ciudad, busca su código y verifícalo:

```bash
curl -s "https://geocodes.envia.com/zipcode/CO/170001" \
  -H "Authorization: Bearer $ENVIA_TOKEN"
```

Confirma que `locality` sea la ciudad esperada antes de agregarlo.

## Endpoints útiles

| Para qué | Endpoint |
|---|---|
| Verificar que la llave sirve | `GET queries.envia.com/webhook-types` |
| Departamentos | `GET queries.envia.com/state?country_code=CO` |
| Transportadoras del país | `GET queries.envia.com/carrier?country_code=CO` |
| Resolver un CP | `GET geocodes.envia.com/zipcode/CO/{cp}` |

## Qué falta

1. **Llave de sandbox** para poder probar `/ship/generate/` sin crear envíos
   reales.
2. **Preguntarle a Envia** por las cuatro transportadoras que no cotizan.
3. **Esquema de firma de los webhooks** — hoy el adaptador compara un secreto
   plano en el header, sin confirmar.
4. **Contra entrega**: si hay cobertura y con qué comisión.
5. **Revisar la tarifa propia**, que está por debajo del costo real.
