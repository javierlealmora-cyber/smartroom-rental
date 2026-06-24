# rules-60-service-incidents.md — SmartConversations: Servicio de Gestión de Incidencias

## 1. Propósito

Este documento define las reglas que gobiernan el servicio `conv_incidencias`: los requisitos de identidad, los datos mínimos requeridos, la distinción entre pre-incidencia e incidencia oficial, los estados del caso, las condiciones de escalado y la contribución al activity log de SmartRoom Core.

Este servicio se trata como flujo privilegiado: las acciones que afectan a SmartRoom Core (creación de incidencias oficiales) tienen los requisitos de identidad más estrictos del sistema.

---

## 2. Alcance

Este documento aplica a:

- n8n WF-20-INCIDENCIA
- n8n WF-IDENTITY (sub-workflow de identificación, cuando se activa desde WF-20)
- EF `conv-core-create-incident` (crea la incidencia oficial en el Core)
- EF `conv-save-pre-incident` (crea la pre-incidencia en `conv_cases`)
- EF `conv-escalate-case` (escala el caso a admin humano)
- Tabla `conv_cases` para casos de tipo `incident`
- Tabla `conv_messages` (mensajes del flujo de incidencias)

---

## 3. Decisiones No Negociables

1. **Solo `STRONG_MATCH_ACTIVE` puede crear una incidencia oficial en SmartRoom Core.** Esta regla no tiene excepción. Ninguna configuración de tenant, flag ni preferencia puede rebajarla.

2. **`PARTIAL_MATCH_ACTIVE` solo permite crear una pre-incidencia en `conv_cases`.** La pre-incidencia no existe en SmartRoom Core hasta que la identidad se confirma como `STRONG_MATCH_ACTIVE`.

3. **`MATCH_INACTIVE` y `NO_MATCH` no pueden crear ningún tipo de incidencia.** Estos niveles deben escalar a admin humano con el contexto recopilado.

4. **La IA no determina si el inquilino está activo ni si la habitación es válida.** La IA solo extrae entidades conversacionales (tipo de incidencia, urgencia, descripción). La validación de identidad y habitación es siempre responsabilidad de `conv-core-validate-identity`.

5. **Una pre-incidencia en `conv_cases` no es una incidencia oficial.** No tiene `incident_id` del Core hasta que se promueve. El usuario debe ser informado de que su solicitud está registrada pero pendiente de confirmación de identidad.

6. **La descripción de la incidencia que llega a la IA nunca debe incluir datos personales identificativos del inquilino.** La IA solo recibe el texto de la descripción del problema para clasificarlo y extraer entidades.

---

## 4. Reglas Obligatorias

### 4.1 Requisitos de identidad por acción

| Acción | Nivel mínimo requerido | Consecuencia si no se alcanza |
|---|---|---|
| Crear incidencia oficial en SmartRoom Core | `STRONG_MATCH_ACTIVE` | No se crea; se ofrece pre-incidencia si hay `PARTIAL_MATCH_ACTIVE` |
| Crear pre-incidencia en `conv_cases` | `PARTIAL_MATCH_ACTIVE` | No se crea; se escala a admin si `MATCH_INACTIVE` o `NO_MATCH` |
| Ver estado de una incidencia propia | `STRONG_MATCH_ACTIVE` | Acceso denegado |
| Actualizar descripción de una pre-incidencia | `PARTIAL_MATCH_ACTIVE` | Acceso denegado |
| Escalar a admin con contexto | Cualquier nivel | Siempre disponible |

### 4.2 Datos mínimos requeridos para crear una incidencia

Antes de llamar a `conv-core-create-incident`, deben estar disponibles en `conv_cases.case_context`:

| Dato | Obligatorio | Origen |
|---|---|---|
| `incident_type` | Sí | IA (clasificación desde descripción del usuario) |
| `urgency` | Sí | IA (extraída del texto; si ambigua, usar `'medium'` por defecto) |
| `description` | Sí | Texto del usuario (normalizado, sin PII de terceros) |
| `room_id` | Sí | `conv-core-validate-identity` o confirmación explícita del usuario |
| `profile_id` | Sí | `conv-core-validate-identity` (almacenado en `conv_sessions`, no en n8n) |

