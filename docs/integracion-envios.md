# Integrar la plataforma de envíos — paso a paso

Cómo pasar de la tarifa propia (lo que corre hoy) a un agregador con guías
reales, tracking automático y contra entrega.

El código ya está escrito. Lo que falta es dar de alta la cuenta, comparar
tarifas y confirmar los nombres de los campos contra el sandbox. Cuenta
**2 a 3 días** de trabajo real, casi todo esperando respuestas comerciales.

---

## Qué corre hoy y qué cambia

| | Hoy (`tarifa-propia`) | Con agregador |
|---|---|---|
| Cotización | Tabla por zona con peso volumétrico real | Tarifa en vivo de 5 transportadoras |
| Guía | Número interno; la guía real la generas en el portal | Guía real por API, PDF descargable |
| Tracking | Lo actualizas a mano | Webhook automático |
| Contra entrega | No disponible | Con validación de cobertura |

El cambio es una variable de entorno. La UI, el checkout y el orquestador no
se tocan.

---

## Fase 0 — Elegir agregador (lo único que no se puede saltar)

No elijas por la página web de ninguno: **cotiza las mismas rutas en los dos
sandbox y compara**. La diferencia entre uno y otro en tu mezcla de envíos
puede ser 20-30%, y a ~320 pedidos/mes eso decide el asunto.

### Los paquetes con los que tienes que cotizar

Salen de las dimensiones que tú mismo declaraste en Mercado Libre, ya
consolidadas por el sistema:

| Pedido típico | Caja | Peso real | Peso volumétrico | **Kilos que te cobran** |
|---|---|---|---|---|
| 1 arándano (tu más vendido) | 40×20×12 cm | 0,90 kg | 1,60 kg | **2 kg** |
| 2 arándanos | 40×20×23 cm | 1,80 kg | 3,07 kg | **4 kg** |
| Kit 12 suculentas | 10×10×12 cm | 0,20 kg | 0,20 kg | **1 kg** |
| Berries + suculentas | 40×20×25 cm | 2,00 kg | 3,33 kg | **4 kg** |

Ojo con esto: en 49 de tus 89 productos **manda el peso volumétrico, no el
real**. Vendes cosas livianas y voluminosas. Cualquier agregador que cotices
tienes que cotizarlo con dimensiones, no solo con kilos, o el precio que te
prometan no será el que te facturen.

### Las rutas

Cotiza origen Bogotá contra: **Medellín, Cali, Barranquilla, Bucaramanga y un
municipio pequeño** (por ejemplo Sincelejo o Tuluá). El municipio pequeño es el
que separa a los agregadores: en las cinco capitales todos andan parecido.

> Los datos que sacamos de Mercado Libre no traen la ciudad de destino, así que
> revisa en tu reporte de ventas de ML cuáles son tus 5 destinos reales y
> reemplaza esta lista. Vale la pena: es la diferencia entre optimizar para tu
> mezcla o para una genérica.

### Qué medir, además del precio

1. **Tiempo en tránsito real** en cada ruta. Aquí viajan plantas vivas: cada
   día de más es riesgo de reposición, y una reposición se come el ahorro de
   varios envíos. Un agregador 10% más caro que llegue un día antes sale
   ganando.
2. **Comisión de recaudo contra entrega** y a cuántos días hábiles giran.
3. **Cobertura de recaudo** en municipios pequeños.
4. **Formato de guía**: PDF sirve; ZPL solo si vas a comprar impresora térmica.
5. **Webhooks de novedades**: si no los tienen, el tracking hay que consultarlo
   con un job y es peor.

---

## Paso 1 — Crear la cuenta

### Mipaquete (la que probaría primero)

1. Regístrate en **mipaquete.com** → "Crear cuenta" (empresa, con NIT).
2. Verifica el correo y completa los datos de la empresa.
3. Pide acceso a la **API** desde el panel o escribiendo a soporte. Te dan un
   ambiente de pruebas.
