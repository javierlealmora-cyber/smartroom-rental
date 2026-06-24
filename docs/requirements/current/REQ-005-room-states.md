# REQ-005 - Estados derivados de habitaciones

## Status
ACTIVE

## Owner
@admin

## Last updated
2026-04-08

---

## 🎯 Objetivo

Definir cómo se calcula el estado operativo de una habitación en tiempo real a partir de los datos de
asignación, sin almacenar un campo `status` redundante en la tabla `rooms`. Evita inconsistencias
causadas por sincronización manual y garantiza que el estado es siempre coherente con la realidad.

---

## 📌 Alcance

### Incluye
- Definición de los 4 estados posibles de una habitación
- Regla de derivación desde `lodger_room_assignments` y `rooms.is_maintenance`
- Cómo se calcula el estado en el frontend (JS) y en la base de datos (SQL)
- Contadores de ocupación en la lista de alojamientos
- Gantt de ocupación en el detalle de alojamiento

### No incluye
- Estados de inquilino (ver REQ-006)
- Facturación ni energía (ver REQ-004)
- Disponibilidad para nueva asignación (ver REQ-003)

---

## 🧩 Descripción funcional

El estado de una habitación **no se almacena** en la tabla `rooms`. Se deriva en el momento de la
consulta cruzando dos fuentes:

1. `rooms.is_maintenance` — el único indicador almacenado en rooms
2. `lodger_room_assignments` — las asignaciones activas o futuras de esa habitación

### Estados posibles

| Estado | Valor | Color UI | Descripción |
|--------|-------|----------|-------------|
| Libre | `free` | Verde `#16A34A` | Sin asignación activa ni futura |
| Ocupada | `occupied` | Rojo `#DC2626` | Asignación activa (sin fecha de salida) |
| Pendiente de baja | `pending_checkout` | Ámbar `#D97706` | Tiene fecha de salida futura |
| Mantenimiento | `maintenance` | Gris `#6B7280` | `is_maintenance = true` |
| Reservada | `reserved` | Violeta `#6D28D9` | Solo asignación futura (move_in_date > hoy), sin inquilino actual |

### Badge secundario "Reservada"

Una habitación en estado `occupied` o `pending_checkout` puede tener simultáneamente una
reserva futura. En ese caso muestra su estado principal en la cabecera de la card, **más**
un badge secundario violeta "Reservada DD/MM/YYYY" superpuesto en la imagen (abajo-derecha).

La función `getRoomUpcoming(room)` devuelve la primera asignación futura o `null`.

### Prioridad de evaluación

`maintenance` tiene prioridad absoluta: si `is_maintenance = true`, el estado es siempre
`maintenance` independientemente de las asignaciones.

---

## 🔁 Flujo funcional

### Cálculo en frontend (JS)

Implementado en `AccommodationDetail.jsx` y `RoomsSearch.jsx` — dos queries separadas por `move_in_date`:

```js
const today = new Date().toISOString().split("T")[0];

// Query 1 — asignaciones ya empezadas (move_in_date <= hoy) y no terminadas
supabase.from("lodger_room_assignments")
  .lte("move_in_date", today)
  .or(`move_out_date.is.null,move_out_date.gt.${today}`)
// → active_assignment

// Query 2 — asignaciones futuras (reservas: move_in_date > hoy)
supabase.from("lodger_room_assignments")
  .gt("move_in_date", today)
// → future_assignment

// Derivar estado por habitación
function getRoomStatus(room) {
  if (room.is_maintenance) return "maintenance";
  const today = new Date().toISOString().split("T")[0];
  const current = (room.active_assignment || []).find(
    a => a.move_in_date <= today && (!a.move_out_date || a.move_out_date > today)
  );
  const upcoming = (room.future_assignment || []).find(a => a.move_in_date > today);
  if (!current && !upcoming) return "free";
  if (!current && upcoming)  return "reserved";
  if (current && !current.move_out_date) return "occupied";
  return "pending_checkout"; // current con move_out_date futuro
}

// Badge secundario de reserva futura
function getRoomUpcoming(room) {
  const today = new Date().toISOString().split("T")[0];
  return (room.future_assignment || []).find(a => a.move_in_date > today) ?? null;
}
```

### Cálculo en SQL

