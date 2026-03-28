# Casos de Test: Validación de Asignación de Habitación en TenantCreate

## Contexto
La asignación de habitación es **opcional**, pero si el usuario selecciona un alojamiento, **todos los campos de asignación se vuelven obligatorios**. Existe un botón "Limpiar Asignación" para resetear todos los campos.

---

## TEST-001: Crear inquilino SIN asignación de habitación (flujo básico)

**Objetivo:** Verificar que se puede crear un inquilino sin asignar habitación

**Precondiciones:**
- Usuario autenticado como admin
- Existe al menos un alojamiento activo

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos obligatorios de "Datos Personales":
   - Nombre: "Juan"
   - Primer apellido: "García"
   - Segundo apellido: "López"
   - Email: "juan.garcia@example.com"
   - Teléfono: "+34 600 000 001"
   - Documento: "12345678A"
   - Género: "Masculino"
3. **NO seleccionar** ningún alojamiento
4. Click en "Registrar Inquilino"

**Resultado esperado:**
- ✅ Inquilino creado exitosamente
- ✅ Redirige a pantalla de pagadores
- ✅ Inquilino tiene `onboarding_status = 'invited'`
- ✅ No tiene asignación de habitación

---

## TEST-002: Validación de campos obligatorios al seleccionar alojamiento

**Objetivo:** Verificar que todos los campos de asignación se vuelven obligatorios al seleccionar un alojamiento

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento "Apartamento Principal" con habitaciones libres

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos obligatorios de "Datos Personales"
3. En "Asignación de Habitación":
   - Seleccionar alojamiento: "Apartamento Principal"
4. **NO rellenar** ningún otro campo de asignación
5. Click en "Registrar Inquilino"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra errores de validación:
  - "Debes seleccionar una habitación"
  - "La fecha de check-in es obligatoria"
  - "El importe de la fianza es obligatorio"

---

## TEST-003: Crear inquilino CON asignación completa

**Objetivo:** Verificar que se puede crear un inquilino con asignación de habitación completa

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento "Apartamento Principal" con habitación 101 libre (renta 450€/mes)

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos obligatorios de "Datos Personales"
3. En "Asignación de Habitación":
   - Seleccionar alojamiento: "Apartamento Principal"
   - Seleccionar habitación: "Hab. 101"
   - Fecha de Check-In: "22/03/2026"
   - Importe de la Fianza: "900"
   - Importe Comisión: "200" (opcional)
4. Click en "Registrar Inquilino"

**Resultado esperado:**
- ✅ Inquilino creado exitosamente
- ✅ Redirige a pantalla de pagadores
- ✅ Inquilino tiene `onboarding_status = 'active'`
- ✅ Tiene asignación de habitación con:
  - `room_id` = ID de Hab. 101
  - `move_in_date` = "2026-03-22"
  - `deposit_amount` = 900
  - `commission_amount` = 200
  - `monthly_rent` = 450

---

## TEST-004: Botón "Limpiar Asignación" - Visibilidad

**Objetivo:** Verificar que el botón "Limpiar Asignación" solo aparece cuando hay un alojamiento seleccionado

**Precondiciones:**
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Verificar que el botón "Limpiar Asignación" **NO está visible**
3. Seleccionar un alojamiento
4. Verificar que el botón "Limpiar Asignación" **SÍ está visible**

**Resultado esperado:**
- ✅ Botón solo visible cuando `accommodation_id` tiene valor
- ✅ Botón tiene icono `ClearOutlined`
- ✅ Botón tiene estilo `danger` (rojo)

---

## TEST-005: Botón "Limpiar Asignación" - Funcionalidad completa

**Objetivo:** Verificar que el botón limpia todos los campos de asignación correctamente

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento "Apartamento Principal" con habitación 101 libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. En "Asignación de Habitación":
   - Seleccionar alojamiento: "Apartamento Principal"
   - Seleccionar habitación: "Hab. 101"
   - Fecha de Check-In: "22/03/2026"
   - Importe de la Fianza: "900"
   - Importe Comisión: "200"
4. Click en botón "Limpiar Asignación"

**Resultado esperado:**
- ✅ Campo "Alojamiento" queda vacío
- ✅ Campo "Habitación" queda vacío
- ✅ Campo "Fecha de Check-In" vuelve a fecha actual
- ✅ Campo "Importe de la Fianza" queda vacío
- ✅ Campo "Importe Comisión" queda vacío
- ✅ Lista de habitaciones desaparece
- ✅ Botón "Limpiar Asignación" desaparece
- ✅ Campos de "Datos Personales" NO se modifican

---

## TEST-006: Limpiar asignación con checkbox "Pago hasta fin de mes" marcado

**Objetivo:** Verificar que limpiar asignación también resetea el checkbox y campos relacionados

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento con habitación libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. Seleccionar alojamiento y habitación
4. Fecha de Check-In: "22/03/2026"
5. Marcar checkbox "El inquilino va a pagar desde la fecha de Check-in hasta fin de mes"
6. Rellenar "Importe a pagar hasta fin de mes": "450"
7. Click en "Limpiar Asignación"

**Resultado esperado:**
- ✅ Checkbox "Pago hasta fin de mes" queda desmarcado
- ✅ Campo "Importe a pagar hasta fin de mes" desaparece
- ✅ Campo "Fecha del próximo pago" desaparece
- ✅ Todos los demás campos de asignación quedan vacíos

---

## TEST-007: Deseleccionar alojamiento usando la X del Select

