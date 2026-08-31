# test-create-incident-contract.md — smart-incidents: Verificación Documental del Contrato de Creación de Incidencia

## 1. Objetivo

Verificar que `contract-create-incident-request.md` (v1.0) cumple íntegramente las rules del add-on `smart-incidents` y es compatible con el contrato de entidad y con la implementación de SmartConversations como consumer. Este test es de naturaleza documental: no ejecuta código, no conecta a base de datos, no invoca ningún endpoint real. Cada escenario se verifica revisando el contenido de los documentos canónicos.

---

## 2. Alcance

Este test documental cubre:

- La existencia, estructura y versión del contrato provider.
- La correcta ubicación de cada campo en el request.
- La separación entre actor técnico y requester humano.
- La obligatoriedad de `description` (no nullable, 10–4000 chars) y su restricción adicional vs. rules-30 §4.2.
- La responsabilidad de `title` y el fallback determinista con tabla exhaustiva de cinco etiquetas en español.
- El mapping de `urgency_proposal → priority`.
- El estado diferido de adjuntos.
- Los campos de identidad prohibidos y la PII de canal.
- El modelo de idempotencia (scope, replay, conflicto, concurrencia, hash).
- La structure exacta de la response.
- Los 15 errores canónicos y ninguno más.
- Los requisitos de autenticación y autorización.
- El entitlement del add-on.
- El aislamiento cross-tenant.
- La no dependencia de n8n como productor.
- Las fronteras entre módulos (`conv_*`, `inc_*`).
- La actividad interna única en creación.
- La ausencia de eventos externos no reglados.

Este test no cubre: implementación de la EF provider, lógica de la EF de SC, rutas HTTP, mecanismo de autenticación concreto (pendiente de SI-P3), ni algoritmo de hash (pendiente de SI-P5).

---

## 3. Reglas y contratos cubiertos

| Documento | Secciones relevantes |
|---|---|
| `contract-create-incident-request.md` | Todas — documento bajo test |
| `rules-00-scope-and-principles.md` | §3.7, §4.3, §4.6, §4.7 |
| `rules-05-roles-and-visibility.md` | §4.1, §4.5 |
| `rules-10-addon-entitlement.md` | §4.1, §4.3, §4.4, §4.5, §4.6 |
| `rules-20-incident-lifecycle.md` | §3.2, §4.5 |
| `rules-30-incident-creation.md` | §4.1, §4.2, §4.4, §4.5, §4.9, §4.10, §4.11 |
| `rules-80-security-and-tenancy.md` | §4.1, §4.2, §4.3.1, §4.4, §4.5, §4.6, §4.7, §4.8 |
| `contract-incident-entity.md` | §4.1, §4.3, §4.4 |
| `integration/incident-provider-si-p1-reconciliation.md` | SC-SI-01 |

---

## 4. Precondiciones

- El fichero `docs/smart-incidents/contracts/contract-create-incident-request.md` existe en la ruta canónica.
- Los documentos de §3 están disponibles para lectura.
- No se requiere ningún entorno de ejecución.
- No se requieren credenciales, usuarios reales ni datos de producción.
- El revisor tiene acceso de lectura al repositorio en el estado actual de `develop`.

---

## 5. Escenarios de prueba

Cada escenario indica el identificador, la descripción, el documento de referencia que traza la regla y el criterio de verificación documental.

### E-01 — Existencia del contrato

**Referencia:** `rules-30-incident-creation.md` §4.5; `rules-01-document-authoring-standard.md` §4.1

**Verificación:** El fichero `docs/smart-incidents/contracts/contract-create-incident-request.md` existe. Su nombre sigue el patrón `contract-topic-name.md` del estándar global. Su ubicación es la ruta canónica `docs/smart-incidents/contracts/`.

### E-02 — Versión del contrato

**Referencia:** `contract-create-incident-request.md` §11

**Verificación:** El contrato declara `contract_version: "1.0"` como único valor válido. El contrato declara estado `INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING`. No declara implementación del provider.

### E-03 — `additionalProperties = false`

**Referencia:** `contract-create-incident-request.md` §5.1; `rules-80-security-and-tenancy.md` §4.3