Si `room_id` no está disponible tras la validación de identidad, WF-20 debe preguntar al usuario la habitación antes de continuar.

### 4.3 Tipos de incidencia válidos

Los valores aceptados para `incident_type` son:

```
'maintenance' | 'security' | 'noise' | 'billing' | 'other'
```

La IA clasifica el texto del usuario en uno de estos tipos. Si la clasificación tiene `confidence < 0.8`, WF-20 debe preguntar al usuario para confirmar el tipo antes de crear la incidencia.

### 4.4 Diferencia entre pre-incidencia e incidencia oficial

| Característica | Pre-incidencia | Incidencia oficial |
|---|---|---|
| Dónde vive | `conv_cases` del add-on | SmartRoom Core + referencia en `conv_cases` |
| `case_ref_id` | Ausente o provisional | `incident_id` devuelto por `conv-core-create-incident` |
| Visible en panel del Core | No | Sí |
| Requiere | `PARTIAL_MATCH_ACTIVE` | `STRONG_MATCH_ACTIVE` |
| Activity log del Core | `conv_pre_incident_created` | `conv_incident_created` |
| Número de ticket | No se emite | Se emite (`incident_ref`, ej: `INC-2026-0042`) |

### 4.5 Flujo de WF-20 según nivel de identidad

```
Al recibir mensaje en WF-20 (desde WF-10):

1. Leer identity_level de conv_sessions
2. Si identity_level < PARTIAL_MATCH_ACTIVE:
   → Activar WF-IDENTITY para obtener datos del usuario
   → Si tras WF-IDENTITY el nivel sigue siendo NO_MATCH o MATCH_INACTIVE:
      → EF conv-escalate-case → publicar conv_case_escalated
      → Responder: "No pude verificar tus datos. Te pongo en contacto con el equipo."
      → Fin

3. Si identity_level = PARTIAL_MATCH_ACTIVE:
   → IA extrae entidades: incident_type, urgency, description
   → Si faltan datos → preguntar al usuario
   → EF conv-save-pre-incident: INSERT conv_cases (status='open', case_ref_type='incident')
   → EF publica conv_pre_incident_created al activity log del Core
   → Responder: "Tu solicitud ha sido registrada. Confirmaremos los detalles contigo pronto."

4. Si identity_level = STRONG_MATCH_ACTIVE:
   → IA extrae entidades: incident_type, urgency, description
   → Si faltan datos → preguntar al usuario (máximo 1 vuelta de preguntas)
   → EF conv-core-create-incident con { client_account_id, profile_id, room_id, description, incident_type, urgency, source, conv_case_id }
   → Si éxito: UPDATE conv_cases.case_ref_id = incident_id, status='waiting_internal'
   → EF publica conv_incident_created al activity log del Core
   → Responder: "Tu incidencia ha sido registrada con el número {incident_ref}. Te avisaremos cuando sea atendida."
   → La EF inyecta {incident_ref} en el texto; la IA no recibe el número directamente.
```

### 4.6 Estados del caso para `conv_cases` de tipo `incident`

| Estado | Significado |
|---|---|
| `open` | Caso recién creado, recopilando datos |
| `waiting_user` | WF-20 espera respuesta del usuario (pregunta de datos) |
| `waiting_internal` | Incidencia creada en Core; en espera de respuesta del equipo de mantenimiento |
| `escalated` | Derivado a admin humano (identidad no verificada o problema técnico) |
| `resolved` | Incidencia atendida y cerrada; EF `conv-close-case` publica `conv_case_closed` |
| `closed` | Cerrado sin resolución (cancelado por el usuario o por timeout) |

Transiciones no permitidas: de `resolved` a `open`; de `closed` a cualquier estado activo.

