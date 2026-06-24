# rules-75-activity-log.md — SmartConversations: Activity Log en SmartRoom Core

## 1. Propósito

Este documento define qué hitos conversacionales deben publicarse en el activity log de SmartRoom Core, en qué formato, por quién y con qué restricciones de contenido.

El requisito del activity log es transversal. Aplica a todos los workflows de servicio, a ambos canales y a todas las operaciones de ciclo de vida. Cualquier documento que describa un servicio, canal u operación de ciclo de vida debe referenciar este documento al especificar su contribución al activity log.

---

## 2. Alcance

Este documento aplica a:

- Todos los workflows de n8n (WF-20, WF-30, WF-40)
- Todas las EFs de canal (`conv-wa-webhook`, `conv-web-session`, `conv-web-message`)
- Todas las EFs de Integration API que crean objetos en el Core (`conv-core-create-incident`, `conv-core-create-lead`)
- Las EFs de ciclo de vida del tenant (`conv-offboard-wa-session`, `conv-activate-subscription`)
- La máquina de estados de `conv_cases` (transiciones a `resolved` y `closed`)

---

## 3. Decisiones No Negociables

1. **El add-on nunca debe escribir directamente en tablas del Core.** Todos los eventos del activity log se publican mediante llamadas a la Integration API, no mediante inserts directos.

2. **Los mensajes de chat brutos nunca deben publicarse en el activity log del Core.** El log del Core contiene únicamente hitos funcionales y resúmenes.

3. **El add-on es el responsable del detalle técnico completo.** `conv_messages`, `conv_cases` y `conv_sessions` almacenan el registro conversacional completo. El activity log del Core almacena hitos funcionales y referencias.

4. **La publicación en el activity log se desencadena desde Edge Functions, no desde n8n.** n8n orquesta los workflows y llama a las EFs. La EF que realiza la operación en el Core es también la responsable de publicar el evento de actividad correspondiente.

5. **Los eventos de actividad deben contener únicamente datos no PII.** Los payloads de los eventos no deben incluir el nombre del inquilino, su número de teléfono, la etiqueta de habitación, el nombre de la residencia, el email ni el `profile_id`.

6. **`conv_conversation_started` debe publicarse como máximo una vez por sesión.** Debe dispararse en el primer mensaje de una sesión nueva que supere las tres comprobaciones de activación. No debe dispararse en cada mensaje.

---

## 4. Reglas Obligatorias

### 4.1 Dos sistemas de log distintos

| Sistema | Propósito | Propietario | Contenido |
|---|---|---|---|
| Log técnico del add-on | Registro conversacional completo para depuración, auditoría y trazabilidad operativa | Add-on SmartConversations | Todos los mensajes, payloads brutos, clasificaciones de intención, estados de sesión, transiciones de caso |
| Activity log del Core | Hitos funcionales visibles para el admin del tenant y el equipo de operaciones de SmartRoom | SmartRoom Core (publicado mediante Integration API) | Hitos funcionales, IDs de referencia, enums, resúmenes anónimos |

Estos dos sistemas son independientes. Los datos del log técnico del add-on no deben copiarse en bloque al activity log del Core.

### 4.2 Catálogo de eventos obligatorios

Los siguientes eventos deben publicarse en el activity log del Core sin excepción:

