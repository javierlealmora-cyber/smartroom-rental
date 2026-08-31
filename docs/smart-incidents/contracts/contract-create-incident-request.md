# contract-create-incident-request.md — smart-incidents: Solicitud de Creación de Incidencia (Provider v1.0)

## 1. Propósito

Este contrato define la estructura que el provider de Smart Incidents acepta para crear una incidencia mediante la integración backend-to-backend desde SmartConversations. Define el request v1.0, la response v1.0, los errores canónicos, los requisitos de autenticación, el modelo de idempotencia, el mapping de prioridad y los campos prohibidos.

Este contrato pertenece al dominio provider de Smart Incidents. SmartConversations consume este contrato y construye su adapter en consecuencia. Cualquier cambio en el contrato es decisión exclusiva del provider. Este contrato no puede ser modificado unilateralmente por SmartConversations.

**Estado documental:** `INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING`

Este contrato resuelve formalmente la brecha `SC-SI-01 DOCUMENTAL_PROVIDER_GAP_WITH_CONSUMER_ALIGNMENT` identificada en `integration/incident-provider-si-p1-reconciliation.md`.

---

## 2. Cuándo se usa

Este contrato aplica cuando SmartConversations invoca al provider de Smart Incidents para crear una incidencia originada en los canales `whatsapp` o `webchat`. Requiere que se cumplan simultáneamente todas las condiciones siguientes:

- El caller es el backend autorizado de SmartConversations, autenticado mediante mecanismo backend-to-backend.
- El caller está autorizado para operar en nombre del `client_account_id` solicitado.
- El entitlement del add-on `smart_incidents` está activo para el `client_account` (verificación independiente: SC verifica su activación conversacional; SI verifica el entitlement del add-on).
- El `requester_profile_id` ha sido resuelto por SmartConversations server-side antes de invocar.
- El `priority` ha sido mapeado desde `urgency_proposal` antes de invocar.

Este contrato **no aplica** cuando:

- La incidencia se crea desde el formulario web del tenant (`web-tenant`).
- La incidencia se crea desde el panel del `client_admin` (`web-admin`).
- El actor técnico no es `system`.
- El add-on no está activo para el `client_account`.

---

## 3. Productor

**Productor autorizado:** El backend o adapter de SmartConversations.

Los siguientes actores **no son productores directos** y no pueden invocar este contrato:

- Navegador o aplicación frontend
- WhatsApp, WebChat, Wasender (son canales de entrada hacia SC, no productores de este contrato)
- n8n o cualquier workflow
- Modelo de IA o sistema de clasificación automática
- Tenant sin intermediación del backend de SC

**Responsabilidades del productor antes de invocar:**

- Resolver `requester_profile_id` exclusivamente server-side en la Edge Function de SC.
- Mapear `urgency_proposal` al enum canónico `priority` (ver §8.7).
- Generar `title` de forma determinista con fallback controlado (ver §8.6).
- Sanitizar `description` antes de invocar (ver §6.3).
- Generar `idempotency_key` de forma opaca y determinista, sin PII.
- No enviar campos de identidad conversacional (`STRONG_MATCH_ACTIVE`, JID, `sender_ref`, etc.) al provider.
- Verificar su propio gating (activación conversacional y canal) antes de invocar.

---

## 4. Consumidor

**Consumidor:** El provider backend de Smart Incidents.

**Responsabilidades del provider:**

- Autenticar al caller antes de procesar el request.
- Autorizar al caller para la operación y el `client_account_id` solicitado, server-side (la mera posesión de una credencial no implica autorización para un tenant específico).
- Verificar el entitlement del add-on `smart_incidents` para el `client_account` (según `rules-10-addon-entitlement.md`).
- Validar todos los campos del request según las reglas de este contrato.
- Validar `requester_profile_id`, `accommodation_id` y `room_id` contra el Core.
- Ejecutar la creación de forma atómica: `inc_incidents` + `inc_activities`.
- Repetir la verificación de entitlement inmediatamente antes de persistir.
- Devolver la response exacta definida en §5.2.