Función `get_room_derived_status(room_id UUID)` — actualizada en `20260408000001_add_reserved_room_state.sql`:

```sql
-- Devuelve JSONB: { status, upcoming }
-- status: 'free' | 'occupied' | 'pending_checkout' | 'maintenance' | 'reserved'
-- upcoming: fecha ISO de la reserva futura (o null)
SELECT get_room_derived_status(room_id);
```

### Contadores de ocupación (AccommodationsList)

Las cards de la lista de alojamientos muestran: Total | Ocupado | Libres | Pend. | %Ocupación.

**Estado actual (BUG-037):** `listAccommodations()` solo fetcha `rooms(id, is_maintenance)` —
sin datos de asignación. `getStats()` lee `r.status` que es siempre `undefined` → todos los
contadores muestran 0. Ver `qa/defects/OPEN-DEFECTS.md` BUG-037.

**Comportamiento correcto esperado:** `listAccommodations()` debe incluir las asignaciones
activas/futuras en el fetch de rooms para poder calcular `derivedStatus` en `getStats()`.

---

## ✅ Casos válidos

- **Habitación sin ninguna asignación** → `free`
- **Habitación con asignación activa** (`move_out_date IS NULL`) → `occupied`
- **Habitación con asignación que termina mañana** → `pending_checkout`
- **Habitación con asignación que terminó ayer** → `free` (la asignación ya no cuenta)
- **Habitación marcada `is_maintenance = true` aunque tenga asignación futura** → `maintenance`
- **Habitación con múltiples asignaciones históricas y ninguna activa** → `free`

---

## ❌ Casos inválidos

- Usar `rooms.status` para derivar el estado (campo eliminado — migración `20260325150100`)
- Mostrar `r.status` de datos de `listAccommodations()` (BUG-037 — campo nunca presente)
- Asignar estado `free` a habitación en mantenimiento (maintenance tiene prioridad)

---

## 📊 Reglas de negocio

1. **No almacenamiento:** `rooms` no tiene campo `status`. El estado se computa siempre desde `lodger_room_assignments`.
2. **Mantenimiento prioritario:** `is_maintenance = true` → siempre `maintenance`, sin excepción.
3. **Asignación activa = ya empezó y no ha terminado:** `move_in_date <= hoy AND (move_out_date IS NULL OR move_out_date > hoy)` → `occupied` o `pending_checkout`.
4. **Asignación futura = no ha empezado:** `move_in_date > hoy` → contribuye al estado `reserved` o al badge secundario.
5. **Reservada = solo asignación futura, sin activa:** `!current && upcoming` → `reserved`.
6. **Ocupada:** `current con move_out_date IS NULL` → `occupied`.
7. **Pendiente de baja:** `current con move_out_date > hoy` → `pending_checkout`.
8. **Libre = ninguna de las anteriores.**
9. **Hoy = libre / checkout:** si `move_out_date = today`, la query usa `.gt.today` → la asignación ya no aparece → habitación libre ese mismo día. El constraint `'[)'` permite que el check-in del nuevo inquilino sea el mismo día.
10. **Badge dual:** `occupied` o `pending_checkout` pueden tener una reserva futura simultánea. La card muestra el estado principal + badge secundario "Reservada DD/MM/YYYY" abajo-derecha.
11. **Constraint de no solapamiento:** `EXCLUDE USING gist` con `daterange '[)'` — permite mismo día de salida e entrada.

---

## 🗄️ Impacto en base de datos

**Tablas afectadas:**
- `rooms` — campo `is_maintenance BOOLEAN NOT NULL DEFAULT false` (único campo de estado almacenado)
- `lodger_room_assignments` — campos `move_in_date DATE NOT NULL`, `move_out_date DATE NULL`

**Campos relevantes:**
- `rooms.is_maintenance` — flag de mantenimiento (almacenado)
- `lodger_room_assignments.move_out_date` — NULL = activo, DATE = salida programada o completada

**Constraints:**
- `no_overlapping_assignments`: `EXCLUDE USING gist (room_id WITH =, daterange(..., '[)') WITH &&)` — permite mismo día de checkout/checkin
- ~~`idx_room_active_assignment`~~: eliminado en `20260408000001` — bloqueaba la 2ª asignación futura por habitación
- ~~`idx_lodger_active_assignment`~~: eliminado en `20260408000001` — bloqueaba la asignación activa + reserva futura para el mismo inquilino