| Tipo de evento | Desencadenante | Publicado por |
|---|---|---|
| `conv_subscription_activated` | La suscripción umbrella (`saas_service_subscriptions`, `service_code = 'smart_conversations'`) se activa por primera vez para un tenant | EF `conv-activate-subscription` |
| `conv_channel_connected` | `conv_wa_sessions.status` pasa a `active` (conexión de WhatsApp completada) | EF `conv-wa-webhook` (evento `session_status` de conexión) |
| `conv_channel_offboarded` | `conv-offboard-wa-session` completa con éxito, en `mode: 'logout'` o `mode: 'delete'` | EF `conv-offboard-wa-session` |
| `conv_conversation_started` | Primer mensaje de una sesión nueva que supera los tres niveles de activación | `conv-ingest` |
| `conv_identity_validated` | `conv-core-validate-identity` devuelve `STRONG_MATCH_ACTIVE` o `PARTIAL_MATCH_ACTIVE` | EF `conv-core-validate-identity` |
| `conv_case_created` | Se inserta una fila nueva en `conv_cases`, de cualquier `case_ref_type` (`incident`, `lead`, `help_ticket`) | EF que inserta el caso |
| `conv_pre_incident_created` | WF-20 llama a `conv-save-pre-incident`, que crea la pre-incidencia en `conv_cases` (aún no en Core) | EF `conv-save-pre-incident` |
| `conv_incident_created` | `conv-core-create-incident` devuelve con éxito | EF `conv-core-create-incident` |
| `conv_lead_created` | `conv-core-create-lead` devuelve con éxito | EF `conv-core-create-lead` |
| `conv_case_escalated` | Un caso es escalado a un admin humano (cualquier servicio) | EF `conv-escalate-case` |
| `conv_case_summary_updated` | Un caso acumula contexto suficiente para un resumen funcional | EF `conv-generate-case-summary` |
| `conv_case_closed` | `conv_cases.status` pasa a `resolved` o `closed` | EF `conv-close-case` |
| `conv_message_delivery_failed` | Una entrada de `conv_send_queue` agota `max_retries` y el mensaje afecta a una conversación, caso o comunicación funcional relevante | EF `conv-send-wa` (u otra EF de envío saliente) |

**Regla de `conv_case_created` (evento genérico):** se publica únicamente cuando se inserta realmente una fila en `conv_cases`. No sustituye a los eventos específicos `conv_pre_incident_created`, `conv_incident_created`, `conv_lead_created` ni `conv_case_escalated`: cuando uno de estos se dispara, `conv_case_created` se publica además, no en su lugar. `help` no está obligado a crear un `conv_case` cuando solo responde una consulta de FAQ pública; en ese supuesto no existe ningún caso que crear y `conv_case_created` no se publica.

**Regla de `conv_message_delivery_failed`:** se publica **solo** cuando el fallo de entrega es definitivo — se agotaron los reintentos configurados en `conv_send_queue.max_retries` — y afecta a una conversación, caso o comunicación funcional relevante. Los fallos temporales (reintentos todavía en curso, dentro de `max_retries`) nunca generan este evento; permanecen exclusivamente en observabilidad interna (`conv_admin_notifications`), según `rules-90-observability-and-failure-handling.md` §4.2 y §4.8.

### 4.2.1 Tabla de equivalencia entre requirements y `event_type` técnicos

Los requirements `REQ-SC-000`, `REQ-SC-010` y `REQ-SC-020` describen los hitos del activity log con nombres conceptuales. Esta tabla es la fuente de verdad de la correspondencia entre esos nombres y los `event_type` técnicos publicados por este documento:

| Nombre conceptual (requirement) | `event_type` técnico |
|---|---|
| `conversation_started` | `conv_conversation_started` |
| `identity_validated` | `conv_identity_validated` |
| `case_created` | `conv_case_created` |
| `incident_created` | `conv_incident_created` |
| `lead_created` | `conv_lead_created` |
| `conversation_escalated` | `conv_case_escalated` |
| `conversation_closed` | `conv_case_closed` |
| `message_delivery_failed` | `conv_message_delivery_failed` |

El prefijo `conv_` es la convención de namespacing del add-on y no representa una desviación funcional respecto a los nombres conceptuales de los requirements.

### 4.3 Estructura obligatoria del payload de evento

Todos los eventos deben incluir estos campos base:

```json
{
  "event_type": "<event_type>",
  "source": "smartconversations",
  "client_account_id": "<uuid>",
  "timestamp": "<ISO 8601>",
  "data": { ... }
}
```

