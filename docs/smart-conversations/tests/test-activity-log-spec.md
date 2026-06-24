# test-activity-log-spec.md — Especificación de Pruebas: Activity Log del Core

## 1. Objetivo

Verificar que los eventos del catálogo de activity log del Core (definido en `rules-75-activity-log.md`) se publican correctamente: publicación exclusivamente desde las EFs del add-on (nunca desde n8n), semántica fire-and-log (sin rollback ante fallo), ausencia de PII en los eventos, unicidad de `conv_conversation_started` por sesión, y la correcta separación entre el log técnico del add-on y el activity log del Core.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Los eventos del catálogo de activity log según `rules-75` | Lógica interna del Core para procesar los eventos |
| Semántica fire-and-log (sin rollback) | Panel de administración del activity log |
| Restricciones de PII en eventos | Logs técnicos internos del add-on (tabla separada) |
| Unicidad de `conv_conversation_started` por sesión | Retención de datos del activity log en el Core |
| Publicación solo desde EFs (nunca desde n8n) | |
| Distinción log técnico del add-on vs. activity log del Core | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-75-activity-log.md` | §4.1 | Catálogo de eventos obligatorios y cuándo se publican |
| `rules-75-activity-log.md` | §4.2 | Publicación solo desde EFs con `service_role`; nunca desde n8n |
| `rules-75-activity-log.md` | §4.3 | Semántica fire-and-log: fallo de publicación no hace rollback |
| `rules-75-activity-log.md` | §4.4 | Restricciones de PII en los campos de los eventos |
| `rules-75-activity-log.md` | §4.5 | `conv_conversation_started` publicado máximo una vez por sesión |
| `rules-80-data-and-privacy.md` | §4.5 | Audit log nunca incluye PII del inquilino |
| `rules-90-observability-and-failure-handling.md` | §4.9 | Audit log de operaciones con impacto en Core |

---

## 4. Precondiciones

- `conv-core-publish-activity` disponible y simulable (éxito, timeout, error 5xx).
- Sesión válida en `conv_sessions` para cada escenario.
- Los flujos previos (creación de incidencia, lead, caso de ayuda) disponibles para simular el trigger de cada evento.
- Acceso al log técnico del add-on para verificar eventos registrados.

---

## 5. Escenarios de Prueba

### Bloque LOG — Eventos obligatorios del catálogo (rules-75)

**LOG-01: `conv_conversation_started` publicado al inicio de una sesión nueva**

- **Precondición**: Nueva sesión creada en `conv_sessions` (estado `NEW`). No hay registro previo de este `session_id` en el activity log.
- **Acción**: `conv-ingest` o `conv-web-session` activa la publicación.
- **Resultado esperado**:
  - `conv-core-publish-activity` llamado con `{ event_type: 'conv_conversation_started', session_id, client_account_id, channel }`.
  - Campos ausentes del payload: `full_name`, `phone_number`, `room_label`, `profile_id`.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-02: `conv_conversation_started` publicado máximo una vez por sesión**

- **Precondición**: Sesión con `conv_conversation_started` ya publicado previamente. La sesión pasa por IDLE y se reactiva.
- **Acción**: El usuario envía un nuevo mensaje; la sesión se reactiva.
- **Resultado esperado**:
  - `conv_conversation_started` **no** se publica de nuevo.
  - La sesión se reactiva sin duplicar el evento.
- **Regla cubierta**: `rules-75` §4.5.

---

**LOG-03: `conv_identity_validated` publicado tras validación exitosa con nivel suficiente**

- **Precondición**: `conv-core-validate-identity` devuelve `STRONG_MATCH_ACTIVE` o `PARTIAL_MATCH_ACTIVE`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_identity_validated', session_id, client_account_id, identity_level }`.
  - No se publica si el resultado es `NO_MATCH` o `MATCH_INACTIVE`.
  - Campos ausentes: `profile_id`, `phone_number`, `full_name`.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-04: `conv_pre_incident_created` publicado al crear pre-incidencia (`PARTIAL_MATCH_ACTIVE`)**

- **Precondición**: WF-20 crea pre-incidencia para `PARTIAL_MATCH_ACTIVE`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_pre_incident_created', session_id, client_account_id, conv_case_id }`.
  - Campos ausentes: `profile_id`, `description` de la incidencia (texto bruto).
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-05: `conv_incident_created` publicado tras incidencia oficial creada en Core**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 201 con `incident_id`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_incident_created', incident_id, incident_ref, conv_case_id, channel, incident_type, urgency }`.
  - Se publica **después** de que la incidencia fue creada con éxito.
  - Campos ausentes: `session_id`, `full_name`, `phone_number`, `room_label`, texto de la descripción.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-06: `conv_lead_created` publicado tras lead creado en Core**

