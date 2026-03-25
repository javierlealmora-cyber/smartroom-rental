# Test Cases: Validación de Gastos Adicionales en Alojamientos

## 📋 Resumen

Este documento define los casos de prueba E2E para validar la funcionalidad de **gastos adicionales** en el módulo de alojamientos, incluyendo el nuevo campo de **importe**.

**Contexto:** Se ha añadido la funcionalidad de gastos adicionales (WiFi, Basura, etc.) con tres campos: Concepto, Importe y Modo de reparto. Los datos se guardan en la columna JSONB `extra_costs` de la tabla `accommodations`.

**Cambios recientes:**
- ✅ Campo **Importe** añadido a gastos adicionales (2026-03-23)
- ✅ Validación numérica con `InputNumber` (min: 0, precision: 2)
- ✅ Formato de moneda con sufijo "€"
- ✅ Persistencia en BD como JSONB

**Spec sugerido:** `tests/e2e/specs/accommodation-extra-costs.spec.js`

---

## 🎯 Grupo 1: Añadir Gastos Adicionales

### TEST-EXTRA-001: Añadir un gasto adicional completo

**Objetivo:** Verificar que se puede añadir un gasto adicional con todos los campos.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente con ID conocido

**Pasos:**
1. Navegar a `/v2/admin/alojamientos/{id}/habitaciones`
2. Click en tab "Datos del Alojamiento"
3. Scroll hasta sección "Configuración de Consumo"
4. Activar switch "Los servicios (agua, luz, gas) están incluidos en el alquiler"
5. En "Otros gastos adicionales", click en "Añadir gasto adicional"
6. Rellenar campos:
   - Concepto: "WiFi"
   - Importe: "25.00"
   - Modo de reparto: "Partes iguales"
7. Click en "Guardar Alojamiento"

**Resultado esperado:**
- ✅ El gasto se añade correctamente
- ✅ Mensaje de éxito (visual feedback)
- ✅ El gasto aparece en la lista con los 3 campos
- ✅ El importe se muestra con formato "25.00 €"

**Selectores:**
```javascript
'button:has-text("Añadir gasto adicional")'
'input[placeholder="Concepto (ej. WiFi, Basura...)"]'
'input[placeholder="Importe"]'
'.ant-select:has-text("Partes iguales")'
'button:has-text("Guardar Alojamiento")'
```

---

### TEST-EXTRA-002: Añadir múltiples gastos adicionales

**Objetivo:** Verificar que se pueden añadir varios gastos adicionales.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo del alojamiento
2. Añadir 3 gastos adicionales:
   - Gasto 1: "WiFi" - 25.00€ - Partes iguales
   - Gasto 2: "Basura" - 15.50€ - Partes iguales
   - Gasto 3: "Netflix" - 12.99€ - Prorrateado
3. Guardar alojamiento

**Resultado esperado:**
- ✅ Los 3 gastos se añaden correctamente
- ✅ Cada gasto mantiene sus valores independientes
- ✅ El orden de los gastos se mantiene
- ✅ Los importes se muestran con 2 decimales

---

### TEST-EXTRA-003: Validar campo importe con decimales

**Objetivo:** Verificar que el campo importe acepta valores decimales con precisión de 2 dígitos.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir gasto adicional
3. Probar diferentes valores en el campo Importe:
   - Test A: "12.5" → debe mostrar "12.50 €"
   - Test B: "25" → debe mostrar "25.00 €"
   - Test C: "10.999" → debe redondear a "11.00 €"
   - Test D: "0.01" → debe mostrar "0.01 €"

**Resultado esperado:**
- ✅ Los valores se formatean correctamente a 2 decimales
- ✅ El sufijo "€" aparece automáticamente
- ✅ Los valores se redondean si tienen más de 2 decimales

---

### TEST-EXTRA-004: Validar importe mínimo (no negativos)

**Objetivo:** Verificar que el campo importe no acepta valores negativos.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir gasto adicional
3. Intentar introducir valores negativos:
   - Test A: "-10" → debe rechazarse o convertirse a 0
   - Test B: Usar flechas hacia abajo desde 0 → no debe permitir negativos