La ruta HTTP concreta y la Edge Function responsable se formalizan en SI-P3. Este contrato define la estructura del payload y la semántica de la operación, no la URL ni el mecanismo de transporte HTTP.

---

## 5. Estructura

### 5.1 Request v1.0

```json
{
  "contract_version": "1.0",
  "client_account_id": "uuid",
  "request_id": "uuid",
  "correlation_id": "uuid",
  "idempotency_key": "opaque-string",
  "source_system": "smart_conversations",
  "source_channel": "whatsapp",
  "external_request_reference": null,
  "actor": {
    "type": "system"
  },
  "requester_profile_id": "uuid",
  "incident": {
    "title": "string",
    "description": "string",
    "accommodation_id": "uuid",
    "room_id": "uuid | null",
    "category": "maintenance",
    "priority": "normal",
    "attachments": []
  }
}
```

**Ubicación canónica — campos en la raíz** (no pueden ubicarse dentro de `incident`):

`contract_version`, `client_account_id`, `request_id`, `correlation_id`, `idempotency_key`, `source_system`, `source_channel`, `external_request_reference`, `actor`, `requester_profile_id`.

**Ubicación canónica — campos dentro de `incident`** (no pueden ubicarse en la raíz):

`title`, `description`, `accommodation_id`, `room_id`, `category`, `priority`, `attachments`.

`additionalProperties = false` en el objeto raíz, en `actor` y en `incident`. Cualquier campo fuera de los definidos produce `VALIDATION_ERROR`.

### 5.2 Response v1.0

```json
{
  "contract_version": "1.0",
  "request_id": "uuid",
  "correlation_id": "uuid",
  "incident_id": "opaque-string",
  "incident_reference": null,
  "status": "new",
  "created_at": "ISO-8601 con timezone",
  "idempotent_replay": false
}
```

**Reglas de la response:**

- `contract_version` siempre `"1.0"`.
- `request_id` y `correlation_id` corresponden a la invocación actual (no a la original en replays).
- `incident_id` es opaco para SmartConversations y no implica ninguna estructura interna.
- `incident_reference` es nullable en v1.0.
- `status` siempre `"new"`. El consumer debe rechazar respuestas donde `status !== "new"`.
- `created_at` es estable en replay.
- `idempotent_replay = true` en replay; `false` en primera creación.

**Replay idempotente:** Los campos de negocio (`incident_id`, `incident_reference`, `status`, `created_at`) son idénticos a la respuesta original. `request_id` y `correlation_id` reflejan la invocación actual porque identifican la invocación técnica, no la operación de negocio. La respuesta estable de negocio se persiste en el primer intento exitoso y se devuelve sin modificación en replays.

**La response no devuelve:** modelo completo de la incidencia, datos del requester, datos del alojamiento o habitación, PII, secretos ni datos internos del provider.

---

## 6. Campos obligatorios

### 6.1 Campos obligatorios en la raíz

| Campo | Tipo | Descripción |
|---|---|---|
| `contract_version` | string literal `"1.0"` | Versión del contrato. Verificada como primera operación. Cualquier valor distinto produce `UNSUPPORTED_CONTRACT_VERSION`. |
| `client_account_id` | uuid | Dato declarado, no confiable por sí mismo. El provider lo vincula server-side al caller autenticado. No sustituye la autorización del caller ni el entitlement. |
| `request_id` | uuid | Identifica la invocación técnica. Puede cambiar entre reintentos. No forma parte del hash funcional de idempotencia. |
| `correlation_id` | uuid | Identifica la operación de negocio de forma transversal. Estable para toda la operación. No confiere autorización. No forma parte del hash funcional. |
| `idempotency_key` | string | Opaca, entre 16 y 128 caracteres. No contiene PII. Nunca se registra completa en logs. Scope: ver §8.5. |
| `source_system` | string literal `"smart_conversations"` | No se aceptan nombres de workflow, n8n, Wasender, canal ni integración no autorizada. |
| `source_channel` | enum `"whatsapp" | "webchat"` | El canal no actúa como identidad ni autorización. |
| `external_request_reference` | null | En v1.0 siempre `null`. Campo obligatorio y nullable. No usar `conv_case_id`, `conv_session_id` ni nombres de tablas `conv_*`. Una referencia opaca no nula requerirá evolución contractual compatible. |
| `actor` | objeto | Ver §6.2. |
| `requester_profile_id` | uuid | Identificador del perfil del tenant que reporta. Resuelto server-side por SC antes de invocar. El provider lo revalida. Ver §8.4. |