- **Precondición**: `conv-core-create-lead` devuelve HTTP 201 con `lead_id`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_lead_created', lead_id, lead_ref, listing_id, conv_case_id, channel, interest_type }`.
  - Campos ausentes: `session_id`, `name`, `phone`, `email` del contacto del lead.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-07: `conv_help_escalated` publicado cuando WF-40 escala por KB insuficiente**

- **Precondición**: KB devuelve `confidence < 0.8`; WF-40 invoca `conv-escalate-case`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_help_escalated', session_id, client_account_id, conv_case_id, escalation_reason }`.
  - `escalation_reason` es un enum, no texto libre del usuario.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-08: `conv_case_summary_updated` publicado cuando el admin actualiza el resumen del caso**

- **Precondición**: Admin actualiza el resumen de un caso abierto en el panel.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_case_summary_updated', conv_case_id, client_account_id, updated_by }`.
  - El payload puede incluir un resumen funcional anónimo del caso si `rules-75` lo permite. Campos ausentes en cualquier caso: texto bruto de los mensajes del usuario, datos personales del inquilino (`full_name`, `phone_number`, `room_label`).
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-09: `conv_case_closed` publicado al cerrar un caso**

- **Precondición**: Admin o EF cierra un caso (`conv_cases.status = 'closed'`).
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_case_closed', conv_case_id, client_account_id, resolution_channel }`.
  - `resolution_channel` indica si fue cerrado via WhatsApp, WebChat o panel admin.
  - Campos ausentes: PII del inquilino.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-9a: `conv_case_created` publicado al crear un nuevo caso**

- **Precondición**: EF crea un nuevo registro en `conv_cases` (inicio de flujo de incidencias, lead o ayuda).
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_case_created', conv_case_id, client_account_id, channel, case_ref_type }`.
  - Se publica **después** de que el INSERT en `conv_cases` sea exitoso.
  - Campos ausentes: `session_id`, `profile_id`, `full_name`, texto libre del usuario.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

**LOG-9b: `conv_message_delivery_failed` publicado tras fallo definitivo de entrega**

- **Precondición**: `conv_send_queue` agota `max_retries = 3`; `conv_messages.status = 'failed'`.
- **Resultado esperado**:
  - EF publica `{ event_type: 'conv_message_delivery_failed', conv_case_id, client_account_id, channel }`.
  - Se publica **después** de que el estado `'failed'` se persiste en `conv_messages`.
  - Campos ausentes: texto del mensaje, `phone_number`, datos personales del destinatario.
- **Regla cubierta**: `rules-75` §4.1; §4.4.

---

### Bloque LOG — Semántica fire-and-log

**LOG-10: Fallo de `conv-core-publish-activity` no hace rollback de la operación principal**

- **Precondición**: `conv-core-create-incident` exitoso (HTTP 201). `conv-core-publish-activity` devuelve HTTP 500.
- **Resultado esperado**:
  - Incidencia creada en el Core permanece intacta.
  - `conv_cases.status = 'waiting_internal'`.
  - El usuario recibe confirmación con `incident_ref`.
  - Warning registrado en log técnico del add-on: "Fallo al publicar conv_incident_created".
  - Sin rollback de ninguna operación.
- **Regla cubierta**: `rules-75` §4.3; `rules-90` §3.4.

---

**LOG-11: Timeout de `conv-core-publish-activity` → solo log, sin reintento obligatorio**

- **Precondición**: `conv-core-publish-activity` no responde en el tiempo máximo.
- **Resultado esperado**:
  - La operación principal ya se completó.
  - El timeout se registra como warning.
  - La operación principal (incidencia, lead, etc.) no se deshace.
- **Regla cubierta**: `rules-75` §4.3.

---

### Bloque LOG — Responsabilidad: solo EFs, nunca n8n

**LOG-12: n8n nunca llama directamente a `conv-core-publish-activity`**

- **Precondición**: WF-20 completa el flujo de incidencias exitosamente.
- **Resultado esperado**:
  - La llamada a `conv-core-publish-activity` se origina desde una EF del add-on.
  - No hay ningún nodo en WF-20 que llame directamente a `conv-core-publish-activity` con credenciales de n8n.
- **Regla cubierta**: `rules-75` §4.2.

---

### Bloque LOG — Separación de logs

**LOG-13: Log técnico del add-on ≠ activity log del Core**

- **Precondición**: Fallo de EF durante el flujo de incidencias.
- **Resultado esperado**:
  - El fallo técnico se registra en el **log técnico del add-on** (tabla interna o logs de Supabase).
  - El **activity log del Core** (vía `conv-core-publish-activity`) solo registra hitos funcionales.
  - El error técnico (código HTTP, stack trace) nunca llega al activity log del Core.
