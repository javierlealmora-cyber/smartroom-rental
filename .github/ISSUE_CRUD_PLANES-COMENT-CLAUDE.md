# 💬 Comentarios Claude — ISSUE_CRUD_PLANES.md

> Revisión del issue original. El issue está bien estructurado pero le faltan ~26 escenarios BDD.
> A continuación se detallan los gaps por categoría para que Cascade los incorpore.

---

## 1. Validación de tamaño de campos — NO EXISTE en el issue

El issue no define límites de longitud para ningún campo de texto. Añadir:

### Campos con límite recomendado

| Campo | Límite sugerido | Motivo |
|-------|----------------|--------|
| `name` | 100 chars | Evitar nombres kilométricos en la UI |
| `code` | 50 chars | Identificador técnico, debe ser corto |
| `description` | 1000 chars | Texto largo pero acotado |
| `stripe_price_*_id` | 100 chars | IDs de Stripe tienen formato fijo |

### Escenarios BDD a añadir

```gherkin
Scenario: Rechazar name vacío (solo espacios)
  Given tengo datos con name = "   " (solo espacios)
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "El campo 'name' no puede estar vacío"

Scenario: Rechazar name demasiado largo (> 100 chars)
  Given tengo datos con name de 101 caracteres
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "El campo 'name' no puede superar 100 caracteres"

Scenario: Rechazar description demasiado larga (> 1000 chars)
  Given tengo datos con description de 1001 caracteres
  When llamo a createPlan(data)
  Then obtengo un error de validación
```

---

## 2. Validación de formato del campo `code` — INCOMPLETA

El issue solo valida UNIQUE. Falta validar el formato:

### Reglas recomendadas para `code`
- Solo letras minúsculas, números y guión bajo (`_`)
- Sin espacios
- Sin caracteres especiales ni acentos
- Sin mayúsculas (o forzar lowercase automáticamente)

### Escenarios BDD a añadir

```gherkin
Scenario: Rechazar code con espacios
  Given tengo datos con code = "plan basico"
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "El código solo puede contener letras minúsculas, números y guión bajo"

Scenario: Rechazar code con caracteres especiales
  Given tengo datos con code = "plan-básico!"
  When llamo a createPlan(data)
  Then obtengo un error de validación

Scenario: Rechazar code con mayúsculas (o forzar lowercase)
  Given tengo datos con code = "BASIC"
  When llamo a createPlan(data)
  Then o bien obtengo error, o bien se guarda como "basic"
  # Decisión de negocio: ¿error o normalización automática?

Scenario: Aceptar code válido con guión bajo
  Given tengo datos con code = "plan_basico_2026"
  When llamo a createPlan(data)
  Then el plan se crea exitosamente
```

---

## 3. Validación de tipos numéricos — INCOMPLETA

### Gaps detectados

| Campo | Problema en el issue |
|-------|---------------------|
| `annual_discount_months` | Valida 0-6 pero ¿acepta 2.5? Debe ser entero |
| `tax_percent` | Valida 0-100 pero no especifica si acepta decimales (10.5%) |
| `monthly_price` | ¿Cuántos decimales? ¿29.999 se redondea a 2 decimales? |
| `max_*` campos | Solo menciona "-1 o > 0" pero NO hay ningún escenario Gherkin |

### Escenarios BDD a añadir

```gherkin
Scenario: Rechazar annual_discount_months decimal
  Given tengo datos con annual_discount_months = 2.5
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "annual_discount_months debe ser un número entero"

Scenario: Aceptar annual_discount_months = 0 (sin descuento anual)
  Given tengo datos con annual_discount_months = 0
  When llamo a createPlan(data)
  Then el plan se crea exitosamente
  And annual_price = monthly_price * 12

Scenario: Rechazar annual_discount_months fuera de rango (> 11)
  Given tengo datos con annual_discount_months = 12
  When llamo a createPlan(data)
  Then obtengo un error de validación
  # Nota: 12 meses de descuento = plan anual gratuito, probablemente no deseado

Scenario: max_rooms con valor -1 (ilimitado)
  Given tengo datos con max_rooms = -1
  When llamo a createPlan(data)
  Then el plan se crea exitosamente
  And max_rooms = -1 representa "sin límite"

Scenario: Rechazar max_rooms = 0
  Given tengo datos con max_rooms = 0
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "max_rooms debe ser -1 (ilimitado) o mayor que 0"

Scenario: monthly_price con más de 2 decimales
  Given tengo datos con monthly_price = 29.999
  When llamo a createPlan(data)
  Then o bien se redondea a 30.00, o bien obtengo un error
  # Decisión de negocio: ¿redondear o rechazar?
```

---

## 4. Cálculo del IVA — AUSENTE COMPLETAMENTE ⚠️

Este es el gap más importante. El issue tiene `tax_percent` pero **nadie lo usa para calcular nada**.