### 4.7 Condiciones de escalado a admin

WF-20 debe llamar a EF `conv-escalate-case` y publicar `conv_case_escalated` en las siguientes situaciones:

| Condición | Acción de escalado |
|---|---|
| `identity_level = MATCH_INACTIVE` | Escalar con contexto de la incidencia intentada |
| `identity_level = NO_MATCH` tras 3 intentos | Escalar con datos recopilados en `conv_sessions.identity_data` |
| `conv-core-create-incident` devuelve 422 (precondición fallida) | Escalar con contexto técnico; responder al usuario sin exponer el error |
| `conv-core-create-incident` devuelve 5xx | Escalar con contexto; guardar pre-incidencia en `conv_cases` para reintento |
| `auto_escalate_after_minutes` superado sin resolución | Escalar automáticamente (configurado en `conv_service_activations.config`) |

El mensaje al usuario cuando se escala nunca debe mencionar el motivo técnico. El mensaje recomendado es: "Tu solicitud ha sido recibida. Un miembro del equipo se pondrá en contacto contigo en breve."

### 4.8 Contribución al activity log del Core

Los siguientes eventos deben publicarse mediante Integration API:

| Evento | Publicado por | Cuándo |
|---|---|---|
| `conv_case_created` | EF `conv-save-pre-incident` o `conv-core-create-incident` (la que inserte la fila) | Se inserta una fila real en `conv_cases` para este servicio, además del evento específico que corresponda |
| `conv_pre_incident_created` | EF `conv-save-pre-incident` | Pre-incidencia creada en `conv_cases` |
| `conv_incident_created` | EF `conv-core-create-incident` | Incidencia oficial creada en Core con éxito |
| `conv_case_escalated` | EF `conv-escalate-case` | Caso escalado a admin por cualquier motivo |
| `conv_case_closed` | EF `conv-close-case` | Caso pasa a `resolved` o `closed` |

**Nota sobre `conv_case_created`:** si el flujo de este servicio inserta una fila real en `conv_cases` (como pre-incidencia o como incidencia oficial), debe publicarse también `conv_case_created`, además del evento específico (`conv_pre_incident_created` o `conv_incident_created`). `conv_case_created` no sustituye a estos eventos; se publica en paralelo. Véase `rules-75-activity-log.md` §4.2 para la regla completa.

Véase `rules-75-activity-log.md` para los payloads exactos de cada evento.

---

## 5. Casos Permitidos

- Un inquilino activo con `STRONG_MATCH_ACTIVE` que crea una incidencia oficial y recibe un número de ticket.
- Un inquilino identificado solo como `PARTIAL_MATCH_ACTIVE` que crea una pre-incidencia en `conv_cases`; el bot le informa de que su solicitud está registrada y se procesará.
- Un ex-inquilino con `MATCH_INACTIVE` que es escalado a admin con el contexto recopilado.
- WF-20 que pregunta al usuario el tipo de incidencia cuando la confianza de clasificación de la IA es < 0.8.
- `conv-core-create-incident` que falla con 5xx: se guarda pre-incidencia y se escala; el usuario recibe un mensaje genérico de "registrado, te confirmamos pronto".

---

## 6. Casos Prohibidos

- Llamar a `conv-core-create-incident` con `identity_level = PARTIAL_MATCH_ACTIVE` o inferior.
- Incluir `profile_id`, `phone_number`, `full_name` o `room_label` en los datos enviados a la IA para clasificación.
- Responder al usuario con el mensaje de error técnico de `conv-core-create-incident`.
- Crear un caso de tipo `incident` en `conv_cases` sin al menos `incident_type`, `urgency` y `description` en `case_context`.
- Tratar una pre-incidencia como incidencia oficial antes de que `conv-core-create-incident` devuelva con éxito.
- Publicar `conv_incident_created` antes de recibir confirmación de éxito de `conv-core-create-incident`.

---

## 7. Impacto en el Diseño