**Verificación:** El contrato declara explícitamente `additionalProperties = false` en: (a) el objeto raíz, (b) el objeto `actor`, (c) el objeto `incident`. El contrato establece que cualquier campo fuera de los definidos produce `VALIDATION_ERROR`.

### E-04 — Placement de `requester_profile_id` en la raíz

**Referencia:** `contract-create-incident-request.md` §5.1, §6.1; `rules-30-incident-creation.md` §4.2; `rules-80-security-and-tenancy.md` §4.3.1

**Verificación:** `requester_profile_id` aparece en la sección de campos obligatorios de la raíz (§6.1). No aparece dentro del objeto `incident`. El contrato declara explícitamente que `requester_profile_id` no puede ubicarse dentro de `incident`. El ejemplo inválido 10.1 demuestra el rechazo.

### E-05 — Placement de `external_request_reference` en la raíz

**Referencia:** `contract-create-incident-request.md` §5.1, §6.1; `integration/incident-provider-si-p1-reconciliation.md` SC-SI-01

**Verificación:** `external_request_reference` aparece en la sección de campos obligatorios de la raíz (§6.1) con valor `null` en v1.0. No aparece dentro del objeto `incident`. El contrato declara que no puede ubicarse dentro de `incident`. El ejemplo inválido 10.2 demuestra el rechazo. El contrato referencia explícitamente SC-SI-01 y su resolución.

### E-06 — Separación actor/requester

**Referencia:** `contract-create-incident-request.md` §6.1, §6.2; `rules-80-security-and-tenancy.md` §4.2

**Verificación:** El contrato define `actor` (objeto que identifica al caller técnico) y `requester_profile_id` (UUID que identifica al tenant solicitante) como campos separados, con ubicaciones distintas (ambos en raíz) y semánticas distintas. El contrato declara explícitamente que "actor y requester son identidades distintas y ninguno sustituye al otro".

### E-07 — Actor técnico: único valor `"system"`

**Referencia:** `contract-create-incident-request.md` §6.2; `rules-05-roles-and-visibility.md` §4.5; `rules-80-security-and-tenancy.md` §4.2

**Verificación:** El contrato especifica que `actor.type` acepta únicamente `"system"`. Los valores `"system_service"`, `"tenant"`, `"client_admin"` y cualquier otro están explícitamente excluidos. El ejemplo inválido 10.3 demuestra el rechazo de `"system_service"`. No se aceptan propiedades adicionales en `actor`.

### E-08 — `requester_profile_id` obligatorio

**Referencia:** `contract-create-incident-request.md` §6.1, §8.4; `rules-30-incident-creation.md` §4.2; `rules-80-security-and-tenancy.md` §4.3.1

**Verificación:** `requester_profile_id` aparece en la sección §6 (Campos obligatorios) del contrato. El contrato define el error `REQUESTER_NOT_ALLOWED` para el caso en que el campo está presente pero no supera la validación del provider. La ausencia del campo produce `VALIDATION_ERROR`.

### E-09 — `title`: obligatorio y límites

**Referencia:** `contract-create-incident-request.md` §6.3, §8.6; `rules-30-incident-creation.md` §4.2

**Verificación:** `title` aparece en §6.3 (campos obligatorios dentro de `incident`) con límites 5–120 caracteres. El contrato define la responsabilidad del consumer (`CONSUMER_OBLIGATORIO`), el fallback determinista con sus reglas, y el caso donde el consumer no debe invocar si no puede generar un título válido. El ejemplo inválido 10.7 demuestra el rechazo por longitud inferior a 5. El contrato incluye la nota de compatibilidad con `contract-incident-entity.md` (límite de almacenamiento 255 vs límite contractual 120).

### E-10 — `description`: obligatoria, no nullable, límites 10–4000

**Referencia:** `contract-create-incident-request.md` §6.3; `rules-30-incident-creation.md` §4.2; `contract-incident-entity.md` §4.1

**Verificación:** `description` aparece en §6.3 (Campos obligatorios dentro de `incident`), no en §7 (Campos opcionales). El contrato declara que `description` es obligatoria en v1.0, tipo `string`, no nullable. El valor `null` produce `VALIDATION_ERROR`. La ausencia del campo produce `VALIDATION_ERROR`. Cuando presente debe tener entre 10 y 4000 caracteres, trimmed, no vacía. No debe contener payload raw del canal ni prompts o respuestas raw de IA. El contrato incluye los ejemplos inválidos 10.11 (`description = null`) y 10.12 (`description` ausente). El contrato nota explícitamente que esta restricción adicional respecto a `rules-30-incident-creation.md` §4.2 es una decisión del provider para la integración conversacional v1.0.

