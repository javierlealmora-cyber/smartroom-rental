# test-permissions-and-privacy-spec.md — Especificación de Pruebas: Permisos y Privacidad

## 1. Objetivo

Verificar que la política de minimización de PII definida en `rules-80-data-and-privacy.md` se cumple en todas las capas del sistema: que n8n nunca recibe datos personales del inquilino, que el proveedor de IA solo recibe datos públicos y marcadores (nunca valores reales), que el mecanismo de inyección posterior de marcadores funciona correctamente, que las restricciones de acceso por nivel de identidad se aplican en cada servicio, y que los logs del add-on no contienen PII.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Tabla definitiva de PII por capa (n8n, EFs, IA, BD) | Lógica de matching del Core para validar identidad |
| Mecanismo de marcadores: generación y sustitución | Políticas de retención de datos (cubiertos en `rules-80`) |
| Restricciones de acceso por nivel de identidad en los 3 servicios | Configuración de RLS en Supabase |
| Reglas de logging: qué puede y no puede loguearse | Panel de administración de privacidad |
| Restricciones del activity log del Core (sin PII) | Gestión de eliminación de datos después de retención |
| `conv_sessions.identity_data`: qué contiene y qué no | |
| `conv_messages.raw_payload`: acceso restringido y eliminación | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-80-data-and-privacy.md` | §4.1 | Tabla definitiva de PII por capa |
| `rules-80-data-and-privacy.md` | §4.2 | Mecanismo de inyección posterior de marcadores |
| `rules-80-data-and-privacy.md` | §4.3 | `message_text` puede contener PII del usuario; mitigaciones |
| `rules-80-data-and-privacy.md` | §4.4 | Reglas de logging por capa |
| `rules-80-data-and-privacy.md` | §4.5 | Audit log sin PII del inquilino |
| `rules-80-data-and-privacy.md` | §4.7 | `conv_messages.raw_payload`: solo acceso con `service_role` o superadmin |
| `rules-80-data-and-privacy.md` | §4.8 | `conv_sessions.identity_data`: qué contiene, qué no |
| `rules-00-scope-and-principles.md` | §4.5 | `profile_id` almacenado en EF; nunca a n8n |
| `rules-75-activity-log.md` | §4.4 | Activity log del Core sin PII |
| `rules-40-identity-validation.md` | §4.6 | Matriz de acciones permitidas por nivel |

---

## 4. Precondiciones

- Sesiones con todos los niveles de identidad disponibles para prueba.
- EFs instrumentadas para registrar los payloads enviados a n8n y al proveedor de IA.
- Acceso al log técnico del add-on para verificar ausencia de PII.
- `conv_sessions.identity_data` con datos de prueba cargados.
- `conv_messages.raw_payload` con datos de prueba para verificar restricción de acceso.

---

## 5. Escenarios de Prueba

### Bloque PII — Capa n8n: campos prohibidos

**PII-01: Payload de WF-01 a n8n no contiene `profile_id`**

- **Precondición**: `conv-ingest` ha validado identidad y almacenado `profile_id = 'prof-uuid-001'` en `conv_sessions`.
- **Acción**: `conv-ingest` dispara WF-01 vía HTTP POST a n8n.
- **Resultado esperado**:
  - Payload a WF-01: `{ session_id, client_account_id, message_text, channel, identity_level }`.
  - Campo `profile_id` **ausente** en el payload.
  - Campo `phone_number` **ausente** en el payload.
- **Regla cubierta**: `rules-80` §4.1; `rules-00` §4.5.

---

**PII-02: Payload de WF-01 a n8n no contiene `full_name`, `room_label`, ni `assignment_id`**

- **Precondición**: `conv_sessions.identity_data` contiene `{ full_name: "María García", room_label: "204", assignment_id: "assign-001" }`.
- **Acción**: Nuevo mensaje entrante dispara WF-01.
- **Resultado esperado**:
  - Payload a WF-01 no contiene ninguno de: `full_name`, `room_label`, `residence_name`, `assignment_id`, `email`.
  - Solo contiene campos permitidos de la tabla §4.1.
- **Regla cubierta**: `rules-80` §4.1.

---

**PII-03: `identity_level` en n8n es siempre un enum, no texto libre con datos personales**

- **Precondición**: Usuario con `STRONG_MATCH_ACTIVE`.
- **Resultado esperado**:
  - n8n recibe `identity_level: 'STRONG_MATCH_ACTIVE'` (enum opaco).
  - n8n **no** recibe `{ identity_level: 'STRONG - María García hab 204 Residencia Sol' }`.
- **Regla cubierta**: `rules-80` §4.1.

---

**PII-04: Ningún workflow de n8n (WF-10/20/30/40/IDENTITY) incluye `profile_id` en sus payloads internos**

- **Precondición**: Flujo completo de incidencias ejecutado (WF-01 → WF-10 → WF-20 → EF).
- **Resultado esperado**:
  - Revisión de todos los payloads intercambiados entre workflows de n8n: `profile_id` ausente en todos.
  - La EF obtiene `profile_id` directamente de `conv_sessions` con `service_role` cuando lo necesita.
- **Regla cubierta**: `rules-80` §4.1; §3.4.

---

### Bloque PII — Capa IA: datos prohibidos en prompts

**PII-05: Prompt de clasificación de intención (WF-10) no contiene PII del inquilino**

- **Precondición**: Sesión con `STRONG_MATCH_ACTIVE`. Mensaje del usuario: "Hay una gotera en mi habitación 204".
- **Acción**: WF-10 construye el prompt de clasificación de intención.
- **Resultado esperado**:
  - Prompt contiene: `message_text` (el texto tal como lo escribió el usuario), lista de `service_code` activos.
  - Prompt **no** contiene: `profile_id`, `full_name`, `room_label` (aunque el usuario lo mencionó en el texto).
  - **Nota:** `message_text` puede contener PII escrita espontáneamente por el usuario ("Soy Juan de la habitación 204"). Esto es inevitable en un sistema de chat. Lo que está prohibido es añadir al prompt PII estructurada procedente del Core, `identity_data` o payloads internos — es decir, campos como `profile_id`, `full_name` del Core, `room_label` del contrato, etc. La IA procesa el texto libre del usuario, pero los datos estructurados extraídos de él no deben persistirse en n8n ni reenviarse fuera de la capa de EFs.
- **Regla cubierta**: `rules-80` §4.1; §4.3.

---

**PII-06: Prompt de WF-40 (ayuda) no contiene datos contractuales del inquilino como valores directos**

- **Precondición**: `STRONG_MATCH_ACTIVE`. Usuario pregunta por fecha de fin de contrato.
- **Acción**: EF construye prompt para IA con marcador.
- **Resultado esperado**:
  - Prompt: `"El inquilino pregunta por su fecha de fin de contrato. Redacta una respuesta indicando que el contrato finaliza el {contract_end_date}."`.
  - Prompt **no contiene**: `"El contrato finaliza el 2026-08-31"`.
  - La IA nunca recibe el valor real de la fecha.
- **Regla cubierta**: `rules-80` §4.1; §4.2.

---

**PII-07: Prompt de WF-30 (publicaciones) no contiene datos de inquilinos actuales del anuncio**

- **Precondición**: `UNVERIFIED_LEAD`. El Core devuelve datos del anuncio incluyendo nombre del inquilino actual.
- **Acción**: EF construye prompt para IA con datos del anuncio.
- **Resultado esperado**:
  - Prompt contiene: precio, disponibilidad, condiciones generales, fotos.
  - Prompt **no contiene**: nombre del inquilino actual, fecha de su contrato, historial de pagos.
- **Regla cubierta**: `rules-80` §4.1; `rules-61` §4.5.

---

**PII-08: Prompt de WF-20 (incidencias) no contiene descripción de incidencia enviada al Core**

- **Precondición**: IA extrae `description` del mensaje del usuario. EF crea incidencia en el Core con esa descripción.
- **Resultado esperado**:
  - El prompt de confirmación al usuario usa marcador: `"La incidencia {incident_ref} ha sido registrada."`.
  - La descripción literal de la incidencia no vuelve a enviarse a la IA como confirmación.
  - La IA nunca recibe el `incident_id` o `incident_ref` real como input.
- **Regla cubierta**: `rules-80` §4.2.

---

### Bloque PII — Mecanismo de marcadores

**PII-09: `{incident_ref}` sustituido por la EF después de la generación de IA**

- **Precondición**: `conv-core-create-incident` devuelve `incident_ref = 'INC-2026-0042'`.
- **Secuencia verificable**:
  1. EF envía prompt a IA: `"Confirma que la incidencia {incident_ref} ha sido registrada con tiempo estimado de 24h."`.
  2. IA devuelve: `"Tu incidencia {incident_ref} ha sido registrada. Tiempo estimado: 24h."`.
  3. EF sustituye `{incident_ref}` → `'INC-2026-0042'`.
  4. EF construye `CanonicalResponse { text: "Tu incidencia INC-2026-0042 ha sido registrada. Tiempo estimado: 24h." }`.
- **Resultado esperado**:
  - La IA nunca recibió `INC-2026-0042` como input.
  - El usuario recibe el mensaje con el valor real.
- **Regla cubierta**: `rules-80` §4.2.

---

**PII-10: Marcadores definidos en `rules-80` §4.2 son los únicos permitidos**

- **Precondición**: Implementación de un nuevo marcador no definido, p.ej. `{tenant_phone}`.
- **Resultado esperado**:
  - La EF rechaza el marcador no reconocido.
  - El marcador no sustituido nunca llega al usuario final.
  - El evento se registra en logs del add-on como error de implementación.
- **Regla cubierta**: `rules-80` §4.2 — "cualquier marcador nuevo debe definirse explícitamente antes de usarse".

---

**PII-11: La sustitución de marcadores ocurre DESPUÉS de la generación de IA, nunca antes**

- **Precondición**: Flujo de confirmación de incidencia.
- **Resultado esperado**:
  - Si la sustitución ocurriera antes, la IA recibiría `INC-2026-0042` como texto.
  - La secuencia correcta: IA genera texto con `{incident_ref}` → EF sustituye → usuario recibe texto con valor real.
  - No existe ningún camino en el código donde el valor real llegue al prompt de IA.
- **Regla cubierta**: `rules-80` §6 — "sustituir marcadores antes de enviar el texto a la IA es un caso prohibido".

---

### Bloque PII — Restricciones de logging

**PII-12: Logs de EFs de canal no contienen `phone_number` ni texto del mensaje**

- **Precondición**: `conv-wa-webhook` procesa un mensaje de WhatsApp.
- **Resultado esperado**:
  - Log de la EF contiene: timestamp, `client_account_id`, tipo de mensaje, `session_id`, resultado.
  - Log **no contiene**: `phone_number`, texto del mensaje, `profile_id`.
- **Regla cubierta**: `rules-80` §4.4.

---

**PII-13: Logs de EFs de Integration API no contienen `full_name` ni `room_label`**

- **Precondición**: `conv-core-create-incident` completa una llamada al Core.
- **Resultado esperado**:
  - Log contiene: timestamp, `client_account_id`, nombre de la EF, código de respuesta HTTP, latencia.
  - Log **no contiene**: `profile_id`, `full_name`, `phone_number`, `room_label`, texto de la descripción de la incidencia.
- **Regla cubierta**: `rules-80` §4.4.

---

**PII-14: Logs de n8n no contienen `message_text`, `profile_id` ni `phone_number`**

- **Precondición**: WF-10 completa un ciclo de enrutado.
- **Resultado esperado**:
  - Log de n8n contiene: timestamp, `session_id`, `client_account_id`, nombre del workflow, resultado.
  - Log **no contiene**: `message_text`, `profile_id`, `phone_number`, `full_name`.
- **Regla cubierta**: `rules-80` §4.4.

---

**PII-15: `conv_messages.raw_payload` no accesible desde n8n ni desde el proveedor de IA**

- **Precondición**: `conv_messages` con `raw_payload` del webhook de Wasender (puede contener PII).
- **Resultado esperado**:
  - `raw_payload` no se incluye en ningún payload enviado a n8n.
  - `raw_payload` no se incluye en ningún prompt enviado a la IA.
  - Solo accesible con `service_role` o mediante panel de administración con permisos de superadmin.
- **Regla cubierta**: `rules-80` §4.7.

---

**PII-16: `conv_sessions.identity_data` no contiene `phone_number` en texto claro**

- **Precondición**: Fast-path WhatsApp: teléfono usado para validación, `STRONG_MATCH_ACTIVE` obtenido.
- **Resultado esperado**:
  - `conv_sessions.identity_data` puede contener `full_name` declarado, `residence_name` declarado.
  - `conv_sessions.identity_data` **no** contiene `phone_number` en texto claro.
- **Regla cubierta**: `rules-80` §4.8.

---

### Bloque PII — Restricciones de acceso por nivel de identidad

**PII-17: `NO_MATCH` no puede ver datos contractuales en ningún servicio**

- **Precondición**: Sesión con `identity_level = 'NO_MATCH'`. Usuario intenta acceder a fecha de contrato (WF-40), crear incidencia oficial (WF-20), o ver balance (WF-40).
- **Resultado esperado**:
  - WF-40: requiere identificación para datos contractuales → WF-IDENTITY activado.
  - WF-20: pre-incidencia no creada; requiere al menos `PARTIAL_MATCH_ACTIVE`.
  - En ningún caso se exponen datos contractuales a `NO_MATCH`.
- **Regla cubierta**: `rules-40` §4.6.

---

**PII-18: `UNVERIFIED_LEAD` no puede acceder a datos de otros inquilinos**

- **Precondición**: `identity_level = 'UNVERIFIED_LEAD'`. Usuario pregunta por el inquilino actual de una habitación.
- **Resultado esperado**:
  - WF-30 y WF-40 responden con datos públicos del anuncio únicamente.
  - Nombre, teléfono o contrato del inquilino actual no se revelan.
- **Regla cubierta**: `rules-61` §4.5; `rules-80` §4.1.

---

**PII-19: Datos contractuales propios solo para `STRONG_MATCH_ACTIVE`**

- **Precondición**: Sesión con `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Usuario pregunta por su saldo pendiente.
- **Resultado esperado**:
  - WF-40 detecta que se requiere `STRONG_MATCH_ACTIVE`.
  - Activa WF-IDENTITY para mejorar el nivel.
  - Si el nivel no mejora: escalado a admin o respuesta genérica.
  - El saldo pendiente nunca se revela a `PARTIAL_MATCH_ACTIVE`.
