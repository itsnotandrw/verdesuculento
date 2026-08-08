# Integración de Envia.com — Checklist de implementación

El adaptador de Envia está **100% listo en el código**. Lo que falta es:

1. **Token válido del sandbox** que tenga acceso a `/ship/rate/`
2. **Verificación de campos** contra la respuesta real

## Obtener un token válido

1. Ve a https://docs.envia.com/docs/getting-started
2. **Sección "Authentication"** → obtén un token de sandbox válido
3. Confirma en el panel de desarrolladores que el token tenga permisos en:
   - `POST /ship/rate/` — cotización
   - `POST /ship/generate/` — crear envío
   - `GET /ship/generalTracking` — tracking

## Probar que el token funciona

Con un curl directo, antes de configurar el `.env.local`:

```bash
TOKEN="tu_token_aqui"
curl -X POST "https://api-test.envia.com/ship/rate/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "origin": {"city": "Bogotá", "state": "Cundinamarca", "country": "CO"},
    "destination": {"city": "Medellín", "state": "Antioquia", "country": "CO"},
    "packages": [{"weight": 2, "length": 40, "width": 20, "height": 12}],
    "shipment": {"type": 1}
  }'
```

Si responde JSON con `data: [...]`, el token es válido.

Si responde `"Authentication error."`, está mal. Vuelve al panel y regenera.

## Configurar en la tienda

Una vez que tengas el token válido:

```bash
# .env.local
SHIPPING_PROVIDER=envia
ENVIA_TOKEN=tu_token_valido_aqui
ENVIA_BASE_URL=https://api-test.envia.com   # sandbox
SHIPPING_WEBHOOK_SECRET=genera_uno_aleatorio
```

Luego cotiza con curl:

```bash
curl -X POST http://localhost:3000/api/shipping/quote \
  -H "Content-Type: application/json" \
  -d '{
    "departamento": "Antioquia",
    "ciudad": "Medellín",
    "lines": [{"productId": "MCO2178557170", "qty": 1}]
  }'
```

Debe responder con un array de quotes con carrier, service, cost, etaLabel.

## Si sigue sin funcionar

**Campo a verificar en el adaptador** (línea 130 de `lib/shipping/providers/envia.ts`):

El payload que mandamos es:

```javascript
{
  origin: ubicacion(...),           // objeto con city, state, country
  destination: ubicacion(...),
  packages: paquete(...),           // array con weight, dimensions
  shipment: { carrier: '', type: 1 },
  settings: { currency: 'COP' }
}
```

Si Envia responde error, compara este JSON contra los ejemplos de https://docs.envia.com y ajusta los nombres de campos.

Busca en `envia.ts` los comentarios `// VERIFICAR:` — esos son los puntos donde el adaptador asume estructura.

## Una vez funcionando

1. **Prueba todas las rutas** de tus destinos reales (Bogotá → Medellín, Cali, Barranquilla, municipio pequeño)
2. **Compara tarifas** contra Mipaquete
3. **Decide cuál usar** basado en:
   - Precio total en tu mezcla
   - Tiempo de tránsito real
   - Cobertura de recaudo
4. **Configura webhooks** para tracking automático
5. **Prueba contra entrega** (opcional pero muy valioso)

## Cambiar a producción

Cuando estés listo:

```bash
ENVIA_BASE_URL=https://api.envia.com   # cambiar de sandbox a producción
```

Nada más cambia. Todo lo demás sigue igual.
