# Envia.com — estado de la integración

**Probado contra la API de producción el 2026-08-07.** Las cuatro
transportadoras nacionales cotizan de verdad. Este documento registra lo que se
descubrió probando, no lo que dice la documentación.

## Estado

| | |
|---|---|
| Cotización (`/ship/rate/`) | ✅ 4 transportadoras, cualquier municipio del país |
| Resolución de municipios (`/locate`) | ✅ |
| Generar guía (`/ship/generate/`) | ⚠️ Implementado, **sin probar a propósito** |
| Tracking | ⚠️ Implementado, sin probar |
| Webhooks | ⚠️ Falta confirmar el esquema de firma |
| Contra entrega | ⚠️ Confirmado que existe; falta probar el flujo |

## Lo que hacía que solo cotizara una transportadora

El adaptador mandaba `city: "Medellín"`. **En Colombia el campo `city` lleva el
código DANE de 8 dígitos**, no el nombre. De la documentación del endpoint:

> *Colombia only: the `city` field must contain the 8-digit DANE municipal
> code, not a human-readable city name.*

Lo traicionero es cómo falla. No da un error de validación: da tres errores
distintos, uno por transportadora, que parecen problemas de cuenta o caídas
ajenas.

| Transportadora | Lo que respondía | Lo que uno concluye |
|---|---|---|
| TCC | cotizaba normal | "esta sí funciona" |
| Servientrega | "No se ha encontrado el Codigo DANE de la Ciudad Origen" | "falta un dato del origen" |
| Coordinadora | "Error in call to Coordinadora ws" | "se cayó Coordinadora" |
| Inter Rapidísimo | "Unknown error in InterRapidisimo" | "problema de ellos" |

Que TCC funcionara con el nombre reforzaba la conclusión equivocada: si el
campo estuviera mal, fallarían todas. Con el DANE correcto, cotizan las cuatro.

El código lo resuelve `POST https://api.envia.com/locate`, que acepta cualquier
municipio —no solo capitales— y no requiere autenticación:

```bash
curl -X POST https://api.envia.com/locate \
  -H "Content-Type: application/json" \
  -d '{"city":"Guarne","state":"AN","country":"CO"}'
# {"city":"05318000","name":"GUARNE","state":"AN"}
```

## Los dos catálogos de departamentos se contradicen

Envia publica los códigos de departamento en dos sitios que no coinciden:

| Departamento | `queries/state` | Geocodes | Cuál sirve |
|---|---|---|---|
| Cundinamarca | CN | CU | **CN** |
| Santander | SN | ST | **SN** |
| Cauca | CU | CA | **CU** |
| Caquetá | CA | CQ | **CA** |
| Quindío | QU | QD | **QU** |

`CA` es Caquetá en un catálogo y Cauca en el otro. Un mapa armado con el
equivocado **no da error: despacha al departamento equivocado, en silencio.**

El bueno es `GET queries.envia.com/state?country_code=CO`, verificado contra
`/locate`, que rechaza los otros códigos. Los 33 están en `envia-geo.ts` y se
validaron resolviendo la capital de cada uno.

## Tarifas reales

1 arándano (40×20×12 cm, 2 kg cobrables), origen Bogotá, salida del checkout:

| Destino | Opción más barata | Opción más rápida |
|---|---|---|
| Medellín | Servientrega $19.500 · 1–2 d | TCC $21.700 · 1 d |
| Chía | Inter Rapidísimo $11.400 · 2–3 d | Coordinadora $14.400 · 1 d |
| Zipaquirá | Inter Rapidísimo $11.400 · 2–3 d | Coordinadora $17.600 · 1 d |
| Sincelejo | Servientrega $20.800 · 1–2 d | (la misma) |
| Guarne | Servientrega $20.800 · 1–2 d | TCC $21.700 · 1 d |
| Leticia | Inter Rapidísimo $71.000 · 4–6 d | Coordinadora $91.600 · 2–4 d |

**Compara con la tarifa propia**, que cobra $14.000 a Medellín cuando el costo
real más bajo es $19.500. Se está subsidiando ~$5.500 por envío en esa ruta sin
haberlo decidido. Vale la pena revisar la tabla de zonas aparte de esto.

## Cómo activarlo

```bash
# .env.local
SHIPPING_PROVIDER=envia
ENVIA_TOKEN=<la llave>
ENVIA_BASE_URL=https://api.envia.com    # debe coincidir con el ambiente de la llave
```

**La llave que tenemos es de producción.** Una llave solo autentica en el
ambiente donde se creó: contra `api-test.envia.com` da 401, y el 401 no
distingue "llave inválida" de "ambiente equivocado".

Por eso `.env.local` quedó en `SHIPPING_PROVIDER=tarifa-propia`: cotizar es de
solo lectura y no cuesta nada, pero `/ship/generate/` con esta llave crearía un
**envío real y facturable**, y eso pasa solo al aprobar un pago en el panel.
Cambia la variable a `envia` cuando quieras usarlo — sabiendo eso.

## Decisiones del adaptador

**Una llamada por transportadora.** `shipment.carrier` es obligatorio y no
acepta cadena vacía; Envia no devuelve todas de una. Se cotizan las cuatro en
paralelo y las que fallen no tumban al resto.

**Se excluye el carrier `envia`.** Sus servicios son `type 3` —tractomula,
mula, sencillo— y rechazan cajas: *"shipment type: box not supported"*. Es
transporte de carga.

**`postalCode` va vacío.** El esquema exige el campo, pero con el DANE presente
su valor no se usa. Eso elimina la necesidad de una tabla de códigos postales
(que además había salido mal: de 40 códigos escritos de memoria, 7 apuntaban a
otro municipio).

**Se filtran las opciones por frontera de Pareto.** Envia devuelve hasta siete
por ruta, con duplicados al mismo precio y servicios "industriales" que cuestan
el triple sin llegar antes. Se conserva una opción solo si llega estrictamente
antes que todas las más baratas: lo que queda gana en precio, en tiempo o en el
equilibrio, y lo descartado siempre es peor en ambas cosas que algo que quedó.

**El plazo se parsea del texto.** `deliveryEstimate` viene en español libre
("Día siguiente", "1-2 días"), no como fechas. Sin parsearlo, todo caía al
plazo genérico de la zona y el checkout decía "2 — 4 días hábiles" para algo
que llega mañana.

## Contra entrega

El catálogo confirma que existe: `cash_on_delivery: 1` en TCC (ambos
servicios), Coordinadora (los cuatro), Inter Rapidísimo (los cinco) y el
servicio `premier_cod` de Servientrega.

La comisión sale de `additional_services`: **5% del recaudo, mínimo $4.760**,
más 1,3% de seguro (mínimo $650) si se asegura.

Sigue desactivado hasta probar el flujo completo con llave de sandbox.

## Qué falta

1. **Llave de sandbox** para probar `/ship/generate/` sin crear envíos reales.
   Dashboard → Developer → API Keys, creándola desde el ambiente sandbox.
2. **Esquema de firma de los webhooks.**
3. **Probar el recaudo** de punta a punta.
4. **Revisar la tarifa propia**, por debajo del costo real.

## Endpoints útiles

| Para qué | Endpoint |
|---|---|
| Verificar que la llave sirve | `GET queries.envia.com/webhook-types` |
| Departamentos (catálogo bueno) | `GET queries.envia.com/state?country_code=CO` |
| Transportadoras del país | `GET queries.envia.com/carrier?country_code=CO` |
| Servicios, con flag de recaudo | `GET queries.envia.com/service?country_code=CO` |
| Municipio → DANE | `POST api.envia.com/locate` |