### E-11 — `source_system`: valor literal exacto

**Referencia:** `contract-create-incident-request.md` §6.1; `rules-00-scope-and-principles.md` §4.3

**Verificación:** El contrato especifica que `source_system` acepta únicamente el literal `"smart_conversations"`. El contrato declara que no se aceptan nombres de workflow, n8n, Wasender ni canal.

### E-12 — `source_channel`: enum restringido

**Referencia:** `contract-create-incident-request.md` §6.1; `rules-00-scope-and-principles.md` §4.3

**Verificación:** El contrato especifica que `source_channel` acepta únicamente `"whatsapp"` y `"webchat"`. El contrato declara que el canal no actúa como identidad ni autorización.

### E-13 — `category`: enum de cinco valores exactos

**Referencia:** `contract-create-incident-request.md` §6.3; `rules-30-incident-creation.md` §4.3; `contract-incident-entity.md` §4.3

**Verificación:** El contrato lista los cinco valores válidos: `"maintenance"`, `"noise"`, `"security"`, `"billing"`, `"other"`. El contrato define el error `INVALID_CATEGORY` para valores fuera del enum.

### E-14 — `priority`: enum de dos valores exactos

**Referencia:** `contract-create-incident-request.md` §6.3; `rules-30-incident-creation.md` §4.4; `contract-incident-entity.md` §4.4

**Verificación:** El contrato lista los dos valores válidos: `"normal"` y `"urgent"`. El contrato define el error `INVALID_PRIORITY` para valores fuera del enum. No existe `"critical"` ni ningún valor adicional en v1.0.

### E-15 — Mapping `urgency_proposal → priority`

**Referencia:** `contract-create-incident-request.md` §8.7; `rules-30-incident-creation.md` §4.4, §4.5

**Verificación:** El contrato incluye la tabla de mapping completa: `low` → `normal`, `medium` → `normal`, `high` → `urgent`, ausente o `null` → `normal`, valor desconocido → no invocar. El contrato declara que el mapping es responsabilidad del consumer/adapter, no del provider. El contrato prohíbe `urgency_proposal` como campo en el payload (§8.2). El contrato prohíbe rebajar silenciosamente `"urgent"` a `"normal"`. El ejemplo inválido 10.5 demuestra el rechazo.

### E-16 — Adjuntos diferidos (`ATTACHMENTS_DEFERRED`)

**Referencia:** `contract-create-incident-request.md` §7.1, §8.12; `rules-30-incident-creation.md` §4.2

**Verificación:** El contrato declara que `attachments` en v1.0 solo acepta `[]` o la omisión del campo. El contrato define el error `ATTACHMENTS_NOT_SUPPORTED` para arrays no vacíos. No define binarios, URLs firmadas, referencias de storage ni antivirus. El ejemplo inválido 10.4 demuestra el rechazo.

### E-17 — Campos de identidad prohibidos

**Referencia:** `contract-create-incident-request.md` §8.2; `rules-80-security-and-tenancy.md` §4.7

**Verificación:** El contrato lista explícitamente en §8.2 los campos de identidad prohibidos: `identity_level`, `identity_verified`, `verified`, `identity_data`, `STRONG_MATCH_ACTIVE`, `PARTIAL_MATCH_ACTIVE`, `MATCH_INACTIVE`, `NO_MATCH`, `UNVERIFIED_LEAD`. El ejemplo inválido 10.8 demuestra el rechazo de `identity_level` en `actor`. El contrato declara que el provider no usa ninguno de estos estados para validar el requester.

### E-18 — PII de canal prohibida

**Referencia:** `contract-create-incident-request.md` §8.2; `rules-80-security-and-tenancy.md` §4.7

**Verificación:** El contrato lista explícitamente en §8.2 los campos de PII de canal prohibidos: teléfono, email, JID, `wa_jid`, `sender_ref`, `raw_payload`, token WebChat, metadata de Wasender, metadata de n8n, prompts, respuestas raw de IA. El contrato declara que el provider no realiza resolución de identidad conversacional.