El campo `data` varía según el tipo de evento. Todos los campos en `data` deben cumplir las restricciones de PII de la Sección 4.5.

### 4.4 Payloads `data` específicos por evento

**`conv_subscription_activated`**
```json
{
  "service_code": "smart_conversations"
}
```

**`conv_channel_connected`**
```json
{
  "channel": "whatsapp | webchat"
}
```

**`conv_channel_offboarded`**
```json
{
  "channel": "whatsapp",
  "mode": "logout | delete"
}
```

**`conv_conversation_started`**
```json
{
  "session_id": "<uuid>",
  "channel": "whatsapp | webchat"
}
```

**`conv_identity_validated`**
```json
{
  "session_id": "<uuid>",
  "identity_level": "STRONG_MATCH_ACTIVE | PARTIAL_MATCH_ACTIVE",
  "channel": "whatsapp | webchat"
}
```

**`conv_pre_incident_created`**
```json
{
  "conv_case_id": "<uuid>",
  "channel": "whatsapp | webchat",
  "incident_type": "<enum>",
  "urgency": "low | medium | high"
}
```

**`conv_incident_created`**
```json
{
  "incident_id": "<uuid>",
  "incident_ref": "INC-YYYY-NNNN",
  "conv_case_id": "<uuid>",
  "channel": "whatsapp | webchat",
  "incident_type": "<enum>",
  "urgency": "low | medium | high"
}
```

**`conv_lead_created`**
```json
{
  "lead_id": "<uuid>",
  "lead_ref": "LEAD-YYYY-NNNN",
  "listing_id": "<uuid>",
  "conv_case_id": "<uuid>",
  "channel": "whatsapp | webchat",
  "interest_type": "immediate | future"
}
```

**`conv_case_escalated`**
```json
{
  "conv_case_id": "<uuid>",
  "channel": "whatsapp | webchat",
  "service_code": "<enum>",
  "reason": "identity_failed | no_kb_match | admin_requested"
}
```

**`conv_case_summary_updated`**
```json
{
  "conv_case_id": "<uuid>",
  "case_ref_type": "incident | lead | help_ticket",
  "summary": "<texto funcional anónimo del resumen>"
}
```

**`conv_case_closed`**
```json
{
  "conv_case_id": "<uuid>",
  "case_ref_id": "<uuid, opcional>",
  "case_ref_type": "incident | lead | help_ticket",
  "resolution_channel": "whatsapp | webchat | admin_panel"
}
```
> `case_ref_id` es opcional porque los casos de tipo `help_ticket` pueden cerrarse sin que exista nunca un objeto en el Core (si la consulta se resolvió directamente desde la KB o se cerró sin crear escalada). Para `incident` y `lead`, `case_ref_id` debe estar presente cuando la operación en el Core fue exitosa.

**`conv_case_created`**
```json
{
  "conv_case_id": "<uuid>",
  "case_ref_type": "incident | lead | help_ticket",
  "service_code": "<enum>",
  "channel": "whatsapp | webchat"
}
```

**`conv_message_delivery_failed`**
```json
{
  "session_id": "<uuid>",
  "conv_case_id": "<uuid, opcional>",
  "channel": "whatsapp | webchat",
  "attempts": "<integer>",
  "reason": "<enum técnico resumido, sin detalle de proveedor>"
}
```

### 4.5 Restricciones de PII para los eventos del activity log

Los eventos publicados en el activity log del Core nunca deben incluir:

- Nombre del inquilino (`full_name`)
- Número de teléfono (`phone_number`)
- Etiqueta de habitación (`room_label`)
- Nombre de residencia (`residence_name`)
- Email
- `profile_id`
- `assignment_id`
- Cualquier contenido de texto de mensajes (bruto o transcrito)

El campo `summary` de `conv_case_summary_updated` es el único campo de texto libre permitido. Debe ser un resumen funcional anónimo generado por IA (por ejemplo: "Fontanería reportada en habitación (urgencia alta)"), no una copia literal de ningún mensaje del usuario.