**Resultado esperado:**
- ✅ No se permiten valores negativos
- ✅ El campo tiene `min={0}` configurado
- ✅ El valor mínimo permitido es 0

---

### TEST-EXTRA-005: Añadir gasto sin importe (campo vacío)

**Objetivo:** Verificar el comportamiento cuando se añade un gasto sin especificar importe.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir gasto adicional
3. Rellenar solo:
   - Concepto: "WiFi"
   - Modo de reparto: "Partes iguales"
   - Dejar Importe vacío
4. Guardar alojamiento

**Resultado esperado:**
- ✅ El gasto se guarda con importe = 0 o null
- ✅ No hay error de validación (campo opcional)
- ✅ El gasto aparece en la lista

**Nota:** Verificar si el campo debe ser obligatorio o no según requisitos de negocio.

---

## 🎯 Grupo 2: Editar Gastos Adicionales

### TEST-EXTRA-006: Editar concepto de gasto existente

**Objetivo:** Verificar que se puede modificar el concepto de un gasto.

**Precondiciones:**
- Alojamiento con gasto adicional "WiFi - 25.00€ - Partes iguales"
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Modificar el concepto de "WiFi" a "Internet Fibra"
3. Guardar alojamiento
4. Recargar página

**Resultado esperado:**
- ✅ El concepto se actualiza correctamente
- ✅ El importe y modo de reparto se mantienen
- ✅ Los cambios persisten después de recargar

---

### TEST-EXTRA-007: Editar importe de gasto existente

**Objetivo:** Verificar que se puede modificar el importe de un gasto.

**Precondiciones:**
- Alojamiento con gasto adicional "WiFi - 25.00€ - Partes iguales"
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Modificar el importe de "25.00" a "30.50"
3. Guardar alojamiento
4. Recargar página

**Resultado esperado:**
- ✅ El importe se actualiza a "30.50 €"
- ✅ El concepto y modo de reparto se mantienen
- ✅ Los cambios persisten en la BD

---

### TEST-EXTRA-008: Cambiar modo de reparto

**Objetivo:** Verificar que se puede cambiar entre "Partes iguales" y "Prorrateado".

**Precondiciones:**
- Alojamiento con gasto adicional "WiFi - 25.00€ - Partes iguales"
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Cambiar modo de reparto de "Partes iguales" a "Prorrateado"
3. Guardar alojamiento
4. Recargar página

**Resultado esperado:**
- ✅ El modo de reparto se actualiza correctamente
- ✅ El concepto e importe se mantienen
- ✅ Los cambios persisten en la BD

---

## 🎯 Grupo 3: Eliminar Gastos Adicionales

### TEST-EXTRA-009: Eliminar un gasto adicional

**Objetivo:** Verificar que se puede eliminar un gasto de la lista.

**Precondiciones:**
- Alojamiento con 2 gastos adicionales
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Click en botón de eliminar (icono rojo) del primer gasto
3. Guardar alojamiento
4. Recargar página

**Resultado esperado:**
- ✅ El gasto se elimina de la lista inmediatamente
- ✅ Los demás gastos se mantienen
- ✅ Los cambios persisten después de guardar

---

### TEST-EXTRA-010: Eliminar todos los gastos adicionales

**Objetivo:** Verificar que se pueden eliminar todos los gastos.

**Precondiciones:**
- Alojamiento con 3 gastos adicionales
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Eliminar los 3 gastos uno por uno
3. Guardar alojamiento
4. Recargar página

**Resultado esperado:**
- ✅ Todos los gastos se eliminan
- ✅ La sección "Otros gastos adicionales" queda vacía
- ✅ Solo aparece el botón "Añadir gasto adicional"
- ✅ Los cambios persisten (extra_costs = [] en BD)

---

## 🎯 Grupo 4: Persistencia en Base de Datos

### TEST-EXTRA-011: Verificar estructura JSONB en BD