### E-19 — `assignee` prohibido en el request v1.0

**Referencia:** `contract-create-incident-request.md` §8.2; `contract-incident-entity.md` §3.1; `rules-30-incident-creation.md` §4.6

**Verificación:** Los campos `assignee` y `resolver_id` aparecen en la lista de campos prohibidos de §8.2. El contrato no los define como campos opcionales ni en la raíz ni en `incident`. La asignación queda diferida al Lote 3 (`rules-40-assignment-routing.md`).

### E-20 — Scope de idempotencia

**Referencia:** `contract-create-incident-request.md` §8.5

**Verificación:** El contrato define explícitamente el scope: `client_account_id + "create_incident" + idempotency_key`. El contrato especifica que `request_id` y `correlation_id` quedan excluidos del scope. La `idempotency_key` tiene longitud entre 16 y 128 caracteres y no contiene PII.

### E-21 — Replay exacto

**Referencia:** `contract-create-incident-request.md` §5.2, §8.5

**Verificación:** El contrato define que en un replay exacto (misma clave, mismo hash funcional): (a) no se crea otra incidencia, (b) se devuelven los mismos `incident_id`, `incident_reference`, `status` y `created_at`, (c) `request_id` y `correlation_id` reflejan la invocación actual, (d) `idempotent_replay = true`, (e) no se duplican registros en `inc_activities`, (f) no se duplican publicaciones externas. El ejemplo válido 9.3 ilustra la response de replay.

### E-22 — Conflicto de idempotencia

**Referencia:** `contract-create-incident-request.md` §8.5, §8.12

**Verificación:** El contrato define que ante misma clave con hash funcional diferente: (a) se devuelve `IDEMPOTENCY_CONFLICT`, (b) HTTP 409, (c) `retryable = false`, (d) no se crea ninguna incidencia, (e) no se registra actividad.

### E-23 — Concurrencia

**Referencia:** `contract-create-incident-request.md` §8.5

**Verificación:** El contrato declara que: (a) como máximo se crea una incidencia por clave de idempotencia, (b) la segunda solicitud concurrente espera el resultado o recibe el replay, (c) no puede producirse doble persistencia.

### E-24 — Hash funcional de idempotencia

**Referencia:** `contract-create-incident-request.md` §8.5

**Verificación:** El contrato define que el hash funcional incluye los campos que determinan la identidad de la operación de negocio. El contrato define explícitamente qué queda excluido del hash: `request_id`, `correlation_id`, timestamps de transporte, credenciales y secretos. El contrato declara que no se deduplicará por título o descripción. El algoritmo criptográfico concreto y el mecanismo de almacenamiento se delegan a SI-P5 (estado `DESIGNED_NOT_IMPLEMENTED`).

### E-25 — Response v1.0

**Referencia:** `contract-create-incident-request.md` §5.2; `rules-20-incident-lifecycle.md` §3.2

**Verificación:** El contrato define la estructura exacta de la response con los campos: `contract_version`, `request_id`, `correlation_id`, `incident_id`, `incident_reference`, `status`, `created_at`, `idempotent_replay`. El contrato declara que `status` siempre es `"new"`. La response no contiene: modelo completo de la incidencia, datos del requester, datos del alojamiento, PII, secretos ni datos internos.

### E-26 — Exactamente 15 errores canónicos

**Referencia:** `contract-create-incident-request.md` §8.12; `incidents-integration-port.ts` (comparación)

**Verificación:** El contrato define exactamente estos 15 errores con su HTTP y retryabilidad:
`UNSUPPORTED_CONTRACT_VERSION` (400), `VALIDATION_ERROR` (400), `AUTHENTICATION_REQUIRED` (401), `CALLER_NOT_AUTHORIZED` (403), `FEATURE_DISABLED` (403), `RESOURCE_NOT_FOUND` (404), `REQUESTER_NOT_ALLOWED` (403), `INVALID_CATEGORY` (422), `INVALID_PRIORITY` (422), `ATTACHMENTS_NOT_SUPPORTED` (422), `IDEMPOTENCY_CONFLICT` (409), `RATE_LIMITED` (429), `DEPENDENCY_UNAVAILABLE` (503), `PROVIDER_TIMEOUT` (504), `INTERNAL_ERROR` (500).

