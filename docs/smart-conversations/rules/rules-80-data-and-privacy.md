# rules-80-data-and-privacy.md — SmartConversations: Datos y Privacidad

## 1. Propósito

Este documento define la política de minimización de PII, los límites de flujo de datos entre capas, el uso de placeholders para inyección posterior de datos personales, y las reglas de logging, auditoría y retención aplicables al add-on SmartConversations.

Este documento es la fuente de verdad única para las restricciones de privacidad del sistema. Cualquier aparente contradicción entre este documento y otro debe resolverse a favor de este documento.

---

## 2. Alcance

Este documento aplica a:

- n8n y todos sus workflows (WF-01 a WF-92)
- Todas las Edge Functions con prefijo `conv-*`
- El proveedor de IA (Claude API)
- Las tablas `conv_sessions`, `conv_messages`, `conv_cases`, `conv_kb`, `conv_send_queue`
- Los logs de Supabase Edge Functions
- El activity log de SmartRoom Core (vía Integration API)

---

## 3. Decisiones No Negociables

1. **n8n nunca recibe datos personales del inquilino.** El payload que llega a n8n contiene únicamente `session_id`, `client_account_id`, `message_text`, `channel` e `identity_level`. Sin excepción.

2. **La IA nunca recibe datos personales identificativos del inquilino.** La IA recibe texto de mensajes, KB y datos públicos de anuncios. Nunca recibe `phone_number`, `full_name`, `profile_id`, `room_label`, datos contractuales ni historial de pagos.

3. **Los datos personales del inquilino que deben aparecer en una respuesta del bot se inyectan después de la generación por IA.** La IA genera texto con marcadores; la EF sustituye el valor real. La IA nunca recibe el valor real directamente.

4. **`profile_id`, `assignment_id`, `room_id` y `room_label` (cuando identifican al inquilino) son almacenados por las EFs en `conv_sessions` y nunca reenviados a n8n ni a la IA.** El `room_label` que aparece como característica pública de un anuncio en datos de listing no está sujeto a esta restricción; véase §4.1.

5. **El número de teléfono de WhatsApp se usa únicamente para la validación de identidad (fast-path).** No se persiste en texto claro en logs. No se envía a n8n ni a la IA.

6. **El activity log de SmartRoom Core solo recibe hitos funcionales anónimos.** Nunca recibe mensajes brutos, nombres, teléfonos, etiquetas de habitación ni `profile_id`.

---

## 4. Reglas Obligatorias

### 4.1 Tabla definitiva de minimización de PII por capa

> **Nota sobre `room_label`:** este campo tiene dos semánticas distintas. En contexto de listing (anuncio público), `room_label` es el identificador de la habitación disponible ("204-A") y forma parte de los datos públicos del anuncio: puede incluirse en los datos que `conv-core-lookup-listing` devuelve y que la IA recibe como contexto para elaborar respuestas. En contexto de identidad o contrato del inquilino, `room_label` identifica la habitación asignada al tenant activo y es PII: lo devuelve `conv-core-validate-identity` y nunca debe pasarse a n8n ni a la IA. La distinción la determina el origen del campo: si proviene de datos de un anuncio de listing, es dato público; si proviene de la validación de identidad o del perfil del tenant, es PII.



| Capa | Recibe | Nunca debe recibir |
|---|---|---|
| **n8n** (orquestador) | `session_id` (UUID opaco), `client_account_id`, `message_text` (texto del usuario), `channel`, `identity_level` (enum), `service_code` (si ya enrutado) | `profile_id`, `phone_number`, `full_name`, `room_label` (en contexto de identidad/contrato), `residence_name`, `email`, `assignment_id`, `incident_id` |
| **Edge Functions** (`conv-ingest`, `conv-wa-webhook`, `conv-web-session`) | Todo lo de n8n + `phone_number` (solo para llamar a `conv-core-validate-identity`, nunca en logs) + `profile_id` (almacenado en `conv_sessions`, no reenviado) | — |
| **Proveedor de IA** (Claude API) | `message_text` (texto plano del usuario), resumen anónimo del caso, texto de KB, datos públicos de anuncios (incluido `room_label` como etiqueta de anuncio, no como identificador del inquilino), mensajes del thread (solo texto) | `phone_number`, `full_name`, `profile_id`, `room_label` (en contexto de identidad/contrato del inquilino), `residence_name`, datos contractuales, historial de pagos |
| **`conv_sessions`** (BD) | `profile_id` (FK con RLS), `identity_level`, `identity_data` (jsonb con datos declarados por el usuario) | — |
| **Activity log del Core** | `session_id` (opaco), `client_account_id`, enums de tipo de evento, IDs de referencia (`incident_ref`, `lead_ref`), `channel` | `full_name`, `phone_number`, `room_label`, `profile_id`, `assignment_id`, texto bruto de mensajes |

### 4.2 Regla de inyección posterior de datos personales

Cuando una respuesta del bot debe mencionar datos del inquilino (nombre, número de habitación, importe de pago, fecha de contrato), el proceso es:

