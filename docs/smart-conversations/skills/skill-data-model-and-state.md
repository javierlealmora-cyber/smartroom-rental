# Skill — Modelo de Datos y Máquina de Estados

## 1. Objetivo

Este skill explica cómo implementar y mantener las tablas centrales de SmartConversations: `conv_sessions`, `conv_cases`, `conv_messages` y `conv_send_queue`. Cubre cómo aplicar correctamente la máquina de estados, cuándo actualizar `active_case_id`, `open_cases_ids` y `active_service_code`, y cómo evitar las inconsistencias más frecuentes entre tablas.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar una migración de esquema para las tablas de SmartConversations
- revisar si una EF actualiza el estado correctamente
- depurar inconsistencias entre `conv_sessions.state` y `conv_cases.status`
- entender qué EF tiene autoridad para modificar cada campo
- diseñar una nueva EF que crea o cierra casos

## 3. Preconditions

Antes de usar este skill, leer:

- `contract-case-state-machine.md` — fuente de verdad de los estados válidos y sus transiciones
- `rules-90-observability-and-failure-handling.md` — `conv_send_queue` y el job de reconciliación

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- Solo las EFs con `service_role` pueden ejecutar `UPDATE` sobre `conv_sessions` y `conv_cases`. n8n no escribe en estas tablas directamente.
- `conv-escalate-case` es la única EF autorizada para mover `conv_cases.status` a `escalated`.
- `conv_sessions.state` solo puede avanzar en el sentido definido por la máquina de estados. No existen transiciones arbitrarias.
- `conv_send_queue` es exclusivamente la cola de reintentos de envío saliente al usuario. No se usa para reintentos de llamadas al Core.
- Una sesión con `state = 'EXPIRED'` no se reanuda. Un nuevo mensaje crea una sesión nueva con `state = 'NEW'`.
- Un caso con `status = 'closed'` es final. No puede reabrirse.

## 5. Estrategia de implementación

El modelo de datos tiene cuatro tablas con roles distintos:

1. **`conv_sessions`** — ciclo de vida de la conversación; una fila por canal por usuario; contiene el estado de enrutado y los punteros a casos activos.
2. **`conv_cases`** — ciclo de vida de una intención específica del usuario; puede haber múltiples casos en la misma sesión.
3. **`conv_messages`** — registro de todos los mensajes: entrantes del usuario, salientes del bot/admin, deduplicados por `wasender_message_id` en WhatsApp.
4. **`conv_send_queue`** — cola temporal para los reintentos de entrega de mensajes salientes que fallaron.

## 6. Pasos recomendados

### Paso 1 — Entender la estructura de `conv_sessions`

Campos clave y su significado:

| Campo | Tipo | Quién lo actualiza | Cuándo |
|---|---|---|---|
| `state` | enum | EFs (`conv-ingest`, `conv-close-session`, `WF-C00-RECONCILE` via EF) | En cada transición definida en `contract-case-state-machine.md` |
| `active_case_id` | UUID \| null | EFs que crean/cierran casos | Al crear un caso nuevo o al cerrar el activo |
| `open_cases_ids` | UUID[] | EFs que crean/cierran casos | Append al crear; remove al cerrar/resolver |
| `active_service_code` | text \| null | EFs invocadas por WF-10 | Al enrutar a un servicio; null al volver a NEW |
| `identity_level` | enum | `conv-ingest`, `conv-web-session`, EF que llama a `conv-core-validate-identity` | Al completar la validación de identidad |
| `profile_id` | UUID \| null | EFs receptoras de `IdentityValidationResult` | Al almacenar el resultado de validación |
| `identity_data` | JSONB | EFs receptoras de `IdentityValidationResult` | Al almacenar datos del flujo progresivo |
| `last_active_at` | timestamptz | `conv-ingest`, `conv-web-message` | Al recibir cualquier mensaje del usuario |

### Paso 2 — Entender la estructura de `conv_cases`

Campos clave:

| Campo | Tipo | Valores |
|---|---|---|
| `status` | text | `open`, `waiting_user`, `waiting_internal`, `escalated`, `resolved`, `closed` |
| `case_ref_type` | text | `incident`, `lead`, `help_ticket` |
| `case_ref` | text \| null | Referencia legible del Core (`INC-2026-NNNN`, `LEAD-2026-NNNN`) |
| `session_id` | UUID | FK a `conv_sessions` |
| `service_code` | text | Servicio que creó el caso |

### Paso 3 — Aplicar transiciones de estado correctamente

Antes de ejecutar cualquier `UPDATE` de estado, la EF debe:

1. Leer el estado actual.
2. Verificar que la transición es válida según `contract-case-state-machine.md`.
3. Si la transición ya fue aplicada: devolver éxito sin modificar (operación idempotente).
4. Si la transición es inválida: registrar el intento en logs y devolver error descriptivo.

