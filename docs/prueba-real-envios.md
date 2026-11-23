# Prueba real de envío con Envía — lista de verificación

Pensada para el día que el cliente haga el primer envío real. Todo lo de abajo ya está construido y probado contra el
sandbox de Envía; lo que no se puede probar sin dinero real (guía facturable, recogida con tarifa) se hace en este orden.

## 1. Antes de empezar (una sola vez)

**Variables en Railway** (servicio del sitio → Variables):

| Variable | Valor | Nota |
|---|---|---|
| `SHIPPING_PROVIDER` | `envia` | |
| `ENVIA_TOKEN` | la llave de **producción** | una llave solo sirve en su ambiente |
| `ENVIA_BASE_URL` | `https://api.envia.com` | sandbox es `https://api-test.envia.com` |
| ~~`SHIPPING_ORIGIN_ADDRESS`~~ | (ya no se usa) | la bodega es FIJA en el código: sede de Soacha de `data/contacto.ts` (Calle 6 # 13-08, El Altico). Puedes borrar la variable de Railway |
| `SHIPPING_ORIGIN_POSTAL_CODE` | código postal de la bodega | solo lo exige **agendar recogida**; por defecto `250051` (Soacha), confírmalo |
| `ENVIA_CARRIERS` | `tcc,interRapidisimo,serviEntrega,coordinadora` | opcional (es el valor por defecto): qué transportadoras ve el cliente. DHL también cubre pero cuesta ≈ $49.000: se agrega añadiendo `dhl` |
| `SHIPPING_COD_ENABLED` | `false` | contra entrega apagada hasta tener Ecart Pay |

**Cuenta de Envía:** saldo **prepagado** suficiente (guía + recogida; ≈ $25.000–$45.000 para una prueba).
Sin saldo, la guía falla con un mensaje claro y el pedido queda «pagado sin guía» para reintentar con un clic.

**Panel → Envíos** (`/admin/envios`): muestra si Envía está activo y en qué ambiente (debe decir **Producción**) y permite
«Probar cobertura y precios» para cualquier ciudad con **todas** las transportadoras de Envía en Colombia. Úsalo para ver
cuáles cubren de verdad y decidir qué entra en `ENVIA_CARRIERS`.

## 2. La prueba, paso a paso

1. En el sitio, haz un pedido **real y barato** hacia una dirección donde puedas recibirlo. Elige la transportadora
   que quieras (el checkout muestra todas las que cotizan, cada una con su precio y plazo).
2. Paga (Wompi, o Bre-B y apruébalo en el panel → *Aprobar*). Al aprobar se genera la **guía real** y se le avisa al
   cliente por correo con el número de guía.
3. En el panel → Ventas → el pedido: **Imprimir guía (PDF)**. Pégala en el paquete.
4. Entrega: lleva el paquete a un punto de la transportadora, o pulsa **Agendar recogida** (elige fecha; franja 9:00–17:00).
   Se agenda **una sola recogida por transportadora** con todos los paquetes pendientes; la transportadora la cobra aparte.
5. Seguimiento: el estado avanza solo (el sitio consulta a la transportadora cada 25 min; el webhook lo acelera si se
   configura). El cliente lo ve en `/pedido/<ticket>` y en «Mis pedidos».
6. Si algo sale mal **antes** de que la transportadora recoja el paquete: **Anular guía** (TCC, Servientrega y
   Coordinadora devuelven el valor al saldo). **Inter Rapidísimo no permite anular por API**: hay que escribirle a ella.

## 3. Cosas que conviene saber

- **El precio que ve el cliente es el cotizado.** Envía no reserva la tarifa entre cotizar y generar; si la guía sale
  más cara o barata de $100 de diferencia, queda una alerta en el pedido.
- **Plantas vivas / ICA:** mover material vegetal puede exigir constancia fitosanitaria según el caso (Resolución ICA
  00019328 de 2024). Confirma con el cliente cómo lo manejan.
- **Dos productos** (materas de yeso) usan la caja genérica de 500 g y 20×20 cm; el resto tiene peso y medidas reales.
  Se editan en el formulario del producto.
- **Webhook (opcional):** Envía no entrega el secreto por API. Si lo piden a soporte (`SHIPPING_WEBHOOK_SECRET`), se
  registra desde el panel → Envíos → «Registrar webhook». Sin él nada se rompe: el seguimiento sigue por consulta.
- **Seguridad:** el seguimiento público ya no devuelve la referencia del pedido; anular guía y agendar recogida exigen
  confirmación explícita; el webhook solo acepta firmas válidas y recientes (máx. 5 min) y es idempotente.
