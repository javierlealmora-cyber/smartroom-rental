# contract-incident-entity.md — smart-incidents: Entidad Incidencia

## 1. Propósito

Este documento define la estructura canónica de la entidad `incident` en el add-on `smart-incidents`: los campos que la componen, sus tipos, sus restricciones de validación, los valores válidos de todos los campos de tipo enum y las invariantes que el sistema debe garantizar en todo momento.

Este contrato es la referencia de verdad para el esquema de la tabla `inc_incidents`, para las EFs que leen o escriben incidencias, y para cualquier representación serializada de una incidencia (payloads de API, eventos publicados).

---

## 2. Alcance

Este contrato aplica a:

- El esquema de la tabla `inc_incidents` en la base de datos del add-on
- Todas las EFs del add-on que lean, creen o modifiquen registros de incidencias
- Los payloads de respuesta de las EFs que devuelven datos de incidencias
- Los payloads de integración entre smart-conversations y smart-incidents vía `conv-core-create-incident`
- Cualquier serialización de una incidencia enviada a n8n (dentro de los límites de minimización de PII definidos en `rules-00` §4.6)

---

## 3. Decisiones de diseño

### 3.1 El campo `assignee` queda diferido al Lote 3 de este contrato

El campo de asignación al resolutor (`assignee`, `resolver_id` o equivalente) queda fuera de la versión inicial de este contrato (Lote 1). La asignación de incidencias y el routing simple siguen siendo parte del MVP; su ausencia en este documento es una decisión de secuenciación de Lotes, no una exclusión del alcance del producto. Su definición se difiere al Lote 3, tras la aprobación de `rules-40-assignment-routing.md`. Cuando `rules-40` esté aprobado, se realizará una actualización formal de este contrato para incorporar los campos de asignación. Hasta entonces, ninguna EF ni ningún documento de menor precedencia puede introducir un campo de asignación en la entidad.

### 3.2 El campo `priority` usa dos valores únicamente

El campo `priority` acepta únicamente `normal` y `urgent`. No existe un nivel intermedio en V1. La política de quién puede asignar cada valor en la creación está definida en `rules-30-incident-creation.md` §4.4.

### 3.3 El `client_account_id` es el identificador de aislamiento principal

El `client_account_id` es la clave de partición lógica de los datos del add-on. Toda consulta y toda operación de escritura sobre `inc_incidents` debe incluir el `client_account_id` en la condición.

### 3.4 Los timestamps opcionales se fijan solo cuando el estado los activa

Los campos `resolved_at`, `closed_at` y `cancelled_at` son `null` hasta que la incidencia alcanza el estado correspondiente. Los campos `closed_at` y `cancelled_at`, una vez fijados, no pueden modificarse. El campo `resolved_at` es una excepción: representa la resolución actualmente vigente y se revierte a `null` cuando la transición T-13 (`resolved → in_progress`) se ejecuta. El intento de resolución anterior queda trazado en `inc_activities` sin eliminarse del historial.

---

## 4. Definición de campos

### 4.1 Tabla de campos

| Campo | Tipo | Obligatoriedad | Descripción |
|---|---|---|---|
| `incident_id` | `uuid` | Obligatorio | Identificador único de la incidencia. Generado por la EF. No aceptado como input externo. |
| `client_account_id` | `uuid` | Obligatorio | Identificador del cliente al que pertenece la incidencia. Extraído del contexto de autenticación, nunca del payload externo (salvo integración desde `conv-core-create-incident`). |
| `accommodation_id` | `uuid` | Obligatorio | Identificador del alojamiento al que pertenece la incidencia. |
| `requester_profile_id` | `uuid` | Obligatorio | Identificador del perfil del inquilino que reporta la incidencia. Debe corresponder a un perfil activo del `client_account`. |
| `room_id` | `uuid` | Opcional | Identificador de la habitación específica afectada. Debe pertenecer al `accommodation_id` indicado si se especifica. |
| `source` | `enum` | Obligatorio | Fuente de creación de la incidencia. Inmutable tras la creación. Ver §4.2. |
| `category` | `enum` | Obligatorio | Categoría de la incidencia. Ver §4.3. |
| `priority` | `enum` | Obligatorio | Prioridad de la incidencia. Valor por defecto `normal`. Ver §4.4. |
| `status` | `enum` | Obligatorio | Estado actual del ciclo de vida. Fijado a `new` en la creación. Solo modificable por EFs del add-on. Ver §4.5. |
| `title` | `text` | Obligatorio | Descripción breve de la incidencia. Máximo 255 caracteres. No debe interpretarse como fuente de metadatos estructurados. |
| `description` | `text` | Opcional | Descripción extendida de la incidencia. Sin longitud máxima definida en V1. No debe interpretarse como fuente de metadatos estructurados. |
| `created_at` | `timestamptz` | Obligatorio | Timestamp de creación de la incidencia. Fijado por la EF. No aceptado como input externo. |
| `resolved_at` | `timestamptz` | Opcional | Timestamp de la resolución actualmente vigente. Fijado por la EF al ejecutar T-08 (`in_progress → resolved`). Se revierte a `null` cuando se ejecuta T-13 (`resolved → in_progress`); el intento de resolución anterior permanece en `inc_activities`. |
| `closed_at` | `timestamptz` | Opcional | Timestamp en que la incidencia alcanzó el estado `closed`. Fijado por la EF al ejecutar la transición. `null` hasta entonces. No modificable una vez fijado. |
| `cancelled_at` | `timestamptz` | Opcional | Timestamp en que la incidencia alcanzó el estado `cancelled`. Fijado por la EF al ejecutar la transición. `null` hasta entonces. No modificable una vez fijado. |

