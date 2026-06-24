# contract-canonical-response.md — SmartConversations: Contrato CanonicalResponse

## 1. Propósito

`CanonicalResponse` normaliza el resultado de cualquier workflow de servicio (WF-20, WF-30, WF-40) en un único formato que WF-10 puede interpretar sin conocer el servicio que lo produjo. Permite que los workflows de salida (WF-91, WF-92) entreguen el mensaje al usuario independientemente del canal.

---

## 2. Cuándo se usa

Al finalizar cada turno de procesamiento de un workflow de servicio, sea cual sea el resultado: éxito, error gestionado, escalada, espera de input del usuario o identidad insuficiente.

No aplica a payloads internos entre EFs del add-on, ni al mensaje final que WF-91/92 envían al canal (que usa únicamente el campo `text`).

---

## 3. Productor

| Workflow | Cuándo produce `CanonicalResponse` |
|---|---|
| WF-20-INCIDENCIA | Al finalizar cada turno de procesamiento de una incidencia |
| WF-30-INFO-ANUNCIO | Al finalizar cada turno del flujo de publicaciones |
| WF-40-AYUDA-CONSULTA | Al finalizar cada turno del flujo de ayuda |

La sustitución de marcadores en `text` (`{incident_ref}`, `{lead_ref}`, etc.) la realizan las EFs del add-on antes de que el workflow construya `CanonicalResponse`. El objeto llega a WF-10 con `text` ya listo para enviarse al usuario.

---

## 4. Consumidor

| Consumidor | Qué usa de `CanonicalResponse` |
|---|---|
| WF-10 (enrutador) | `response_type`, `next_state`, `case_id`, `escalated`, `needs_more_input` — para decidir el siguiente paso |
| WF-91 (entrega WhatsApp) | Únicamente `text` para construir el payload de Wasender; ignora `metadata` |
| WF-92 (entrega WebChat) | `text` y opcionalmente `suggested_actions` para renderizar botones; ignora `metadata` |

---

## 5. Estructura

```typescript
interface CanonicalResponse {
  session_id:         string;
  service_code:       ServiceCode;
  response_type:      ResponseType;
  text:               string;
  next_state?:        CaseState;
  case_id?:           string;
  case_ref?:          string;
  escalated?:         boolean;
  escalation_reason?: EscalationReason;
  needs_more_input?:  boolean;
  suggested_actions?: string[];
  metadata?:          Record<string, unknown>;
}

type ServiceCode =
  | 'conv_incidencias'
  | 'conv_publicaciones'
  | 'conv_ayuda';

type ResponseType =
  | 'success'            // operación completada
  | 'pending_input'      // se esperan más datos del usuario
  | 'escalated'          // caso enviado a admin humano
  | 'identity_required'  // se necesita validación de identidad antes de continuar
  | 'error_handled'      // error interno gestionado; text es un mensaje genérico
  | 'no_service';        // servicio no disponible para este tenant/canal

type CaseState =
  | 'open' | 'waiting_user' | 'waiting_internal'
  | 'escalated' | 'resolved' | 'closed';

type EscalationReason =
  | 'user_request'        // el usuario pidió hablar con un humano
  | 'identity_unresolved' // identidad no verificada tras el flujo progresivo
  | 'core_error'          // fallo en Integration API sin recuperación posible
  | 'ai_low_confidence'   // la IA no pudo clasificar con confianza suficiente
  | 'auto_timeout';       // superado auto_escalate_after_minutes sin resolución
```

---

## 6. Campos obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `session_id` | `string` (UUID) | UUID de la sesión conversacional |
| `service_code` | `ServiceCode` | Servicio que produjo la respuesta |
| `response_type` | `ResponseType` | Tipo de resultado; determina el comportamiento de WF-10 |
| `text` | `string` (no vacío) | Mensaje final para el usuario, con todos los marcadores ya sustituidos |

---

## 7. Campos opcionales

| Campo | Tipo | Presente cuando… |
|---|---|---|
| `next_state` | `CaseState` | El workflow indica el nuevo estado de `conv_cases` |
| `case_id` | `string` (UUID) | Existe un caso en `conv_cases` asociado a esta respuesta |
| `case_ref` | `string` | Se creó un recurso en el Core con referencia legible (`INC-2026-NNNN`, `LEAD-2026-NNNN`) |
| `escalated` | `boolean` | Omitir si false; incluir explícitamente si true |
| `escalation_reason` | `EscalationReason` | Obligatorio si `escalated = true` |
| `needs_more_input` | `boolean` | Obligatorio en `true` si `response_type = 'pending_input'` |
| `suggested_actions` | `string[]` | Opciones de respuesta rápida para renderizar en WebChat |
| `metadata` | `Record<string, unknown>` | Datos de depuración interna; WF-91 y WF-92 lo ignoran siempre |

---

## 8. Reglas de validación