```
1. WF llama a EF para obtener los datos del Core (si son necesarios)
2. EF obtiene los datos del Core vía Integration API
3. WF envía a la IA el texto de la tarea con marcadores:
   "Redacta una respuesta confirmando que la incidencia {incident_ref} ha sido registrada."
4. La IA devuelve: "Tu incidencia {incident_ref} ha sido registrada correctamente."
5. La EF sustituye {incident_ref} por "INC-2026-0042" antes de enviar al usuario
6. El usuario recibe: "Tu incidencia INC-2026-0042 ha sido registrada correctamente."
```

Los marcadores válidos son: `{incident_ref}`, `{lead_ref}`, `{due_date}`, `{amount}`, `{bot_name}`. Cualquier marcador nuevo debe definirse explícitamente antes de usarse.

La IA nunca recibe el valor real del marcador en su prompt.

### 4.3 Regla de texto libre del usuario (`message_text`)

`message_text` puede contener PII escrita por el usuario ("Me llamo Juan, habitación 204"). Esto es inevitable en un sistema de chat y está permitido: `message_text` es un campo admitido en el payload que llega a n8n. Las mitigaciones obligatorias son:

- **No almacenar el texto del mensaje en logs de n8n.** Los mensajes solo se almacenan en `conv_messages` con RLS activo.
- **No incluir mensajes antiguos como contexto de la IA más allá de las últimas N interacciones necesarias para la tarea inmediata.** N es configurable por tenant (por defecto: 10 mensajes).
- **La IA extrae entidades del texto pero no las almacena ni las reenvía a terceros.** Las entidades extraídas se persisten en `conv_cases.case_context` por la EF receptora, no por n8n.
- **n8n nunca debe extraer campos de PII estructurados del texto del usuario ni persistirlos como variables tipadas de n8n.** Si el usuario escribe "me llamo Juan, mi email es juan@email.com", n8n puede pasar ese texto a la IA para clasificar la intención, pero no debe parsear el texto y crear variables `name = 'Juan'`, `email = 'juan@email.com'` que circulen por el workflow. La extracción estructurada de datos de contacto (nombre, teléfono, email) es responsabilidad de la EF receptora (`conv-core-create-lead` u otras), que los maneja en un entorno controlado y nunca los devuelve a n8n como campos tipados.

### 4.4 Reglas de logging

| Capa | Qué puede loguearse | Qué nunca debe loguearse |
|---|---|---|
| EFs de canal (`conv-wa-webhook`, `conv-web-message`) | Timestamp, `client_account_id`, tipo de mensaje, `session_id`, resultado (éxito/error) | `phone_number`, texto del mensaje, `profile_id` |
| EFs de Integration API (`conv-core-*`) | Timestamp, `client_account_id`, nombre de la EF, código de respuesta HTTP, latencia | `profile_id`, `full_name`, `phone_number`, `room_label`, texto de descripción de incidencias |
| n8n | Timestamp, `session_id`, `client_account_id`, nombre del workflow, resultado | `message_text`, `profile_id`, `phone_number`, `full_name` |
| EFs de envío (`conv-send-wa`) | Timestamp, `client_account_id`, `session_id`, estado del envío | `phone_number` destino, texto del mensaje enviado |

Los logs de Supabase Edge Functions deben estar bajo RLS que restrinja su lectura al superadmin.

### 4.5 Reglas de auditoría

Los siguientes eventos deben quedar registrados en el audit log del add-on (tabla `audit_log` o equivalente):

| Evento | Datos registrados |
|---|---|
| Sesión Wasender desconectada (`conv-offboard-wa-session`) | `client_account_id`, `mode`, timestamp |
| Suscripción umbrella activada | `client_account_id`, timestamp |
| Incidencia oficial creada | `conv_case_id`, `incident_ref`, `client_account_id`, timestamp |
| Lead creado | `conv_case_id`, `lead_ref`, `client_account_id`, timestamp |
| Caso escalado a admin | `conv_case_id`, `client_account_id`, `reason`, timestamp |
| Caso cerrado | `conv_case_id`, `client_account_id`, `resolution_channel`, timestamp |

El audit log nunca debe incluir `profile_id`, `phone_number`, `full_name`, texto de mensajes ni datos contractuales.

### 4.6 Reglas de retención

| Dato | Retención | Motivo |
|---|---|---|
| `conv_messages.text` | 12 meses desde `created_at` | Historial conversacional para soporte |
| `conv_messages.raw_payload` | 30 días desde `created_at` | Solo necesario para depuración |
| `conv_sessions` | 24 meses desde `last_active_at` | Trazabilidad de sesiones activas |
| `conv_cases` | 36 meses desde `created_at` | Historial de incidencias y leads |
| `conv_send_queue` entradas procesadas | 7 días desde procesamiento | Reintentos y depuración |
| Logs de EFs | 90 días | Depuración operativa |
| Audit log | 5 años | Cumplimiento legal |