```sql
-- Patrón de transición segura en una EF
-- Ejemplo: open → waiting_internal

UPDATE conv_cases
SET status = 'waiting_internal', updated_at = now()
WHERE id = <case_id>
  AND status = 'open'                    -- solo si el estado actual es el esperado
  AND client_account_id = <tenant_id>    -- verificación de tenant para RLS
RETURNING id;

-- Si no se devuelve ninguna fila:
--   - Leer el estado actual
--   - Si ya es 'waiting_internal': éxito idempotente
--   - Si es otro estado: error descriptivo
```

### Paso 4 — Gestionar `active_case_id` y `open_cases_ids`

Al **crear un nuevo caso:**

```sql
INSERT INTO conv_cases (...) VALUES (...) RETURNING id;

UPDATE conv_sessions
SET
  active_case_id = <nuevo_case_id>,
  open_cases_ids = array_append(open_cases_ids, <nuevo_case_id>),
  active_service_code = <service_code>,
  last_active_at = now()
WHERE id = <session_id>;
```

Al **resolver o cerrar el caso activo:**

```sql
UPDATE conv_cases SET status = 'resolved' WHERE id = <case_id>;

UPDATE conv_sessions
SET
  active_case_id = (
    -- Buscar el siguiente caso abierto en open_cases_ids, si existe
    SELECT id FROM conv_cases
    WHERE id = ANY(open_cases_ids)
      AND status IN ('open', 'waiting_user')
      AND id != <case_id>
    LIMIT 1
  ),
  open_cases_ids = array_remove(open_cases_ids, <case_id>)
WHERE id = <session_id>;
```

Si no hay otro caso abierto, `active_case_id` queda como `null`.

### Paso 5 — Estructura y uso de `conv_messages`

Campos obligatorios al insertar un mensaje entrante (canal WhatsApp):

```sql
INSERT INTO conv_messages (
  client_account_id,
  session_id,
  channel,                  -- 'whatsapp' | 'webchat'
  sender_type,              -- 'user' | 'bot' | 'admin'
  direction,                -- 'inbound' | 'outbound'
  text,
  status,                   -- 'received' | 'processing' | 'sent' | 'failed'
  wasender_message_id,      -- solo para WhatsApp; NULL para WebChat
  created_at
) VALUES (...);
```

La deduplicación en WhatsApp se garantiza mediante un índice parcial único que excluye filas de WebChat (donde `wasender_message_id` es NULL):

```sql
-- Índice parcial en la migración:
CREATE UNIQUE INDEX uq_wa_message_id
  ON conv_messages (client_account_id, wasender_message_id)
  WHERE wasender_message_id IS NOT NULL;
```

El índice parcial es preferible a un constraint de unicidad convencional porque solo indexa las filas de WhatsApp (excluye los NULL de WebChat) y es portable entre versiones de PostgreSQL.

### Paso 6 — Estructura y uso de `conv_send_queue`

`conv_send_queue` almacena mensajes salientes que fallaron y deben reintentarse. La DDL oficial está definida en `rules-90-observability-and-failure-handling.md` §4.2:

```sql
CREATE TABLE conv_send_queue (
  id                  uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid      NOT NULL REFERENCES conv_sessions(id),
  client_account_id   uuid      NOT NULL,
  channel             text      NOT NULL,
  message_id          uuid      REFERENCES conv_messages(id),
  payload             jsonb     NOT NULL,   -- datos de envío (sin PII en texto claro)
  attempts            integer   DEFAULT 0,
  max_retries         integer   DEFAULT 3,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_error          text,
  status              text      DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  created_at          timestamptz DEFAULT now()
);
```

Nombres de columna exactos: `attempts`, `next_attempt_at`, `payload jsonb`. Los cuatro valores válidos de `status` son: `'pending'`, `'processing'`, `'succeeded'`, `'failed'`.

La cola no almacena el texto del mensaje directamente en `payload` si puede recuperarse desde `conv_messages`.

Un job de reconciliación (WF-C00-RECONCILE) procesa las entradas con `status = 'pending'` y `next_attempt_at <= now()`. Tras `max_retries` intentos fallidos: `status = 'failed'` + `UPDATE conv_messages.status = 'failed'` + alerta al admin.

### Paso 7 — Detectar y resolver inconsistencias

Las inconsistencias más frecuentes son:

| Inconsistencia | Causa habitual | Cómo detectar |
|---|---|---|
| `conv_sessions.state = 'IN_SERVICE'` + sin casos abiertos | Caso cerrado sin actualizar `active_case_id` | `SELECT s.id FROM conv_sessions s LEFT JOIN conv_cases c ON c.id = s.active_case_id WHERE s.state = 'IN_SERVICE' AND c.id IS NULL` |
| `active_case_id` apunta a un caso `closed` | Cierre sin limpiar `active_case_id` | `SELECT s.id FROM conv_sessions s JOIN conv_cases c ON c.id = s.active_case_id WHERE c.status = 'closed'` |
| `open_cases_ids` contiene casos `closed` | Remove no ejecutado al cerrar | `SELECT s.id FROM conv_sessions s, unnest(s.open_cases_ids) case_id JOIN conv_cases c ON c.id = case_id WHERE c.status = 'closed'` |
| `conv_messages.status = 'received'` > 5 min sin procesar | n8n caído | Detectado por WF-C00-RECONCILE |