### Problema
- `monthly_price` = precio SIN IVA (base imponible)
- `tax_percent` = porcentaje de IVA (21 por defecto)
- El precio que ve el cliente = `monthly_price * (1 + tax_percent / 100)`
- **No hay función `calculateFinalPrice()` en el servicio**
- **No hay tests de que el precio mostrado en UI incluye o excluye el IVA**

### Función a añadir al servicio

```javascript
// Añadir en plans.service.js junto a calculateAnnualPrice()
export const calculateFinalPrice = (basePrice, taxPercent) => {
  return basePrice * (1 + taxPercent / 100);
};

export const calculateAnnualFinalPrice = (monthlyPrice, discountMonths, taxPercent) => {
  const annualBase = monthlyPrice * (12 - discountMonths);
  return annualBase * (1 + taxPercent / 100);
};
```

### Escenarios BDD a añadir

```gherkin
Scenario: Calcular precio final mensual con IVA estándar (21%)
  Given monthly_price = 100 y tax_percent = 21
  When llamo a calculateFinalPrice(100, 21)
  Then el resultado es 121.00

Scenario: Calcular precio final anual con IVA
  Given monthly_price = 100, annual_discount_months = 2, tax_percent = 21
  When llamo a calculateAnnualFinalPrice(100, 2, 21)
  Then annual_base = 100 * 10 = 1000
  And annual_final = 1000 * 1.21 = 1210.00

Scenario: Calcular precio con IVA reducido (10%)
  Given monthly_price = 100 y tax_percent = 10
  When llamo a calculateFinalPrice(100, 10)
  Then el resultado es 110.00
  # IVA reducido aplica a algunos servicios en España

Scenario: Calcular precio con IVA superreducido (4%)
  Given monthly_price = 100 y tax_percent = 4
  When llamo a calculateFinalPrice(100, 4)
  Then el resultado es 104.00

Scenario: Plan exento de IVA (tax_percent = 0)
  Given monthly_price = 100 y tax_percent = 0
  When llamo a calculateFinalPrice(100, 0)
  Then el resultado es 100.00 (sin recargo)
  And el plan se crea exitosamente con tax_percent = 0

Scenario: Rechazar tax_percent negativo
  Given tengo datos con tax_percent = -5
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "tax_percent debe estar entre 0 y 100"

Scenario: Rechazar tax_percent mayor de 100
  Given tengo datos con tax_percent = 101
  When llamo a createPlan(data)
  Then obtengo un error de validación
```

---

## 5. Campos condicionales — DEFINIDOS PERO SIN TESTS

El issue menciona relaciones entre campos pero no las testea.

### Escenarios BDD a añadir

```gherkin
Scenario: deactivated_at NO puede existir con status distinto de 'disabled'
  Given tengo datos con status = 'active' y deactivated_at = now()
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "deactivated_at solo se puede establecer cuando status='disabled'"

Scenario: status='expired' requiere end_date en el pasado
  Given tengo datos con status = 'expired' y end_date = mañana
  When llamo a createPlan(data)
  Then obtengo un error de validación
  And el mensaje indica "Un plan con status='expired' debe tener end_date en el pasado"

Scenario: is_featured=true con visible_for_new_accounts=false (combinación contradictoria)
  Given tengo datos con is_featured = true y visible_for_new_accounts = false
  When llamo a createPlan(data)
  Then o bien obtengo un warning, o bien se rechaza
  # Decisión de negocio: ¿tiene sentido un plan destacado que no es visible?

Scenario: annual_discount_months = 0 no aplica descuento
  Given monthly_price = 100 y annual_discount_months = 0
  When el plan se guarda
  Then annual_price = 100 * (12 - 0) = 1200
  And no hay descuento por pago anual
```

---

## 6. Escenarios CRUD con edge cases — INCOMPLETOS

### `updatePlan` — faltan estos casos

```gherkin
Scenario: updatePlan cambia code a uno ya existente (UNIQUE violation)
  Given existe plan_A con code='basic' y plan_B con code='premium'
  When llamo a updatePlan(plan_B.id, { code: 'basic' })
  Then obtengo un error de constraint
  And el mensaje indica "El código 'basic' ya está en uso"

Scenario: updatePlan cambia monthly_price de un plan en uso
  Given un plan está asignado a 3 client_accounts
  And el plan tiene monthly_price = 50
  When llamo a updatePlan(id, { monthly_price: 100 })
  Then o bien se permite con un warning, o bien se rechaza
  # Decisión de negocio: ¿se puede cambiar el precio de un plan activo con clientes?

Scenario: updated_at se actualiza automáticamente tras updatePlan
  Given existe un plan con updated_at = T1
  When llamo a updatePlan(id, { name: 'Nuevo' })
  Then updated_at > T1
```

### `duplicatePlan` — necesita más precisión

