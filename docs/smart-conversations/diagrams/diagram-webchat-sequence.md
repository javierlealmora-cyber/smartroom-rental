# Diagram — Secuencia WebChat: Sesión y Mensaje

## 1. Propósito

Mostrar la secuencia de los dos flujos fundamentales del canal WebChat: (1) la creación de sesión, distinguiendo entre usuario anónimo y usuario autenticado con JWT del portal lodger, y (2) el envío de un mensaje y la entrega de la respuesta por Supabase Realtime. Deja visible que un JWT válido no acredita tenencia activa, y que el `session_token` del add-on es un token distinto del JWT del portal lodger.

## 2. Alcance

Este diagrama es de nivel técnico y de runtime. Cubre los dos flujos principales del canal WebChat. No cubre la lógica interna de WF-10 ni la de los workflows de servicio.

## 3. Diagrama

### Flujo A — Creación de sesión WebChat

```
Widget          conv-web-session       Supabase Auth    conv-core-validate-identity   conv_sessions
  │                   │                     │                       │                      │
  │──POST /conv-web-session────────────────►│                       │                      │
  │  { Origin,        │                     │                       │                      │
  │    tenant_id,     │                     │                       │                      │
  │    lodger_jwt? }  │                     │                       │                      │
  │                   │                     │                       │                      │
  │            ┌──────┴─────────────────────────────────────────────────────────────────┐  │
  │            │  VALIDACIONES PREVIAS                                                  │  │
  │            │  1. Verificar Origin en conv_wc_configs.allowed_origins                │  │
  │            │     └─ No autorizado → HTTP 403 ─────────────────────────────────────►│  │
  │            │  2. Verificar conv_wc_configs.is_active                                │  │
  │            │     └─ False → HTTP 503 { error: 'service_unavailable' } ─────────────►│  │
  │            │  3. [NIVEL 1] Verificar umbrella saas_service_subscriptions            │  │
  │            │     └─ Inactiva → HTTP 503 ──────────────────────────────────────────►│  │
  │            └────────────────────────────────────────────────────────────────────────┘  │
  │                   │                     │                       │                      │
  │         ┌─────────┴───────────────────────────────────────────────────────────────────►│
  │         │         │                                             │                      │
  │         │  ¿lodger_jwt presente?                               │                      │
  │         │         │                                             │                      │
  │         │  ── SÍ: usuario autenticado ─────────────────────────────────────────────── │
  │         │         │──validar JWT────────────────►│             │                      │
  │         │         │                  │◄─profile_id─│            │                      │
  │         │         │                                             │                      │
  │         │         │  IMPORTANTE: JWT válido ≠ tenencia activa  │                      │
  │         │         │  Se requiere llamada explícita al Core      │                      │
  │         │         │                                             │                      │
  │         │         │────────────────────── POST conv-core-validate-identity ──────────►│
  │         │         │             { client_account_id, profile_id }                     │
  │         │         │                                             │                      │
  │         │         │  ┌──────────────── RESULTADO REAL DEL CORE ─────────────────────►│
  │         │         │  │  STRONG_MATCH_ACTIVE  → inquilino activo                       │
  │         │         │  │  PARTIAL_MATCH_ACTIVE → datos parciales                        │
  │         │         │  │  MATCH_INACTIVE       → contrato finalizado                    │
  │         │         │  │  NO_MATCH             → sin coincidencia                       │
  │         │         │◄─┘                                                                │
  │         │         │  [profile_id y datos adicionales se almacenan en conv_sessions]   │
  │         │         │  [NUNCA se reenvían a n8n]                                        │
  │         │         │                                                                    │
  │         │  ── NO: usuario anónimo ──────────────────────────────────────────────────── │
  │         │         │  identity_level = 'NO_MATCH' por defecto                          │
  │         │         │  No se llama a conv-core-validate-identity                        │
  │         │         │                                                                    │
  │         └─────────►──INSERT conv_sessions────────────────────────────────────────────►│
  │                   │  { channel='webchat', identity_level,                             │
  │                   │    profile_id? (solo si no NO_MATCH), state='NEW' }               │
  │                   │                                                                    │
  │                   │──emitir session_token──────────────────────────────────────────── │
  │                   │  JWT firmado con clave PROPIA del add-on (≠ JWT del portal lodger)│
  │                   │  payload: { session_id, client_account_id }                       │
  │                   │  TTL: 1 hora                                                      │
  │                   │                                                                    │
  │◄──HTTP 200────────│                                                                    │
  │  { session_token, │                                                                    │
  │    session_id,    │                                                                    │
  │    is_identified, │                                                                    │
  │    identity_level }                                                                    │
  │  [NUNCA incluye profile_id ni datos de identidad adicionales]                         │
  │                   │                                                                    │
  │──suscribir Supabase Realtime────────────────────────────────────────────────────────► │
  │  channel: conv:session:{session_id}                                                    │
  │  filtro: sender_type IN ('bot', 'admin')                                               │
  │  [desde este momento el widget recibe respuestas sin polling]                          │
```

### Flujo B — Envío de mensaje y entrega de respuesta

