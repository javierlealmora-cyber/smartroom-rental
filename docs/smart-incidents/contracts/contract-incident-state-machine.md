# contract-incident-state-machine.md — smart-incidents: Máquina de Estados de la Incidencia

## 1. Propósito

Este documento formaliza la máquina de estados que opera sobre el campo `status` de la entidad `incident`. Define el conjunto exacto de estados válidos, las transiciones permitidas con su actor autorizado y sus condiciones, las transiciones explícitamente prohibidas, y las reglas de idempotencia y coherencia que toda implementación debe respetar.

Este contrato es la referencia de verdad para la validación programática de transiciones de estado. Las EFs del add-on y la capa de UI deben consultar este documento para determinar si una transición es válida antes de ejecutarla o renderizarla.

---

## 2. Alcance

Este contrato aplica a:

- El campo `status` de la tabla `inc_incidents`
- Toda EF del add-on que lea o modifique `inc_incidents.status`
- La capa de UI del módulo para determinar las acciones disponibles por estado y rol
- Los procesos automáticos del actor `system` (EFs invocadas desde smart-conversations o desde workflows de n8n)
- La tabla `inc_activities` como destino obligatorio del registro de toda transición ejecutada

---

## 3. Decisiones de diseño

### 3.1 Un único estado por incidencia en todo momento

La entidad `incident` tiene un único campo `status` que representa el estado actual de la incidencia. No existe un historial de estados en `inc_incidents`; el historial completo de transiciones se reconstruye consultando `inc_activities`.

### 3.2 Los estados terminales son absolutos

Los estados `closed` y `cancelled` no tienen transiciones salientes. Una incidencia que alcanza uno de estos estados no puede modificarse ni reabrirse por ningún actor, por ningún mecanismo y bajo ninguna circunstancia en V1.

### 3.3 La máquina de estados es cerrada en V1

El conjunto de estados y el conjunto de transiciones son cerrados. No puede añadirse ningún estado ni ninguna transición sin actualizar simultáneamente este documento y `rules-20-incident-lifecycle.md`.

### 3.4 n8n no es actor de transición

n8n opera como observador y orquestador de notificaciones. Puede leer el estado de una incidencia y puede invocar EFs del add-on para solicitar transiciones, pero no ejecuta directamente `UPDATE` sobre `inc_incidents.status`. Cuando n8n solicita una transición, la EF actúa como actor `system`.

---

## 4. Definición formal de la máquina de estados

### 4.1 Conjunto de estados

```
S = { new, notified, in_progress, waiting_tenant, resolved, closed, cancelled }
```

**Estado inicial:** `new`

**Estados terminales:** `closed`, `cancelled`

### 4.2 Tabla de transiciones válidas

| # | Estado origen | Estado destino | Actor(es) autorizado(s) | Condición |
|---|---|---|---|---|
| T-01 | `new` | `notified` | `system` | La notificación outbound al resolutor ha sido enviada y su entrega ha sido confirmada por el sistema de entrega |
| T-02 | `new` | `in_progress` | `client_admin`, `superadmin` | La gestión se inicia manualmente sin esperar la notificación automática |
| T-03 | `new` | `cancelled` | `tenant`, `client_admin`, `superadmin` | El `tenant` solo puede cancelar su propia incidencia; `client_admin` y `superadmin` pueden cancelar cualquier incidencia dentro de su scope autorizado |
| T-04 | `notified` | `in_progress` | `client_admin`, `superadmin` | La atención operativa se inicia explícitamente |
| T-05 | `notified` | `waiting_tenant` | `client_admin`, `superadmin` | Se necesita información o acción del tenant antes de que la gestión pueda avanzar |
| T-06 | `notified` | `cancelled` | `client_admin`, `superadmin` | Cancelación administrativa con justificación documentada |
| T-07 | `in_progress` | `waiting_tenant` | `client_admin`, `superadmin` | La gestión queda suspendida pendiente de respuesta del tenant |
| T-08 | `in_progress` | `resolved` | `client_admin`, `superadmin` | La actuación se considera completada y la incidencia resuelta |
| T-09 | `in_progress` | `cancelled` | `client_admin`, `superadmin` | Cancelación administrativa con justificación documentada |
| T-10 | `waiting_tenant` | `in_progress` | `client_admin`, `superadmin` | Se ha recibido la información necesaria del tenant y se retoma la gestión |
| T-11 | `waiting_tenant` | `cancelled` | `client_admin`, `superadmin` | La incidencia se cancela por falta de respuesta o por decisión administrativa justificada |
| T-12 | `resolved` | `closed` | `client_admin`, `superadmin` | Se confirma el cierre definitivo de la incidencia |
| T-13 | `resolved` | `in_progress` | `client_admin`, `superadmin` | La resolución se determina como insatisfactoria o incompleta y requiere nueva actuación |

**Total de transiciones válidas en V1: 13**

### 4.3 Actores autorizados por actor