**Objetivo:** Validar que los gastos se guardan correctamente en la columna `extra_costs`.

**Precondiciones:**
- Alojamiento con gastos adicionales guardados
- Acceso a SQL Editor de Supabase

**Pasos:**
1. Añadir gasto: "WiFi - 25.00€ - Partes iguales"
2. Guardar alojamiento
3. Ejecutar query SQL:
```sql
SELECT extra_costs 
FROM accommodations 
WHERE id = '{accommodation_id}';
```

**Resultado esperado:**
```json
[
  {
    "name": "WiFi",
    "amount": 25.00,
    "split_mode": "equal"
  }
]
```

**Validaciones:**
- ✅ `extra_costs` es un array JSONB
- ✅ Cada objeto tiene 3 propiedades: `name`, `amount`, `split_mode`
- ✅ `amount` es un número (no string)
- ✅ `split_mode` es "equal" o "prorated"

---

### TEST-EXTRA-012: Verificar actualización de gastos en BD

**Objetivo:** Validar que las modificaciones se reflejan en la BD.

**Precondiciones:**
- Alojamiento con gasto "WiFi - 25.00€"
- Acceso a SQL Editor

**Pasos:**
1. Modificar importe a "30.50€"
2. Guardar alojamiento
3. Ejecutar query SQL para verificar cambio

**Resultado esperado:**
- ✅ El campo `amount` se actualiza a 30.50
- ✅ No se duplican registros
- ✅ El array `extra_costs` mantiene la estructura correcta

---

## 🎯 Grupo 5: Casos Edge y Validaciones

### TEST-EXTRA-013: Añadir gasto con concepto vacío

**Objetivo:** Verificar el comportamiento cuando el concepto está vacío.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir gasto adicional
3. Dejar campo "Concepto" vacío
4. Rellenar Importe: "25.00"
5. Guardar alojamiento

**Resultado esperado:**
- ⚠️ Opción A: El gasto se guarda con concepto vacío
- ⚠️ Opción B: Aparece validación "El concepto es obligatorio"

**Nota:** Definir requisito de negocio sobre si el concepto debe ser obligatorio.

---

### TEST-EXTRA-014: Importe con valor muy alto

**Objetivo:** Verificar que el campo acepta importes altos.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento existente

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir gasto con importe "9999.99"
3. Guardar alojamiento

**Resultado esperado:**
- ✅ El importe se acepta y guarda correctamente
- ✅ Se muestra como "9999.99 €"
- ✅ No hay overflow ni errores de formato

---

### TEST-EXTRA-015: Recargar página sin guardar cambios

**Objetivo:** Verificar que los cambios no guardados se pierden al recargar.

**Precondiciones:**
- Alojamiento con 1 gasto adicional
- Usuario autenticado como admin

**Pasos:**
1. Navegar a configuración de consumo
2. Añadir nuevo gasto: "Basura - 15.00€"
3. **NO** guardar alojamiento
4. Recargar página (F5)

**Resultado esperado:**
- ✅ El nuevo gasto NO aparece (cambios perdidos)
- ✅ Solo aparece el gasto original
- ✅ No hay errores en consola

---

## 📝 Datos de Test Sugeridos

### Gastos Comunes
```javascript
const commonExtraCosts = [
  { name: "WiFi", amount: 25.00, split_mode: "equal" },
  { name: "Basura", amount: 15.50, split_mode: "equal" },
  { name: "Netflix", amount: 12.99, split_mode: "prorated" },
  { name: "Limpieza zonas comunes", amount: 30.00, split_mode: "equal" },
  { name: "Comunidad", amount: 45.00, split_mode: "prorated" },
];
```

### Valores de Importe para Pruebas
```javascript
const testAmounts = {
  zero: 0,
  decimal: 12.50,
  integer: 25,
  highPrecision: 10.999, // debe redondear a 11.00
  verySmall: 0.01,
  high: 9999.99,
};
```

---

## 🔧 Selectores Playwright