```gherkin
Scenario: duplicatePlan cuando ya existe 'basic_copy_1'
  Given existe plan con code='basic' y ya existe 'basic_copy_1'
  When llamo a duplicatePlan(basic.id)
  Then el nuevo plan tiene code = 'basic_copy_2'

Scenario: duplicatePlan no copia stripe_price_*_id
  Given un plan con stripe_price_monthly_id = 'price_xxx'
  When llamo a duplicatePlan(id)
  Then el nuevo plan tiene stripe_price_monthly_id = null
  And stripe_price_annual_id = null
  # Los IDs de Stripe son únicos por precio, no se pueden copiar

Scenario: duplicatePlan crea el nuevo en status='draft'
  Given un plan activo con status='active'
  When llamo a duplicatePlan(id)
  Then el nuevo plan tiene status = 'draft'
  And visible_for_new_accounts = false
```

### `isPlanActive()` — definición ambigua

```gherkin
Scenario: isPlanActive retorna false si status != 'active'
  Given un plan con status = 'deprecated'
  When llamo a isPlanActive(plan)
  Then retorna false

Scenario: isPlanActive retorna false si end_date es pasado (aunque status='active')
  Given un plan con status='active' y end_date = ayer
  When llamo a isPlanActive(plan)
  Then retorna false
  # Un plan 'active' con end_date pasado está efectivamente expirado

Scenario: isPlanActive retorna true solo si status='active' Y vigencia válida
  Given un plan con status='active', start_date=ayer, end_date=mañana
  When llamo a isPlanActive(plan)
  Then retorna true
```

---

## 7. Filtros mencionados sin escenarios BDD

El issue menciona estos filtros en "Filtros soportados" pero **no tiene ningún Gherkin para ellos**:

```gherkin
Scenario: Filtrar planes vigentes hoy (validToday)
  Given existen planes con diferentes rangos de fechas
  When llamo a getPlans({ validToday: true })
  Then obtengo solo planes donde start_date <= hoy <= end_date (o end_date es null)

Scenario: Buscar plan por texto (search)
  Given existen planes: "Básico", "Premium", "Enterprise"
  When llamo a getPlans({ search: 'prem' })
  Then obtengo el plan "Premium"
  And la búsqueda es case-insensitive

Scenario: Combinar múltiples filtros
  Given existen varios planes
  When llamo a getPlans({ status: 'active', is_featured: true, validToday: true })
  Then obtengo solo planes que cumplen TODOS los criterios

Scenario: getPlans sin filtros retorna todos los planes (incluidos deprecated)
  Given existen planes con status 'active', 'deprecated', 'draft'
  When llamo a getPlans()
  Then obtengo todos sin filtrar
```

---

## 8. Funciones del servicio sin escenarios

Estas funciones están definidas en el issue pero **no tienen ningún Gherkin**:

### `setEndDate(id, endDate)`

```gherkin
Scenario: setEndDate establece fecha de fin válida
  Given un plan activo sin end_date
  When llamo a setEndDate(id, '2026-12-31')
  Then end_date = '2026-12-31'
  And status sigue siendo 'active'

Scenario: setEndDate rechaza fecha anterior a start_date
  Given un plan con start_date = '2026-01-01'
  When llamo a setEndDate(id, '2025-12-31')
  Then obtengo un error de validación
```

### `toggleVisibility(id)`

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

### `canModifyPlan(id)` — demasiado vago en el issue

El escenario actual solo dice "obtengo información sobre el uso". Necesita ser más concreto:

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

---

## Resumen de escenarios a añadir

| Categoría | Escenarios nuevos |
|-----------|:-----------------:|
| Tamaño de campos | 3 |
| Formato de `code` | 4 |
| Tipos numéricos (`max_*`, decimales, enteros) | 6 |
| **Cálculo IVA (ausente completamente)** | **7** |
| Campos condicionales | 4 |
| `updatePlan` edge cases | 3 |
| `duplicatePlan` precisión | 3 |
| `isPlanActive()` definición | 3 |
| Filtros sin escenarios | 4 |
| `setEndDate` y `toggleVisibility` | 4 |
| `canModifyPlan` más concreto | 2 |
| **Total** | **43** |

---

## Decisiones de negocio pendientes (requieren respuesta del product owner)

1. ¿El campo `code` se normaliza automáticamente a lowercase o se rechaza si tiene mayúsculas?
2. ¿Se puede cambiar `monthly_price` de un plan que ya tiene clientes activos?
3. ¿`is_featured=true` con `visible_for_new_accounts=false` es válido o contradictorio?
4. ¿`monthly_price` con más de 2 decimales se redondea o se rechaza?
5. ¿Qué tipos de IVA son válidos: solo 0/4/10/21 o cualquier valor entre 0 y 100?
6. ¿`annual_discount_months=12` (año gratuito) está permitido?

---

*Generado por Claude — Revisión del issue ISSUE_CRUD_PLANES.md*
*Fecha: 2026-03-09*
