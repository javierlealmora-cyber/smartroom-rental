# 🎯 CRUD de Planes de Suscripción - Migrar de Mock a Base de Datos Real

## 📋 Descripción

Actualmente, la gestión de planes de suscripción (`plans_catalog`) utiliza datos mock en memoria. Este issue cubre la implementación completa del CRUD conectado a Supabase con tests BDD.

**Pantallas afectadas:**
- `/v2/superadmin/planes` - Lista de planes
- `/v2/superadmin/planes/:id` - Detalle de plan
- `/v2/superadmin/planes/:id/editar` - Editar plan
- `/v2/superadmin/planes/nuevo` - Crear plan

---

## 🎯 Objetivos

1. ✅ Crear servicio `plans.service.js` con CRUD completo
2. ✅ Implementar tests BDD con Vitest
3. ✅ Actualizar componentes React para usar el servicio real
4. ✅ Asegurar que no haya regresiones en funcionalidad existente

---

## 📊 Estructura de Datos

### Tabla: `plans_catalog`

```sql
CREATE TABLE public.plans_catalog (
  -- Identificación
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,

  -- Estado y vigencia
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','deprecated','expired','disabled')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  deactivated_at timestamptz,

  -- Pricing
  monthly_price numeric NOT NULL,
  annual_discount_months int NOT NULL DEFAULT 2,
  annual_price numeric GENERATED ALWAYS AS (monthly_price * (12 - annual_discount_months)) STORED,
  tax_percent numeric NOT NULL DEFAULT 21,

  -- Limites de recursos
  max_owners int NOT NULL DEFAULT 1,
  max_accommodations int NOT NULL DEFAULT 3,
  max_rooms int NOT NULL DEFAULT 20,
  max_admin_users int NOT NULL DEFAULT 3,
  max_associated_admins int NOT NULL DEFAULT 2,
  max_api_users int NOT NULL DEFAULT 1,
  max_viewer_users int NOT NULL DEFAULT 0,

  -- Branding
  branding_enabled boolean NOT NULL DEFAULT false,
  logo_allowed boolean NOT NULL DEFAULT false,
  theme_editable boolean NOT NULL DEFAULT false,

  -- Reglas funcionales
  allows_multi_owner boolean NOT NULL DEFAULT false,
  allows_owner_change boolean NOT NULL DEFAULT false,
  allows_receipt_upload boolean NOT NULL DEFAULT false,

  -- Servicios incluidos (dinamico)
  services jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Visibilidad
  visible_for_new_accounts boolean NOT NULL DEFAULT true,

  -- Stripe price IDs
  stripe_price_monthly_id text,
  stripe_price_annual_id text,

  -- Campos adicionales (ya en BD)
  is_featured boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 🔧 Implementación

### 1. Servicio: `src/services/plans.service.js`

**Métodos requeridos:**

```javascript
// CRUD básico
export const getPlans = async (filters = {}) => { ... }
export const getPlanById = async (id) => { ... }
export const getPlanByCode = async (code) => { ... }
export const createPlan = async (data) => { ... }
export const updatePlan = async (id, data) => { ... }
export const deletePlan = async (id) => { ... } // Soft delete

// Operaciones especiales
export const toggleVisibility = async (id) => { ... }
export const setEndDate = async (id, endDate) => { ... }
export const deactivatePlan = async (id, reason) => { ... }
export const duplicatePlan = async (id) => { ... }

