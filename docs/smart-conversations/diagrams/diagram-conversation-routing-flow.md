# Diagram — Flujo de Enrutado Conversacional (WF-10)

## 1. Propósito

Mostrar la lógica de decisión de WF-10, el enrutador central de SmartConversations. Ilustra cómo se determina hacia qué workflow de servicio enviar un mensaje, cómo se gestiona el cambio de contexto cuando hay casos abiertos, y qué campos de `conv_sessions` dirigen las decisiones de enrutado.

## 2. Alcance

Este diagrama es de nivel lógico y de flujo. Cubre la lógica interna de WF-10 desde que recibe el payload de WF-01 hasta que invoca WF-20, WF-30 o WF-40. No cubre la lógica interna de los workflows de servicio.

## 3. Diagrama

```
                    ENTRADA A WF-10
                         │
                         │  payload: { session_id, client_account_id,
                         │             message_text, channel, identity_level }
                         │
                         ▼
              ┌──────────────────────────┐
              │  1. Leer TenantFeaturesResponse    │
              │  POST conv-core-get-tenant-features│
              │  { client_account_id }             │
              │                                    │
              │  [obligatorio en cada ejecución;   │
              │   sin caché entre ejecuciones]      │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │  services_active = [] ?          │
              └──────────────┬───────────────────┘
                     SÍ      │       NO
                     │       │
                     ▼       │
          Responder al usuario│
          "servicio no disponible"
          → CanonicalResponse │
            { response_type: │
              'no_service' } │
          → FIN              │
                             ▼
              ┌──────────────────────────────────┐
              │  2. ¿Hay casos abiertos en        │
              │     conv_cases.status IN          │
              │     ('open', 'waiting_user')      │
              │     para esta session_id?         │
              └──────────────┬───────────────────┘
                     NO      │       SÍ
                     │       │       │
                     │       │       ▼
                     │       │  ┌─────────────────────────────────────────┐
                     │       │  │  3a. Clasificar intención con IA         │
                     │       │  │  ¿El mensaje continúa el caso activo     │
                     │       │  │  o introduce un tema nuevo?              │
                     │       │  │                                          │
                     │       │  │  Contexto al prompt de IA:              │
                     │       │  │  - message_text                          │
                     │       │  │  - service_code del caso activo          │
                     │       │  │  - case_ref (referencia del caso)        │
                     │       │  │  [SIN nombre, teléfono, habitación]      │
                     │       │  └──────────────┬──────────────────────────┘
                     │       │                 │
                     │       │    "continúa"   │   "tema nuevo"
                     │       │    confidence   │   confidence
                     │       │    ≥ 0.85       │   < 0.85 o distinto
                     │       │         │       │       │
                     │       │         ▼       │       ▼
                     │       │  Llamar al WF   │  Preguntar al usuario
                     │       │  del servicio   │  "Tienes un caso abierto.
                     │       │  activo         │   ¿Continúas o prefieres
                     │       │  (sin menú)     │   consultar X?"
                     │       │    │            │       │
                     │       │    │            │   usuario confirma cambio
                     │       │    │            │       │
                     │       │    │            │   EF actualiza
                     │       │    │            │   active_service_code
                     │       │    │            │   [solo tras confirmación]
                     │       │    │            │       │
                     │       │    │            │       │
                     │       │    └────────────┘       │
                     │       │         │               │
                     │       └─────────┘               │
                     │                                 │
                     ▼                                 │
              ┌──────────────────────────────────┐     │
              │  3b. Clasificar intención con IA  │     │
              │                                   │     │
              │  Prompt (sin PII):                │     │
              │  - message_text                   │     │
              │  - lista de service_code activos  │     │
              │    para este tenant y canal        │     │
              │                                   │     │
              │  Resultado: { service_code,       │     │
              │               confidence }        │     │
              └──────────────┬────────────────────┘     │
                             │                          │
                             ▼                          │
              ┌──────────────────────────────────┐      │
              │  service_code en services_active? │      │
              └──────────────┬───────────────────┘      │
                     NO      │     SÍ                   │
                     │       │                          │
                     ▼       │                          │
           confidence = 0    │                          │
           (tratar como      │                          │
            ambiguo)         │                          │
                     │       │                          │
                     └───────►                          │
                             │                          │
                             ▼                          │
              ┌──────────────────────────────────┐      │
              │  confidence ≥ 0.85 ?             │      │
              └──────────────┬───────────────────┘      │
                     NO      │     SÍ                   │
                     │       │     │                    │
                     │       │     ▼                    │
                     │       │  ENRUTADO DIRECTO        │
                     │       │  EF actualiza            │
                     │       │  active_service_code     │
                     │       │  Llamar WF-20/30/40      │
                     │       │  (sin menú)              │
                     │       │    │                     │
                     ▼       │    │                     │
              ┌──────────────────────────────────┐      │
              │  ¿Cuántos servicios activos?      │      │
              └──────────────┬───────────────────┘      │
              exactamente 1  │   más de 1               │
                     │       │       │                  │
                     ▼       │       ▼                  │
         ENRUTADO DIRECTO    │  PRESENTAR MENÚ          │
         sin menú            │  dinámico:               │
         (la falta de        │  - una opción por        │
          confianza es       │    service_code activo   │
          irrelevante        │  - si hay caso abierto:  │
          con 1 servicio)    │    opción "volver al     │
                     │       │    caso pendiente"       │
                     │       │       │                  │
                     └───────┘       │                  │
                             │       │                  │
                             ▼       ▼                  │
                        ┌──────────────────────┐        │
                        │  WF-20 / WF-30 / WF-40        │
                        │  según service_code elegido   │
                        │                              │
                        │  Payload a WF:              │
                        │  { session_id,               │
                        │    client_account_id,        │
                        │    message_text,             │
                        │    channel,                  │
                        │    identity_level,           │
                        │    service_code }            │
                        │  [SIN profile_id, phone, etc]│
                        └──────────────────────────────┘
                                        │
                                        ▼
                              CanonicalResponse
                              { response_type, text,
                                next_state, ... }
                                        │
                        ┌───────────────┴───────────────┐
                        │  Actuar según response_type   │
                        │                               │
                        │  'success'        → entregar text al canal
                        │  'pending_input'  → entregar text; EF → conv_cases waiting_user
                        │  'escalated'      → notificar admin; entregar text
                        │  'identity_required' → activar WF-IDENTITY
                        │  'error_handled'  → entregar text genérico; EF → waiting_internal
                        │  'no_service'     → responder: servicio no disponible
                        └───────────────────────────────┘
```

