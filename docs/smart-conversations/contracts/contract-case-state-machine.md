# contract-case-state-machine.md — SmartConversations: Máquina de Estados

## 1. Propósito

Este contrato define las máquinas de estados de `conv_sessions.state` y `conv_cases.status`, los estados válidos, las transiciones permitidas, los eventos que las desencadenan y las reglas que impiden transiciones inválidas. Es la fuente de verdad para cualquier EF que actualice el estado de una sesión o de un caso.

Las dos máquinas son independientes: la sesión tiene un ciclo de vida ligado al canal y al tiempo; el caso tiene un ciclo de vida ligado a la resolución de una intención del usuario.

---

## 2. Cuándo se usa

Este contrato debe consultarse en cualquiera de estas situaciones:

- Una EF va a ejecutar `UPDATE conv_sessions SET state = ...`
- Una EF va a ejecutar `UPDATE conv_cases SET status = ...`
- Un workflow lee `conv_sessions.state` o `conv_cases.status` para tomar una decisión de enrutado
- Se revisa si una transición de estado es válida antes de proceder

---

## 3. Productor

Las EFs son el único mecanismo autorizado para modificar estados. n8n puede leer estados, pero nunca ejecuta `UPDATE` directamente sobre `conv_sessions` ni `conv_cases`.

| EF / actor | Qué estado modifica |
|---|---|
| `conv-ingest` | `conv_sessions.state`: `NEW`/`IDLE` → `IN_SERVICE` (un solo servicio activo) o `NEW` → `SELECTING_SERVICE` (múltiples servicios); `SELECTING_SERVICE` → `IN_SERVICE` (usuario responde al menú); `conv_cases.status`: `waiting_user` → `open` |
| `conv-escalate-case` | `conv_cases.status`: cualquier estado activo → `escalated` |
| `conv-close-case` | `conv_cases.status`: `escalated`/`resolved`/`waiting_*` → `closed` |
| `conv-close-session` | `conv_sessions.state`: `IN_SERVICE`/`IDLE` → `CLOSED` |
| EFs de Integration API | `conv_cases.status`: `open` → `waiting_internal` (operación enviada al Core) |
| `WF-C00-RECONCILE` (job) | `conv_sessions.state`: activos → `IDLE`/`EXPIRED`; `conv_cases.status`: `waiting_user` → `escalated` por timeout |

---

## 4. Consumidor

| Consumidor | Qué lee |
|---|---|
| WF-10 (enrutador) | `conv_sessions.state`, `conv_cases.status` — para decidir enrutado y detectar contexto activo |
| WF-20, WF-30, WF-40 | `conv_cases.status` — para continuar o crear casos |
| `conv-wa-webhook`, `conv-web-message` | `conv_sessions.state` — para validar que la sesión acepta mensajes |
| Panel de administración | Ambos — para mostrar estado a los admins |
| `WF-C00-RECONCILE` | Ambos — para detectar estados bloqueados y aplicar transiciones automáticas |

---

## 5. Estructura

### 5.1 `conv_sessions.state`

El campo de estado de la sesión es `state` (no `status`). Cubre tanto los estados de enrutado conversacional (coherentes con `rules-50-conversation-routing.md` §4.6) como los estados de ciclo de vida.

| Estado | Descripción |
|---|---|
| `NEW` | Sesión inicializada; ningún mensaje procesado aún |
| `SELECTING_SERVICE` | WF-10 presentó el menú de servicios; esperando selección del usuario |
| `IN_SERVICE` | Sesión activa; un workflow de servicio está procesando el mensaje |
| `AWAITING_USER` | WF de servicio espera respuesta del usuario (pregunta de datos) |
| `ESCALATED` | Sesión derivada a admin humano; el bot no gestiona la sesión activamente |
| `IDLE` | Sin actividad durante `idle_timeout_minutes`; se reanuda al llegar un nuevo mensaje |
| `EXPIRED` | TTL de sesión superado; no puede reanudarse; un nuevo mensaje crea nueva sesión |
| `CLOSED` | Cerrada explícitamente por el usuario o por el admin; no puede reanudarse |

### 5.2 Diagrama de transiciones de `conv_sessions.state`

```
   nuevo mensaje
        │
        ▼
     ┌─────┐
     │ NEW │
     └──┬──┘
        │
        ├── un solo servicio activo ──────────────────► IN_SERVICE ◄─── reanuda desde IDLE
        │                                                    │
        └── múltiples servicios ──► SELECTING_SERVICE        ├── servicio pide datos ──► AWAITING_USER
                                           │                 │                               │
                                    usuario elige            │◄──── usuario responde ─────────┘
                                           │                 │
                                           └──► IN_SERVICE   ├── escalado ──────────► ESCALATED
                                                             │                          │
                                                             ├── sin actividad N min ─► IDLE
                                                             │                          │ nuevo mensaje
                                                             │◄─────────────────────────┘
                                                             │
                                                             ├── TTL superado ─────────► EXPIRED
                                                             │
                                                             └── cierre explícito ──────► CLOSED
```

### 5.3 `conv_cases.status`

El campo de estado del caso es `status`.