- WF-20 debe ser invocable tanto en modo "nuevo caso" como en modo "continuar caso abierto". La diferencia se establece por la presencia o ausencia de `case_id` en el input de WF-10.
- La EF `conv-save-pre-incident` es responsable tanto de crear el registro en `conv_cases` como de publicar `conv_pre_incident_created` en el activity log del Core.
- El número de ticket (`incident_ref`) es inyectado por la EF después de la generación de texto por IA. El texto base generado por la IA usa el marcador `{incident_ref}`.
- `conv_service_activations.config.require_strong_identity_for_incidents` controla si `PARTIAL_MATCH_ACTIVE` puede crear pre-incidencias. El valor por defecto es `true` para incidencias oficiales y `false` para pre-incidencias.

---

## 8. Impacto en la Implementación

- WF-20 debe leer `conv_sessions.identity_level` antes de cualquier otro paso. Esta lectura determina el camino de ejecución completo.
- `conv-core-create-incident` debe incluir `conv_case_id` en el request para que el Core pueda referenciar el caso del add-on.
- La respuesta de `conv-core-create-incident` incluye `estimated_response_hours`; WF-20 puede incluir esta información en la respuesta al usuario.
- Los reintentos de `conv-core-create-incident` en caso de 5xx deben implementarse con backoff exponencial directamente en la EF (1s → 5s → 30s, máximo 3 intentos). Si los tres intentos fallan, la EF almacena la situación como pre-incidencia en `conv_cases` con `status = 'waiting_internal'` y llama a `conv-escalate-case`. `conv_send_queue` es exclusivamente la cola de reintentos de envío saliente al usuario; no interviene en reintentos de llamadas al Core (véase `rules-90-observability-and-failure-handling.md` §4.5).

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P3, P5, P6, P9
- `rules-40-identity-validation.md` — niveles de identidad y comportamiento de WF-IDENTITY
- `rules-70-integration-api.md` — contrato de `conv-core-create-incident`
- `rules-75-activity-log.md` — eventos `conv_case_created`, `conv_pre_incident_created`, `conv_incident_created`, `conv_case_escalated`, `conv_case_closed`
- `rules-80-data-and-privacy.md` — restricciones de PII para la IA y n8n
- `contract-case-state-machine.md` — transiciones de estado de `conv_cases`
- `contract-canonical-response.md` — estructura de la respuesta de WF-20 hacia WF-10

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-100-incidents-service.md`
- `REQ-SC-110-incidents-whatsapp-channel-integration.md`
- `REQ-SC-120-incidents-chatbot-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] `conv-core-create-incident` solo se llama cuando `identity_level = STRONG_MATCH_ACTIVE`
- [ ] Los casos `PARTIAL_MATCH_ACTIVE` crean pre-incidencia en `conv_cases`, no en Core
- [ ] Los casos `MATCH_INACTIVE` y `NO_MATCH` escalan a admin sin crear ningún registro de incidencia
- [ ] `case_context` incluye `incident_type`, `urgency` y `description` antes de crear cualquier caso
- [ ] El número de ticket se inyecta por la EF después de la generación de texto por IA
- [ ] `conv_incident_created` se publica solo tras respuesta exitosa de `conv-core-create-incident`
- [ ] Los errores 5xx de `conv-core-create-incident` guardan pre-incidencia y escalan; no se expone el error al usuario
- [ ] La IA no recibe `profile_id`, `phone_number` ni `room_label`

---

## 11. Notas de Control de Cambios

Modificar los tipos de incidencia válidos (`incident_type`) requiere actualizar simultáneamente: el CHECK constraint en la BD, la lógica de clasificación de la IA en WF-20 y este documento.

Cambiar el requisito de identidad mínimo para incidencias oficiales (de `STRONG_MATCH_ACTIVE` a cualquier otro nivel) es un cambio arquitectónico que requiere aprobación de producto y actualización de `rules-40-identity-validation.md` y `rules-00-scope-and-principles.md`.
