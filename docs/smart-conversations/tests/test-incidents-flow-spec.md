# test-incidents-flow-spec.md — Especificación de Pruebas: Flujo del Servicio de Incidencias (WF-20)

## 1. Objetivo

Verificar que WF-20 gestiona el ciclo completo de creación de incidencias según `rules-60-service-incidents.md`: las tres ramas de identidad (`STRONG_MATCH_ACTIVE`, `PARTIAL_MATCH_ACTIVE`, `MATCH_INACTIVE`/`NO_MATCH`), la llamada a `conv-core-create-incident`, el backoff exponencial ante errores 5xx del Core, el mecanismo de marcadores de la IA, y el `next_state = 'waiting_internal'` tras éxito.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Las tres ramas de identidad en WF-20 | Lógica interna del Core para crear incidencias |
| Pre-incidencia para `PARTIAL_MATCH_ACTIVE` | WF-IDENTITY (cubierto en `test-identity-validation-spec.md`) |
| Escalado para `MATCH_INACTIVE` | Panel de administración de incidencias |
| Flujo WF-IDENTITY para `NO_MATCH` antes de escalar | |
| EF `conv-core-create-incident`: enriquecimiento y llamada al Core | Respuesta del equipo de mantenimiento |
| Backoff exponencial 1s→5s→30s, máx. 3 intentos | Job de reconciliación `WF-C00-RECONCILE` |
| Mecanismo de marcadores `{incident_ref}` | |
| `next_state = 'waiting_internal'` tras incidencia creada | |
| `conv-core-publish-activity` fire-and-log | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-60-service-incidents.md` | §4.1 | `STRONG_MATCH_ACTIVE` requerido para incidencia oficial |
| `rules-60-service-incidents.md` | §4.2 | `PARTIAL_MATCH_ACTIVE` → pre-incidencia en `conv_cases` |
| `rules-60-service-incidents.md` | §4.3 | `MATCH_INACTIVE` → escalado inmediato; `NO_MATCH` → activar WF-IDENTITY si hay intentos disponibles |
| `rules-60-service-incidents.md` | §4.4 | `next_state = 'waiting_internal'` tras incidencia creada |
| `rules-60-service-incidents.md` | §4.5 | Backoff exponencial 1s→5s→30s, máx. 3 intentos ante 5xx |
| `rules-70-integration-api.md` | §4.4 | Campos contractuales de `conv-core-create-incident` |
| `rules-90-observability-and-failure-handling.md` | §4.5 | Tratamiento de errores HTTP del Core (400/403/404/422/5xx) |
| `rules-80-data-and-privacy.md` | §4.2 | Mecanismo de marcadores: IA genera `{incident_ref}`, EF sustituye |
| `rules-75-activity-log.md` | §4.3 | Publicación fire-and-log de `conv_incident_created` |
| `contract-canonical-response.md` | §3 | `CanonicalResponse` con `response_type: 'success'` y `case_ref` |
| `contract-case-state-machine.md` | §4 | Transiciones de `conv_cases.status` en el flujo |

---

## 4. Precondiciones

- Tenant con `conv_incidencias` activo en `conv_service_activations` para el canal bajo prueba.
- `conv-core-create-incident` simulable para devolver éxito y errores HTTP específicos.
- `conv-core-publish-activity` disponible (puede simularse con latencia o fallo).
- `conv_sessions` con el `identity_level` apropiado para cada rama de prueba.

---

## 5. Escenarios de Prueba

### Bloque INC — Rama `STRONG_MATCH_ACTIVE`

**INC-01: Incidencia oficial creada con éxito → `waiting_internal`**

- **Precondición**: `identity_level = 'STRONG_MATCH_ACTIVE'`. Datos completos extraídos por IA: `incident_type = 'maintenance'`, `urgency = 'medium'`, descripción proporcionada.
- **Acción**: WF-20 llama a EF `conv-core-create-incident`.
- **Resultado esperado**:
  - EF lee `profile_id` y `room_id` de `conv_sessions` internamente (no desde n8n).
  - EF llama al Core con `{ client_account_id, profile_id, room_id, incident_type, urgency, description, source, conv_case_id }`.
  - Core devuelve HTTP 201 con `incident_ref = 'INC-2026-0042'`.
  - `conv_cases.status` actualizado a `'waiting_internal'`.
  - `conv_cases.case_ref` = `'INC-2026-0042'`.
  - `CanonicalResponse { response_type: 'success', text: "Tu incidencia INC-2026-0042 ha sido registrada.", next_state: 'waiting_internal', case_ref: 'INC-2026-0042' }`.
- **Regla cubierta**: `rules-60` §4.1; `rules-60` §4.4.

---

**INC-02: IA genera marcador `{incident_ref}`; EF sustituye antes de construir `CanonicalResponse`**

- **Precondición**: Estado de INC-01. IA devuelve texto con marcador.
- **Resultado esperado**:
  - Texto generado por IA: `"Tu incidencia {incident_ref} ha sido registrada. Tiempo estimado: 24h."`.
  - EF sustituye `{incident_ref}` por `'INC-2026-0042'` **antes** de construir la `CanonicalResponse`.
  - El usuario recibe: `"Tu incidencia INC-2026-0042 ha sido registrada. Tiempo estimado: 24h."`.
  - La IA nunca recibe el número de incidencia real en su prompt.
- **Regla cubierta**: `rules-80` §4.2.

---

**INC-03: n8n envía payload a EF sin `profile_id` ni `phone_number`**

- **Precondición**: WF-20 enviando payload a `conv-core-create-incident`.
- **Resultado esperado**:
  - Payload de WF-20 a la EF: `{ session_id, client_account_id, incident_type, urgency, description, source, conv_case_id }`.
  - Campos ausentes: `profile_id`, `phone_number`, `full_name`, `room_label`.
  - La EF recupera `profile_id` y `room_id` internamente desde `conv_sessions`.
- **Regla cubierta**: `rules-80` §4.1; `rules-00` §4.5.

---

**INC-04: Datos de incidencia incompletos → `pending_input`, estado `waiting_user`**

- **Precondición**: `identity_level = 'STRONG_MATCH_ACTIVE'`. IA no puede extraer `incident_type` del mensaje.
- **Resultado esperado**:
  - WF-20 devuelve `CanonicalResponse { response_type: 'pending_input', needs_more_input: true, next_state: 'waiting_user' }`.
  - `conv_cases.status = 'waiting_user'`.
  - No se llama a `conv-core-create-incident` hasta tener datos completos.
- **Regla cubierta**: `rules-60` §4.1.

---

### Bloque INC — Rama `PARTIAL_MATCH_ACTIVE`

**INC-05: `PARTIAL_MATCH_ACTIVE` → pre-incidencia en `conv_cases`, sin llamar al Core**

- **Precondición**: `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Datos de incidencia completos.
- **Resultado esperado**:
  - EF inserta caso en `conv_cases` con `status = 'open'` (la pre-incidencia nace en estado abierto).
  - `conv-core-create-incident` **no** se llama.
  - `CanonicalResponse { response_type: 'pending_input', text: "He registrado tu consulta. Para formalizar necesito verificar tu identidad completa.", next_state: 'waiting_user' }`.