| Actor | Transiciones que puede ejecutar |
|---|---|
| `tenant` | T-03 (solo sobre incidencias propias, solo desde estado `new`) |
| `client_admin` | T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13 |
| `superadmin` | T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, T-10, T-11, T-12, T-13 |
| `system` | T-01 |

El resolutor no es actor de transición en V1. n8n no es actor de transición en V1.

### 4.4 Matriz de transiciones

La siguiente tabla muestra qué transiciones son válidas entre cada par de estados. La celda indica el identificador de la transición (T-01 a T-13) si es válida, o "-" si no hay transición permitida entre ese par.

| Desde \ Hasta | `new` | `notified` | `in_progress` | `waiting_tenant` | `resolved` | `closed` | `cancelled` |
|---|---|---|---|---|---|---|---|
| `new` | — | T-01 | T-02 | — | — | — | T-03 |
| `notified` | — | — | T-04 | T-05 | — | — | T-06 |
| `in_progress` | — | — | — | T-07 | T-08 | — | T-09 |
| `waiting_tenant` | — | — | T-10 | — | — | — | T-11 |
| `resolved` | — | — | T-13 | — | — | T-12 | — |
| `closed` | — | — | — | — | — | — | — |
| `cancelled` | — | — | — | — | — | — | — |

Toda celda con "—" es una transición explícitamente prohibida.

---

## 5. Transiciones explícitamente prohibidas

Las siguientes transiciones merecen mención explícita por su relevancia arquitectónica o por ser casos en los que podría existir ambigüedad:

| Par origen → destino | Razón de la prohibición |
|---|---|
| `closed` → cualquier estado | `closed` es un estado terminal absoluto |
| `cancelled` → cualquier estado | `cancelled` es un estado terminal absoluto |
| `new` → `resolved` | Una incidencia no puede resolverse sin gestión previa |
| `new` → `closed` | Una incidencia no puede cerrarse sin gestión previa |
| `new` → `waiting_tenant` | Una incidencia no puede quedar en espera del tenant sin que la gestión haya comenzado |
| `notified` → `resolved` | No puede resolverse directamente desde `notified` sin gestión activa |
| `notified` → `closed` | No puede cerrarse directamente desde `notified` |
| `waiting_tenant` → `resolved` | Una incidencia en espera del tenant no puede resolverse sin retomar la gestión (`in_progress`) |
| `waiting_tenant` → `closed` | Una incidencia en espera del tenant no puede cerrarse directamente |

---

## 6. Reglas de comportamiento de las EFs

### 6.1 Verificación previa a toda transición

Antes de ejecutar cualquier `UPDATE` sobre `inc_incidents.status`, la EF debe verificar en orden:

1. El entitlement del `client_account` está activo.
2. La incidencia con el `incident_id` especificado existe y pertenece al `client_account`.
3. El estado actual de la incidencia (obtenido con `SELECT ... FOR UPDATE` o equivalente).
4. La transición solicitada es válida para el par (estado origen actual, estado destino solicitado) según la tabla §4.2.
5. El actor solicitante está autorizado para esa transición según la tabla §4.3.

Si alguna verificación falla, la EF devuelve error descriptivo sin modificar el estado.

### 6.2 Idempotencia

Cuando el estado actual de la incidencia ya es el estado destino solicitado:

1. La EF verifica que el estado actual ya es el destino solicitado.
2. Devuelve respuesta de éxito.
3. No ejecuta ningún `UPDATE` sobre `inc_incidents.status`.
4. No inserta ningún registro en `inc_activities`.

El tratamiento idempotente aplica independientemente del actor solicitante.

### 6.3 Registro obligatorio en `inc_activities`

Toda transición exitosa (excluidas las repetidas, tratadas de forma idempotente) debe registrar en `inc_activities` antes de que la transición se considere completa. El `UPDATE` sobre `inc_incidents.status` y el `INSERT` en `inc_activities` deben ejecutarse en la misma transacción atómica. Si el registro en `inc_activities` falla, la transición no debe completarse y el estado de la incidencia permanece sin cambios.

### 6.4 Actualización de timestamps de estado

Al ejecutar las siguientes transiciones, la EF debe actualizar atómicamente el campo de timestamp correspondiente:

| Transición | Campo a actualizar | Valor |
|---|---|---|
| → `resolved` (T-08) | `resolved_at` | Timestamp de la transición |
| → `closed` (T-12) | `closed_at` | Timestamp de la transición; `resolved_at` se mantiene sin cambios |
| → `cancelled` (T-03, T-06, T-09, T-11) | `cancelled_at` | Timestamp de la transición |
| `resolved` → `in_progress` (T-13) | `resolved_at` | Se revierte a `null` |

**Semántica de `resolved_at` en T-13:** `resolved_at` representa la resolución actualmente vigente en la entidad, no un historial de resoluciones. Cuando T-13 se ejecuta, `resolved_at` se revierte a `null` porque la incidencia ha abandonado el estado `resolved` y la resolución ya no está vigente. El intento de resolución anterior no se pierde: permanece trazado en el registro de `inc_activities` correspondiente a T-08. La entidad solo refleja el estado actual; `inc_activities` preserva el historial completo de transiciones sin que ninguna entrada sea eliminada o sobrescrita por T-13.