1. `session_id`, `service_code`, `response_type` y `text` son obligatorios y no pueden ser nulos ni cadenas vacías.
2. `text` no puede contener marcadores sin sustituir (`{incident_ref}`, `{lead_ref}`, `{due_date}`, `{amount}`).
3. Si `response_type = 'escalated'`: `escalated = true` y `escalation_reason` son obligatorios.
4. Si `response_type = 'pending_input'`: `needs_more_input = true` y `next_state = 'waiting_user'` son obligatorios.
5. Si `response_type = 'success'` y se creó un recurso en el Core: `case_ref` debe estar presente.
6. Los campos `profile_id`, `phone_number`, `full_name`, `room_label`, `assignment_id`, códigos de error HTTP y stack traces nunca deben aparecer en `CanonicalResponse`. Si son necesarios para depuración, van en `metadata`.
7. `metadata` nunca se incluye en el payload que WF-91/92 envían al usuario.

**Comportamiento de WF-10 según `response_type`:**

| `response_type` | Acción de WF-10 |
|---|---|
| `'success'` | Entregar `text` al canal vía WF-91/92 |
| `'pending_input'` | Entregar `text`; actualizar `conv_cases.status = 'waiting_user'` |
| `'escalated'` | Notificar al admin; entregar `text` de escalada al canal |
| `'identity_required'` | Activar WF-IDENTITY; reintentar el servicio tras validación |
| `'error_handled'` | Entregar `text` genérico; actualizar `conv_cases.status = 'waiting_internal'` |
| `'no_service'` | Responder al usuario que el servicio no está disponible |

---

## 9. Ejemplos válidos

### Incidencia oficial creada

```json
{
  "session_id":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":  "conv_incidencias",
  "response_type": "success",
  "text":          "Tu incidencia INC-2026-0042 ha sido registrada. Tiempo de respuesta estimado: 24 horas.",
  "next_state":    "resolved",
  "case_id":       "c1a2b3c4-d5e6-7f89-abcd-ef0123456789",
  "case_ref":      "INC-2026-0042",
  "escalated":     false
}
```

### Escalado por solicitud del usuario

```json
{
  "session_id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":      "conv_ayuda",
  "response_type":     "escalated",
  "text":              "Te pongo en contacto con el equipo. En breve te responderán.",
  "next_state":        "escalated",
  "case_id":           "c1a2b3c4-d5e6-7f89-abcd-ef0123456789",
  "escalated":         true,
  "escalation_reason": "user_request"
}
```

### Pendiente de datos del usuario

```json
{
  "session_id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":      "conv_incidencias",
  "response_type":     "pending_input",
  "text":              "¿Cuál es el tipo de problema? Elige: mantenimiento, ruido, seguridad, facturación u otro.",
  "next_state":        "waiting_user",
  "needs_more_input":  true,
  "suggested_actions": ["Mantenimiento", "Ruido", "Seguridad", "Facturación", "Otro"]
}
```

### Error de Core gestionado internamente

```json
{
  "session_id":        "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":      "conv_incidencias",
  "response_type":     "error_handled",
  "text":              "Tu solicitud ha sido recibida. Un miembro del equipo te confirmará los detalles.",
  "next_state":        "waiting_internal",
  "escalated":         true,
  "escalation_reason": "core_error",
  "metadata": { "internal_error": "conv-core-create-incident returned HTTP 503 after 3 retries" }
}
```

---

## 10. Ejemplos inválidos

### Marcador sin sustituir en `text`

```json
{
  "session_id":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":  "conv_incidencias",
  "response_type": "success",
  "text":          "Tu incidencia {incident_ref} ha sido registrada.",
  "case_ref":      "INC-2026-0042"
}
```
**Inválido:** `text` contiene `{incident_ref}` sin sustituir. La sustitución debe ocurrir en la EF antes de construir `CanonicalResponse`.

---

### `response_type = 'escalated'` sin `escalation_reason`

```json
{
  "session_id":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":  "conv_ayuda",
  "response_type": "escalated",
  "text":          "Te conectamos con el equipo.",
  "escalated":     true
}
```
**Inválido:** `escalation_reason` es obligatorio cuando `response_type = 'escalated'`.

---

### PII en el cuerpo del contrato

```json
{
  "session_id":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":  "conv_incidencias",
  "response_type": "success",
  "text":          "Incidencia registrada.",
  "profile_id":    "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "full_name":     "Juan García"
}
```
**Inválido:** `profile_id` y `full_name` son PII y nunca deben aparecer en `CanonicalResponse`.

---

### `pending_input` sin `needs_more_input` ni `next_state`

```json
{
  "session_id":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "service_code":  "conv_incidencias",
  "response_type": "pending_input",
  "text":          "¿Cuál es el tipo de incidencia?"
}
```
**Inválido:** `response_type = 'pending_input'` requiere `needs_more_input = true` y `next_state = 'waiting_user'`.

---

## 11. Notas de versionado

- Añadir campos **opcionales** es compatible. Los consumidores deben ignorar campos no reconocidos.
- Añadir un valor a `ResponseType` o `EscalationReason` es compatible si los consumidores tienen fallback para valores desconocidos. Requiere actualizar la tabla de comportamiento de WF-10 en §8.
- Eliminar o renombrar cualquier campo de §6 (obligatorios) es un breaking change. Requiere coordinación entre WF-10, WF-20, WF-30, WF-40, WF-91 y WF-92 antes del despliegue.
- Cambiar la semántica de `response_type` o las reglas de §8 es un breaking change que requiere revisión de arquitectura.

---

## 12. Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