- **Regla cubierta**: `rules-60` §4.2.

---

### Bloque INC — Rama `MATCH_INACTIVE` / `NO_MATCH`

**INC-06: `MATCH_INACTIVE` → escalado inmediato a admin**

- **Precondición**: `identity_level = 'MATCH_INACTIVE'`.
- **Resultado esperado**:
  - `conv-escalate-case` invocado.
  - `CanonicalResponse { response_type: 'escalated', escalation_reason: 'identity_unresolved' }`.
  - No se crea caso en `conv_cases`.
  - No se llama a `conv-core-create-incident`.
- **Regla cubierta**: `rules-60` §4.3.

---

**INC-07: `NO_MATCH` con flujo progresivo fallido (3 intentos) → escalado**

- **Precondición**: `identity_level = 'NO_MATCH'`. WF-IDENTITY ha agotado los 3 intentos.
- **Resultado esperado**:
  - `conv-escalate-case` invocado.
  - `CanonicalResponse { response_type: 'escalated', escalation_reason: 'identity_unresolved' }`.
- **Regla cubierta**: `rules-60` §4.3; `rules-40` §4.4.

---

### Bloque INC — Gestión de errores del Core

**INC-08: Core devuelve HTTP 5xx → backoff exponencial, 3 intentos**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 503 en los 3 intentos.
- **Resultado esperado**:
  - EF reintenta con intervalos 1s → 5s → 30s.
  - Tras 3 fallos: pre-incidencia guardada en `conv_cases` con `status = 'waiting_internal'`.
  - `conv-escalate-case` invocado.
  - `CanonicalResponse { response_type: 'error_handled', escalation_reason: 'core_error', next_state: 'waiting_internal' }`.
  - El usuario recibe: "Tu solicitud ha sido recibida. Un miembro del equipo te confirmará los detalles en breve."
  - El error técnico (HTTP 503) nunca llega al usuario.