### 4.6 `conv_case_summary_updated`: reglas para el contenido del resumen

Un resumen puede publicarse cuando:
- El caso ha acumulado suficientes datos estructurados (tipo de incidencia, urgencia, descripción general, servicio).
- La IA ha generado un resumen con `confidence ≥ 0.8`.

Un resumen debe:
- Describir el estado funcional del caso en texto plano.
- No reproducir ningún mensaje del usuario de forma literal.
- No incluir el nombre del inquilino, su habitación ni su residencia.
- Estar redactado en el idioma de la configuración del tenant (`conv_service_activations.config.kb_language`).

### 4.7 Responsabilidad de publicación

Cada EF es responsable de publicar el evento de actividad que corresponde a su propia operación:

| EF | Eventos que publica |
|---|---|
| `conv-activate-subscription` | `conv_subscription_activated` |
| `conv-wa-webhook` | `conv_channel_connected` |
| `conv-offboard-wa-session` | `conv_channel_offboarded` |
| `conv-ingest` | `conv_conversation_started` |
| `conv-core-validate-identity` | `conv_identity_validated` |
| `conv-core-create-incident` | `conv_incident_created` |
| `conv-core-create-lead` | `conv_lead_created` |
| `conv-save-pre-incident` | `conv_pre_incident_created` |
| `conv-close-case` | `conv_case_closed` |
| `conv-generate-case-summary` | `conv_case_summary_updated` |
| `conv-escalate-case` | `conv_case_escalated` |
| EF que inserta en `conv_cases` (`conv-save-pre-incident`, `conv-core-create-incident`, `conv-core-create-lead`, EF de `help` que abra caso) | `conv_case_created` (además del evento específico que corresponda) |
| `conv-send-wa` (u otra EF de envío saliente) | `conv_message_delivery_failed` |

n8n no debe publicar eventos de actividad directamente. n8n llama a EFs; las EFs publican.

### 4.8 La publicación debe ser condicional al éxito de la operación en el Core

`conv_incident_created` debe publicarse únicamente después de que `conv-core-create-incident` devuelva una respuesta exitosa. La publicación no debe ocurrir de forma especulativa antes de que la operación tenga éxito.

Si la operación en el Core falla, no se publica ningún evento de actividad. El fallo queda registrado únicamente en el log técnico del add-on.

---

## 5. Casos Permitidos

- Publicar `conv_incident_created` tras recibir con éxito el `incident_id` del Core.
- Publicar `conv_case_escalated` cuando una sesión escala al admin por tres intentos fallidos de identificación.
- Una única sesión que produce múltiples eventos en secuencia: `conv_conversation_started` → `conv_identity_validated` → `conv_incident_created` → `conv_case_closed`.
- Publicar `conv_case_summary_updated` múltiples veces para el mismo caso a medida que el resumen evoluciona.
- No publicar `conv_identity_validated` cuando el resultado de validación es `MATCH_INACTIVE` o `NO_MATCH` (no son hitos funcionales alcanzados).

---

## 6. Casos Prohibidos

- Insert directo en cualquier tabla del Core desde el add-on con fines de publicación de actividad.
- Publicar el contenido bruto de los mensajes (texto del usuario, transcripciones de audio) en el activity log del Core.
- Publicar `conv_conversation_started` en cada mensaje entrante (solo al inicio de sesión).
- Publicar eventos desde n8n directamente (debe hacerse siempre a través de EFs).
- Incluir `profile_id`, `phone_number`, `full_name`, `room_label` o cualquier PII del usuario en los payloads de eventos.
- Publicar `conv_incident_created` antes de que la operación en el Core haya confirmado el éxito.
- Omitir el evento `conv_incident_created` cuando se crea una incidencia con éxito.
- Publicar `conv_message_delivery_failed` antes de agotar `max_retries` en `conv_send_queue` (los fallos temporales no se publican al Core).
- Publicar `conv_case_created` sin que exista realmente una fila nueva en `conv_cases`.