### 6.2 Objeto `actor`

Estructura exacta:

```json
{ "type": "system" }
```

El campo `type` acepta únicamente el valor `"system"`. Los siguientes valores no se aceptan: `"system_service"`, `"tenant"`, `"client_admin"`, o cualquier otro. No se aceptan propiedades adicionales en el objeto `actor`.

El actor técnico identifica al sistema que llama (SmartConversations), no al tenant solicitante. El tenant solicitante se identifica exclusivamente mediante `requester_profile_id` en la raíz. Actor y requester son identidades distintas y ninguno sustituye al otro.

### 6.3 Campos obligatorios dentro de `incident`

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | string | Entre 5 y 120 caracteres, trimmed. Responsabilidad del consumer. Ver §8.6. |
| `description` | string | Entre 10 y 4000 caracteres, trimmed, no vacía, sin HTML ejecutable. Obligatoria en v1.0. `null` produce `VALIDATION_ERROR`. Campo ausente produce `VALIDATION_ERROR`. No debe contener payload raw del canal ni prompts o respuestas raw de IA. |
| `accommodation_id` | uuid | El provider verifica existencia, pertenencia al `client_account_id` y estado permitido. |
| `category` | enum | Uno de: `"maintenance"`, `"noise"`, `"security"`, `"billing"`, `"other"`. |
| `priority` | enum | Uno de: `"normal"`, `"urgent"`. Mapeado desde `urgency_proposal` por el consumer antes de invocar. Ver §8.7. |

---

## 7. Campos opcionales

### 7.1 Campos opcionales dentro de `incident`

| Campo | Tipo | Condiciones cuando presente |
|---|---|---|
| `room_id` | uuid o null | Si presente y no nulo: debe pertenecer al `accommodation_id` y al `client_account_id` verificado. Ante imposibilidad de verificación de pertenencia: fail closed. |
| `attachments` | array | En v1.0: solo se acepta `[]`. El campo puede omitirse; la omisión equivale a `[]`. Cualquier array no vacío produce `ATTACHMENTS_NOT_SUPPORTED`. |

---

## 8. Reglas de validación

### 8.1 Verificación de `contract_version`

El provider verifica `contract_version` como primera operación, antes de procesar cualquier otro campo. Si el valor no es `"1.0"`, devuelve `UNSUPPORTED_CONTRACT_VERSION` sin procesar el payload.

### 8.2 Campos prohibidos

Los siguientes campos y valores no se aceptan en ningún nivel del request. Su presencia produce `VALIDATION_ERROR`:

```
identity_level, identity_verified, verified, identity_data,
STRONG_MATCH_ACTIVE, PARTIAL_MATCH_ACTIVE, MATCH_INACTIVE, NO_MATCH, UNVERIFIED_LEAD,
urgency_proposal, conv_case_id, conv_session_id,
teléfono, email, JID, wa_jid, sender_ref, raw_payload,
token WebChat, metadata Wasender, metadata n8n,
prompts, respuestas raw de IA,
assignee, resolver_id, status (enviado por consumer),
credenciales, service_role,
referencias a tablas conv_*
```

### 8.3 Autenticación y autorización del caller

**Requisitos (mecanismo concreto pendiente de SI-P3):**

- Autenticación backend-to-backend.
- Caller autenticado con identidad verificada por el provider.
- Caller autorizado específicamente para la operación y el `client_account_id` solicitado, server-side. Una credencial global no implica autorización para ningún tenant.
- Audience específica para este provider.
- Credencial con expiración, rotación y separada por entorno.
- Secreto nunca en el payload ni en logs.
- No se acepta: JWT de usuario como credencial provider, `service_role` compartido, invocación desde navegador, invocación directa desde n8n.

**Estados del requisito:**