4. La llave se genera llamando a `generateApiKey` con tu usuario y contraseña.
   Guárdala: es lo que va en `MIPAQUETE_API_KEY`.
5. Pide expresamente: **URL del sandbox**, **catálogo de ciudades**
   (`GET /cities`), **catálogo de transportadoras** (`GET /deliveryCompanies`)
   y **cómo firman los webhooks**.

Por qué esta primero: documentación en español, sin contrato ni mensualidad, y
cubre Inter Rapidísimo, Servientrega, Envía, Coordinadora y TCC.

### Envia.com (la alternativa)

1. Regístrate en **envia.com/es-CO** → sección desarrolladores.
2. Obtén el **Bearer token** de pruebas desde el panel.
3. Sandbox y producción son URLs distintas (`api-test.envia.com` vs
   `api.envia.com`), la llave puede ser la misma. No las mezcles.

---

## Paso 2 — Configurar

En `.env.local` (y en las variables de entorno de tu hosting):

```bash
SHIPPING_PROVIDER=mipaquete
MIPAQUETE_API_KEY=la_que_te_dieron
MIPAQUETE_BASE_URL=https://api-v2.dev.mipaquete.com   # sandbox
SHIPPING_WEBHOOK_SECRET=genera_uno_largo_y_aleatorio

# La bodega de donde salen todas las guías
SHIPPING_ORIGIN_DEPT=Cundinamarca
SHIPPING_ORIGIN_CITY=Bogotá
SHIPPING_ORIGIN_CITY_CODE=11001000
SHIPPING_ORIGIN_ADDRESS=la direccion real de la bodega
```

Si la llave está mal o falta, el sistema **no se cae**: vuelve a la tarifa
propia y lo deja escrito en el log. Revisa los logs después de configurar, no
asumas que quedó andando.

---

## Paso 3 — Confirmar los campos contra el sandbox

Aquí está el trabajo real. Los adaptadores (`lib/shipping/providers/`) están
escritos contra la documentación pública, **sin probar contra el sandbox**. La
estructura, el manejo de errores y el mapeo de estados están terminados; lo que
falta es confirmar cómo se llaman los campos, que es justo donde estos
servicios suelen diferir de sus propios docs.

Busca `VERIFICAR` en `lib/shipping/providers/mipaquete.ts`. Son cuatro cosas:

1. **El header de autenticación.** El código manda `session-tracker`. Si es
   `Authorization: Bearer`, cámbialo en la función `llamar()`.
2. **Los campos de `POST /price`** y cómo vienen las tarifas en la respuesta
   (`shippingCost` vs `totalPrice`, cómo se llama el tiempo de entrega).
3. **Los códigos de estado del tracking** — el mapa `ESTADOS` traduce texto en
   español a nuestros estados internos. Pide la lista real.
4. **La firma del webhook** — hoy compara un secreto compartido en el header.
   Si usan HMAC, hay que calcularlo.

La forma más rápida: haz una cotización con Postman o Bruno, compara la
respuesta real contra lo que espera el adaptador, y ajusta.

### Probar sin salir del proyecto

Con el servidor corriendo:

```bash
# Cotización — debe traer varias transportadoras con precios distintos
curl -X POST http://localhost:3000/api/shipping/quote \
  -H "Content-Type: application/json" \
  -d '{"departamento":"Antioquia","ciudad":"Medellín",
       "lines":[{"productId":"MCO2178557170","qty":2}]}'

# Cobertura de contra entrega
curl -X POST http://localhost:3000/api/shipping/coverage \
  -H "Content-Type: application/json" \
  -d '{"departamento":"Sucre","ciudad":"Sincelejo","amount":90000}'
```

Si la cotización responde con `carrier: "Red de transportadoras"`, todavía
estás en tarifa propia: la llave no quedó bien.

---

## Paso 4 — El catálogo de ciudades

**Esta es la falla número uno al integrar agregadores.** No aceptan nombres de
ciudad en texto: exigen el código del municipio, y cada uno tiene su propio
catálogo.

