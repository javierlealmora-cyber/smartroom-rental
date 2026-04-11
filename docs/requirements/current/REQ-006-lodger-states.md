# REQ-006 - Estados de inquilinos (lodgers)

## Status
ACTIVE

## Owner
@admin

## Last updated
2026-03-28

---

## 🎯 Objetivo

Definir la máquina de estados de un inquilino: qué estados existen, cómo se calculan,
qué los provoca y cómo se muestran en la UI. Distingue entre el estado almacenado
(`onboarding_status` en `profiles`) y el estado operativo derivado de las asignaciones
(calculado en tiempo real).

---

## 📌 Alcance

### Incluye
- Los 4 estados operativos de un inquilino
- Regla de derivación desde `lodger_room_assignments`
- Campo almacenado `onboarding_status` y su relación con el estado derivado
- Utilidades JS para cálculo y presentación
- Flujo de transición entre estados

### No incluye
- Estados de habitación (ver REQ-005)
- Proceso de asignación (ver REQ-003)
- Facturación ni energía (ver REQ-004)

---

## 🧩 Descripción funcional

Un inquilino tiene **dos capas de estado**:

### Capa 1 — `onboarding_status` (almacenado en `profiles`)

Campo persistido en BD. Refleja el progreso del inquilino en el proceso de incorporación.

| Valor | Descripción |
|-------|-------------|
| `invited` | El admin ha creado al inquilino. Aún no ha activado su cuenta. |
| `active` | Ha activado la cuenta o se le ha asignado una habitación. |
| `inactive` | Ha completado el proceso de baja. |

Este campo se actualiza explícitamente via `setLodgerStatus()` o automáticamente al asignar
una habitación (`assignRoomToLodger()` y `reassignRoom()` hacen `onboarding_status = 'active'`).

### Capa 2 — Estado operativo derivado (calculado en tiempo real)

Calculado en el frontend a partir de las asignaciones del inquilino. Es el estado que
determina qué acciones están disponibles y cómo se muestra el inquilino en la UI.

| Estado derivado | Condición | Label UI | Color |
|-----------------|-----------|----------|-------|
| `invited` | Sin asignaciones, o asignación sin `move_in_date` | Invitado | Azul `#3B82F6` |
| `active` | Asignación más reciente con `move_out_date IS NULL` | Activo | Verde `#059669` |
| `pending_checkout` | Asignación más reciente con `move_out_date > hoy` | Pendiente baja | Ámbar `#F59E0B` |
| `inactive` | Asignación más reciente con `move_out_date <= hoy` | Inactivo | Gris `#6B7280` |

---

## 🔁 Flujo funcional

### Función principal: `getLodgerStatus(lodger)`

Implementada en `src/utils/lodgerStatus.js`:

```js
export function getLodgerStatus(lodger) {
  const assignments = lodger?.assignments || lodger?.active_assignment || [];

  if (!assignments || assignments.length === 0) return 'invited';

  // Asignación más reciente (por move_in_date)
  const sorted = [...assignments].sort((a, b) =>
    new Date(b.move_in_date || 0) - new Date(a.move_in_date || 0)
  );
  const latest = sorted[0];

  if (!latest.move_in_date)   return 'invited';
  if (!latest.move_out_date)  return 'active';

  const checkOut = dayjs(latest.move_out_date);
  const today    = dayjs().startOf('day');
  return checkOut.isAfter(today) ? 'pending_checkout' : 'inactive';
}
```

**Importante:** la función acepta el campo tanto con clave `assignments` (de `getLodger`)
como `active_assignment` (de `listLodgers`). Ver BUG-038.

### Transiciones de estado

```
                    [crear inquilino]
   ──────────────────────────────────────────►  invited
                                                  │
                   [asignar habitación]            │
   ◄──────────────────────────────────────────────┘
   active   ◄──── [reasignar]
     │
     │ [schedule_checkout: move_out_date = fecha futura]
     ▼
   pending_checkout
     │
     │ [fecha move_out_date llega (automático)]
     ▼
   inactive
```

### Flujo de alta (invited → active)

1. Admin crea inquilino → `onboarding_status = 'invited'`, sin asignaciones → derivado: `invited`
2. Admin asigna habitación (`assignRoomToLodger`) → crea asignación con `move_out_date IS NULL`
   y actualiza `onboarding_status = 'active'` → derivado: `active`

### Flujo de checkout (active → pending_checkout → inactive)

1. Admin hace checkout (`scheduleCheckout`) → actualiza `move_out_date = fecha_futura`
   → derivado: `pending_checkout`
2. Cuando `move_out_date <= hoy` → derivado automáticamente: `inactive`
   (sin cambio en BD — el estado cambia al pasar la fecha)

---

## ✅ Casos válidos

- Inquilino recién creado sin asignación → `invited`
- Inquilino con asignación activa (`move_out_date IS NULL`) → `active`
- Inquilino con checkout programado para mañana → `pending_checkout`
- Inquilino con checkout programado para hoy → `inactive` (hoy no es "después de hoy")
- Inquilino con múltiples asignaciones históricas y la última finalizada → `inactive`
- Inquilino reasignado (dos asignaciones, la última activa) → `active`

---

## ❌ Casos inválidos

- Leer `lodger.status` para determinar el estado operativo (campo no existe)
- Usar solo `onboarding_status` para determinar si el inquilino tiene habitación activa
  (no refleja el estado real de las asignaciones)
- Pasar datos de `listLodgers()` a `getLodgerStatus()` sin aceptar clave `active_assignment`
  → BUG-038

---

## 📊 Reglas de negocio

