# Diagram — Flujo del Servicio de Incidencias (WF-20)

## 1. Propósito

Mostrar el flujo completo del servicio de incidencias en n8n (WF-20): desde la entrada con un determinado `identity_level` hasta la creación de la incidencia oficial, la pre-incidencia, el escalado y la publicación en el activity log del Core. Deja visible qué nivel de identidad autoriza cada acción y qué componente es responsable de cada paso.

## 2. Alcance

Este diagrama es de nivel técnico y de flujo. Cubre WF-20 completo, incluyendo la llamada a `conv-core-create-incident`, el manejo de errores del Core y el sub-workflow WF-IDENTITY. No cubre la lógica interna de `conv-core-validate-identity` ni el panel de administración.

## 3. Diagrama

```
                   ENTRADA A WF-20
                         │
                         │  payload: { session_id, client_account_id,
                         │             message_text, channel, identity_level }
                         │
                         ▼
              ┌──────────────────────────────────────┐
              │  1. Verificar identity_level          │
              └──────────────┬───────────────────────┘
                             │
              ┌──────────────┼───────────────────────────────────────┐
              │              │                                        │
              ▼              ▼                                        ▼
  MATCH_INACTIVE         NO_MATCH                       STRONG o PARTIAL
  o NO_MATCH             (posible flujo progresivo)     MATCH_ACTIVE
  (sin identidad         │                              │
   posible)              │                              │
       │           ┌─────┘                              │
       │           │ Activar WF-IDENTITY                │
       │           │ (recoger full_name,                │
       │           │  residence_name, room_label)       │
       │           │                                    │
       │           │ RESULTADO WF-IDENTITY:             │
       │           ├─► STRONG_MATCH_ACTIVE ────────────►│
       │           ├─► PARTIAL_MATCH_ACTIVE ────────────┤
       │           └─► MATCH_INACTIVE / NO_MATCH (3 fallos)
       │                          │                     │
       ▼                          ▼                     │
  ┌────────────────────────────────────┐                │
  │  ESCALADO INMEDIATO               │                │
  │  conv-escalate-case               │                │
  │                                   │                │
  │  CanonicalResponse:               │                │
  │  { response_type: 'escalated',    │                │
  │    escalation_reason:             │                │
  │    'identity_unresolved' }        │                │
  └────────────────────────────────────┘                │
                                                        │
                    ┌───────────────────────────────────┤
                    │                                   │
                    ▼                                   ▼
          PARTIAL_MATCH_ACTIVE              STRONG_MATCH_ACTIVE
                    │                                   │
                    │                                   │
                    ▼                                   ▼
       ┌─────────────────────────┐         ┌─────────────────────────────────────┐
       │  2. Recoger datos de    │         │  2. Recoger datos de la incidencia  │
       │     la incidencia       │         │                                     │
       └────────────┬────────────┘         │  IA extrae del message_text:        │
                    │                      │  - incident_type                    │
                    │ (mismos pasos)       │    (maintenance/security/noise/     │
                    │                      │     billing/other)                  │
                    ▼                      │  - description                      │
       Si datos incompletos:              │  - urgency (low/medium/high)        │
       CanonicalResponse:                 │                                     │
       { response_type: 'pending_input',  │  Si datos incompletos:              │
         needs_more_input: true,           │  CanonicalResponse:                 │
         next_state: 'waiting_user' }      │  { response_type: 'pending_input',  │
                    │                      │    needs_more_input: true,          │
       Si datos completos:                │    next_state: 'waiting_user' }     │
                    │                      └──────────────────┬──────────────────┘
                    ▼                                         │
       ┌─────────────────────────┐              Si datos completos:
       │  3. PRE-INCIDENCIA       │                           │
       │  (sin llamar al Core)   │                           ▼
       │                         │         ┌─────────────────────────────────────┐
       │  INSERT conv_cases:     │         │  3. EF conv-core-create-incident    │
       │  status='waiting_user'  │         │                                     │
       │                         │         │  WF-20 envía a la EF:               │
       │  CanonicalResponse:     │         │  { session_id, client_account_id,   │
       │  { response_type:       │         │    incident_type, urgency,          │
       │    'pending_input',     │         │    description, source, conv_case_id}│
       │    text: "He registrado │         │                                     │
       │    tu consulta. Para    │         │  EF enriquece internamente:         │
       │    formalizar necesito  │         │  Lee profile_id y room_id de        │
       │    verificar tu         │         │  conv_sessions (con service_role)   │
       │    identidad completa." │         │                                     │
       │    next_state:          │         │  Llama al Core con:                 │
       │    'waiting_user' }     │         │  { client_account_id, profile_id,   │
       └─────────────────────────┘         │    room_id, incident_type, urgency, │
                                           │    description, source, conv_case_id}│
                                           └──────────────────┬──────────────────┘
                                                              │
                                        ┌─────────────────────┼──────────────────────┐
                                        │                     │                      │
                                        ▼                     ▼                      ▼
                              HTTP 2xx (éxito)        HTTP 4xx (error          HTTP 5xx (error
                                        │              no recuperable)          temporal del Core)
                                        │                     │                      │
                                        │              Devolver error          Backoff exponencial:
                                        │              al usuario              1s → 5s → 30s
                                        │              sin reintento           máx. 3 intentos
                                        │              (400/403/404)                 │
                                        │                                     3 fallos → pre-incidencia
                                        │                                     conv_cases waiting_internal
                                        │                                     + conv-escalate-case
                                        │                                           │
                                        │                              CanonicalResponse:
                                        │                              { response_type: 'error_handled',
                                        │                                escalation_reason: 'core_error',
                                        │                                next_state: 'waiting_internal' }
                                        │
                                        ▼
                          ┌─────────────────────────────────────────────────────┐
                          │  4. ÉXITO: incidencia creada en Core                │
                          │                                                     │
                          │  UPDATE conv_cases:                                 │
                          │    case_ref_id = incident_id                        │
                          │    status = 'waiting_internal'                      │
                          │  [caso espera respuesta del equipo de mantenimiento]│
                          │                                                     │
                          │  EF llama a conv-core-publish-activity              │
                          │  { event_type: 'conv_incident_created',             │
                          │    incident_id, session_id, channel }               │
                          │  [fire-and-log: si falla, solo log; sin rollback]   │
                          │                                                     │
                          │  IA genera texto con marcador:                      │
                          │  "Tu incidencia {incident_ref} ha sido registrada." │
                          │  EF sustituye {incident_ref} por INC-2026-NNNN     │
                          │  ANTES de construir la CanonicalResponse            │
                          │                                                     │
                          │  CanonicalResponse:                                 │
                          │  { response_type: 'success',                        │
                          │    text: "Tu incidencia INC-2026-0042 ha sido       │
                          │           registrada. Tiempo estimado: 24h.",       │
                          │    next_state: 'waiting_internal',                  │
                          │    case_ref: 'INC-2026-0042' }                      │
                          └─────────────────────────────────────────────────────┘
```

