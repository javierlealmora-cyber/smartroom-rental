# Diagram — Secuencia de Mensaje Entrante por WhatsApp

## 1. Propósito

Mostrar la secuencia completa de pasos que sigue un mensaje de WhatsApp desde que llega el webhook de Wasender hasta que el usuario recibe la respuesta del bot. Incluye los seis puntos de descarte silencioso y deja visible que el HTTP 200 se envía a Wasender antes de cualquier procesamiento posterior.

## 2. Alcance

Este diagrama es de nivel técnico y de runtime. Cubre el flujo nominal de un mensaje de texto entrante y los seis casos de descarte. No cubre la lógica interna de WF-10 ni de los workflows de servicio (WF-20/30/40), cada uno de los cuales tiene su propio diagrama.

## 3. Diagrama

```
Wasender        conv-wa-webhook       conv-ingest        n8n WF-01/WF-10    WF-20/30/40    conv-send-wa     Wasender
    │                  │                   │                    │                  │               │              │
    │──POST webhook────►│                   │                    │                  │               │              │
    │  (mensaje        │                   │                    │                  │               │              │
    │   entrante)      │                   │                    │                  │               │              │
    │                  │                   │                    │                  │               │              │
    │◄─HTTP 200────────│                   │                    │                  │               │              │
    │  [inmediatamente, ANTES de cualquier comprobación; Wasender no reintenta]    │               │              │
    │                  │                   │                    │                  │               │              │
    │            ┌─────┴──────────────────────────────────────────────────────────────────────────────────────┐  │
    │            │  PROCESAMIENTO ASÍNCRONO (después del 200)                                                  │  │
    │            │                                                                                             │  │
    │            │  1. Verificar X-Webhook-Signature                                                          │  │
    │            │     ├─ Ausente o no coincide con webhook_secret → log + DESCARTAR ──────────────────────►  │  │
    │            │     └─ Válida → continuar                                                                  │  │
    │            │                                                                                             │  │
    │            │  2. Resolver wasender_session_id → client_account_id (conv_wa_sessions)                   │  │
    │            │     ├─ Sesión no encontrada → log + DESCARTAR ───────────────────────────────────────────► │  │
    │            │     └─ Encontrada → continuar                                                              │  │
    │            │                                                                                             │  │
    │            │  3. [NIVEL 1] saas_service_subscriptions WHERE service_code='smart_conversations'          │  │
    │            │              AND status='active' AND client_account_id=<resuelto>                          │  │
    │            │     ├─ Inactiva → DESCARTAR silenciosamente ──────────────────────────────────────────────►│  │
    │            │     └─ Activa → continuar                                                                  │  │
    │            │                                                                                             │  │
    │            │  4. [NIVEL 2] conv_wa_sessions.status = 'active'                                           │  │
    │            │     ├─ No activa → DESCARTAR silenciosamente ─────────────────────────────────────────────►│  │
    │            │     └─ Activa → continuar                                                                  │  │
    │            │                                                                                             │  │
    │            │  5. [NIVEL 3] conv_service_activations WHERE channel='whatsapp' AND is_active=true         │  │
    │            │     ├─ Ningún servicio activo → DESCARTAR silenciosamente ───────────────────────────────► │  │
    │            │     └─ Al menos uno activo → continuar                                                     │  │
    │            │                                                                                             │  │
    │            │  6. Deduplicar: wasender_message_id ya existe en conv_messages?                            │  │
    │            │     ├─ Sí → DESCARTAR silenciosamente (duplicado) ──────────────────────────────────────►  │  │
    │            │     └─ No → continuar                                                                      │  │
    │            │                                                                                             │  │
    │            │  7. ¿Tipo de mensaje?                                                                      │  │
    │            │     ├─ audioMessage → encolar transcripción (WF-C00-TRANSCRIBE)                            │  │
    │            │     │                  esperar resultado; normalizar con texto transcrito                  │  │
    │            │     └─ text/image/extendedText → normalizar directamente a NormalizedMessage               │  │
    │            └─────────────────────────────────────────────────────────────────────────────────────────┘  │
    │                  │                   │                    │                  │               │              │
    │                  │──llamar conv-ingest►│                   │                 │               │              │
    │                  │  { channel,        │                   │                  │               │              │
    │                  │    client_account_id,                  │                  │               │              │
    │                  │    normalized_msg }│                   │                  │               │              │
    │                  │                   │                    │                  │               │              │
    │                  │                   │ FAST-PATH IDENTIDAD│                  │               │              │
    │                  │                   │ Extraer phone de   │                  │               │              │
    │                  │                   │ message.from       │                  │               │              │
    │                  │                   │ (formato +34...)   │                  │               │              │
    │                  │                   │ conv-core-validate-│                  │               │              │
    │                  │                   │ identity({phone,   │                  │               │              │
    │                  │                   │  client_account_id})                  │               │              │
    │                  │                   │ → guardar resultado│                  │               │              │
    │                  │                   │   en conv_sessions │                  │               │              │
    │                  │                   │   (identity_level, │                  │               │              │
    │                  │                   │    profile_id)     │                  │               │              │
    │                  │                   │                    │                  │               │              │
    │                  │                   │──WF-01 HTTP POST──►│                  │               │              │
    │                  │                   │  { session_id,     │                  │               │              │
    │                  │                   │    client_account_id,                 │               │              │
    │                  │                   │    message_text,   │                  │               │              │
    │                  │                   │    channel,        │                  │               │              │
    │                  │                   │    identity_level }│                  │               │              │
    │                  │                   │  [phone_number NO sale de conv-ingest]│               │              │
    │                  │                   │                    │                  │               │              │
    │                  │                   │                    │──WF-10 enruta──►  │               │              │
    │                  │                   │                    │                  │               │              │
    │                  │                   │                    │         [WF-20/30/40 + EFs conv-core-*]         │
    │                  │                   │                    │                  │               │              │
    │                  │                   │                    │◄──CanonicalResponse────────────  │              │
    │                  │                   │                    │  { text,         │               │              │
    │                  │                   │                    │    next_state,   │               │              │
    │                  │                   │                    │    response_type}│               │              │
    │                  │                   │                    │                  │               │              │
    │                  │                   │                    │──WF-91 (envío WA)───────────────►│              │
    │                  │                   │                    │  { sessionId,    │               │              │
    │                  │                   │                    │    to: phone@c.us│               │──POST ──────►│
    │                  │                   │                    │    text }        │               │ send-message │
    │                  │                   │                    │                  │               │◄─200─────────│
    │                  │                   │                    │                  │    (mensaje entregado al usuario)
```