No existe ningún error adicional. Los 15 códigos coinciden exactamente con `ProviderErrorCode` en `incidents-integration-port.ts`. El contrato declara que los errores internos no contractuales se colapsan a `INTERNAL_ERROR`.

### E-27 — Autenticación sin `service_role` compartido

**Referencia:** `contract-create-incident-request.md` §8.3; `rules-80-security-and-tenancy.md` §4.5

**Verificación:** El contrato declara explícitamente que no se acepta: `service_role` compartido como credencial provider, JWT de usuario como credencial provider, invocación desde navegador, invocación directa desde n8n. El contrato declara estado `CONTRACT_REQUIREMENTS_DEFINED / IMPLEMENTATION_PENDING / DEV_VERIFICATION_PENDING` para el mecanismo de autenticación.

### E-28 — Autorización caller–tenant

**Referencia:** `contract-create-incident-request.md` §8.3; `rules-80-security-and-tenancy.md` §4.1

**Verificación:** El contrato declara que la posesión de una credencial válida no implica autorización para un `client_account_id` específico. El provider debe vincular server-side: (1) el caller autenticado, (2) la operación, y (3) el `client_account_id` solicitado. Un caller con entitlement activo en su `client_account` no queda automáticamente autorizado para otros tenants. El error `CALLER_NOT_AUTHORIZED` cubre el caso de caller autenticado pero sin autorización para el tenant.

### E-29 — Entitlement del add-on

**Referencia:** `contract-create-incident-request.md` §8.3, §8.10; `rules-10-addon-entitlement.md` §4.1, §4.3, §4.4, §4.5

**Verificación:** El contrato declara que el provider verifica el entitlement del add-on `smart_incidents` de forma independiente. El contrato declara que el provider repite la verificación inmediatamente antes de persistir. El contrato define `FEATURE_DISABLED` para entitlement inactivo. El contrato declara que ante `FEATURE_DISABLED` el provider no crea ni modifica datos y no elimina incidencias históricas.

### E-30 — Cross-tenant opaco

**Referencia:** `contract-create-incident-request.md` §8.9; `rules-80-security-and-tenancy.md` §4.4

**Verificación:** El contrato declara que ante discrepancias de tenant el error es opaco: no distingue entre recurso inexistente y recurso de otro tenant. El contrato declara que no se confirma la existencia de recursos ajenos y no se devuelven IDs de otros tenants. Los errores `RESOURCE_NOT_FOUND` y `REQUESTER_NOT_ALLOWED` están marcados como opacos en la matriz de §8.12.

### E-31 — Sin dependencia de n8n como productor

**Referencia:** `contract-create-incident-request.md` §3, §8.3; `rules-30-incident-creation.md` §3.7; `rules-00-scope-and-principles.md` §3.5

**Verificación:** El contrato lista a n8n en §3 como actor que **no es productor directo**. El contrato no define ningún endpoint ni mecanismo de invocación desde n8n hacia el provider. El contrato declara en §8.3 que no se acepta invocación directa desde n8n.

### E-32 — Sin acceso a tablas `conv_*`

**Referencia:** `contract-create-incident-request.md` §8.2; `rules-80-security-and-tenancy.md` §4.6; `rules-00-scope-and-principles.md` §4.1

**Verificación:** El contrato lista `conv_case_id`, `conv_session_id` y referencias a tablas `conv_*` en la lista de campos prohibidos (§8.2). El contrato no define ningún campo que exponga datos de las tablas `conv_*`. El contrato no requiere que el provider consulte tablas `conv_*` para ninguna operación.

### E-33 — Sin acceso directo del consumer a `inc_*`

**Referencia:** `contract-create-incident-request.md` §4; `rules-80-security-and-tenancy.md` §4.6

**Verificación:** El contrato define el consumidor (provider backend de SI) como el único actor con acceso a `inc_*`. SmartConversations es el productor, no el consumidor. El contrato no define ningún mecanismo que permita a SC leer o escribir directamente en tablas `inc_*`.

### E-34 — Actividad interna única en creación

**Referencia:** `contract-create-incident-request.md` §8.11; `rules-30-incident-creation.md` §4.11; `rules-20-incident-lifecycle.md` §4.5