### 4.2 Enum `source`

| Valor | Descripción |
|---|---|
| `web-tenant` | Creada por el tenant desde el formulario web del módulo |
| `web-admin` | Creada por el `client_admin` desde el panel de administración |
| `whatsapp` | Creada por integración con smart-conversations vía canal WhatsApp |
| `webchat` | Creada por integración con smart-conversations vía canal webchat |

El campo `source` es inmutable. No puede modificarse después de la creación.

### 4.3 Enum `category`

| Valor | Descripción |
|---|---|
| `maintenance` | Problemas de mantenimiento, averías, desperfectos |
| `noise` | Molestias por ruido |
| `security` | Incidentes relacionados con la seguridad del alojamiento |
| `billing` | Discrepancias o dudas sobre facturación o pagos |
| `other` | Cualquier incidencia que no encaje en las categorías anteriores |

### 4.4 Enum `priority`

| Valor | Descripción | Quién puede asignarlo en creación |
|---|---|---|
| `normal` | Prioridad estándar | Cualquier actor; valor por defecto |
| `urgent` | Prioridad elevada | Solo `client_admin` en creación |

En creación desde fuente `web-tenant`, el valor es siempre `normal`: el formulario del tenant no expone el campo de prioridad. Para fuentes `whatsapp` y `webchat`, el valor debe llegar ya traducido al enum canónico; la política de traducción se define en `contract-create-incident-request.md`.

### 4.5 Enum `status`

| Valor | Estado terminal | Estado inicial |
|---|---|---|
| `new` | No | Sí (todo registro creado empieza aquí) |
| `notified` | No | No |
| `in_progress` | No | No |
| `waiting_tenant` | No | No |
| `resolved` | No | No |
| `closed` | Sí | No |
| `cancelled` | Sí | No |

La semántica normativa de cada estado y la tabla completa de transiciones válidas están definidas en `rules-20-incident-lifecycle.md` y en `contract-incident-state-machine.md`.

---

## 5. Invariantes del sistema

Las siguientes condiciones deben ser verdaderas en todo momento para cualquier registro válido en `inc_incidents`:

1. **Invariante de estado inicial**: `status = 'new'` en el momento de la creación.

2. **Invariante de inmutabilidad de `source`**: `source` no puede cambiar después de la inserción.

3. **Invariante de `incident_id`**: El `incident_id` es único en la tabla y no puede modificarse.

4. **Invariante de `created_at`**: `created_at` no puede ser posterior a `resolved_at`, `closed_at` ni `cancelled_at` cuando estos campos no son `null`.

5. **Invariante de timestamp `resolved_at`**: `resolved_at` solo es no-null cuando `status` es `resolved` o `closed`. Si la incidencia retornó a `in_progress` vía T-13, `resolved_at` es `null` aunque el intento anterior esté registrado en `inc_activities`.

6. **Invariante de timestamp `closed_at`**: `closed_at` solo es no-null cuando `status` es `closed`.

7. **Invariante de timestamp `cancelled_at`**: `cancelled_at` solo es no-null cuando `status` es `cancelled`.

8. **Invariante de exclusividad de estado terminal**: Solo uno de `closed_at` o `cancelled_at` puede ser no-null en un mismo registro.

9. **Invariante de `client_account_id`**: El `client_account_id` debe corresponder a una suscripción activa o histórica de `smart_incidents` en `saas_service_subscriptions`. El check de entitlement activo se realiza solo en operaciones de escritura.