- **Regla cubierta**: `rules-75` §4.1 — distinción explícita entre ambos sistemas.

---

**LOG-14: Audit log registra eventos sin PII del inquilino**

- **Precondición**: Incidencia oficial creada exitosamente.
- **Resultado esperado**:
  - Registro en audit log del add-on: `{ conv_case_id, incident_ref, client_account_id, timestamp }`.
  - Campos ausentes: `profile_id`, `phone_number`, `full_name`, `room_label`, texto de la descripción de la incidencia.
- **Regla cubierta**: `rules-80` §4.5; `rules-90` §4.9.

---

**LOG-15: `conv-core-publish-activity` publicado con `service_role`, nunca con token del widget**

- **Precondición**: EF del add-on invoca `conv-core-publish-activity` tras crear lead.
- **Resultado esperado**:
  - La llamada lleva `Authorization: Bearer <service_role_key>` en el header.
  - El `session_token` del widget no se usa en esta llamada.
- **Regla cubierta**: `rules-75` §4.2; `diagram-integration-api-boundary.md` Capa C.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| LOG-NEG-01 | n8n llama directamente a `conv-core-publish-activity` | Violación de `rules-75` §4.2; solo las EFs pueden publicar |
| LOG-NEG-02 | `conv_conversation_started` publicado dos veces para la misma sesión | Violación de `rules-75` §4.5; máximo una vez por sesión |
| LOG-NEG-03 | Evento de activity log incluye `phone_number` del inquilino | Violación de `rules-75` §4.4; campo prohibido en eventos |
| LOG-NEG-04 | Rollback de incidencia creada porque la publicación del activity log falló | Violación de `rules-75` §4.3; semántica fire-and-log |
| LOG-NEG-05 | Descripción de incidencia en texto bruto incluida en el payload del evento | Violación de `rules-75` §4.4; el activity log no recibe texto de mensajes |
| LOG-NEG-06 | Fallo técnico de EF registrado en el activity log del Core en lugar del log técnico del add-on | Violación de la separación de responsabilidades entre los dos sistemas de log |

---

## 7. Datos de Prueba

```json
{
  "events": {
    "conversation_started": {
      "event_type": "conv_conversation_started",
      "session_id": "sess-log-001",
      "client_account_id": "tenant-log-001",
      "channel": "whatsapp"
    },
    "identity_validated": {
      "event_type": "conv_identity_validated",
      "session_id": "sess-log-001",
      "client_account_id": "tenant-log-001",
      "identity_level": "STRONG_MATCH_ACTIVE"
    },
    "incident_created": {
      "event_type": "conv_incident_created",
      "incident_id": "inc-uuid-001",
      "incident_ref": "INC-2026-0042",
      "conv_case_id": "case-uuid-001",
      "channel": "whatsapp",
      "incident_type": "maintenance",
      "urgency": "medium"
    },
    "lead_created": {
      "event_type": "conv_lead_created",
      "lead_id": "lead-uuid-001",
      "lead_ref": "LEAD-2026-0015",
      "listing_id": "listing-001",
      "conv_case_id": "case-uuid-002",
      "channel": "webchat",
      "interest_type": "immediate"
    }
  },
  "publish_activity_responses": {
    "success_200": { "status": 200 },
    "error_500": { "status": 500, "error": "internal_error" },
    "timeout": null
  },
  "prohibited_fields_in_events": [
    "full_name", "phone_number", "room_label", "profile_id",
    "assignment_id", "message_text", "description"
  ]
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| Los eventos del catálogo publicados en los momentos correctos | Verificación de cada evento tras completar su flujo correspondiente |
| `conv_conversation_started` publicado ≤ 1 vez por sesión | No aparece duplicado en el activity log del Core |
| Publicación solo desde EFs | Ningún nodo de n8n contiene llamada a `conv-core-publish-activity` |
| Fire-and-log respetado | Fallo de publicación en 10 escenarios: 0 rollbacks de operación principal |
| Sin PII en eventos | Revisión de todos los payloads de eventos: campos prohibidos ausentes |
| Separación log técnico vs. activity log | Errores técnicos nunca llegan al activity log del Core |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-75-activity-log.md` | Fuente de verdad completa de este spec |
| `rules-80-data-and-privacy.md` §4.5 | Restricciones de PII en el audit log |
| `rules-90-observability-and-failure-handling.md` §4.9 | Audit log de operaciones con impacto en Core |
| `rules-60-service-incidents.md` | Trigger de `conv_incident_created` |
| `rules-61-service-listings.md` | Trigger de `conv_lead_created` |
| `rules-62-service-help.md` | Trigger de `conv_help_escalated` |
| `diagram-integration-api-boundary.md` | Capas de autenticación para `conv-core-publish-activity` |