**Verificación:** El contrato declara que la primera creación exitosa registra una única actividad inicial en `inc_activities`. Los cinco campos del registro de actividad (`incident_id`, actor, rol, estado inicial `new`, timestamp, fuente de creación) están respaldados explícitamente por `rules-30-incident-creation.md` §4.11, y el contrato cita dicha fuente. El contrato delega el schema exacto de columnas de `inc_activities` a SI-P6A. El contrato declara que el replay idempotente no duplica esa actividad. El contrato declara que el conflicto de idempotencia no registra actividad. El contrato declara que el fallo de creación no registra actividad (con rollback si `inc_incidents` ya se insertó).

### E-36 — Fallback de `title`: etiqueta `"maintenance"` → `"Mantenimiento"`

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** El contrato incluye la tabla de etiquetas de fallback. Para `category = "maintenance"` la etiqueta de fallback es exactamente `Mantenimiento`. La tabla es exhaustiva y determinista.

### E-37 — Fallback de `title`: etiqueta `"noise"` → `"Ruido"`

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** Para `category = "noise"` la etiqueta de fallback definida en la tabla es exactamente `Ruido`.

### E-38 — Fallback de `title`: etiqueta `"security"` → `"Seguridad"`

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** Para `category = "security"` la etiqueta de fallback definida en la tabla es exactamente `Seguridad`.

### E-39 — Fallback de `title`: etiqueta `"billing"` → `"Facturación"`

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** Para `category = "billing"` la etiqueta de fallback definida en la tabla es exactamente `Facturación`.

### E-40 — Fallback de `title`: etiqueta `"other"` → `"Otra incidencia"`

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** Para `category = "other"` la etiqueta de fallback definida en la tabla es exactamente `Otra incidencia`. Cualquier otro valor distinto a `"Otra incidencia"` (por ejemplo `"Otro"`) constituye un defecto documental.

### E-41 — Fallback de `title`: truncación determinista a 120 caracteres

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** El contrato declara que el resultado del fallback se trunca a 120 caracteres de forma determinista. Dado que `title` acepta hasta 120 caracteres (§6.3), el truncado garantiza que el resultado nunca supera ese límite. Si el resultado tiene menos de 5 caracteres, el contrato declara que el consumer no debe invocar.

### E-42 — Fallback de `title`: tabla determinista y exhaustiva

**Referencia:** `contract-create-incident-request.md` §8.6

**Verificación:** El contrato declara explícitamente que la tabla de etiquetas de fallback es determinista y exhaustiva: no existe ningún valor de `category` sin etiqueta asignada. Los cinco valores del enum (`maintenance`, `noise`, `security`, `billing`, `other`) tienen exactamente una etiqueta cada uno.

### E-35 — Ausencia de eventos externos no reglados

**Referencia:** `contract-create-incident-request.md` §8.11; `rules-00-scope-and-principles.md` §4.7

**Verificación:** El contrato declara explícitamente que el payload hacia n8n, la entrega de eventos a n8n, el payload del `audit_log`, los retries de publishers externos y cualquier event key externa no se definen en este contrato. El contrato indica que estos aspectos dependen de `rules-50-n8n-automation.md` y `rules-70-activity-log.md`, pendientes de SI-P6A. No existe ningún evento externo nuevo introducido por este contrato.

---

## 6. Resultados esperados

Cada escenario de prueba pasa cuando el documento bajo test contiene la declaración o la regla evaluada en el escenario. Pasa implica presencia explícita en el documento: no se acepta la ausencia de la declaración ni la inferencia por omisión.