10. **Invariante de `room_id`**: Cuando `room_id` no es `null`, debe pertenecer al `accommodation_id` de la misma incidencia.

---

## 6. Reglas de validación

### 6.1 Validaciones en creación

| Campo | Regla |
|---|---|
| `incident_id` | La EF genera el UUID; el valor nunca se acepta del input externo |
| `client_account_id` | Extraído del contexto de autenticación para actores `tenant` y `client_admin`; presente en payload para fuentes conversacionales |
| `accommodation_id` | Debe existir como alojamiento válido dentro del `client_account_id` indicado |
| `requester_profile_id` | Debe ser un perfil activo dentro del `client_account_id`; para fuentes conversacionales, debe venir resuelto en el payload |
| `room_id` | Si se especifica, debe pertenecer al `accommodation_id` indicado |
| `source` | Debe ser uno de los cuatro valores del enum; la EF lo determina según el canal; no se acepta del input externo |
| `category` | Debe ser uno de los cinco valores del enum; obligatorio; sin valor por defecto |
| `priority` | Debe ser `normal` o `urgent`; valor por defecto `normal`; para fuente `web-tenant` la EF fija `normal`; para fuentes `whatsapp` y `webchat` el valor debe llegar ya traducido al enum canónico; si el valor recibido no es `normal` ni `urgent` la EF rechaza la operación |
| `title` | No puede estar vacío; máximo 255 caracteres |
| `status` | La EF fija `new`; el valor nunca se acepta del input externo |
| `created_at` | La EF fija el timestamp de la operación; el valor nunca se acepta del input externo |

### 6.2 Validaciones en modificación de estado

Solo las EFs del add-on pueden modificar `status`. Para todo `UPDATE` sobre `status`:

- El par (`status` origen, `status` destino) debe ser una transición válida según `contract-incident-state-machine.md`.
- El actor debe estar autorizado para esa transición según `rules-20-incident-lifecycle.md`.
- Los timestamps (`resolved_at`, `closed_at`, `cancelled_at`) deben actualizarse atómicamente con el `UPDATE` de `status` cuando corresponda.

---

## 7. Representación serializada

### 7.1 Representación completa (para EFs internas con acceso autorizado)

```json
{
  "incident_id": "<uuid>",
  "client_account_id": "<uuid>",
  "accommodation_id": "<uuid>",
  "requester_profile_id": "<uuid>",
  "room_id": "<uuid | null>",
  "source": "web-tenant | web-admin | whatsapp | webchat",
  "category": "maintenance | noise | security | billing | other",
  "priority": "normal | urgent",
  "status": "new | notified | in_progress | waiting_tenant | resolved | closed | cancelled",
  "title": "<string, máx 255 caracteres>",
  "description": "<string | null>",
  "created_at": "<iso8601 con timezone>",
  "resolved_at": "<iso8601 con timezone | null>",
  "closed_at": "<iso8601 con timezone | null>",
  "cancelled_at": "<iso8601 con timezone | null>"
}
```

### 7.2 Representación reducida para payloads de n8n

Los payloads emitidos hacia n8n nunca deben incluir datos de identidad del tenant. La representación permitida para n8n es:

```json
{
  "incident_id": "<uuid>",
  "client_account_id": "<uuid>",
  "status": "new | notified | in_progress | waiting_tenant | resolved | closed | cancelled",
  "category": "maintenance | noise | security | billing | other",
  "priority": "normal | urgent",
  "source": "web-tenant | web-admin | whatsapp | webchat"
}
```

Los campos `accommodation_id`, `requester_profile_id`, `room_id`, `title`, `description` y todos los timestamps de identidad o contexto quedan fuera del payload de n8n.

---

## 8. Ejemplos

### 8.1 Registro válido: incidencia recién creada desde formulario web del tenant

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000030",
  "room_id": null,
  "source": "web-tenant",
  "category": "maintenance",
  "priority": "normal",
  "status": "new",
  "title": "Grifo del baño con pérdida de agua",
  "description": "El grifo del baño lleva dos días goteando continuamente.",
  "created_at": "2026-07-24T10:00:00+02:00",
  "resolved_at": null,
  "closed_at": null,
  "cancelled_at": null
}
```

### 8.2 Registro válido: incidencia creada por `client_admin` con prioridad `urgent`

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000002",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000031",
  "room_id": "d3e4f5a6-0000-0000-0000-000000000040",
  "source": "web-admin",
  "category": "security",
  "priority": "urgent",
  "status": "new",
  "title": "Cerradura de la habitación 204 no responde",
  "description": null,
  "created_at": "2026-07-24T11:30:00+02:00",
  "resolved_at": null,
  "closed_at": null,
  "cancelled_at": null
}
```