---

## 7. Representación de la máquina de estados

### 7.1 Descripción textual del grafo de transiciones

```
new ──T-01──► notified
new ──T-02──► in_progress
new ──T-03──► cancelled [TERMINAL]

notified ──T-04──► in_progress
notified ──T-05──► waiting_tenant
notified ──T-06──► cancelled [TERMINAL]

in_progress ──T-07──► waiting_tenant
in_progress ──T-08──► resolved
in_progress ──T-09──► cancelled [TERMINAL]

waiting_tenant ──T-10──► in_progress
waiting_tenant ──T-11──► cancelled [TERMINAL]

resolved ──T-12──► closed [TERMINAL]
resolved ──T-13──► in_progress
```

### 7.2 Ejemplos de secuencias válidas

**Ciclo estándar completo:**
`new → notified → in_progress → resolved → closed`

**Ciclo con espera del tenant:**
`new → notified → in_progress → waiting_tenant → in_progress → resolved → closed`

**Resolución insatisfactoria y reapertura:**
`new → notified → in_progress → resolved → in_progress → resolved → closed`

**Cancelación temprana por el tenant:**
`new → cancelled`

**Cancelación administrativa desde `notified`:**
`new → notified → cancelled`

**Gestión manual sin esperar notificación:**
`new → in_progress → resolved → closed`

---

## 8. Ejemplos de payloads de transición

### 8.1 Solicitud de transición válida: T-08 (`in_progress → resolved`)

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "target_status": "resolved",
  "actor_role": "client_admin",
  "context": {
    "reason": "Avería reparada y confirmada por el equipo de mantenimiento"
  }
}
```

Resultado: la EF verifica que el estado actual es `in_progress`, que T-08 está autorizada para `client_admin`, actualiza `status = 'resolved'` y `resolved_at = <timestamp>`, inserta en `inc_activities`.

### 8.2 Solicitud de transición inválida: `notified → resolved` (prohibida)

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000002",
  "target_status": "resolved",
  "actor_role": "client_admin",
  "context": {}
}
```

Estado actual: `notified`. Resultado: la EF detecta que no existe transición válida entre `notified` y `resolved`. Devuelve error sin modificar el estado.

### 8.3 Solicitud idempotente: estado ya igual al destino

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000003",
  "target_status": "in_progress",
  "actor_role": "client_admin",
  "context": {}
}
```

Estado actual: `in_progress`. Resultado: la EF detecta idempotencia. Devuelve éxito sin `UPDATE` ni inserción en `inc_activities`.

### 8.4 Solicitud de transición desde estado terminal: `closed → in_progress` (prohibida)

```json
{
  "incident_id": "a1b2c3d4-0000-0000-0000-000000000004",
  "target_status": "in_progress",
  "actor_role": "superadmin",
  "context": {}
}
```

Estado actual: `closed`. Resultado: la EF detecta que `closed` no tiene transiciones salientes. Devuelve error indicando que la incidencia está en estado terminal.

---

## 9. Coherencia con otros documentos

Este contrato debe permanecer en sincronía con:

- `rules-20-incident-lifecycle.md` — es la fuente de decisión normativa; cuando exista conflicto entre este contrato y rules-20, prevalece rules-20
- `contract-incident-entity.md` — define los tipos y valores válidos del campo `status` y los timestamps asociados

Cuando se modifique la tabla de transiciones (§4.2), los tres documentos deben actualizarse en el mismo PR.

---

## 10. Impacto en implementación

- Las EFs deben usar `SELECT ... FOR UPDATE` (o mecanismo equivalente) al leer el estado actual antes de ejecutar una transición, para evitar condiciones de carrera.
- La validación de la transición debe realizarse en la EF, no delegarse a la base de datos exclusivamente.
- El `UPDATE` sobre `status` y el `INSERT` en `inc_activities` deben estar en la misma transacción atómica.
- Cualquier PR que permita una transición no listada en §4.2 debe rechazarse.
- Cualquier PR que omita la actualización de timestamps de estado (§6.4) debe rechazarse.
- La UI debe consultar el estado actual y el rol del usuario para determinar las acciones disponibles; no debe mostrar acciones cuya transición no esté autorizada para ese par (estado, actor).

---

## 11. Dependencias

- `rules-20-incident-lifecycle.md` — fuente de decisión normativa sobre estados, transiciones y actores; este contrato lo formaliza
- `contract-incident-entity.md` — definición del campo `status`, sus valores válidos y los campos de timestamp asociados
- `rules-05-roles-and-visibility.md` — capacidades de cada actor y restricciones de scope

## 12. Requirements relacionados

- `REQ-013-saas-services-catalog.md` — modelo de suscripción SaaS bajo el que opera el add-on