`lib/shipping/zonas.ts` trae los códigos DANE de unos 40 municipios, que cubren
el grueso de los pedidos. Para el resto:

1. Descarga el catálogo completo del agregador (`GET /cities`).
2. Guárdalo como un JSON en `data/` y amplía el mapa `CIUDAD_DANE`.
3. Idealmente, convierte el campo "Ciudad" del checkout en un autocompletado
   que solo deje elegir ciudades del catálogo. Mientras sea texto libre, un
   cliente que escriba "Bogota DC" o "Medellin" mal va a fallar al cotizar.

Si falta el código, el adaptador lanza un error claro diciendo cuál falta. No
cotiza mal en silencio.

---

## Paso 5 — Webhooks de tracking

1. En el panel del agregador, configura la URL de eventos:
   `https://tudominio.com/api/webhooks/shipping`
2. Ese endpoint ya valida la firma e ignora eventos repetidos por `eventId`.
3. Para probar en local, expón tu máquina:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   y registra la URL que te devuelva.
4. Genera una guía de prueba y confirma que los estados llegan. Míralo en
   `/pedido/[referencia]`: la línea de tiempo se actualiza sola.

Verifica que el endpoint responde: `GET /api/webhooks/shipping` debe devolver
`{"status":"listo","provider":"mipaquete"}`.

---

## Paso 6 — Pasar a producción

1. Cambia `MIPAQUETE_BASE_URL` a la URL de producción.
2. Cambia la llave de sandbox por la de producción.
3. Actualiza la URL de webhooks al dominio real.
4. **Haz un pedido de verdad, a ti mismo, y despáchalo completo.** Que la guía
   salga, que el PDF imprima, que el tracking llegue. No lo estrenes con un
   cliente.
5. Revisa los logs el primer día. Los errores de campos aparecen ahí, no en la
   UI.

---

## Paso 7 — Contra entrega (opcional, pero es plata)

Alrededor de tres de cada cuatro compras de ecommerce en Colombia se pagan
contra entrega. Es la palanca más grande de conversión que tienes disponible, y
también la más riesgosa.

Para activarlo: `SHIPPING_COD_ENABLED=true`.

Antes de hacerlo, tres cosas:

1. **El sistema valida cobertura antes de ofrecerlo.** Si el agregador dice que
   no hay recaudo en ese municipio, el método no aparece. Está implementado, no
   lo desactives.
2. **El giro tarda 4 a 11 días hábiles** después de entregar. Necesitas caja
   para aguantar ese desfase.
3. **Una entrega fallida en contra entrega es producto en la calle y dinero que
   no existe.** El sistema las marca con prioridad en el panel (`PRIORIDAD:
   novedad en un contra entrega`). Revísalas primero, siempre.

Cuando el giro llegue, márcalo en el panel con "Marcar recaudo girado". Ese es
el cruce de conciliación: entregados contra girados.

Sugerencia: arranca ofreciéndolo solo en las rutas donde tu tasa de novedades
sea baja, no en todo el país de una.

---

## Si algo sale mal

| Síntoma | Causa casi siempre |
|---|---|
| Cotiza "Red de transportadoras" | La llave no quedó; revisa el log |
| `falta el código DANE de X` | El municipio no está en `CIUDAD_DANE` |
| Cotización 401/403 | Header de autenticación equivocado (paso 3.1) |
| Webhook no actualiza nada | Falta `SHIPPING_WEBHOOK_SECRET` o la firma no coincide |
| Tarifa mucho más alta de lo esperado | Estás cotizando por peso real; manda dimensiones |
| Pago aprobado y sin guía | Falló la transportadora; el pedido queda pagado y hay botón "Generar guía" en el panel |

El último caso es a propósito: si la transportadora falla, el pedido **no** se
pierde ni se cancela. El pago ya está confirmado, así que queda visible en el
panel para reintentar.