```
CONTRACT_REQUIREMENTS_DEFINED
IMPLEMENTATION_PENDING
DEV_VERIFICATION_PENDING
```

**Resultado por caso:**

- Caller no autenticado → `AUTHENTICATION_REQUIRED`.
- Caller autenticado pero no autorizado para el `client_account_id` → `CALLER_NOT_AUTHORIZED`.
- Entitlement de `smart_incidents` inactivo → `FEATURE_DISABLED`.

### 8.4 Validación de `requester_profile_id`

El provider verifica que:

- El perfil existe en el Core.
- Pertenece al `client_account_id` verificado.
- Está activo y no eliminado.
- Está autorizado para el `accommodation_id` indicado.

Ante cualquier condición fallida: `REQUESTER_NOT_ALLOWED` (opaco, no revela información sobre el perfil).

El provider no realiza resolución de identidad conversacional. No usa `STRONG_MATCH_ACTIVE`, JID, teléfono, `sender_ref` ni ningún estado interno de SmartConversations. Si no recibe un `requester_profile_id` válido, rechaza la operación.

### 8.5 Idempotencia

**Estado de implementación:** `DESIGNED_NOT_IMPLEMENTED`

**Scope:**

```
client_account_id + "create_incident" + idempotency_key
```

**Hash funcional:** El provider persiste un hash del payload funcional normalizado. El hash incluye los campos que determinan la identidad de la operación de negocio. El hash **excluye**: `request_id`, `correlation_id`, timestamps de transporte, credenciales y secretos. El algoritmo criptográfico y el mecanismo de almacenamiento se formalizan en SI-P5.

La `idempotency_key` nunca se registra completa en logs.

**Primera ejecución:**

- Reserva atómica de la clave.
- Persiste hash funcional normalizado.
- Crea una incidencia en `inc_incidents`.
- Crea el registro inicial en `inc_activities`.
- Persiste la respuesta estable de negocio.
- Devuelve `idempotent_replay = false`.

**Replay exacto** (misma clave, mismo hash):

- No crea otra incidencia.
- Devuelve el mismo `incident_id`, `incident_reference`, `status` y `created_at`.
- `request_id` y `correlation_id` reflejan la invocación actual.
- Devuelve `idempotent_replay = true`.
- No duplica registros en `inc_activities`.
- No duplica publicaciones externas.

**Conflicto** (misma clave, hash diferente):

- `IDEMPOTENCY_CONFLICT`, HTTP 409, `retryable = false`.
- No crea ninguna incidencia.
- No registra ninguna actividad.

**Concurrencia:**

- Máximo una incidencia por clave de idempotencia.
- La segunda solicitud concurrente espera el resultado o recibe el replay.
- No puede producirse doble persistencia.

### 8.6 Responsabilidad de `title`

**Responsabilidad:** `CONSUMER_OBLIGATORIO`

El consumer (SmartConversations) es responsable de proporcionar un `title` válido antes de invocar. Si no puede generarlo, no debe invocar.

**Reglas del `title` en el request:**

- Entre 5 y 120 caracteres.
- Trimmed.
- Sin HTML ejecutable.
- Sin PII de canal (sin teléfono, email, JID, `sender_ref`).
- Generado de forma determinista o mediante fallback determinista.

**Fallback contractual para el consumer** cuando no dispone de título explícito:

```
<Etiqueta canónica de category en español>: <primera frase no vacía de description>
```

**Tabla de etiquetas de fallback por `category`:**

| `category` | Etiqueta de fallback |
|---|---|
| `"maintenance"` | `Mantenimiento` |
| `"noise"` | `Ruido` |
| `"security"` | `Seguridad` |
| `"billing"` | `Facturación` |
| `"other"` | `Otra incidencia` |

Reglas del fallback:

- Usar la etiqueta de fallback correspondiente a `category` según la tabla anterior. Esta tabla es determinista y exhaustiva; no hay valor de `category` sin etiqueta asignada.
- Extraer la primera frase no vacía de `description`.
- Normalizar espacios y eliminar saltos de línea.
- Truncar a 120 caracteres de forma determinista.
- Si el resultado tiene menos de 5 caracteres: no invocar al provider.

