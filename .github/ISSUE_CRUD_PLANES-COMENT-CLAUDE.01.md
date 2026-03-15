# 💬 Comentarios Claude — Revisión de IMPLEMENTACION_COMPLETA_PLANES.md

> Revisión del documento de implementación de Cascade (2026-03-09).
> La implementación base es sólida. A continuación se detallan los **gaps de tests** que faltan
> para completar la cobertura, y un par de inconsistencias menores en el documento.

---

## ✅ Decisiones confirmadas (ya reflejadas en ALL-FUNCTIONAL-TESTS.md)

| # | Decisión | Estado |
|---|----------|--------|
| 1 | `code` → normalización automática a **UPPERCASE** | ✅ Aceptado |
| 2 | Cambiar precio con clientes activos → **warning** (no bloqueo) | ✅ Aceptado |
| 3 | `is_featured=true` + `visible=false` → **permitido** | ✅ Aceptado |
| 4 | `monthly_price` con más de 2 decimales → **redondeo automático** | ✅ Aceptado |
| 5 | `annual_discount_months` y `annual_price` → **eliminados** | ✅ Aceptado |

---

## 🔴 Gaps de tests — funciones del servicio sin cobertura

El documento menciona **41 tests** pero las siguientes funciones del servicio **no tienen ningún escenario BDD**:

### 1. `duplicatePlan(id)`

```gherkin
Scenario: duplicatePlan genera code con sufijo _COPY_1 en UPPERCASE
  Given un plan con code = 'BASIC'
  When llamo a duplicatePlan(id)
  Then el nuevo plan tiene code = 'BASIC_COPY_1'
  And status = 'draft'
  And visible_for_new_accounts = false

Scenario: duplicatePlan incrementa el sufijo si ya existe _COPY_1
  Given existe 'BASIC' y ya existe 'BASIC_COPY_1'
  When llamo a duplicatePlan(basic.id)
  Then el nuevo plan tiene code = 'BASIC_COPY_2'

Scenario: duplicatePlan NO copia los stripe_price_*_id
  Given un plan con stripe_price_monthly_id = 'price_xxx'
  When llamo a duplicatePlan(id)
  Then el nuevo plan tiene stripe_price_monthly_id = null
  And stripe_price_annual_id = null
  # Los IDs de Stripe son únicos por precio y no se pueden reutilizar
```

### 2. `isPlanActive(plan)`

```gherkin
Scenario: isPlanActive retorna false si status != 'active'
  Given un plan con status = 'deprecated'
  When llamo a isPlanActive(plan)
  Then retorna false

Scenario: isPlanActive retorna false si end_date es pasado (aunque status='active')
  Given un plan con status = 'active' y end_date = ayer
  When llamo a isPlanActive(plan)
  Then retorna false
  # Un plan 'active' con end_date pasada está efectivamente expirado

Scenario: isPlanActive retorna true solo si status='active' Y vigencia válida
  Given un plan con status = 'active', start_date = ayer, end_date = mañana
  When llamo a isPlanActive(plan)
  Then retorna true
```

### 3. `setEndDate(id, endDate)`

```gherkin
Scenario: setEndDate establece fecha de fin válida
  Given un plan activo sin end_date
  When llamo a setEndDate(id, '2027-12-31')
  Then end_date = '2027-12-31'
  And status sigue siendo 'active'

Scenario: setEndDate rechaza fecha anterior a start_date
  Given un plan con start_date = '2026-01-01'
  When llamo a setEndDate(id, '2025-12-31')
  Then obtengo un error de validación
  And el mensaje indica "end_date no puede ser anterior a start_date"
```

### 4. `toggleVisibility(id)`

```gherkin
Scenario: toggleVisibility cambia visible_for_new_accounts de true a false
  Given un plan con visible_for_new_accounts = true
  When llamo a toggleVisibility(id)
  Then visible_for_new_accounts = false

Scenario: toggleVisibility cambia visible_for_new_accounts de false a true
  Given un plan con visible_for_new_accounts = false
  When llamo a toggleVisibility(id)
  Then visible_for_new_accounts = true
```

### 5. `canModifyPlan(id)` — mencionada en el issue original pero sin tests

```gherkin
Scenario: canModifyPlan retorna false si hay cuentas activas usando el plan
  Given el plan está asignado a 2 client_accounts activos
  When llamo a canModifyPlan(id)
  Then retorna { canModify: false, activeAccounts: 2 }

Scenario: canModifyPlan retorna true si nadie usa el plan
  Given el plan no está asignado a ninguna client_account
  When llamo a canModifyPlan(id)
  Then retorna { canModify: true, activeAccounts: 0 }
```

### 6. `getPlans()` — filtros sin escenarios

```gherkin
Scenario: Filtrar planes vigentes hoy (validToday)
  Given existen planes con diferentes rangos de fechas
  When llamo a getPlans({ validToday: true })
  Then obtengo solo planes donde start_date <= hoy <= end_date (o end_date es null)

Scenario: Buscar plan por texto parcial (search)
  Given existen planes: 'BASICO', 'PREMIUM', 'ENTERPRISE'
  When llamo a getPlans({ search: 'prem' })
  Then obtengo el plan 'PREMIUM'
  And la búsqueda es case-insensitive

Scenario: Combinar múltiples filtros
  Given existen varios planes
  When llamo a getPlans({ status: 'active', is_featured: true, validToday: true })
  Then obtengo solo planes que cumplen TODOS los criterios simultáneamente

Scenario: getPlans sin filtros retorna todos los planes (incluidos deprecated y draft)
  Given existen planes con status 'active', 'deprecated', 'draft'
  When llamo a getPlans()
  Then obtengo todos sin filtrar
```

### 7. `updatePlan` — edge cases

```gherkin
Scenario: updatePlan cambia code a uno ya existente (UNIQUE violation)
  Given existe PLAN_A con code='BASIC' y PLAN_B con code='PREMIUM'
  When llamo a updatePlan(planB.id, { code: 'BASIC' })
  Then obtengo un error de constraint
  And el mensaje indica "El código 'BASIC' ya está en uso"

Scenario: updated_at se actualiza automáticamente tras updatePlan
  Given existe un plan con updated_at = T1
  When llamo a updatePlan(id, { name: 'Nuevo' })
  Then updated_at > T1
```

---

## ⚠️ Inconsistencia menor en el documento

El encabezado de la sección "Resumen Ejecutivo" indica **"50+ tests BDD completos"** pero el conteo detallado suma **41**. No es un error funcional pero conviene corregirlo para no crear confusión.

---

## Resumen de escenarios pendientes

| Función | Escenarios nuevos |
|---------|:-----------------:|
| `duplicatePlan` | 3 |
| `isPlanActive` | 3 |
| `setEndDate` | 2 |
| `toggleVisibility` | 2 |
| `canModifyPlan` | 2 |
| `getPlans` filtros | 4 |
| `updatePlan` edge cases | 2 |
| **Total** | **18** |

---

*Generado por Claude — Revisión de IMPLEMENTACION_COMPLETA_PLANES.md*
*Fecha: 2026-03-09*