**Objetivo:** Verificar que usar el allowClear del Select también limpia los campos

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento con habitación libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Seleccionar alojamiento: "Apartamento Principal"
3. Seleccionar habitación: "Hab. 101"
4. Rellenar Fecha de Check-In y Fianza
5. Click en la "X" del campo "Alojamiento" (allowClear)

**Resultado esperado:**
- ✅ Campo "Alojamiento" queda vacío
- ✅ Todos los campos de asignación se resetean
- ✅ Checkbox "Pago hasta fin de mes" se desmarca
- ✅ Lista de habitaciones desaparece

---

## TEST-008: Validación de habitación obligatoria con alojamiento seleccionado

**Objetivo:** Verificar que no se puede enviar el formulario sin seleccionar habitación si hay alojamiento

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento "Apartamento Principal" con habitaciones libres

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. Seleccionar alojamiento: "Apartamento Principal"
4. Rellenar Fecha de Check-In: "22/03/2026"
5. Rellenar Importe de la Fianza: "900"
6. **NO seleccionar habitación**
7. Click en "Registrar Inquilino"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra error: "Debes seleccionar una habitación"

---

## TEST-009: Validación de fecha obligatoria con alojamiento seleccionado

**Objetivo:** Verificar que la fecha de check-in es obligatoria si hay alojamiento

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento con habitación libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. Seleccionar alojamiento y habitación
4. **Borrar** la fecha de Check-In
5. Rellenar Importe de la Fianza: "900"
6. Click en "Registrar Inquilino"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra error: "La fecha de check-in es obligatoria"

---

## TEST-010: Validación de fianza obligatoria con alojamiento seleccionado

**Objetivo:** Verificar que la fianza es obligatoria si hay alojamiento

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento con habitación libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. Seleccionar alojamiento y habitación
4. Rellenar Fecha de Check-In: "22/03/2026"
5. **NO rellenar** Importe de la Fianza
6. Click en "Registrar Inquilino"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra error: "El importe de la fianza es obligatorio"

---

## TEST-011: Validación de "Importe hasta fin de mes" obligatorio cuando checkbox marcado

**Objetivo:** Verificar que el importe es obligatorio si el checkbox está marcado

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento con habitación libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos de "Datos Personales"
3. Seleccionar alojamiento y habitación
4. Fecha de Check-In: "22/03/2026"
5. Marcar checkbox "El inquilino va a pagar desde la fecha de Check-in hasta fin de mes"
6. **NO rellenar** "Importe a pagar hasta fin de mes"
7. Rellenar Importe de la Fianza: "900"
8. Click en "Registrar Inquilino"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra error: "El importe es obligatorio"

---

## TEST-012: Cambiar de alojamiento limpia habitación seleccionada

**Objetivo:** Verificar que cambiar de alojamiento resetea la habitación pero mantiene otros campos

**Precondiciones:**
- Usuario autenticado como admin
- Existen dos alojamientos: "Apartamento A" y "Apartamento B"

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Seleccionar alojamiento: "Apartamento A"
3. Seleccionar habitación: "Hab. 101"
4. Rellenar Fecha de Check-In: "22/03/2026"
5. Rellenar Importe de la Fianza: "900"
6. Cambiar alojamiento a: "Apartamento B"

**Resultado esperado:**
- ✅ Campo "Habitación" queda vacío
- ✅ Fecha de Check-In se resetea a fecha actual
- ✅ Importe de la Fianza queda vacío
- ✅ Importe Comisión queda vacío
- ✅ Se cargan las habitaciones del "Apartamento B"

---

## Resumen de Validaciones

| Campo | Sin Alojamiento | Con Alojamiento |
|-------|----------------|-----------------|
| Alojamiento | Opcional | - |
| Habitación | N/A | **Obligatorio** |
| Fecha Check-In | N/A | **Obligatorio** |
| Importe Fianza | N/A | **Obligatorio** |
| Importe Comisión | N/A | Opcional |
| Importe Mes Entrada | N/A | Opcional |
| Importe hasta fin de mes | N/A | **Obligatorio** (si checkbox marcado) |

---

## Comandos para Claude (Playwright)

Para ejecutar estos tests con Playwright, Claude deberá:

```bash
# Test individual
npx playwright test tests/e2e/specs/tenant-create-validation.spec.js -g "TEST-001"

# Todos los tests de validación
npx playwright test tests/e2e/specs/tenant-create-validation.spec.js

# Con UI mode para debugging
npx playwright test tests/e2e/specs/tenant-create-validation.spec.js --ui
```

---

## Notas para Implementación de Tests

1. **Selectores importantes:**
   - Alojamiento: `[name="accommodation_id"]`
   - Habitación: `[name="room_id"]`
   - Fecha Check-In: `[name="move_in_date"]`
   - Fianza: `[name="deposit_amount"]`
   - Botón Limpiar: `button:has-text("Limpiar Asignación")`
   - Checkbox pago fin mes: `text=El inquilino va a pagar desde la fecha de Check-in hasta fin de mes`

2. **Validaciones a verificar:**
   - Mensajes de error con `expect(page.locator('text=...')).toBeVisible()`
   - Campos vacíos con `expect(input).toHaveValue('')`
   - Botones visibles/ocultos con `toBeVisible()` / `toBeHidden()`

3. **Setup necesario:**
   - Crear alojamientos de prueba con habitaciones libres
   - Limpiar datos después de cada test
   - Usar `test.beforeEach()` para navegación inicial