## 7. Datos / contratos involucrados

- `contract-case-state-machine.md` — estados válidos y transiciones para `conv_sessions.state` y `conv_cases.status`
- `rules-90-observability-and-failure-handling.md` — DDL de `conv_send_queue` y job de reconciliación
- `rules-80-data-and-privacy.md` — retención de datos: `conv_messages.text` 12 meses, `conv_sessions` 24 meses, `conv_cases` 36 meses, `conv_send_queue` 7 días

## 8. Errores comunes

- **EF que ejecuta `UPDATE` sin verificar el estado actual:** sin la cláusula `WHERE status = <expected>`, una EF puede aplicar una transición inválida sin saberlo.
- **Olvidar actualizar `open_cases_ids` al cerrar un caso:** el array queda con UUIDs de casos cerrados, lo que confunde a WF-10 cuando busca casos activos.
- **Setear `active_case_id = null` sin limpiar `open_cases_ids`:** si hay otros casos abiertos, `active_case_id` debería apuntar al siguiente, no a `null`.
- **Insertar en `conv_messages` sin deduplicar en WhatsApp:** el constraint único evita el duplicado en base de datos, pero el intent de `conv-ingest` ya debería haberlo comprobado antes.
- **Usar `conv_send_queue` para reintentos de Core:** esa cola es solo para reintentos de mensajes salientes al usuario.

## 9. Qué no debe hacerse

- Ejecutar `UPDATE` sobre `conv_sessions` o `conv_cases` directamente desde n8n.
- Reabrir un caso con `status = 'closed'` creando una nueva transición. Para continuar la gestión se debe crear un nuevo caso.
- Reanudar una sesión con `state = 'EXPIRED'`. Un nuevo mensaje crea una sesión nueva.
- Incrementar `attempts` en `conv_send_queue` sin actualizar `next_attempt_at` con el backoff correcto.
- Almacenar en `conv_messages.text` datos que no son texto del usuario o del bot (por ejemplo, metadatos de infraestructura).

## 10. Escenarios mínimos de prueba

1. **Primer mensaje WhatsApp → sesión NEW → IN_SERVICE:**
   `conv_sessions.state` transita de `NEW` a `IN_SERVICE` cuando hay un único servicio activo; `active_service_code` se establece correctamente.

2. **Múltiples servicios → NEW → SELECTING_SERVICE:**
   Con más de un servicio activo, el estado transita a `SELECTING_SERVICE` hasta que el usuario elige.

3. **Caso creado → `open_cases_ids` actualizado:**
   Al crear un `conv_case`, `conv_sessions.open_cases_ids` incluye el UUID del nuevo caso y `active_case_id` apunta a él.

4. **Caso cerrado → `open_cases_ids` limpiado:**
   Al cerrar el caso activo, el UUID se elimina de `open_cases_ids` y `active_case_id` apunta al siguiente caso abierto o queda en `null`.

5. **Transición inválida → error sin modificar estado:**
   Intentar transitar `conv_cases.status` de `closed` a `open` → la EF devuelve error descriptivo sin ejecutar el `UPDATE`.

6. **Sesión EXPIRED → nuevo mensaje crea sesión nueva:**
   Un mensaje en una sesión `EXPIRED` crea una nueva sesión con `state = 'NEW'`; la sesión expirada no se modifica.

7. **Fallo de envío → entra en `conv_send_queue`:**
   Envío fallido → INSERT en `conv_send_queue` con `max_retries=3`; `conv_messages.status` queda en `'received'` hasta que el reintento tenga éxito.

## 11. Criterio de done

El modelo de datos se considera correctamente implementado cuando:

- Las transiciones de `conv_sessions.state` y `conv_cases.status` solo las ejecutan EFs con `service_role`
- Cada `UPDATE` de estado incluye la cláusula `WHERE status = <expected>` para garantizar idempotencia
- `open_cases_ids` se mantiene consistente: append al crear un caso, remove al cerrar o resolver
- `active_case_id` apunta al siguiente caso abierto cuando se cierra el activo, o es `null` si no hay más
- El índice parcial único `uq_wa_message_id` en `conv_messages (client_account_id, wasender_message_id) WHERE wasender_message_id IS NOT NULL` existe en la migración
- `conv_send_queue` solo almacena mensajes salientes al usuario, no reintentos de Core

## 12. Documentos relacionados

- `contract-case-state-machine.md` — estados válidos y transiciones autorizadas
- `rules-90-observability-and-failure-handling.md` — DDL de `conv_send_queue` y job de reconciliación
- `rules-80-data-and-privacy.md` — retención de datos por tabla
- `skill-integration-api-implementation.md` — EFs que modifican el estado de `conv_cases`
- `skill-n8n-incidents-workflow.md` — flujo completo que crea y cierra casos de incidencias

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