---

## 7. Impacto en el Diseño

- Toda EF que realiza una operación en el Core debe incluir la publicación en el activity log como parte de su ruta de éxito.
- La llamada de publicación debe tratarse como una operación de tipo fire-and-log: si falla, la EF registra el fallo pero no hace rollback de la operación en el Core.
- Los workflows de servicio (WF-20, WF-30, WF-40) deben diseñarse de forma que el evento desencadenante para la publicación en el activity log ocurra dentro de una EF, no en n8n.
- La generación del resumen del caso debe ser propiedad de una EF que controle tanto la llamada a la IA como la publicación.

---

## 8. Impacto en la Implementación

- Las EFs `conv-core-*` deben incluir la publicación en el activity log como parte de su ruta de respuesta de éxito.
- Un fallo de publicación debe registrarse en los logs de Supabase con el payload completo del evento para recuperación manual.
- El payload del evento `conv_case_summary_updated` debe validarse para asegurarse de que no hay PII filtrada en el texto del resumen antes de publicarlo.
- `conv-ingest` debe rastrear si una sesión es nueva o existente antes de decidir si publica `conv_conversation_started`.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio de que el add-on nunca escribe directamente en tablas del Core
- `rules-20-tenant-activation-and-lifecycle.md` — eventos de ciclo de vida (`conv_subscription_activated`, `conv_channel_connected`, `conv_channel_offboarded`)
- `rules-30-whatsapp-channel.md` — eventos de actividad del canal WhatsApp
- `rules-40-identity-validation.md` — evento `conv_identity_validated`
- `rules-60-service-incidents.md` — eventos `conv_incident_created`, `conv_pre_incident_created`
- `rules-61-service-listings.md` — evento `conv_lead_created`
- `rules-62-service-help.md` — evento `conv_case_escalated`
- `rules-70-integration-api.md` — contratos de Integration API usados para publicar eventos
- `rules-80-data-and-privacy.md` — restricciones de PII sobre el contenido de eventos
- `rules-90-observability-and-failure-handling.md` — clasificación de fallos temporales vs. definitivos en `conv_send_queue`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] Ninguna EF inserta directamente en tablas del Core con fines de activity log
- [ ] `conv_conversation_started` se dispara como máximo una vez por sesión
- [ ] `conv_incident_created` se dispara únicamente tras respuesta exitosa del Core
- [ ] Ningún payload de evento contiene `profile_id`, `phone_number`, `full_name`, `room_label` ni texto de mensajes
- [ ] El texto del resumen de `conv_case_summary_updated` no contiene PII ni mensajes literales del usuario
- [ ] Los eventos de actividad se publican desde EFs, no desde n8n
- [ ] Los trece tipos de evento obligatorios del catálogo (Sección 4.2) están implementados
- [ ] `conv_message_delivery_failed` solo se publica cuando se agotan los reintentos de `conv_send_queue` y hay impacto funcional, nunca por fallos temporales
- [ ] `conv_case_created` se publica solo cuando se inserta una fila real en `conv_cases`, sin sustituir a los eventos específicos
- [ ] Los fallos de publicación se registran sin hacer rollback de la operación en el Core correspondiente

---

## 11. Notas de Control de Cambios

Añadir un nuevo tipo de evento obligatorio requiere actualizar simultáneamente el catálogo de este documento (Sección 4.2) y la implementación de la EF correspondiente.

Los cambios en el payload `data` de cualquier evento que eliminen o renombren campos son breaking changes para los consumidores del activity log del Core. Estos cambios requieren coordinación con el equipo del Core antes del merge.

Añadir campos opcionales a los payloads de eventos existentes no es un breaking change y no requiere coordinación, siempre que se respeten las restricciones de PII de la Sección 4.5.