- **Regla cubierta**: `rules-62` §4.3; `rules-40` §4.6.

---

**PII-20: Activity log del Core no recibe PII del inquilino en ningún evento**

- **Precondición**: Flujo completo: sesión nueva, validación, incidencia creada, caso cerrado (4 eventos publicados).
- **Resultado esperado**:
  - Revisión de todos los payloads enviados a `conv-core-publish-activity`.
  - Campos ausentes en todos los eventos: `full_name`, `phone_number`, `room_label`, `profile_id`, `assignment_id`, texto bruto de mensajes.
  - Solo presentes: `session_id` (UUID opaco), `client_account_id`, enums de tipo de evento, IDs de referencia.
- **Regla cubierta**: `rules-75` §4.4; `rules-80` §4.1.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| PII-NEG-01 | `profile_id` incluido en payload de WF-01 a n8n | Violación de `rules-80` §4.1; campo prohibido en la capa n8n |
| PII-NEG-02 | `phone_number` del usuario WA logueado en logs de la EF de canal | Violación de `rules-80` §4.4; el teléfono nunca en logs |
| PII-NEG-03 | IA recibe `full_name = "María García"` directamente en el prompt (no como marcador) | Violación de `rules-80` §4.1; usar marcador `{user_name}` |
| PII-NEG-04 | Marcador `{incident_ref}` sustituido ANTES de enviar el texto a la IA | Violación de `rules-80` §6; la sustitución ocurre DESPUÉS |
| PII-NEG-05 | `conv_messages.raw_payload` incluido en payload de n8n | Violación de `rules-80` §4.7; `raw_payload` no a n8n |
| PII-NEG-06 | `PARTIAL_MATCH_ACTIVE` accede a saldo pendiente sin mejora de identidad | Violación de `rules-62` §4.3; requiere `STRONG_MATCH_ACTIVE` |
| PII-NEG-07 | Activity log del Core incluye texto bruto del mensaje del usuario | Violación de `rules-75` §4.4; el activity log no recibe mensajes brutos |
| PII-NEG-08 | `conv_sessions.identity_data` almacena `phone_number` en texto claro | Violación de `rules-80` §4.8 |