// Utilidades
export const calculateAnnualPrice = (monthlyPrice, discountMonths = 2) => { ... }
export const isPlanActive = (plan) => { ... }
export const canModifyPlan = async (planId) => { ... } // Verifica si hay cuentas usando el plan
```

**Filtros soportados:**
- `status`: 'draft' | 'active' | 'deprecated' | 'expired' | 'disabled'
- `visible_for_new_accounts`: boolean
- `is_featured`: boolean
- `search`: string (busca en name y code)
- `validToday`: boolean (filtra por vigencia actual)

---

### 2. Tests BDD: `src/services/__tests__/plans.service.test.js`

**Campos Obligatorios vs Opcionales:**

| Campo | Tipo | Requerido | Default | Validación |
|-------|------|-----------|---------|------------|
| `name` | text | ✅ SÍ | - | No vacío |
| `code` | text | ✅ SÍ | - | No vacío, único, lowercase |
| `monthly_price` | numeric | ✅ SÍ | - | > 0 |
| `description` | text | ❌ NO | null | - |
| `status` | text | ✅ SÍ | 'active' | CHECK: draft/active/deprecated/expired/disabled |
| `start_date` | date | ✅ SÍ | CURRENT_DATE | - |
| `end_date` | date | ❌ NO | null | >= start_date |
| `deactivated_at` | timestamptz | ❌ NO | null | Solo si status='disabled' |
| `annual_discount_months` | int | ✅ SÍ | 2 | 0-6 |
| `annual_price` | numeric | ❌ NO | GENERATED | Calculado automáticamente |
| `tax_percent` | numeric | ✅ SÍ | 21 | 0-100 |
| `max_*` | int | ✅ SÍ | varies | -1 (ilimitado) o > 0 |
| `*_enabled/*_allowed` | boolean | ✅ SÍ | false | - |
| `services` | jsonb | ✅ SÍ | [] | Array válido |
| `features` | jsonb | ✅ SÍ | [] | Array válido |
| `stripe_*_id` | text | ❌ NO | null | - |
| `visible_for_new_accounts` | boolean | ✅ SÍ | true | - |
| `is_featured` | boolean | ✅ SÍ | false | - |

**Escenarios de prueba:**

```gherkin
Feature: Gestión de Planes de Suscripción

  # ========================================
  # TESTS DE VALIDACIÓN DE CAMPOS REQUERIDOS
  # ========================================

  Scenario: Crear plan con todos los campos mínimos requeridos
    Given tengo datos con solo los campos obligatorios sin default
      | name           | Básico |
      | code           | basic  |
      | monthly_price  | 29.99  |
    When llamo a createPlan(data)
    Then el plan se crea exitosamente
    And los campos con default se establecen automáticamente
      | status                    | active |
      | start_date                | today  |
      | annual_discount_months    | 2      |
      | tax_percent               | 21     |
      | max_owners                | 1      |
      | max_accommodations        | 3      |
      | max_rooms                 | 20     |
      | max_admin_users           | 3      |
      | max_associated_admins     | 2      |
      | max_api_users             | 1      |
      | max_viewer_users          | 0      |
      | branding_enabled          | false  |
      | logo_allowed              | false  |
      | theme_editable            | false  |
      | allows_multi_owner        | false  |
      | allows_owner_change       | false  |
      | allows_receipt_upload     | false  |
      | services                  | []     |
      | features                  | []     |
      | visible_for_new_accounts  | true   |
      | is_featured               | false  |
    And annual_price se calcula como monthly_price * (12 - 2) = 299.90

  Scenario: Intentar crear plan sin campo 'name' (requerido)
    Given tengo datos sin el campo 'name'
      | code           | basic  |
      | monthly_price  | 29.99  |
    When llamo a createPlan(data)
    Then obtengo un error de validación
    And el mensaje indica "El campo 'name' es obligatorio"

  Scenario: Intentar crear plan sin campo 'code' (requerido)
    Given tengo datos sin el campo 'code'
      | name           | Básico |
      | monthly_price  | 29.99  |
    When llamo a createPlan(data)
    Then obtengo un error de validación
    And el mensaje indica "El campo 'code' es obligatorio"

  Scenario: Intentar crear plan sin campo 'monthly_price' (requerido)
    Given tengo datos sin el campo 'monthly_price'
      | name | Básico |
      | code | basic  |
    When llamo a createPlan(data)
    Then obtengo un error de validación
    And el mensaje indica "El campo 'monthly_price' es obligatorio"

  Scenario: Crear plan con campos opcionales incluidos
    Given tengo datos con campos opcionales
      | name                      | Premium        |
      | code                      | premium        |
      | monthly_price             | 99.99          |
      | description               | Plan premium   |
      | end_date                  | 2026-12-31     |
      | stripe_price_monthly_id   | price_xxx      |
      | stripe_price_annual_id    | price_yyy      |
    When llamo a createPlan(data)
    Then el plan se crea exitosamente
    And los campos opcionales se guardan correctamente

  Scenario: Crear plan sin campos opcionales
    Given tengo datos sin campos opcionales
      | name           | Básico |
      | code           | basic  |
      | monthly_price  | 29.99  |
    When llamo a createPlan(data)
    Then el plan se crea exitosamente
    And los campos opcionales son null
      | description             | null |
      | end_date                | null |
      | deactivated_at          | null |
      | stripe_price_monthly_id | null |
      | stripe_price_annual_id  | null |

  # ========================================
  # TESTS DE VALIDACIÓN DE CONSTRAINTS
  # ========================================

  Scenario: Validar status con valor inválido
    Given tengo datos con status inválido
      | name           | Básico   |
      | code           | basic    |
      | monthly_price  | 29.99    |
      | status         | invalid  |
    When llamo a createPlan(data)
    Then obtengo un error de constraint
    And el mensaje indica que status debe ser: draft, active, deprecated, expired, disabled

  Scenario: Validar status con valores válidos
    Given tengo datos con cada status válido
      | draft | active | deprecated | expired | disabled |
    When llamo a createPlan(data) para cada uno
    Then todos se crean exitosamente

  Scenario: Validar código único (UNIQUE constraint)
    Given existe un plan con code 'basic'
    When intento crear otro plan con code 'basic'
    Then obtengo un error de constraint
    And el mensaje indica "El código 'basic' ya existe"

  Scenario: Validar monthly_price positivo
    Given tengo datos con monthly_price negativo
      | name           | Básico |
      | code           | basic  |
      | monthly_price  | -10    |
    When llamo a createPlan(data)
    Then obtengo un error de validación
    And el mensaje indica "monthly_price debe ser mayor que 0"

  Scenario: Validar end_date posterior a start_date
    Given tengo datos con end_date anterior a start_date
      | name        | Básico     |
      | code        | basic      |
      | monthly_price | 29.99    |
      | start_date  | 2026-12-31 |
      | end_date    | 2026-01-01 |
    When llamo a createPlan(data)
    Then obtengo un error de validación
    And el mensaje indica "end_date debe ser posterior a start_date"

  # ========================================
  # TESTS DE CAMPOS CALCULADOS
  # ========================================

  Scenario: Verificar cálculo automático de annual_price
    Given creo un plan con monthly_price = 50 y annual_discount_months = 2
    When el plan se guarda en BD
    Then annual_price es 500 (50 * 10)

  Scenario: Verificar cálculo de annual_price con diferentes descuentos
    Given creo planes con diferentes annual_discount_months
      | monthly_price | discount_months | expected_annual |
      | 100           | 0               | 1200            |
      | 100           | 1               | 1100            |
      | 100           | 2               | 1000            |
      | 100           | 3               | 900             |
    When cada plan se guarda
    Then annual_price coincide con expected_annual

  Scenario: Intentar establecer annual_price manualmente (campo GENERATED)
    Given tengo datos con annual_price manual
      | name           | Básico |
      | code           | basic  |
      | monthly_price  | 50     |
      | annual_price   | 999    |
    When llamo a createPlan(data)
    Then el campo annual_price se ignora
    And se calcula automáticamente como 500

  # ========================================
  # TESTS CRUD BÁSICOS
  # ========================================

  Scenario: Listar todos los planes
    Given existen planes en la base de datos
    When llamo a getPlans()
    Then obtengo un array de planes
    And cada plan tiene todos los campos requeridos

  Scenario: Filtrar planes activos
    Given existen planes con diferentes estados
    When llamo a getPlans({ status: 'active' })
    Then obtengo solo planes con status 'active'

  Scenario: Buscar plan por código
    Given existe un plan con code 'basic'
    When llamo a getPlanByCode('basic')
    Then obtengo el plan correcto

  Scenario: Actualizar plan existente
    Given existe un plan con id 'xxx'
    When llamo a updatePlan('xxx', { name: 'Nuevo Nombre' })
    Then el plan se actualiza correctamente
    And updated_at se actualiza automáticamente

  Scenario: Desactivar plan
    Given existe un plan activo
    When llamo a deactivatePlan(id, 'Obsoleto')
    Then status cambia a 'disabled'
    And deactivated_at se establece
    And se guarda el motivo en metadata

  Scenario: Duplicar plan
    Given existe un plan con code 'basic'
    When llamo a duplicatePlan(id)
    Then se crea un nuevo plan
    And el code es 'basic_copy_1'
    And el status es 'draft'
    And todos los demás campos se copian

  Scenario: Verificar plan en uso
    Given un plan está asignado a client_accounts
    When llamo a canModifyPlan(id)
    Then obtengo información sobre el uso
    And puedo decidir si permitir cambios
```

---

### 3. Actualizar Componentes

**Archivos a modificar:**

1. **`src/pages/v2/superadmin/plans/PlansList.jsx`**
   - Reemplazar `mockPlans` por `getPlans()`
   - Usar `toggleVisibility()` en lugar de mock
   - Usar `deactivatePlan()` en lugar de alert

2. **`src/pages/v2/superadmin/plans/PlanDetail.jsx`**
   - Reemplazar `getPlanById()` mock por servicio real
   - Usar `updatePlan()` en handleSubmit
   - Usar `deactivatePlan()` en handleDeactivate

3. **`src/pages/v2/superadmin/plans/PlanCreate.jsx`**
   - Usar `createPlan()` para guardar
   - Validar código único antes de enviar

---

## ✅ Criterios de Aceptación

### Funcionalidad
- [ ] Todos los métodos CRUD funcionan correctamente
- [ ] Los filtros devuelven resultados correctos
- [ ] Las validaciones previenen datos inválidos
- [ ] El código único se valida correctamente
- [ ] `annual_price` se calcula automáticamente (campo GENERATED)
- [ ] Soft delete funciona (status = 'disabled')

### Tests
- [ ] Todos los tests BDD pasan
- [ ] Cobertura de código > 80%
- [ ] Tests incluyen casos de error
- [ ] Tests verifican validaciones

### UI/UX
- [ ] No hay regresiones visuales
- [ ] Mensajes de error claros
- [ ] Loading states implementados
- [ ] Confirmaciones antes de acciones destructivas

### Seguridad
- [ ] Solo superadmin puede modificar planes
- [ ] RLS policies aplicadas correctamente
- [ ] Validación de permisos en cada operación

---

## 🚀 Plan de Implementación

### Fase 1: Servicio Base (2-3 horas)
1. Crear `src/services/plans.service.js`
2. Implementar métodos CRUD básicos
3. Añadir manejo de errores

### Fase 2: Tests BDD (2-3 horas)
1. Configurar entorno de tests
2. Escribir tests para cada escenario
3. Asegurar cobertura completa

### Fase 3: Integración UI (2-3 horas)
1. Actualizar PlansList
2. Actualizar PlanDetail
3. Actualizar PlanCreate
4. Añadir loading states y error handling

### Fase 4: Validación (1-2 horas)
1. Pruebas manuales en dev
2. Verificar RLS policies
3. Pruebas en staging
4. Deploy a producción

---

## 📝 Notas Técnicas

### Diferencias Mock vs BD Real

**Mock actual (`plans.mock.js`):**
```javascript
{
  id: "plan-001",
  name: "Básico",
  code: "basic",
  limits: { max_properties: 3, ... },
  services_included: ["lavanderia", ...],
  pricing: { monthly_price: 29, ... }
}
```

**BD Real (`plans_catalog`):**
```javascript
{
  id: "uuid",
  name: "Básico",
  code: "basic",
  max_accommodations: 3,  // No hay objeto 'limits'
  services: ["lavanderia"],  // No 'services_included'
  monthly_price: 29,  // No hay objeto 'pricing'
  annual_price: 290  // GENERATED COLUMN
}
```

**⚠️ Importante:** El frontend debe adaptarse a la estructura plana de la BD.

---

## 🔗 Referencias

- **Tabla BD:** `supabase/baseline/01_schema.sql` (líneas 6-60)
- **Mock actual:** `src/mocks/plans.mock.js`
- **Componentes:** `src/pages/v2/superadmin/plans/`
- **Supabase Docs:** https://supabase.com/docs/guides/database

---

## 🎨 Mejoras Futuras (Fuera de Scope)

- [ ] Versionado de planes
- [ ] Historial de cambios
- [ ] Comparador de planes
- [ ] Exportar/Importar planes
- [ ] Notificaciones cuando un plan cambia

---

## 👥 Asignación

**Desarrollador:** Claude AI  
**Revisor:** @javierlealmora  
**Prioridad:** Alta  
**Estimación:** 8-10 horas  
**Sprint:** Actual

---

## ✅ Checklist Final

- [ ] Servicio implementado y testeado
- [ ] Tests BDD pasando
- [ ] Componentes actualizados
- [ ] Documentación actualizada
- [ ] Code review aprobado
- [ ] Merge a develop
- [ ] Deploy a staging
- [ ] Pruebas en staging OK
- [ ] Deploy a producción