El provider valida el `title` recibido. Si no cumple las reglas: `VALIDATION_ERROR`. El provider no genera títulos en v1.0.

**Nota de compatibilidad con `contract-incident-entity.md`:** La entidad almacena `title` con máximo 255 caracteres (§4.1). Este contrato limita la creación vía API conversacional a 120 caracteres. Son compatibles: el límite del request es más restrictivo que el de almacenamiento. Una versión futura del contrato puede ampliar hasta 255.

### 8.7 Mapping `urgency_proposal → priority`

El consumer (SmartConversations) traduce `urgency_proposal` a `priority` antes de invocar. El provider recibe exclusivamente el valor canónico del enum. No recibe `urgency_proposal`, score de IA ni explicación de prioridad.

| `urgency_proposal` (SC interno) | `priority` en el request | Acción del consumer |
|---|---|---|
| `"low"` | `"normal"` | Invocar |
| `"medium"` | `"normal"` | Invocar |
| `"high"` | `"urgent"` | Invocar |
| ausente o `null` | `"normal"` | Invocar |
| valor desconocido | — | No invocar; abortar con error interno de SC |

**Reglas:**

- El mapping es determinista.
- El consumer no puede rebajar silenciosamente `"urgent"` a `"normal"`.
- No existe `"critical"` ni ninguna prioridad adicional en v1.0.
- El provider valida que el valor de `priority` recibido sea `"normal"` o `"urgent"`. Si no: `INVALID_PRIORITY`.
- Una propuesta de IA no se convierte directamente en decisión de dominio; el mapping del adapter es la capa de decisión.

### 8.8 Validación de recursos de dominio

- `accommodation_id`: el provider verifica existencia, pertenencia al `client_account_id` verificado y estado que permite asociar incidencias. Si falla: `RESOURCE_NOT_FOUND` (opaco).
- `room_id` (cuando presente): el provider verifica pertenencia al `accommodation_id` y al `client_account_id`. Ante imposibilidad de verificación: fail closed, `RESOURCE_NOT_FOUND` (opaco).
- `room_id = null`: válido cuando la incidencia no se asocia a una habitación específica.

El acceso a datos del Core se realiza únicamente a través de interfaces, puertos o helpers controlados que existan en el proyecto. No se accede directamente a tablas del Core.

### 8.9 Aislamiento multi-tenant y cross-tenant

Ante cualquier discrepancia entre el `client_account_id` del payload y el `client_account_id` verificado server-side, o ante cualquier recurso que no pertenezca al tenant verificado:

- Fail closed sin ejecutar la operación.
- El error devuelto es opaco: no distingue entre recurso inexistente y recurso de otro tenant.
- No se confirma la existencia de recursos ajenos.
- No se devuelven IDs de otros tenants.

### 8.10 Doble gating para creación conversacional

Para que la creación pueda ejecutarse deben cumplirse simultáneamente:

```
smart_incidents subscription active (verificado por Smart Incidents)
AND activación del canal de incidencias en SmartConversations activa (verificado por SC)
AND source_channel activo (verificado por SC)
```

**Responsabilidad de SmartConversations (fuera del alcance de este contrato):**

- Verificar que el canal de incidencias está activado en su propia configuración para el `client_account`.
- Verificar que el `source_channel` está activo.
- Repetir estos checks inmediatamente antes de invocar al provider.

**Responsabilidad de Smart Incidents (normativa de este contrato):**

- Autenticar y autorizar el caller.
- Verificar el entitlement del add-on.
- Verificar el estado del `client_account`.
- Validar el dominio (requester, accommodation, room).
- Repetir el check de entitlement inmediatamente antes de persistir.

Si el provider detecta el add-on inactivo: devuelve `FEATURE_DISABLED`, no crea ni modifica datos, no elimina incidencias históricas, no permite retry indefinido.

### 8.11 Actividad interna y eventos

**Lo que se define en este contrato:**

