# SmartConversations -- Wasender Integration: Variables de entorno

Variables para la integracion con Wasender (canal WhatsApp).
**No incluir valores reales. No commitear API keys.**

## Control de modo (obligatoria)

```dotenv
# Modo de integracion con Wasender: 'mock' (default) o 'real'
# Si no se define, el sistema usa mock -- nunca llama al proveedor real.
WASENDER_INTEGRATION_MODE=mock
```

## Variables de conexion (requeridas en mode=real)

```dotenv
# API key de Wasender (nunca se loguea, nunca se hardcodea)
WASENDER_API_KEY=REPLACE_WITH_WASENDER_TOKEN

# URL base del servidor Wasender (sandbox o produccion)
WASENDER_BASE_URL=https://wasender.example.invalid
```

## Variables de tuning (opcionales)

```dotenv
# Timeout por llamada en milisegundos (default: 8000)
WASENDER_TIMEOUT_MS=8000

# Numero de REINTENTOS tras el intento inicial para 429/5xx/timeout (default: 3)
# Semantica: WASENDER_MAX_RETRIES=N significa N reintentos + 1 intento inicial = N+1 llamadas totales.
# Ejemplo: WASENDER_MAX_RETRIES=3 -> 4 llamadas totales maximo (1 inicial + 3 reintentos).
WASENDER_MAX_RETRIES=3

# Backoff en segundos entre reintentos (default: 1,5,30)
# Un valor por reintento. Con WASENDER_MAX_RETRIES=3: espera 1s, 5s, 30s entre cada intento fallido.
WASENDER_RETRY_BACKOFF_SECONDS=1,5,30
```

## Variables de webhook (opcionales)

```dotenv
# Secreto HMAC para verificar firma de webhook inbound (por tenant, en conv_wa_sessions)
# No se usa como env global -- se almacena en conv_wa_sessions.webhook_secret por tenant
WASENDER_WEBHOOK_SECRET=REPLACE_WITH_HMAC_SECRET

# Prefijo de pais por defecto para normalizar numeros sin prefijo
WASENDER_DEFAULT_COUNTRY_PREFIX=34

# ID de sesion Wasender por defecto para el tenant (tambien en conv_wa_sessions)
WASENDER_PROVIDER_SESSION_ID=
```

## Notas de seguridad

1. WASENDER_API_KEY nunca aparece en logs, Activity Log ni payloads internos.
2. Authorization (Bearer token) nunca se loguea.
3. En mode=mock el sistema funciona sin ninguna variable real definida.
4. En mode=real, si falta API key o base URL, las llamadas devuelven error controlado.
5. El JID (@s.whatsapp.net, @c.us) nunca se persiste en conv_sessions ni conv_messages.
6. sender_ref persistido es siempre telefono normalizado con + internacional.
7. n8n no envia WhatsApp directamente -- solo conv-send-wa o conv-process-send-queue.
8. La IA no envia WhatsApp directamente.
9. Frontend no llama Wasender directamente.
10. Core no conoce Wasender -- toda la integracion es en Edge Functions.