| Escenario | Resultado esperado |
|---|---|
| E-01 | Fichero existe en ruta canónica con nombre correcto |
| E-02 | Contrato declara `contract_version: "1.0"` y estado `INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING` |
| E-03 | `additionalProperties = false` declarado en raíz, `actor` e `incident` |
| E-04 | `requester_profile_id` en §6.1 (raíz); ausente de §6.3 (incident); ejemplo inválido 10.1 presente |
| E-05 | `external_request_reference` en §6.1 (raíz); ausente de §6.3 (incident); SC-SI-01 referenciado |
| E-06 | `actor` y `requester_profile_id` definidos como identidades distintas y no sustituibles |
| E-07 | `actor.type = "system"` como único valor; `"system_service"` excluido explícitamente |
| E-08 | `requester_profile_id` en §6 (obligatorio); ausencia → `VALIDATION_ERROR` |
| E-09 | `title` obligatorio 5–120 chars; fallback determinista definido; ejemplo inválido 10.7 presente |
| E-10 | `description` en §6.3 (obligatoria); `null` → `VALIDATION_ERROR`; ausente → `VALIDATION_ERROR`; límites 10–4000; restricción adicional vs. rules-30 §4.2 documentada |
| E-11 | `source_system = "smart_conversations"` como único literal |
| E-12 | `source_channel` = `"whatsapp"` | `"webchat"` únicamente |
| E-13 | Cinco categorías exactas; `INVALID_CATEGORY` definido |
| E-14 | Dos prioridades exactas; `INVALID_PRIORITY` definido |
| E-15 | Tabla de mapping en §8.7; `urgency_proposal` en lista de prohibidos |
| E-16 | `attachments = []` o ausente; `ATTACHMENTS_NOT_SUPPORTED` definido |
| E-17 | Lista de campos de identidad prohibidos en §8.2; provider no usa `STRONG_MATCH_ACTIVE` |
| E-18 | Lista de PII de canal prohibida en §8.2 |
| E-19 | `assignee` y `resolver_id` en lista de prohibidos (§8.2) |
| E-20 | Scope de idempotencia declarado; exclusiones del hash declaradas |
| E-21 | Replay: mismos campos de negocio; `request_id`/`correlation_id` actuales; sin duplicación |
| E-22 | Conflicto: `IDEMPOTENCY_CONFLICT` 409, no retryable, sin creación |
| E-23 | Concurrencia: máximo una incidencia por clave; sin doble persistencia |
| E-24 | Hash funcional: excluye `request_id`, `correlation_id` y secretos; pendiente de SI-P5 |
| E-25 | Response v1.0 con siete campos exactos; `status = "new"` siempre |
| E-26 | Exactamente 15 errores canónicos; tabla presente con HTTP y retryability |
| E-27 | `service_role` compartido explícitamente excluido; estado de autenticación = `PENDING` |
| E-28 | Vinculación caller–tenant server-side declarada; entitlement ≠ autorización |
| E-29 | Entitlement verificado dos veces; `FEATURE_DISABLED` definido; sin borrado de históricos |
| E-30 | Errores cross-tenant opacos declarados; sin confirmación de existencia de recursos ajenos |
| E-31 | n8n en lista de no-productores; sin invocación directa desde n8n |
| E-32 | `conv_case_id`, `conv_session_id` y tablas `conv_*` en lista de prohibidos |
| E-33 | Consumer (SC) no es consumidor de `inc_*`; solo el provider backend lo es |
| E-34 | Una única actividad en primera creación; campos citados con fuente rules-30 §4.11; schema de columnas en SI-P6A; sin duplicación en replay ni en conflicto |
| E-35 | Eventos externos no definidos; pendientes de SI-P6A |
| E-36 | Tabla de fallback: `"maintenance"` → `Mantenimiento` |
| E-37 | Tabla de fallback: `"noise"` → `Ruido` |
| E-38 | Tabla de fallback: `"security"` → `Seguridad` |
| E-39 | Tabla de fallback: `"billing"` → `Facturación` |
| E-40 | Tabla de fallback: `"other"` → `Otra incidencia` (no `"Otro"`) |
| E-41 | Truncación determinista a 120 chars; resultado < 5 chars → no invocar |
| E-42 | Tabla determinista y exhaustiva: cinco valores, cinco etiquetas |

---

## 7. Casos negativos

Los siguientes casos describen situaciones cuya presencia en el contrato constituiría un defecto documental.