- **Regla cubierta**: `rules-60` §4.5; `rules-90` §4.5.

---

**INC-09: Core devuelve HTTP 5xx en primer intento, éxito en segundo → incidencia creada**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 503 en el intento 1, HTTP 201 en el intento 2.
- **Resultado esperado**:
  - EF reintenta tras 1s.
  - Segundo intento exitoso.
  - Incidencia creada; `conv_cases.status = 'waiting_internal'`.
  - `CanonicalResponse { response_type: 'success' }`.
- **Regla cubierta**: `rules-90` §4.5.

---

**INC-10: Core devuelve HTTP 400 → sin reintento, escalado a admin**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 400 (request inválido).
- **Resultado esperado**:
  - La EF **no** reintenta.
  - El payload de error se registra en logs (sin PII).
  - `conv-escalate-case` invocado.
  - Usuario recibe mensaje genérico de escalado.
- **Regla cubierta**: `rules-90` §4.5.

---

**INC-11: Core devuelve HTTP 403 → verificar suscripción umbrella, escalar**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 403.
- **Resultado esperado**:
  - La EF no reintenta.
  - Se verifica el estado de la suscripción umbrella.
  - Escalado a admin.
- **Regla cubierta**: `rules-90` §4.5.

---

**INC-12: Core devuelve HTTP 404 → sin reintento, escalado con contexto**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 404 (recurso no encontrado).
- **Resultado esperado**:
  - Sin reintento.
  - Escalado con contexto del caso.
  - Usuario recibe mensaje genérico.
- **Regla cubierta**: `rules-90` §4.5.

---

### Bloque INC — Activity log

**INC-13: `conv_incident_created` publicado en activity log tras éxito**

- **Precondición**: Incidencia creada con éxito (estado de INC-01).
- **Resultado esperado**:
  - EF llama a `conv-core-publish-activity` con `{ event_type: 'conv_incident_created', incident_id, incident_ref, conv_case_id, channel, incident_type, urgency }`.
  - Si la publicación falla, solo se registra warning en logs del add-on.
  - La incidencia ya creada **no** hace rollback por fallo del activity log.
- **Regla cubierta**: `rules-75` §4.3; `rules-90` §4.1.

---

**INC-14: Fallo de `conv-core-publish-activity` no hace rollback de la incidencia**

- **Precondición**: `conv-core-create-incident` exitoso (HTTP 201). `conv-core-publish-activity` devuelve HTTP 500.
- **Resultado esperado**:
  - La incidencia sigue creada en el Core.
  - `conv_cases.status = 'waiting_internal'`.
  - El usuario recibe la confirmación correcta con `incident_ref`.
  - Se registra warning en logs del add-on.
  - Sin rollback de ninguna operación.