**Campos de `conv_sessions` que dirigen las decisiones de WF-10:**

| Campo | Rol en el enrutado |
|---|---|
| `active_case_id` | Apunta al caso que WF-10 considera activo; solo se cambia con confirmación explícita del usuario |
| `active_service_code` | Servicio que gestiona la sesión actualmente; permite continuar el caso sin reclasificar |
| `open_cases_ids` | Lista de todos los casos abiertos; permite mostrar la opción "volver al caso pendiente" en el menú |
| `identity_level` | Determina qué servicios pueden crear registros en el Core; WF-10 lo pasa a los workflows de servicio |
| `state` | WF-10 no lo modifica; lo leen las EFs invocadas desde los workflows de servicio |

## 4. Notas de lectura

- **Flujo de arriba abajo**: la entrada es un mensaje de usuario; la salida es la invocación del workflow de servicio correcto.
- **Bloques con borde `┌──┐`**: puntos de decisión o comprobaciones con ramificaciones.
- **`TenantFeaturesResponse`**: se lee al inicio de cada ejecución de WF-10, sin caché. Cualquier cambio de configuración del tenant se refleja en la siguiente ejecución.
- **Threshold de confianza 0.85**: valor por defecto configurable por tenant. Por debajo → menú (si hay más de un servicio activo). Por encima → enrutado directo.
- **Cambio de contexto con confirmación**: cuando hay un caso abierto y el mensaje introduce un tema nuevo, WF-10 siempre pregunta al usuario antes de actualizar `active_service_code`. Nunca lo cambia de forma especulativa.
- **El menú es dinámico**: se construye desde `TenantFeaturesResponse.services_active`. Solo muestra servicios contratados y activos para ese tenant y canal. No se hardcodea.
- **n8n no ejecuta `UPDATE`** sobre `conv_sessions` ni `conv_cases`. Los cambios de estado los ejecutan las EFs con `service_role`.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-50-conversation-routing.md` | Fuente de verdad del motor de enrutado; threshold de confianza, reglas de menú |
| `contract-tenant-features-response.md` | Estructura de `TenantFeaturesResponse`; `services_active`, `plan_limits` |
| `contract-canonical-response.md` | Estructura de la `CanonicalResponse` y valores de `response_type` |
| `contract-case-state-machine.md` | Estados de `conv_sessions` y `conv_cases`; qué lee WF-10 |
| `rules-00-scope-and-principles.md` §4.5 | Payload a n8n sin PII |
| `skill-n8n-conversation-engine.md` | Detalles de implementación de WF-10 |
| `skill-ai-usage-boundaries.md` §6 Paso 2 | Prompt de clasificación de intención sin PII |

## 6. Limitaciones

- El diagrama abstrae la lógica interna de los workflows de servicio (WF-20/30/40). Cada uno tiene su propio diagrama.
- No muestra el sub-workflow WF-IDENTITY (identificación progresiva) que puede activarse cuando `response_type = 'identity_required'`.
- No muestra el flujo de `ai_enabled = false` (formulario guiado en lugar de IA); se menciona en las notas pero no se desarrolla visualmente.
- El threshold de confianza (0.85) puede variar por tenant; el diagrama muestra el valor por defecto.
- No muestra el job de reconciliación `WF-C00-RECONCILE` ni las transiciones automáticas de estado (IDLE, EXPIRED).
- El diagrama simplifica el caso de múltiples casos abiertos simultáneos; solo se muestra la ramificación "hay caso activo sí/no".