### Formulario de Gastos Adicionales
```javascript
const EXTRA_COSTS_SELECTORS = {
  addButton: 'button:has-text("Añadir gasto adicional")',
  conceptInput: (index) => `input[placeholder="Concepto (ej. WiFi, Basura...)"]`.nth(index),
  amountInput: (index) => `input[placeholder="Importe"]`.nth(index),
  splitModeSelect: (index) => `.ant-select`.nth(index),
  deleteButton: (index) => `button.ant-btn-dangerous`.nth(index),
  saveButton: 'button:has-text("Guardar Alojamiento")',
};
```

### Opciones de Modo de Reparto
```javascript
const SPLIT_MODE_OPTIONS = {
  equal: 'div[title="Partes iguales"]',
  prorated: 'div[title="Prorrateado"]',
};
```

---

## 📊 Estado de Implementación

- [ ] **TEST-EXTRA-001** - Añadir gasto completo
- [ ] **TEST-EXTRA-002** - Añadir múltiples gastos
- [ ] **TEST-EXTRA-003** - Validar decimales
- [ ] **TEST-EXTRA-004** - Validar mínimo (no negativos)
- [ ] **TEST-EXTRA-005** - Añadir sin importe
- [ ] **TEST-EXTRA-006** - Editar concepto
- [ ] **TEST-EXTRA-007** - Editar importe
- [ ] **TEST-EXTRA-008** - Cambiar modo de reparto
- [ ] **TEST-EXTRA-009** - Eliminar un gasto
- [ ] **TEST-EXTRA-010** - Eliminar todos los gastos
- [ ] **TEST-EXTRA-011** - Verificar estructura JSONB (requiere SQL)
- [ ] **TEST-EXTRA-012** - Verificar actualización en BD (requiere SQL)
- [ ] **TEST-EXTRA-013** - Concepto vacío
- [ ] **TEST-EXTRA-014** - Importe muy alto
- [ ] **TEST-EXTRA-015** - Recargar sin guardar

**Total:** 15 test cases documentados  
**Implementados:** 0 test cases  
**Pendientes:** 15 test cases (12 E2E + 3 SQL)

---

## 📌 Notas para Implementación

1. **Validación de concepto obligatorio:** Definir si el campo "Concepto" debe ser obligatorio o puede estar vacío.

2. **Formato de moneda:** El componente `InputNumber` con `addonAfter="€"` maneja automáticamente el formato.

3. **Persistencia JSONB:** Los gastos se guardan como array de objetos en la columna `extra_costs`:
   ```sql
   extra_costs JSONB NOT NULL DEFAULT '[]'::jsonb
   ```

4. **Validación de importe:**
   - Mínimo: 0 (no negativos)
   - Precisión: 2 decimales
   - Tipo: number (no string)

5. **Modos de reparto:**
   - `equal`: Partes iguales (dividir entre todos los inquilinos)
   - `prorated`: Prorrateado (según algún criterio, ej. días de estancia)

6. **Dependencia de switch:** Los gastos adicionales solo son visibles si el switch "Los servicios están incluidos en el alquiler" está activado.

---

## 🔗 Queries SQL para Verificación

### Ver gastos de un alojamiento
```sql
SELECT 
  id,
  name,
  extra_costs
FROM accommodations
WHERE id = '{accommodation_id}';
```

### Ver estructura de gastos expandida
```sql
SELECT 
  a.id,
  a.name AS accommodation_name,
  jsonb_array_elements(a.extra_costs) AS extra_cost
FROM accommodations a
WHERE a.id = '{accommodation_id}';
```

### Contar gastos por alojamiento
```sql
SELECT 
  id,
  name,
  jsonb_array_length(extra_costs) AS num_extra_costs
FROM accommodations
WHERE client_account_id = '{client_account_id}'
ORDER BY name;
```

### Buscar alojamientos con gasto específico
```sql
SELECT 
  id,
  name
FROM accommodations
WHERE extra_costs @> '[{"name": "WiFi"}]'::jsonb;
```