- La primera creación exitosa registra una única actividad inicial en `inc_activities` con: `incident_id`, actor, rol, estado inicial `new`, timestamp y fuente de creación. **Fuente:** `rules-30-incident-creation.md` §4.11. El schema exacto de columnas de `inc_activities` se formaliza en SI-P6A (`contract-activity-log-event.md`).
- El replay idempotente no duplica esa actividad.
- El conflicto de idempotencia no registra actividad.
- El fallo de creación no registra actividad (rollback si `inc_incidents` ya se insertó pero `inc_activities` falla).

**Lo que no se define en este contrato** (pendiente de SI-P6A):

- Payload hacia n8n.
- Entrega de eventos a n8n.
- Payload del `audit_log` del Core.
- Retries de publishers externos.

### 8.12 Errores canónicos

El provider define exactamente 15 códigos de error. Ningún código adicional puede aparecer en la respuesta. Los errores internos no contractuales se colapsan a `INTERNAL_ERROR`.

| Código | HTTP | Retryable | Expone existencia | Significado |
|---|---|---|---|---|
| `UNSUPPORTED_CONTRACT_VERSION` | 400 | No | No | Versión del contrato no soportada |
| `VALIDATION_ERROR` | 400 | No | No | Campo inválido, faltante, prohibido o con formato incorrecto |
| `AUTHENTICATION_REQUIRED` | 401 | No | No | Caller no autenticado |
| `CALLER_NOT_AUTHORIZED` | 403 | No | No | Caller autenticado pero sin autorización para la operación o el tenant solicitado |
| `FEATURE_DISABLED` | 403 | No | No | Entitlement de `smart_incidents` inactivo para el `client_account` |
| `RESOURCE_NOT_FOUND` | 404 | No | No (opaco) | `accommodation_id` o `room_id` no existe o no pertenece al tenant verificado |
| `REQUESTER_NOT_ALLOWED` | 403 | No | No (opaco) | Perfil no autorizado, inactivo o sin pertenencia al `client_account` |
| `INVALID_CATEGORY` | 422 | No | No | Valor de `category` fuera del enum |
| `INVALID_PRIORITY` | 422 | No | No | Valor de `priority` fuera del enum |
| `ATTACHMENTS_NOT_SUPPORTED` | 422 | No | No | `attachments` no vacío en v1.0 |
| `IDEMPOTENCY_CONFLICT` | 409 | No | No | Misma `idempotency_key`, hash funcional diferente |
| `RATE_LIMITED` | 429 | Sí | No | Límite de tasa excedido; cabecera `Retry-After` cuando disponible |
| `DEPENDENCY_UNAVAILABLE` | 503 | Sí | No | Dependencia interna no disponible |
| `PROVIDER_TIMEOUT` | 504 | Sí | No | Operación excedió el tiempo máximo |
| `INTERNAL_ERROR` | 500 | No | No | Error interno no clasificado |

**Cuándo usar `RESOURCE_NOT_FOUND`:** Para `accommodation_id` o `room_id` que no existe o no pertenece al tenant verificado. Opaco: no distingue entre no-existencia y pertenencia a otro tenant.

**Cuándo usar `REQUESTER_NOT_ALLOWED`:** Para `requester_profile_id` que existe en el sistema pero no cumple las condiciones de autorización (inactivo, no pertenece al `client_account`, sin autorización para el alojamiento). Opaco: no revela información sobre el perfil.

**`Retry-After`:** Se incluye en la cabecera HTTP para `RATE_LIMITED` cuando el provider puede estimar el tiempo de espera.

Los errores no deben contener: stack traces, SQL, secretos, IDs de otros tenants, información de cross-tenant ni datos internos del provider.

---

## 9. Ejemplos válidos

### 9.1 Request mínimo válido desde WhatsApp

```json
{
  "contract_version": "1.0",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "request_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "correlation_id": "b2c3d4e5-0000-0000-0000-000000000002",
  "idempotency_key": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  "source_system": "smart_conversations",
  "source_channel": "whatsapp",
  "external_request_reference": null,
  "actor": { "type": "system" },
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000030",
  "incident": {
    "title": "Grifo del baño con fuga",
    "description": "El grifo del baño lleva dos días goteando continuamente.",
    "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
    "room_id": null,
    "category": "maintenance",
    "priority": "normal",
    "attachments": []
  }
}
```

### 9.2 Response de primera creación