```
Widget         conv-web-message         conv-ingest           n8n             conv_messages  Widget
  │                  │                       │                  │                   │            │
  │──POST /conv-web-message────────────────► │                  │                   │            │
  │  { session_token (del add-on),           │                  │                   │            │
  │    text,                                 │                  │                   │            │
  │    service_code? }                       │                  │                   │            │
  │                  │                       │                  │                   │            │
  │           ┌──────┴───────────────────────────────────────────────────────────────────────┐  │
  │           │  1. Validar session_token (JWT del add-on, TTL 1h)                           │  │
  │           │     └─ Expirado → HTTP 401 { error: 'token_expired' } ─────────────────────►│  │
  │           │        [el widget renueva el token de forma transparente y reintenta]        │  │
  │           │  2. Extraer session_id y client_account_id del token                        │  │
  │           │  3. [NIVEL 1] Verificar umbrella                                            │  │
  │           │  4. [NIVEL 2] Verificar conv_wc_configs.is_active = true                    │  │
  │           │  5. [NIVEL 3] Verificar al menos 1 servicio activo para canal 'webchat'     │  │
  │           │  6. Si service_code presente: verificar activo en conv_service_activations   │  │
  │           │     └─ No activo → HTTP 422 ───────────────────────────────────────────────►│  │
  │           └──────────────────────────────────────────────────────────────────────────────┘  │
  │                  │                       │                  │                   │            │
  │                  │──INSERT conv_messages──────────────────────────────────────►│            │
  │                  │  (channel='webchat', sender_type='user',                     │            │
  │                  │   direction='inbound', text)                                 │            │
  │                  │                       │                  │                   │            │
  │◄──HTTP 200───────│                       │                  │                   │            │
  │  { message_id,   │                       │                  │                   │            │
  │    status: 'received' }                  │                  │                   │            │
  │                  │                       │                  │                   │            │
  │                  │──llamar conv-ingest──► │                  │                   │            │
  │                  │                       │──WF-02 HTTP POST►│                   │            │
  │                  │                       │  { session_id,   │                   │            │
  │                  │                       │    client_account_id,                │            │
  │                  │                       │    message_text, │                   │            │
  │                  │                       │    channel,      │                   │            │
  │                  │                       │    identity_level}│                  │            │
  │                  │                       │  [profile_id NO sale de conv-ingest] │            │
  │                  │                       │                  │                   │            │
  │                  │                       │         WF-10 → WF-20/30/40          │            │
  │                  │                       │         [lógica de enrutado y        │            │
  │                  │                       │          servicio, EFs conv-core-*]  │            │
  │                  │                       │                  │                   │            │
  │                  │                       │         WF-92: INSERT conv_messages (bot) ───────►│
  │                  │                       │                  │  sender_type='bot'│            │
  │                  │                       │                  │                   │            │
  │                  │                       │                  │  Supabase Realtime notifica───►│
  │                  │                       │                  │                   │   mensaje  │
  │                  │                       │                  │                   │   del bot  │
```

**Diferencia entre los dos tokens del sistema:**

| Token | Quién lo emite | Payload | Propósito |
|---|---|---|---|
| JWT del portal lodger | Supabase Auth (SmartRoom Core) | `{ user_id, email, role, ... }` | Autenticación del usuario en el portal web del tenant |
| `session_token` del add-on | `conv-web-session` | `{ session_id, client_account_id }` | Autenticación del widget en `conv-web-message` y `conv-ingest` |

Estos dos tokens son completamente distintos. El `session_token` del add-on **nunca** se usa para llamar a EFs `conv-core-*`. Las EFs `conv-core-*` usan `service_role`.

## 4. Notas de lectura

- **Flujo A** muestra la creación de sesión. El condicional `¿lodger_jwt presente?` separa el usuario autenticado (con JWT del portal) del usuario anónimo.
- **Flujo B** muestra el ciclo de un mensaje después de que la sesión ya existe.
- **Suscripción Realtime**: se establece al final del Flujo A. Desde ese momento, el widget recibe respuestas del bot sin polling.
- **`IMPORTANTE: JWT válido ≠ tenencia activa`**: incluso con JWT válido, se requiere llamada a `conv-core-validate-identity` para confirmar que el usuario sigue siendo inquilino activo. Este es uno de los errores de implementación más frecuentes.
- **`identity_level`**: el único campo relacionado con identidad que pasa a n8n. `profile_id` y demás campos del resultado de validación quedan en `conv_sessions`.
- **WF-92**: workflow de n8n que inserta la respuesta del bot en `conv_messages`. Supabase Realtime la entrega al widget.
- Los bloques con borde representan comprobaciones que pueden derivar en error HTTP antes de continuar.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-31-webchat-channel.md` §3, §4.1–4.8 | Todas las reglas del canal WebChat |
| `rules-40-identity-validation.md` §4.5 | JWT válido ≠ tenencia activa; llamada obligatoria a `conv-core-validate-identity` |
| `rules-00-scope-and-principles.md` §4.4 | Jerarquía de tres niveles de activación |
| `rules-00-scope-and-principles.md` §4.5 | PII: `profile_id` no sale hacia n8n |
| `contract-identity-validation-result.md` | Estructura de la request y response de `conv-core-validate-identity` |
| `skill-webchat-gateway.md` | Detalles de implementación de `conv-web-session` y `conv-web-message` |
| `skill-integration-api-implementation.md` §6 Paso 1 | Las tres capas de autenticación; distinción entre `session_token` y `service_role` |

## 6. Limitaciones

- El diagrama simplifica el flujo de renovación del `session_token` al mencionar la respuesta HTTP 401 y la renovación transparente, pero no desarrolla ese sub-flujo en detalle.
- No muestra el flujo de identificación progresiva (WF-IDENTITY) que puede activarse durante el procesamiento de un mensaje cuando el servicio requiere mayor nivel de identidad.
- No muestra la lógica interna de WF-10 ni la de los workflows WF-20/30/40.
- No modela el comportamiento del widget cuando el canal está desactivado (HTTP 503) más allá de la mención en el Flujo A.
- No muestra el flujo de envío saliente si Supabase Realtime falla.
- El diagrama abstrae la validación de `allowed_origins` a una comprobación única; la lógica exacta de comparación de origen está en `rules-31-webchat-channel.md` §4.1.
- No cubre la comunicación del widget con la página host mediante `postMessage` (tamaño del iframe, badge de mensajes nuevos).