| Estado | Descripción |
|---|---|
| `open` | Caso creado; procesamiento activo |
| `waiting_user` | El sistema espera respuesta del usuario para continuar |
| `waiting_internal` | Esperando respuesta del Core o de un proceso interno |
| `escalated` | Transferido a admin humano; el bot ya no lo gestiona |
| `resolved` | Operación completada con éxito |
| `closed` | Cerrado definitivamente; no puede reabrirse |

---

## 6. Campos obligatorios

| Tabla | Campo | Tipo | Valores válidos |
|---|---|---|---|
| `conv_sessions` | `state` | `text` | `NEW`, `SELECTING_SERVICE`, `IN_SERVICE`, `AWAITING_USER`, `ESCALATED`, `IDLE`, `EXPIRED`, `CLOSED` |
| `conv_cases` | `status` | `text` | `open`, `waiting_user`, `waiting_internal`, `escalated`, `resolved`, `closed` |
| `conv_cases` | `case_ref_type` | `text` | `incident`, `lead`, `help_ticket` |

---

## 7. Campos opcionales

Campos de `conv_sessions` que complementan la máquina de estados:

| Campo | Tipo | Descripción |
|---|---|---|
| `active_case_id` | `uuid` o `null` | UUID del caso que la sesión está atendiendo en este momento |
| `open_cases_ids` | `uuid[]` | Lista de todos los UUID de casos abiertos en esta sesión |
| `active_service_code` | `text` o `null` | Servicio que gestiona la sesión actualmente |
| `identity_level` | `IdentityLevel` | Nivel de identidad de la sesión (ver `contract-identity-validation-result.md`) |
| `last_active_at` | `timestamptz` | Último mensaje procesado; usado por `WF-C00-RECONCILE` para detectar IDLE y EXPIRED |

---

## 8. Reglas de validación

### Transiciones válidas de `conv_sessions.state`

| Desde | Hacia | Evento desencadenante | Actor |
|---|---|---|---|
| `NEW` | `IN_SERVICE` | Primer mensaje; un solo servicio activo | `conv-ingest` |
| `NEW` | `SELECTING_SERVICE` | Primer mensaje; múltiples servicios activos | `conv-ingest` |
| `SELECTING_SERVICE` | `IN_SERVICE` | Usuario responde al menú de servicios | `conv-ingest` |
| `IN_SERVICE` | `AWAITING_USER` | WF de servicio solicita datos al usuario | Callback de WF-20/30/40 |
| `AWAITING_USER` | `IN_SERVICE` | Usuario responde | `conv-ingest` |
| `IN_SERVICE` | `ESCALATED` | Caso escalado a admin | `conv-escalate-case` |
| `ESCALATED` | `IN_SERVICE` | Admin devuelve el control al bot | Acción del admin desde el panel |
| `IN_SERVICE` | `IDLE` | Sin actividad durante `idle_timeout_minutes` | `WF-C00-RECONCILE` |
| `AWAITING_USER` | `IDLE` | Sin actividad durante `idle_timeout_minutes` | `WF-C00-RECONCILE` |
| `IDLE` | `IN_SERVICE` | Nuevo mensaje recibido | `conv-ingest` |
| `IN_SERVICE` | `EXPIRED` | TTL de sesión superado | `WF-C00-RECONCILE` |
| `IDLE` | `EXPIRED` | TTL de sesión superado | `WF-C00-RECONCILE` |
| `IN_SERVICE` | `CLOSED` | Cierre explícito por usuario o admin | `conv-close-session` |
| `IDLE` | `CLOSED` | Cierre por admin desde el panel | `conv-close-session` |

Un nuevo mensaje en una sesión con `state = 'EXPIRED'` crea una nueva sesión con `state = 'NEW'`; no reanuda la expirada.

### Transiciones inválidas de `conv_sessions.state`

| Desde | Hacia | Motivo |
|---|---|---|
| `CLOSED` | Cualquier estado | `CLOSED` es final |
| `EXPIRED` | `IN_SERVICE` / `IDLE` | Una sesión expirada no se reanuda; se crea nueva |
| `NEW` | `IDLE` / `EXPIRED` | Una sesión sin mensajes no puede expirar en el mismo ciclo |

### Transiciones válidas de `conv_cases.status`

| Desde | Hacia | Evento desencadenante | EF responsable |
|---|---|---|---|
| `open` | `waiting_user` | El sistema necesita datos del usuario | Callback de WF |
| `open` | `waiting_internal` | Operación enviada al Core | EF de Integration API |
| `open` | `escalated` | Escalado por cualquier motivo | `conv-escalate-case` |
| `open` | `resolved` | Operación completada sin pasos intermedios | Callback de WF |
| `waiting_user` | `open` | Usuario responde | `conv-ingest` |
| `waiting_user` | `escalated` | `auto_escalate_after_minutes` superado | `WF-C00-RECONCILE` vía `conv-escalate-case` |
| `waiting_user` | `closed` | Admin cierra el caso | `conv-close-case` |
| `waiting_internal` | `open` | Respuesta interna recibida | EF correspondiente |
| `waiting_internal` | `escalated` | Fallo persistente del Core o del proceso interno | EF correspondiente |
| `waiting_internal` | `closed` | Admin cierra el caso | `conv-close-case` |
| `escalated` | `resolved` | Admin resuelve desde el panel | `conv-close-case` |
| `escalated` | `closed` | Admin cierra definitivamente | `conv-close-case` |
| `resolved` | `closed` | Cierre automático o explícito | `conv-close-case` / Job |

