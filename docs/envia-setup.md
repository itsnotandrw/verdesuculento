# Envia.com — estado de la integración

**Probado contra la API de producción el 2026-08-07.** Las cuatro
transportadoras nacionales cotizan de verdad. Este documento registra lo que se
descubrió probando, no lo que dice la documentación.

## Estado

| | |
|---|---|
| Cotización (`/ship/rate/`) | ✅ 4 transportadoras, cualquier municipio del país |
| Resolución de municipios (`/locate`) | ✅ |
| Generar guía (`/ship/generate/`) | ✅ Probado en sandbox de punta a punta |
| Tracking | ✅ Probado en sandbox |
| Webhooks | ⚠️ Headers y body confirmados; algoritmo del HMAC sin confirmar (ver abajo) |
| Contra entrega | ⚠️ Confirmado que existe; falta probar el flujo |
| Cancelar guía | ❌ No implementado — ver "Qué falta" |
| Recoger a domicilio | ❌ No implementado, API confirmada y lista — ver "Qué falta" |

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

**Dos intentos cortos por transportadora, no uno largo.** Probando en vivo se
vio que Coordinadora responde de forma bimodal: ~1-2s o ~10s, sin término
medio, y esto se midió incluso llamándola sola, una petición a la vez, sin
ninguna carga concurrente de por medio — es una característica de su backend,
no un efecto de pedir las cuatro transportadoras a la vez. Un timeout de 3.5s
con un reintento da dos oportunidades de caer en el camino rápido por el mismo
presupuesto de tiempo que un solo intento largo habría gastado esperando a que
termine el lento. En una tanda de 10 pruebas contra 5 rutas distintas, esto
bajó los fallos de "casi siempre" a 1 de 10.

## Por qué a veces solo aparecen 1-2 transportadoras (no es un bug)

Envia puede devolver hasta 7 combinaciones carrier+servicio por ruta. El
checkout no las muestra todas: se queda con las que están en la **frontera de
Pareto** — ninguna de las descartadas es mejor en precio y en tiempo que
alguna de las que se muestran.

Con las tarifas reales para Bogotá → Medellín:

| Transportadora | Precio | Entrega |
|---|---|---|
| Servientrega Premier | $17.550 | 1–2 días |
| TCC Mensajería | $21.700 | Día siguiente |
| Coordinadora Ground | $26.040 | Día siguiente |
| Coordinadora Ecommerce | $23.700 | Día siguiente |

Coordinadora cuesta más que TCC para la **misma velocidad** — está dominada en
ambos ejes, y ocultarla es correcto: mostrarla sería ofrecerle al cliente una
opción objetivamente peor que otra que ya tiene delante. Confirmado también en
Bogotá y Soacha: 2 opciones consistentes (la más barata y la más rápida), sea
cual sea el número de transportadoras que realmente cotizaron por debajo.

Esto se verificó reproduciendo el fallo reportado en el checkout real
(navegador, no scripts aislados): con la mejora de reintentos, Coordinadora e
Inter Rapidísimo pasaron de fallar la mayoría de las veces a responder casi
siempre — y aun así casi nunca se muestran, porque genuinamente no ganan en
nada frente a Servientrega o TCC en las rutas probadas. Las "1-2
transportadoras" que ve el cliente no son un síntoma de que algo esté roto: es
el filtro haciendo su trabajo.

## Contra entrega

El catálogo confirma que existe: `cash_on_delivery: 1` en TCC (ambos
servicios), Coordinadora (los cuatro), Inter Rapidísimo (los cinco) y el
servicio `premier_cod` de Servientrega.

La comisión sale de `additional_services`: **5% del recaudo, mínimo $4.760**,
más 1,3% de seguro (mínimo $650) si se asegura.

Sigue desactivado hasta probar el flujo completo con llave de sandbox.

## ¿Usar Envia solo para cotizar y despachar manual?

Es técnicamente trivial: llamar `/ship/rate/` para mostrar precios reales en
el checkout y nunca llamar `/ship/generate/`, despachando cada pedido a mano
por el portal de cada transportadora. El código ya lo permite —
`SHIPPING_PROVIDER=tarifa-propia` sigue existiendo exactamente para esto.

Pero hay que ser claro en qué se pierde: se pierde la guía automática, el
tracking automático, y la generación de PDF. Cada pedido pasaría a ser
trabajo manual de nuevo — exactamente lo que esta integración estaba
resolviendo. Tiene sentido solo como paso transitorio si el saldo/cuenta
está bloqueado, no como estrategia permanente.

## ¿La tarifa es distinta siendo "aliado" que independiente?

Investigado: el programa "Partners" de Envia (partners.envia.com) **no es
un nivel de tarifa preferencial** — es un programa de referidos. Ahí se gana
comisión por referir OTROS negocios que se registren y envíen con Envia, no
por el volumen propio de envíos. No hay tarifa "de aliado" separada de la
que ya tiene la cuenta actual: lo que se cotiza hoy con este token **es** la
tarifa real de la cuenta, no una tarifa reducida por no ser partner.

Ni la documentación pública ni la página de desarrolladores mencionan
niveles de precio por volumen. Si existe un descuento por volumen, solo se
sabría hablando directo con ventas de Envia — no es algo que la API exponga.