1. **Estado derivado > almacenado:** el estado operativo se calcula desde asignaciones, no desde `onboarding_status`.
2. **`onboarding_status` se actualiza explícitamente:** solo cambia cuando el admin realiza una acción (crear, asignar, bajar).
3. **Transición `inactive` es automática (por fecha):** cuando `move_out_date` pasa, el estado derivado es `inactive` sin cambio en BD.
4. **Solo se evalúa la asignación más reciente** (por `move_in_date`) para determinar el estado actual.
5. **`pending_checkout` requiere fecha estrictamente futura:** `move_out_date > today` (hoy = inactive).
6. **Reasignación mantiene estado `active`:** la nueva asignación reemplaza a la anterior como la más reciente.
7. **Sin asignaciones = invited** aunque `onboarding_status` sea `active` (caso inconsistente que puede ocurrir).

---

## 🗄️ Impacto en base de datos

**Tablas afectadas:**
- `profiles` — campo `onboarding_status TEXT` (`'invited' | 'active' | 'inactive'`)
- `lodger_room_assignments` — campos `move_in_date DATE`, `move_out_date DATE NULL`

**Campos relevantes:**
- `profiles.onboarding_status` — estado almacenado, actualizado explícitamente
- `profiles.role = 'lodger'` — filtro para distinguir inquilinos de otros roles
- `lodger_room_assignments.move_out_date` — NULL = activo, DATE = salida

**Constraints:**
- `idx_lodger_active_assignment`: índice único `WHERE move_out_date IS NULL` → un solo inquilino activo por habitación
- No existe constraint que sincronice `onboarding_status` con el estado derivado

---

## 🧱 Impacto en frontend

**Componentes afectados:**
- `src/utils/lodgerStatus.js` — `getLodgerStatus()`, `getLodgerStatusLabel()`, `getLodgerStatusColor()`, `getLodgerStatusHexColor()`
- `src/pages/v2/admin/tenants/TenantsList.jsx` — usa `getLodgerStatus()` para filtros y badges
- `src/pages/v2/admin/tenants/TenantEdit.jsx` — muestra estado en panel de habitación
- `src/pages/v2/admin/tenants/LodgerDetail.jsx` — detalle de inquilino
- `src/services/lodgers.service.js` — `listLodgers()`, `getLodger()`, `setLodgerStatus()`
- `src/constants/lodgerStatus.js` — constantes de estado

**Datos de entrada para `getLodgerStatus()`:**

| Fuente | Campo de asignaciones | Compatibilidad |
|--------|-----------------------|----------------|
| `getLodger(id)` | `lodger.assignments` (array completo) | ✅ Compatible |
| `listLodgers()` | `lodger.active_assignment` (array filtrado) | ⚠️ BUG-038 — ver abajo |

**BUG-038:** `getLodgerStatus()` en su versión actual solo lee `lodger.assignments`.
Cuando se llama con datos de `listLodgers()` (que retorna `active_assignment`), siempre
devuelve `'invited'`. Fix pendiente: aceptar ambas claves.

**Helpers de presentación:**

```js
getLodgerStatusLabel('active')           // → 'Activo'
getLodgerStatusLabel('pending_checkout') // → 'Pendiente baja'
getLodgerStatusLabel('inactive')         // → 'Inactivo'
getLodgerStatusLabel('invited')          // → 'Invitado'

getLodgerStatusColor('active')           // → 'success'  (Ant Design Tag color)
getLodgerStatusHexColor('active')        // → '#059669'
```

---

## 🧪 Validación (QA)

Tests asociados:
- unit: `src/tests/inquilinos/lodger-field-validation.test.js` (no cubre getLodgerStatus)
- services: ninguno activo para estados derivados
- e2e: `qa/e2e/specs/tenants.spec.js` (parcial — BUG-033 bloquea parte)

**Gaps:**
- ❌ Test unitario de `getLodgerStatus()` con los 4 estados
- ❌ Test de `getLodgerStatus()` con datos de `listLodgers` (active_assignment) — BUG-038
- ❌ Test E2E de filtro por estado en TenantsList (bloqueado por BUG-038)
- ❌ Test de transición automática a `inactive` al llegar la fecha de checkout

---

## 🔗 Trazabilidad

- Requisito relacionado: REQ-003 (asignaciones), REQ-005 (estados habitación)
- Defectos: BUG-038 (getLodgerStatus siempre retorna 'invited' con datos de listLodgers)
- Utilidades: `src/utils/lodgerStatus.js`, `src/constants/lodgerStatus.js`
- Servicios: `src/services/lodgers.service.js`

---

## ⚠️ Consideraciones

- **BUG-038 activo:** `getLodgerStatus` en `TenantsList` siempre devuelve `'invited'` porque
  lee `lodger.assignments` pero los datos vienen de `listLodgers()` que usa el alias
  `active_assignment`. Los filtros y badges de estado en TenantsList no funcionan correctamente.
- **Desincronización posible entre capas:** `onboarding_status = 'active'` pero todas las
  asignaciones tienen `move_out_date` pasado → estado derivado `inactive`. La UI debe
  priorizar el estado derivado.
- **`inactive` sin acción explícita:** el estado derivado cambia a `inactive` automáticamente
  al pasar la fecha, sin ningún cambio en BD. Los componentes deben recalcular en cada carga.

---

## 📝 Observaciones

La separación en dos capas (estado almacenado vs. derivado) permite:
- Que el sistema funcione sin necesitar jobs o triggers para actualizar estados al pasar fechas
- Historial completo de asignaciones sin perder el estado de incorporación
- Consultas eficientes: `onboarding_status` para filtros simples; asignaciones para estado preciso