| CN | Defecto que no debe existir |
|---|---|
| CN-01 | `requester_profile_id` definido dentro de `incident` en lugar de en la raíz |
| CN-02 | `external_request_reference` definido dentro de `incident` |
| CN-03 | `actor.type` aceptando `"system_service"`, `"tenant"`, `"client_admin"` u otro valor |
| CN-04 | `urgency_proposal` aceptado en el payload del provider |
| CN-05 | `priority = "critical"` o cualquier valor adicional al enum v1.0 |
| CN-06 | `title` sin límites definidos o con límite superior mayor que 255 |
| CN-07 | `attachments` con payload no vacío aceptado |
| CN-08 | Menos o más de 15 errores canónicos en la matriz |
| CN-09 | `service_role` como credencial de autenticación aceptable |
| CN-10 | `assignee` o `resolver_id` como campos válidos en el request v1.0 |
| CN-11 | n8n definido como productor directo del contrato |
| CN-12 | Referencias a tablas `conv_*` como campos válidos en el request |
| CN-13 | Replay duplicando `inc_activities` o publicaciones externas |
| CN-14 | Eventos externos (n8n, `audit_log`) definidos en este contrato sin rule previa |
| CN-15 | Entitlement descrito como único check suficiente para autorizar al caller |
| CN-16 | Error cross-tenant que revela si el recurso existe o pertenece a otro tenant |
| CN-17 | Estado `INCIDENTS_PROVIDER_OFFLINE_READY_DEV_PENDING` declarado en este contrato |
| CN-18 | Algoritmo criptográfico de hash funcional definido (debe estar en SI-P5) |
| CN-19 | `description` definida como opcional o nullable en cualquier sección del contrato |
| CN-20 | `"other"` mapeado a `"Otro"` en la tabla de fallback de `title` (valor correcto: `"Otra incidencia"`) |

---

## 8. Datos de prueba

Este test documental no usa datos de producción, usuarios reales, credenciales ni entornos reales.

Los datos que aparecen en los ejemplos del contrato son UUIDs ficticios construidos con el patrón `xxxxxxxx-0000-0000-0000-000000000NNN` para facilitar su identificación como datos de test. No corresponden a ninguna entidad real del sistema.

Los `idempotency_key` de los ejemplos son strings opacos de longitud entre 16 y 128 caracteres sin estructura interna reconocible, tal como exige el contrato.

Para ejecutar un test de integración real sobre este contrato una vez que SI-P3 esté implementado, se deberán usar los datos definidos en los fixtures de prueba del lote correspondiente. Esos fixtures no se definen en este documento documental.

---

## 9. Criterio de aceptación

El contrato `contract-create-incident-request.md` supera la verificación documental cuando:

1. Todos los escenarios E-01 a E-42 pasan sin observaciones abiertas.
2. Ningún caso negativo CN-01 a CN-20 se cumple en el documento.
3. El contrato no declara implementación del provider ni estados de certificación de implementación.
4. El contrato no inventa tablas, rutas, funciones ni mecanismos no documentados en rules previas.
5. El contrato no contiene referencias a n8n como productor ni a SmartConversations como consumidor de `inc_*`.
6. Los 15 errores del contrato coinciden exactamente con los 15 códigos de `ProviderErrorCode` en `incidents-integration-port.ts`.
7. Los campos del request en los ejemplos válidos (§9 del contrato) cumplen todas las reglas del propio contrato.
8. Los campos de los ejemplos inválidos (§10 del contrato) producen el error declarado según las reglas.

**Criterio de fallo bloqueante:** Cualquiera de los escenarios E-04, E-05, E-26, E-27, E-29, E-34 o E-35 que no pase constituye un defecto bloqueante que impide declarar el contrato como válido.

---

## 10. Dependencias

| Dependencia | Relación |
|---|---|
| `contract-create-incident-request.md` | Documento bajo test — fuente primaria |
| `rules-30-incident-creation.md` §4.5 | El contrato es el documento al que §4.5 delega el mapping de urgencia; se verifica consistencia |
| `contract-incident-entity.md` §4.1 | Compatibilidad del límite de `title` (120 vs 255) verificada en E-09 |
| `incidents-integration-port.ts` (`ProviderErrorCode`) | Comparación de los 15 errores exactos verificada en E-26 |
| `integration/incident-provider-si-p1-reconciliation.md` | SC-SI-01 se verifica resuelto en E-05 |
| `rules-10-addon-entitlement.md` | Verificación del doble check de entitlement en E-29 |
| `rules-80-security-and-tenancy.md` | Verificación de cross-tenant, campos prohibidos y separación actor/requester |
| SI-P3 | Dependencia futura: mecanismo de autenticación concreto (no evaluado en este test) |
| SI-P5 | Dependencia futura: algoritmo de hash y almacenamiento de idempotencia (no evaluado en este test) |
| SI-P6A | Dependencia futura: events hacia n8n y `audit_log` (intencionalmente fuera del alcance) |