---

## 7. Datos de Prueba

```json
{
  "pii_fields_prohibited_in_n8n": [
    "profile_id", "phone_number", "full_name", "room_label",
    "residence_name", "email", "assignment_id"
  ],
  "note_incident_id": "incident_id es un identificador de referencia sensible/minimizado, no PII pura. Puede aparecer en el activity log del Core como parte del payload oficial de conv_incident_created.",
  "pii_fields_prohibited_in_ai_prompts": [
    "phone_number", "full_name", "profile_id", "room_label",
    "residence_name", "contract_start", "contract_end",
    "payment_history", "tenant_name"
  ],
  "allowed_markers": [
    "{incident_ref}", "{lead_ref}", "{due_date}", "{amount}", "{bot_name}", "{contract_end_date}"
  ],
  "prohibited_markers": [
    "{tenant_phone}", "{tenant_name}", "{room_number}", "{profile_id}"
  ],
  "allowed_fields_in_activity_log": [
    "session_id", "client_account_id", "event_type", "conv_case_id", "channel", "identity_level",
    "incident_id", "incident_ref", "incident_type", "urgency",
    "lead_id", "lead_ref", "listing_id", "interest_type",
    "case_ref_type", "escalation_reason", "resolution_channel", "updated_by"
  ],
  "identity_data_allowed": ["full_name", "residence_name", "room_label"],
  "identity_data_prohibited": ["phone_number"],
  "test_pii_values": {
    "profile_id": "prof-pii-test-001",
    "phone_number": "+34612345678",
    "full_name": "María García López",
    "room_label": "204",
    "residence_name": "Residencia Sol Mediterráneo",
    "contract_end_date": "2026-08-31",
    "pending_balance": 125.50
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| n8n libre de PII estructurada | Revisión de 20 payloads de n8n: ningún campo prohibido presente |
| IA libre de PII directa | Revisión de 20 prompts enviados al proveedor: PII solo como marcadores `{...}` |
| Marcadores sustituidos post-IA | La secuencia en código: IA genera marcador → EF sustituye → usuario recibe valor real |
| Logs sin PII | Revisión de logs de EFs de canal, Integration API y n8n: campos prohibidos ausentes |
| `raw_payload` restringido | Solo accesible con `service_role` o superadmin; ausente de payloads a n8n |
| Restricciones por nivel aplicadas | Matrix completa verificada para `NO_MATCH`, `PARTIAL`, `STRONG`, `UNVERIFIED_LEAD` |
| Activity log sin PII | Todos los eventos publicados: campos prohibidos ausentes |
| `identity_data` sin teléfono en claro | `conv_sessions.identity_data` nunca almacena `phone_number` en texto claro |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-80-data-and-privacy.md` | Fuente de verdad completa de este spec |
| `rules-00-scope-and-principles.md` §4.5 | Principio P9: minimización de PII; `profile_id` no a n8n |
| `rules-40-identity-validation.md` §4.6 | Matriz de acciones permitidas por nivel |
| `rules-75-activity-log.md` §4.4 | Restricciones de PII en el activity log del Core |
| `rules-60-service-incidents.md` | Restricciones del flujo de incidencias |
| `rules-61-service-listings.md` §4.5 | IA no recibe datos de inquilinos en WF-30 |
| `rules-62-service-help.md` §4.3 | Datos contractuales: `STRONG_MATCH_ACTIVE` requerido |
| `skill-ai-usage-boundaries.md` | Mecanismo de marcadores y límites de la IA |
| `diagram-integration-api-boundary.md` | Separación de las tres capas de autenticación |