## Qué falta

1. **Llave de sandbox real** para volver a probar `/ship/generate/` sin
   arriesgar la cuenta de producción. Dashboard → Developer → API Keys,
   creándola desde el ambiente sandbox.

2. **Confirmar el algoritmo exacto del HMAC de los webhooks.** Los headers y
   la forma del body ya están confirmados contra la documentación real:

   ```
   X-Webhook-Signature: v1=<hex>
   X-Webhook-Timestamp: <unix seconds>
   X-Webhook-Id: <id del evento>

   { "type": "tracking.simple", "created_at": "...",
     "data": { "shipment_id", "tracking_number", "status", "carrier_name" } }
   ```

   Lo que falta es el cálculo exacto del hash — la documentación dice
   "HMAC-SHA256" pero no dice sobre qué se calcula. El código ya implementa
   la variante `HMAC(secreto, "${timestamp}.${body}")`, que es el patrón más
   común en webhooks versionados así (Stripe, GitHub), pero es una hipótesis
   sin confirmar, no un hecho verificado. Para confirmarla: registrar un
   webhook con `POST /webhooks` apuntando a un túnel (`cloudflared tunnel
   --url http://localhost:3000`), generar un evento de tracking real, y
   comparar la firma recibida contra el cálculo. Mientras tanto el sistema
   falla seguro: un secreto que no coincide con el algoritmo real hace que
   se descarten TODOS los webhooks (nunca que se acepte uno falso), y el
   tracking se degrada a lo que ya se ve consultando `/ship/generaltrack/`
   manualmente desde el panel.

3. **Cancelar guía no está implementado.** El endpoint existe
   (`POST /ship/cancel/`, confirmado en la documentación) y no hay ningún
   código que lo llame — si un pedido con guía ya generada se cae (dirección
   mala, cliente se arrepiente), hoy no hay forma de anularla desde la
   tienda. Un detalle real al construirlo: **Inter Rapidísimo no soporta
   cancelar** — confirmado contra `GET queries.envia.com/carrier-action/152`,
   que no trae `cancel` en su lista de acciones (sí lo tienen TCC,
   Servientrega y Coordinadora). Habría que avisar en el panel que esas
   guías se cancelan escribiéndole directo a la transportadora, no por API.

4. **Recoger a domicilio no está implementado, y las cuatro transportadoras
   lo soportan** (`action_id: 3` en las cuatro, confirmado). Ahora mismo el
   despacho depende de llevar el paquete a un punto de la transportadora.
   El endpoint es `POST /ship/pickup/`, acepta varias guías de la misma
   transportadora y bodega en una sola solicitud, y **tiene costo** — cobra
   una tarifa de recogida a la cuenta y valida que haya saldo antes de
   agendar. Sería una acción nueva en el panel: "Agendar recogida" sobre los
   pedidos ya despachados de un día, agrupados por transportadora.

5. **Probar el recaudo** de punta a punta.

6. **Revisar la tarifa propia**, por debajo del costo real (ver hallazgo de
   la sesión anterior: Medellín se cobra $14.000, el costo real ronda
   $17.550-21.700).

## Reconciliación de precio: cotizado vs. cobrado real

Envia **no reserva tarifa** entre cotizar y generar (confirmado en su propia
guía de integración para checkout de e-commerce) — solo documenta el patrón
cotizar → pagar → generar, sin ninguna opción de "hold" de precio. Con el
flujo de Bre-B manual, entre que el cliente ve el total en el checkout y que
alguien aprueba el pago a mano pueden pasar horas. Si la tarifa de la
transportadora se movió en ese tiempo, se le cobra al cliente lo cotizado
igual —eso no cambia—, pero lo que Envia factura de verdad a la cuenta
puede ser distinto.

`/ship/generate/` sí devuelve el costo real (`totalPrice`) y el saldo
resultante (`currentBalance`), y antes se descartaban sin leer. Ahora se
capturan, se comparan contra lo cotizado, y si difieren por más de $100 COP
(margen para no alertar por redondeo) queda una entrada en la bitácora del
pedido y una nota visible en el panel admin. El saldo tras cada guía queda
en el log del servidor — no hay endpoint de saldo actual en la API (se ve
solo indirectamente en cada línea de factura), así que esto es la única
visibilidad al saldo sin entrar al dashboard.

## Endpoints útiles

| Para qué | Endpoint |
|---|---|
| Verificar que la llave sirve | `GET queries.envia.com/webhook-types` |
| Departamentos (catálogo bueno) | `GET queries.envia.com/state?country_code=CO` |
| Transportadoras del país | `GET queries.envia.com/carrier?country_code=CO` |
| Servicios, con flag de recaudo | `GET queries.envia.com/service?country_code=CO` |
| Municipio → DANE | `POST api.envia.com/locate` |
| Qué soporta cada transportadora (pickup, cancel, webhook…) | `GET queries.envia.com/carrier-action/{id}` |
| Facturación del mes, con saldo línea a línea | `GET queries.envia.com/invoice/{mes}/{año}` |
| Historial de pagos/recargas | `GET queries.envia.com/payment/{mes}/{año}` |
| Agendar recogida (sin implementar) | `POST /ship/pickup/` |
| Cancelar guía (sin implementar) | `POST /ship/cancel/` |