```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "correlation_id": "b2c3d4e5-0000-0000-0000-000000000002",
  "incident_id": "7f8a9b0c-0000-0000-0000-000000000099",
  "incident_reference": null,
  "status": "new",
  "created_at": "2026-07-30T10:00:00+02:00",
  "idempotent_replay": false
}
```

### 9.3 Response de replay idempotente exacto

```json
{
  "contract_version": "1.0",
  "request_id": "d1e2f3a4-0000-0000-0000-000000000005",
  "correlation_id": "e2f3a4b5-0000-0000-0000-000000000006",
  "incident_id": "7f8a9b0c-0000-0000-0000-000000000099",
  "incident_reference": null,
  "status": "new",
  "created_at": "2026-07-30T10:00:00+02:00",
  "idempotent_replay": true
}
```

`incident_id`, `incident_reference`, `status` y `created_at` son idénticos a la respuesta original. `request_id` y `correlation_id` reflejan la invocación actual.

### 9.4 Request desde webchat con `priority = urgent` y `room_id`

```json
{
  "contract_version": "1.0",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "request_id": "e1f2a3b4-0000-0000-0000-000000000007",
  "correlation_id": "f2a3b4c5-0000-0000-0000-000000000008",
  "idempotency_key": "a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
  "source_system": "smart_conversations",
  "source_channel": "webchat",
  "external_request_reference": null,
  "actor": { "type": "system" },
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000030",
  "incident": {
    "title": "Seguridad: puerta principal sin cerrar",
    "description": "La puerta principal del alojamiento lleva horas sin cerrarse correctamente.",
    "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
    "room_id": "d3e4f5a6-0000-0000-0000-000000000040",
    "category": "security",
    "priority": "urgent",
    "attachments": []
  }
}
```

---

## 10. Ejemplos inválidos

### 10.1 `requester_profile_id` dentro de `incident` (viola §5.1)

```json
{
  "contract_version": "1.0",
  "incident": {
    "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000030",
    "title": "Fuga de agua"
  }
}
```

Error: `VALIDATION_ERROR`. `requester_profile_id` debe estar en la raíz. `incident` no acepta esta propiedad.

### 10.2 `external_request_reference` dentro de `incident` (viola §5.1)

```json
{
  "contract_version": "1.0",
  "incident": {
    "external_request_reference": null,
    "title": "Fuga de agua"
  }
}
```

Error: `VALIDATION_ERROR`. `external_request_reference` debe estar en la raíz.

### 10.3 `actor.type` con valor no permitido

```json
{
  "actor": { "type": "system_service" }
}
```

Error: `VALIDATION_ERROR`. El único valor permitido para `actor.type` es `"system"`.

### 10.4 Adjuntos no vacíos (viola §7.1)

```json
{
  "incident": {
    "attachments": [{ "url": "https://example.com/foto.jpg" }]
  }
}
```

Error: `ATTACHMENTS_NOT_SUPPORTED`. En v1.0 solo se acepta `[]`.

### 10.5 `urgency_proposal` en el payload (campo prohibido — viola §8.2)

```json
{
  "urgency_proposal": "high",
  "incident": { "priority": "urgent" }
}
```

Error: `VALIDATION_ERROR`. `urgency_proposal` es un campo interno de SC; el provider no lo acepta.

### 10.6 `priority` fuera del enum (viola §8.7)

```json
{
  "incident": { "priority": "critical" }
}
```

Error: `INVALID_PRIORITY`. Solo `"normal"` y `"urgent"` son valores válidos en v1.0.

### 10.7 `title` inferior a 5 caracteres (viola §8.6)

```json
{
  "incident": { "title": "Fuga" }
}
```

Error: `VALIDATION_ERROR`. `title` con menos de 5 caracteres.

### 10.8 `actor` con propiedad adicional prohibida (viola §8.2)

```json
{
  "actor": { "type": "system", "identity_level": "STRONG_MATCH_ACTIVE" }
}
```

Error: `VALIDATION_ERROR`. `actor` no acepta propiedades adicionales.

### 10.9 `contract_version` incorrecto (viola §8.1)