La eliminación de datos debe respetar las políticas de retención. No debe eliminarse `conv_cases` con `case_ref_type = 'incident'` antes de los 36 meses sin coordinación con el Core.

### 4.7 Tratamiento de `conv_messages.raw_payload`

El `raw_payload` almacena el payload completo del webhook de Wasender o del mensaje WebChat. Puede contener PII. Las reglas son:

- Solo se almacena en `conv_messages.raw_payload`. Nunca se envía a n8n ni a la IA.
- Solo accesible con `service_role` o mediante el panel de administración con permisos de superadmin.
- Se elimina automáticamente a los 30 días mediante un job programado.

### 4.8 `conv_sessions.identity_data`

Este campo JSONB almacena los datos declarados por el usuario durante el flujo de identificación progresiva (nombre declarado, residencia mencionada). Es sensible porque contiene datos que el usuario ha afirmado tener.

- No debe incluir el `phone_number` en texto claro. Solo el resultado de la validación (`identity_level`).
- Puede incluir `full_name` declarado, `residence_name` declarado y `room_label` declarado si fueron proporcionados por el usuario.
- Estos datos son accesibles por las EFs del add-on para evitar volver a preguntarlos al usuario.
- No deben reenviarse a n8n ni a la IA directamente.

---

## 5. Casos Permitidos

- n8n recibe `identity_level: 'STRONG_MATCH_ACTIVE'` como enum y toma decisiones de enrutado basadas en él.
- Una EF inyecta `{incident_ref}` en el texto generado por la IA antes de enviarlo al usuario.
- `conv_messages.raw_payload` se elimina automáticamente a los 30 días.
- El audit log registra que se creó una incidencia con `incident_ref: 'INC-2026-0042'` sin incluir el nombre del inquilino.
- La IA recibe el texto del mensaje del usuario para clasificar la intención, aunque ese texto contenga el nombre del usuario.

---

## 6. Casos Prohibidos

- Incluir `profile_id`, `phone_number`, `full_name` o `room_label` en los payloads de n8n.
- Pasar datos personales del inquilino (nombre, teléfono, habitación, contrato) al prompt de la IA.
- Almacenar el texto de mensajes en los logs de n8n o de las EFs.
- Incluir `phone_number` o `full_name` en el activity log de SmartRoom Core.
- Eliminar `conv_cases` con `case_ref_type = 'incident'` antes de los 36 meses.
- Exponer `raw_payload` a n8n o al proveedor de IA.
- Sustituir marcadores en el texto generado por la IA antes de enviar el texto a la IA (la sustitución debe ocurrir después).

---

## 7. Impacto en el Diseño

- El diseño de los prompts de IA debe incorporar marcadores desde el principio. No se puede añadir inyección de datos personales como parche posterior a un prompt que ya los usa directamente.
- Las EFs son el único lugar del sistema donde coexisten datos del Core y texto generado por IA. Esta es la única frontera donde se puede realizar la inyección segura.
- El modelo de datos de `conv_sessions.identity_data` debe diseñarse para no almacenar el `phone_number` en texto claro, solo el hash de validación si es necesario para depuración.

---

## 8. Impacto en la Implementación

- Los workflows de n8n deben validarse mediante revisión de código para garantizar que no incluyen campos prohibidos en sus payloads de IA.
- Los jobs de retención (`raw_payload` 30 días, logs 90 días) deben implementarse como Cron Jobs en Supabase desde el primer sprint de implementación.
- El audit log debe implementarse como una tabla separada con permisos de escritura solo para `service_role` y lectura restringida a superadmin.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P9 (minimización de PII)
- `rules-40-identity-validation.md` — restricciones de propagación de PII tras validación
- `rules-70-integration-api.md` — restricciones de datos en EFs de Integration API
- `rules-75-activity-log.md` — restricciones de PII en el activity log del Core

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] Ningún payload de n8n incluye `profile_id`, `phone_number`, `full_name` o `room_label`
- [ ] Los prompts de IA usan marcadores para datos personales, no los valores reales
- [ ] Los marcadores se sustituyen por la EF después de la generación de IA, antes de enviar al usuario
- [ ] `conv_messages.raw_payload` no se envía a n8n ni a la IA
- [ ] Los logs de EFs no incluyen texto de mensajes ni datos personales del inquilino
- [ ] El audit log registra eventos funcionales sin PII del inquilino
- [ ] El job de eliminación de `raw_payload` a 30 días está implementado y funciona
- [ ] `conv_sessions.identity_data` no almacena `phone_number` en texto claro

---

## 11. Notas de Control de Cambios

Añadir un nuevo marcador de inyección de datos personales requiere documentarlo en la Sección 4.2 y coordinar la implementación en las EFs antes de usarlo en prompts.

Modificar los períodos de retención requiere revisión legal y actualización simultánea de este documento y de los jobs de retención implementados.

Cualquier cambio en qué datos recibe la IA requiere revisión de arquitectura y actualización de la Sección 4.1 de este documento y de `rules-00-scope-and-principles.md`.