**Resumen de los seis puntos de descarte silencioso:**

| # | Condición | Tipo de descarte |
|---|---|---|
| 1 | `X-Webhook-Signature` ausente o no coincide | Log + stop |
| 2 | `wasender_session_id` sin `client_account_id` en `conv_wa_sessions` | Log + stop |
| 3 | Suscripción umbrella `smart_conversations` inactiva | Stop silencioso |
| 4 | `conv_wa_sessions.status ≠ 'active'` | Stop silencioso |
| 5 | Sin filas activas en `conv_service_activations` para `whatsapp` | Stop silencioso |
| 6 | `wasender_message_id` ya existe en `conv_messages` para ese tenant | Stop silencioso |

En todos los casos, el HTTP 200 ya fue entregado a Wasender antes de llegar a este punto.

## 4. Notas de lectura

- **Columnas**: actores o componentes técnicos. La secuencia se lee de arriba a abajo.
- **Bloque de PROCESAMIENTO ASÍNCRONO**: todo lo contenido en ese bloque ocurre después de que el HTTP 200 fue entregado. Esto implementa la regla de `rules-30-whatsapp-channel.md` §4.2: la respuesta 200 debe enviarse antes de cualquier procesamiento.
- **`DESCARTAR silenciosamente`**: el sistema detiene el procesamiento sin devolver ninguna respuesta adicional a Wasender. Wasender no recibe error ni reintenta.
- **Fast-path de identidad**: se ejecuta dentro de `conv-ingest`, antes de disparar WF-01. El `phone_number` extraído del payload no sale de esta capa. n8n solo recibe `identity_level` (enum).
- **WF-91**: workflow de n8n que llama a `conv-send-wa` para el envío saliente. `conv-send-wa` es el único camino válido para enviar a Wasender; n8n nunca llama a la API de Wasender directamente.
- **`to: phone@c.us`**: el cuerpo de la llamada a Wasender usa el campo `to` con el sufijo `@c.us`. El campo `text` transporta el mensaje. El campo `sessionId` identifica la sesión Wasender del tenant.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-30-whatsapp-channel.md` §3, §4.1–4.6 | HTTP 200 inmediato, firma `X-Webhook-Signature`, jerarquía 3 niveles, deduplicación, formato saliente |
| `rules-00-scope-and-principles.md` §4.4 | Orden obligatorio de la jerarquía de activación |
| `rules-00-scope-and-principles.md` §4.5 | Frontera PII: `phone_number` no sale hacia n8n |
| `rules-40-identity-validation.md` §4.3 | Fast-path por teléfono en `conv-ingest` |
| `rules-70-integration-api.md` | EFs `conv-core-*` llamadas desde WF-20/30/40 |
| `contract-normalized-message.md` | Estructura del `NormalizedMessage` producido por `conv-wa-webhook` |
| `contract-canonical-response.md` | Estructura de la `CanonicalResponse` devuelta por WF-20/30/40 |
| `skill-whatsapp-wasender-integration.md` | Detalles de implementación de `conv-wa-webhook` y `conv-send-wa` |
| `skill-identity-validation.md` §6 Paso 1 | Extracción de `phone` de `message.from`; formato internacional |

## 6. Limitaciones

- El diagrama muestra el flujo de un mensaje de texto. Los mensajes de audio tienen un paso adicional asíncrono (WF-C00-TRANSCRIBE) que se menciona pero no se desarrolla.
- No muestra el flujo de escalado a admin humano ni cómo el admin responde desde el panel.
- No muestra `conv_send_queue` ni los reintentos cuando `conv-send-wa` falla al llamar a Wasender.
- La lógica interna de WF-10 (enrutado), WF-IDENTITY (identificación progresiva) y WF-20/30/40 (servicios) se abstrae. Cada uno tiene su propio diagrama.
- No modela mensajes concurrentes ni condiciones de carrera.
- La publicación de eventos en el activity log del Core (llamada a `conv-core-publish-activity`) se abstrae dentro de los bloques WF-20/30/40.
- El diagrama no cubre el ciclo de vida de la sesión (`conv_sessions.state`) ni las transiciones de `conv_cases.status`.