```json
{
  "contract_version": "2.0"
}
```

Error: `UNSUPPORTED_CONTRACT_VERSION`.

### 10.10 `status` enviado por el consumer (campo prohibido — viola §8.2)

```json
{
  "incident": { "status": "in_progress", "title": "Avería calefacción" }
}
```

Error: `VALIDATION_ERROR`. `status` es fijado por el provider; no se acepta como input.

### 10.11 `description` con valor `null` (viola §6.3)

```json
{
  "contract_version": "1.0",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "incident": {
    "title": "Problema en el alojamiento",
    "description": null,
    "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
    "category": "maintenance",
    "priority": "normal"
  }
}
```

Error: `VALIDATION_ERROR`. `description` es obligatoria en v1.0; el valor `null` no se acepta.

### 10.12 `description` ausente (viola §6.3)

```json
{
  "contract_version": "1.0",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "incident": {
    "title": "Problema en el alojamiento",
    "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
    "category": "maintenance",
    "priority": "normal"
  }
}
```

Error: `VALIDATION_ERROR`. `description` es un campo obligatorio en v1.0; su ausencia no se acepta.

---

## 11. Notas de versionado

**Versión actual:** 1.0  
**Propiedad:** Smart Incidents — contrato provider-owned.

SmartConversations no puede modificar este contrato unilateralmente. Si el adapter de SC requiere un cambio de comportamiento del provider, debe coordinarse con el equipo de SI y producirse una actualización formal de este contrato.

**Nota sobre `description` en v1.0:** Este contrato define `description` como campo obligatorio (§6.3) para la integración conversacional. `rules-30-incident-creation.md` §4.2 la clasifica como Opcional para las fuentes `whatsapp`/`webchat` en el modelo general de creación. Esta restricción adicional es una decisión del provider para la integración conversacional v1.0; un contrato puede ser más restrictivo que la rule de referencia. Las otras fuentes de creación (`web-tenant`, `web-admin`) no están cubiertas por este contrato.

**Evolución compatible** (sin cambio de `contract_version`):

- Añadir campos opcionales a la raíz o a `incident` con semántica aditiva y valor por defecto definido.
- Ampliar el límite de `title` hasta 255 caracteres.
- Ampliar el límite de caracteres permitido de `description` (mínimo o máximo).
- Añadir valores a `incident_reference` cuando estén definidos en rules anteriores.

**Evolución incompatible** (requiere nueva versión):

- Cambiar la ubicación de campos entre raíz e `incident`.
- Añadir campos obligatorios sin valor por defecto.
- Cambiar los enums de `category`, `priority` o `source_channel`.
- Cambiar el scope o la semántica de idempotencia.
- Añadir, eliminar o renombrar errores canónicos.
- Habilitar adjuntos con payload no vacío.
- Cambiar los requisitos de autenticación.

**Resolución de SC-SI-01:**

El snapshot `smart-incidents-create-request-v1.0.md` de SmartConversations coloca `requester_profile_id` y `external_request_reference` dentro del objeto `incident`. El TypeScript port (`incidents-integration-port.ts`, interfaz `ProviderCreateIncidentRequestV1`) y el adapter (`incidents-addon-adapter.ts`, función `buildProviderRequest`) los colocan correctamente en la raíz. Este contrato establece formalmente que la posición canónica es la raíz para ambos campos. El snapshot de SC deberá corregirse para reflejar su propia implementación y este contrato. La implementación de SC es compatible con el contrato provider; el snapshot de SC es el único documento que necesita corrección.

**Pendientes de SI-P3:**

- Ruta HTTP, método y Edge Function concreta.
- Mecanismo de autenticación backend-to-backend (token, claims, audience, scopes).

**Pendientes de SI-P5:**

- Algoritmo criptográfico del hash funcional de idempotencia.
- Mecanismo de almacenamiento durable de la clave y la respuesta.

**Pendientes de SI-P6A:**

- Payload de eventos hacia n8n (`rules-50-n8n-automation.md`).
- Payload del `audit_log` del Core (`rules-70-activity-log.md`).
- Contratos `contract-n8n-event-payload.md` y `contract-activity-log-event.md`.