### 8.3 Registro válido: incidencia creada desde WhatsApp y posteriormente cerrada

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000003",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000032",
  "room_id": null,
  "source": "whatsapp",
  "category": "noise",
  "priority": "normal",
  "status": "closed",
  "title": "Ruido en el pasillo por la noche",
  "description": null,
  "created_at": "2026-07-20T22:10:00+02:00",
  "resolved_at": "2026-07-22T09:00:00+02:00",
  "closed_at": "2026-07-24T10:00:00+02:00",
  "cancelled_at": null
}
```

### 8.4 Registro inválido: estado distinto de `new` en creación

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000099",
  "client_account_id": "f1e2d3c4-0000-0000-0000-000000000010",
  "accommodation_id": "b5c6d7e8-0000-0000-0000-000000000020",
  "requester_profile_id": "c9d0e1f2-0000-0000-0000-000000000030",
  "room_id": null,
  "source": "web-tenant",
  "category": "maintenance",
  "priority": "normal",
  "status": "in_progress",
  "title": "Incidencia inválida",
  "description": null,
  "created_at": "2026-07-24T10:00:00+02:00",
  "resolved_at": null,
  "closed_at": null,
  "cancelled_at": null
}
```

Razón de invalidez: `status` debe ser `new` en el momento de la creación sin excepción.

### 8.5 Registro inválido: `room_id` que no pertenece al `accommodation_id`

Registro donde `room_id` es un UUID de una habitación de un alojamiento distinto al especificado en `accommodation_id`. Viola la invariante 10 (§5).

### 8.6 Registro inválido: `closed_at` y `cancelled_at` ambos no-null

Registro con `closed_at` y `cancelled_at` ambos con valor. Viola la invariante 8 (§5).

---

## 9. Campos no incluidos en la versión inicial de este contrato

### 9.1 Campos diferidos a un Lote posterior (forman parte del MVP)

Los siguientes campos pertenecen al MVP pero no están incluidos en la versión inicial de este contrato. Se añadirán en el Lote indicado tras la aprobación de la documentación de mayor precedencia correspondiente.

| Campo | Lote | Dependencia |
|---|---|---|
| Campo de asignación al resolutor (`assignee`, `resolver_id` o equivalente) | Lote 3 | `rules-40-assignment-routing.md` (pendiente de aprobación) |

### 9.2 Campos fuera del alcance del MVP

Los siguientes campos no forman parte del MVP y no deben introducirse salvo una decisión explícita de producto que actualice `rules-00-scope-and-principles.md`.

| Campo | Motivo |
|---|---|
| SLA o timestamps de expiración | No incluidos en el MVP |
| Campo de puntuación o valoración del tenant | No incluido en el MVP |
| Cualquier campo de IA o clasificación automática | No incluido en el MVP |

---

## 10. Impacto en implementación

- El esquema de la tabla `inc_incidents` debe reflejar exactamente los campos de §4.1 con los tipos y restricciones indicados.
- Las columnas `status`, `source`, `category` y `priority` deben definirse como tipos enum en la base de datos con los valores del §4.2 al §4.5.
- La columna `source` debe tener una restricción de inmutabilidad (por ejemplo, trigger o política de RLS que impida el UPDATE sobre esa columna).
- Las columnas `incident_id` y `created_at` deben ser generadas por la base de datos o por la EF; no deben aceptarse desde el exterior.
- Cualquier PR que añada un campo de asignación en `inc_incidents` antes de que `rules-40` esté aprobado debe rechazarse.

---

## 11. Dependencias

- `rules-00-scope-and-principles.md` — namespace `inc_*`, minimización de PII hacia n8n
- `rules-20-incident-lifecycle.md` — semántica de estados y transiciones, invariantes de timestamp
- `rules-30-incident-creation.md` — actores, fuentes, validaciones en creación, política de prioridad
- `contract-incident-state-machine.md` — formalización de la máquina de estados que opera sobre el campo `status`
- `rules-80-security-and-tenancy.md` — política de datos y restricciones PII

## 12. Requirements relacionados

- `REQ-013-saas-services-catalog.md` — modelo de suscripción SaaS; `client_account_id` como clave de partición del entitlement
- `REQ-002-tenants-lifecycle.md` — confirma `accommodation_id` como nombre canónico del alojamiento y `profile_id` como identificador del perfil del tenant