- **Regla cubierta**: `rules-75` §4.4; `rules-90` §3.4.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| INC-NEG-01 | n8n llama directamente a `conv-core-create-incident` con `profile_id` en el payload | Violación de `rules-80` §4.1; el campo no debe estar en el payload de n8n |
| INC-NEG-02 | EF sustituye `{incident_ref}` **antes** de enviar texto a la IA | Violación de `rules-80` §4.2; la sustitución debe ocurrir **después** de la generación por IA |
| INC-NEG-03 | `conv_cases.status = 'resolved'` tras incidencia creada (en lugar de `'waiting_internal'`) | Violación de `rules-60` §4.4; el estado correcto es `'waiting_internal'` |
| INC-NEG-04 | EF realiza 4 o más reintentos ante HTTP 5xx del Core | Violación de `rules-90` §4.5; máximo 3 intentos |
| INC-NEG-05 | El usuario recibe código HTTP 503 en el mensaje de error | Violación de `rules-90` §3.1; mensajes técnicos nunca al usuario |
| INC-NEG-06 | `conv-core-create-incident` llamado con `identity_level = 'PARTIAL_MATCH_ACTIVE'` | Violación de `rules-60` §4.1; requiere `STRONG_MATCH_ACTIVE` |
| INC-NEG-07 | Fallo del activity log cancela la creación de incidencia ya completada | Violación de `rules-75` §4.4; semántica fire-and-log |

---

## 7. Datos de Prueba

```json
{
  "incidents": {
    "complete_maintenance": {
      "incident_type": "maintenance",
      "urgency": "medium",
      "description": "Gotera en el techo de la habitación, lleva 2 días.",
      "source": "whatsapp"
    },
    "complete_security": {
      "incident_type": "security",
      "urgency": "high",
      "description": "Puerta de entrada no cierra correctamente.",
      "source": "webchat"
    },
    "incomplete_no_type": {
      "description": "Hay un problema pero no sé cómo describir el tipo."
    }
  },
  "core_responses": {
    "success_201": { "status": 201, "incident_ref": "INC-2026-0042", "incident_id": "inc-uuid-001" },
    "error_400": { "status": 400, "error": "invalid_request" },
    "error_403": { "status": 403, "error": "tenant_not_authorized" },
    "error_503": { "status": 503, "error": "service_unavailable" }
  },
  "sessions": {
    "strong_match": { "identity_level": "STRONG_MATCH_ACTIVE", "profile_id": "prof-001", "identity_data": { "room_id": "room-001" } },
    "partial_match": { "identity_level": "PARTIAL_MATCH_ACTIVE" },
    "no_match": { "identity_level": "NO_MATCH" },
    "match_inactive": { "identity_level": "MATCH_INACTIVE" }
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| Solo `STRONG_MATCH_ACTIVE` crea incidencia oficial | Ninguna otra rama llama a `conv-core-create-incident` |
| `next_state = 'waiting_internal'` tras éxito | `conv_cases.status` correcto; nunca `'resolved'` ni `'open'` |
| Backoff 1s→5s→30s, máx. 3 intentos | El 4.º intento nunca se ejecuta; tiempos verificables |
| Marcadores sustituidos por EF, nunca antes del texto IA | La IA nunca recibe `INC-2026-XXXX` en su prompt |
| Errores 4xx del Core nunca se reintentan | La EF escala inmediatamente tras el primer error 4xx |
| Fallo del activity log sin rollback | La incidencia y la confirmación al usuario se mantienen |
| Sin PII en payloads de n8n a EF | `profile_id`, `phone_number`, `full_name` ausentes en todos los payloads |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-60-service-incidents.md` | Fuente de verdad del flujo de incidencias |
| `rules-70-integration-api.md` §4.4 | Campos contractuales de `conv-core-create-incident` |
| `rules-90-observability-and-failure-handling.md` §4.5 | Backoff y tratamiento de errores HTTP |
| `rules-75-activity-log.md` | Fire-and-log de `conv_incident_created` |
| `rules-80-data-and-privacy.md` §4.2 | Mecanismo de marcadores |
| `contract-canonical-response.md` | Estructura de `CanonicalResponse` |
| `contract-case-state-machine.md` | Transiciones de `conv_cases.status` |
| `skill-n8n-incidents-workflow.md` | Detalles de implementación de WF-20 |
| `diagram-incidents-service-flow.md` | Diagrama de referencia del flujo |