### Transiciones inválidas de `conv_cases.status`

| Desde | Hacia | Motivo |
|---|---|---|
| `closed` | Cualquier estado | `closed` es un estado final absoluto |
| `escalated` | `open` | Un caso escalado no vuelve al bot automáticamente |
| `escalated` | `waiting_user` / `waiting_internal` | El caso está en manos del admin |
| `resolved` | `open` / `waiting_user` / `escalated` | Un caso resuelto no puede reabrirse |

### Reglas adicionales

- Todas las transiciones de estado las ejecutan EFs con `service_role`. n8n no ejecuta `UPDATE` directamente sobre estas tablas.
- `conv-escalate-case` es la única EF autorizada para mover `conv_cases.status` a `escalated`.
- Las EFs deben verificar el estado actual antes del `UPDATE`. Si la transición ya fue aplicada: devolver éxito sin modificar. Si la transición es inválida: registrar en logs y devolver error descriptivo al llamante sin modificar el estado.
- `active_case_id` se actualiza cuando se crea un nuevo caso o el usuario confirma un cambio de contexto. Se establece a `null` cuando el caso activo pasa a `resolved` o `closed` y no hay otro caso en `open_cases_ids`.

---

## 9. Ejemplos válidos

### Flujo completo de incidencia (`STRONG_MATCH_ACTIVE`)

```
conv_sessions.state:
  NEW → IN_SERVICE           (primer mensaje; un solo servicio activo)
  IN_SERVICE → AWAITING_USER (WF-20 solicita el tipo de incidencia)
  AWAITING_USER → IN_SERVICE (usuario responde con el tipo)

conv_cases.status:
  [creación] → open
  open → waiting_internal    (incidencia enviada al Core)
  waiting_internal → resolved (Core confirma con incident_ref INC-2026-0042)
```

### Escalado por error de Core tras 3 reintentos

```
conv_sessions.state:
  IN_SERVICE → ESCALATED (conv-escalate-case ejecutado)

conv_cases.status:
  open → waiting_internal    (primer intento al Core)
  waiting_internal → escalated (3 reintentos fallidos; conv-escalate-case llamado)
```

### Sesión inactiva que se reanuda

```
conv_sessions.state:
  IN_SERVICE → IDLE      (job detecta idle_timeout superado)
  IDLE → IN_SERVICE      (usuario envía nuevo mensaje)
```

---

## 10. Ejemplos inválidos

### Intento de reabrir un caso `closed`

```
conv_cases.status: closed → open
```
**Inválido:** `closed` es un estado final absoluto. Para continuar la gestión se debe crear un nuevo caso.

---

### Caso escalado que vuelve directamente a `waiting_user`

```
conv_cases.status: escalated → waiting_user
```
**Inválido:** un caso escalado está en manos del admin. Solo puede avanzar a `resolved` o `closed`.

---

### Sesión `EXPIRED` que transita directamente a `IN_SERVICE`

```
conv_sessions.state: EXPIRED → IN_SERVICE
```
**Inválido:** una sesión expirada no puede reanudarse. Un nuevo mensaje crea una sesión nueva con `state = 'NEW'`.

---

### n8n ejecuta `UPDATE` directamente sobre `conv_cases`

```sql
-- Ejecutado desde un nodo n8n directamente
UPDATE conv_cases SET status = 'closed' WHERE id = '...';
```
**Inválido:** las transiciones de estado solo las ejecutan EFs con `service_role`. n8n no puede ejecutar `UPDATE` directamente sobre `conv_sessions` ni `conv_cases`.

---

## 11. Notas de versionado

- Añadir un nuevo estado a `conv_sessions.state` requiere: actualizar §5.1, el diagrama de §5.2, las tablas de §8, y verificar que `conv-ingest`, `conv-close-session` y `WF-C00-RECONCILE` lo manejan. Actualizar también `rules-50-conversation-routing.md` §4.6 si el estado afecta al enrutado.
- Añadir un nuevo estado a `conv_cases.status` requiere: actualizar §5.3, las tablas de §8, y verificar que `conv-escalate-case`, `conv-close-case` y `WF-C00-RECONCILE` lo manejan.
- Cambiar las reglas de transición de `escalated` (en ambas tablas) requiere revisión de arquitectura y coordinación con el panel de administración.
- Añadir un nuevo `case_ref_type` requiere actualizar §6 y la lógica de `conv-close-case` y del job de reconciliación.
- Cambiar la semántica de cuándo `IDLE` transita a `EXPIRED` afecta al job de reconciliación y a los TTLs configurados por tenant; requiere actualizar este contrato y `rules-90-observability-and-failure-handling.md`.

---

## 12. Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