**Quién decide qué en el flujo de incidencias:**

| Responsabilidad | Componente |
|---|---|
| Nivel de identidad requerido | SmartRoom Core (vía `conv-core-validate-identity`) |
| Flujo de recogida de datos | n8n WF-20 (con extracción por IA) |
| Creación de la incidencia oficial | EF `conv-core-create-incident` (llama al Core con `service_role`) |
| Reintentos ante 5xx del Core | EF `conv-core-create-incident` (backoff en la EF, no en n8n) |
| Creación de pre-incidencia en caso de fallo | EF (no n8n directamente) |
| Sustitución de marcadores `{incident_ref}` | EF (antes de construir `CanonicalResponse`) |
| Publicación en activity log | EF `conv-core-publish-activity` (fire-and-log) |
| Actualización de `conv_cases.status` | EF con `service_role` (n8n no ejecuta `UPDATE`) |

## 4. Notas de lectura

- **Tres ramas principales** según `identity_level`: `MATCH_INACTIVE` / `NO_MATCH` → escalado inmediato; `PARTIAL_MATCH_ACTIVE` → pre-incidencia; `STRONG_MATCH_ACTIVE` → incidencia oficial.
- **WF-IDENTITY** (bloque de la izquierda): sub-workflow que se activa cuando el nivel es `NO_MATCH` y hay posibilidad de identificación progresiva. Si el resultado sigue sin ser suficiente (3 fallos), escala al admin.
- **EF `conv-core-create-incident`**: n8n no llama al Core directamente. Envía el payload a la EF; la EF enriquece internamente leyendo `profile_id` y `room_id` de `conv_sessions` con `service_role`.
- **Backoff exponencial**: los reintentos ante 5xx del Core se gestionan en la EF, no en n8n. WF-20 solo recibe el resultado final.
- **`next_state: 'waiting_internal'`**: el estado tras una incidencia creada con éxito. El caso espera respuesta del equipo de mantenimiento. No es `'resolved'`.
- **Marcadores**: la IA genera `{incident_ref}`; la EF sustituye el valor real antes de construir la `CanonicalResponse`. La IA nunca recibe el número de incidencia real.
- **`conv-core-publish-activity`**: se llama solo después del éxito. Si falla, solo se registra un warning; la incidencia ya fue creada y el usuario ya recibió la confirmación.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-60-service-incidents.md` | Reglas del servicio; `STRONG_MATCH_ACTIVE` obligatorio para incidencia oficial; `next_state = 'waiting_internal'` |
| `rules-40-identity-validation.md` §4.6 | Comportamiento de `conv_incidencias` por nivel de identidad |
| `rules-70-integration-api.md` §4.4 | Campos contractuales de `conv-core-create-incident` |
| `rules-75-activity-log.md` | Evento `conv_incident_created` y reglas fire-and-log |
| `contract-canonical-response.md` | Estructura y valores de `CanonicalResponse` |
| `contract-case-state-machine.md` | Transiciones de `conv_cases.status` durante el flujo |
| `skill-n8n-incidents-workflow.md` | Detalles de implementación de WF-20 y WF-IDENTITY |
| `skill-integration-api-implementation.md` | Backoff exponencial en la EF; fire-and-log de actividad |
| `skill-ai-usage-boundaries.md` §6 Paso 4 | Mecanismo de marcadores; IA no recibe valores reales |

## 6. Limitaciones

- El diagrama simplifica la rama `PARTIAL_MATCH_ACTIVE`: no desarrolla en detalle el flujo de espera de mejora de identidad posterior.
- No muestra el flujo completo de WF-IDENTITY (se abstrae en un bloque); el detalle está en `diagram-identity-validation-flow.md`.
- No muestra el ciclo de respuesta del admin cuando el caso está en `waiting_internal` y el equipo de mantenimiento responde.
- Los códigos HTTP de error del Core (400, 403, 404, 422) se agrupan en "HTTP 4xx" por simplicidad; el comportamiento exacto de cada uno está en `rules-70-integration-api.md`.
- El diagrama no cubre el flujo del job de reconciliación `WF-C00-RECONCILE` ni el cierre automático de casos.
- No muestra el mecanismo de `conv_send_queue` para reintentos de entrega del mensaje de confirmación al usuario.