**Función SQL:**
- `get_room_derived_status(room_id UUID)` → `JSONB { status, upcoming }` — `status`: `'free' | 'occupied' | 'pending_checkout' | 'maintenance' | 'reserved'`

**Migraciones relevantes:**
- `20260325150100_remove_status_from_rooms.sql` — elimina el campo `status` de `rooms`
- `20260325150000_remove_status_from_assignments.sql` — elimina el campo `status` de `lodger_room_assignments`
- `20260408000001_add_reserved_room_state.sql` — elimina unique indexes, corrige constraint `'[]'→'[)'`, actualiza `get_room_derived_status()`

---

## 🧱 Impacto en frontend

**Componentes afectados:**
- `src/services/accommodations.service.js` → `listRooms()` (implementación correcta)
- `src/pages/v2/admin/accommodations/AccommodationsList.jsx` → `getStats()` (BUG-037)
- `src/pages/v2/admin/accommodations/AccommodationDetail.jsx` → tabs Habitaciones y Ocupación
- `src/constants/roomStatus.js` → constantes `ROOM_STATUS`, `ROOM_STATUS_LABEL`, `ROOM_STATUS_TAG`

**Campo a usar en componentes:** `room.derivedStatus` (no `room.status`)

**Estados posibles:**
```js
// src/constants/roomStatus.js
ROOM_STATUS.FREE             = 'free'
ROOM_STATUS.OCCUPIED         = 'occupied'
ROOM_STATUS.PENDING_CHECKOUT = 'pending_checkout'
ROOM_STATUS.MAINTENANCE      = 'maintenance'
```

---

## 🧪 Validación (QA)

Tests asociados:
- unit: ninguno activo para derivación de estado de habitación
- services: ninguno activo
- e2e: `qa/e2e/specs/room-status-and-checkout.spec.js` (parcial)

**Gaps:**
- ❌ Test unitario de `get_room_derived_status()` SQL
- ❌ Test de `listRooms()` con asignaciones en distintos estados
- ❌ Test E2E de contadores en AccommodationsList (bloqueado por BUG-037)

---

## 🔗 Trazabilidad

- Requisito relacionado: REQ-003 (asignaciones), REQ-006 (estados inquilino)
- Migraciones SQL: `20260325150100_remove_status_from_rooms.sql`
- Defectos: BUG-037 (contadores a 0 en AccommodationsList), BUG-036 (cache post-checkout)
- Constantes: `src/constants/roomStatus.js`
- Utilidades: `src/services/accommodations.service.js#listRooms`

---

## ⚠️ Consideraciones

- **BUG-037 activo:** AccommodationsList siempre muestra 0 en todos los contadores porque
  `listAccommodations()` no incluye datos de asignación en el fetch de rooms.
- **BUG-036 activo:** Tras checkout desde TenantsList, AccommodationDetail no recarga — sigue
  mostrando el estado previo en memoria.
- La función SQL `get_room_derived_status()` existe pero no se usa en queries del frontend
  (se prefiere derivar en cliente para reducir complejidad de queries).
- Cualquier component que muestre estado de habitación debe usar `derivedStatus` (no `status`).

---

## 📝 Observaciones

El campo `rooms.status` existió en versiones anteriores del sistema pero fue eliminado porque:
- Era redundante con los datos de asignación
- Era fuente de bugs por sincronización manual (BUG-036 es consecuencia de ese patrón)
- El estado derivado automáticamente es siempre coherente con la realidad sin necesitar triggers

---

## Notas relacionadas

- **REQ-015 — Habitaciones compartidas con acompañante**: cuando una asignación tiene `accompanist_id`, la habitación se considera ocupada por dos personas bajo un único contrato. La facturación, la energía y los estados siguen siendo por habitación (no se duplican): el acompañante NO genera renta, fianza, liquidación ni acceso web independiente. El acompañante se arrastra automáticamente en cualquier reasignación de habitación y se cierra en el check-out junto a la asignación. Ver `docs/requirements/current/REQ-015-shared-room-accompanist.md` y `.windsurf/rules/shared-rooms.md`.
