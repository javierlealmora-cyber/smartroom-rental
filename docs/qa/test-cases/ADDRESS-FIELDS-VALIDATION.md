# Test Cases: Validación de Campos de Dirección

## 📋 Resumen

Este documento define los casos de prueba E2E para validar la funcionalidad de los campos de dirección en el módulo de inquilinos.

**Contexto:** Claude añadió los campos de dirección en el frontend (`LodgerFormFields.jsx`) pero olvidó crear la migración. Este documento valida que la funcionalidad completa funciona correctamente después de aplicar las migraciones necesarias.

**Cambios recientes:**
- ✅ Migración `20260323_add_address_fields_to_profiles.sql` aplicada
- ✅ Migración `20260323_add_address_number_to_profiles.sql` aplicada
- ✅ Todos los campos de dirección son ahora **obligatorios** (required)
- ✅ Campo "Calle y número" dividido en "Calle" y "Número" (2 campos separados)
- ✅ Etiqueta "Dirección" visible en vista de detalle

**Spec sugerido:** `tests/e2e/specs/tenant-address-fields.spec.js`

---

## 🎯 Grupo 1: Validación de Campos de Dirección en Creación

### TEST-ADDR-001: Crear inquilino con todos los campos de dirección completos

**Objetivo:** Verificar que se puede crear un inquilino con todos los campos de dirección completos.

**Precondiciones:**
- Usuario autenticado como admin
- Migración `20260323_add_address_fields_to_profiles.sql` aplicada en DEV

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Completar campos obligatorios del inquilino:
   - Nombre: "María"
   - Primer apellido: "García"
   - Segundo apellido: "López"
   - Email: "maria.garcia@example.com"
   - Teléfono: "612345678"
   - Documento: "12345678A"
   - Género: "Femenino"
3. Completar todos los campos de dirección:
   - Calle: "Calle Mayor"
   - Número: "123"
   - Piso / Puerta: "3º B"
   - Código Postal: "28013"
   - Localidad: "Madrid"
   - Provincia: "Madrid"
   - País: "España"
4. Click en "Crear Inquilino"

**Resultado esperado:**
- ✅ El inquilino se crea correctamente
- ✅ Mensaje de éxito: "Inquilino creado correctamente"
- ✅ Redirección a la lista de inquilinos
- ✅ Los datos de dirección se guardan en la base de datos

**Selectores:**
```javascript
'[name="address_street"]'  // Calle (sin número)
'[name="address_number"]'  // Número (nuevo campo)
'[name="address_floor"]'
'[name="address_postal_code"]'
'[name="address_city"]'
'[name="address_province"]'
'[name="address_country"]'
```

---

### TEST-ADDR-002: Validar que todos los campos de dirección son obligatorios

**Objetivo:** Verificar que todos los campos de dirección tienen validación de campo obligatorio.

**Precondiciones:**
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Completar solo campos obligatorios del inquilino (sin dirección)
3. Dejar todos los campos de dirección vacíos
4. Click en "Crear Inquilino"

**Resultado esperado:**
- ❌ El formulario NO se envía
- ✅ Aparecen 7 mensajes de error de validación:
  - "La calle es obligatoria"
  - "El número es obligatorio"
  - "El piso/puerta es obligatorio"
  - "El código postal es obligatorio"
  - "La localidad es obligatoria"
  - "La provincia es obligatoria"
  - "El país es obligatorio"
- ✅ Los campos tienen asterisco rojo (*) indicando que son obligatorios

---

### TEST-ADDR-003: Validar formato de código postal (máximo 10 caracteres)

**Objetivo:** Verificar que el campo código postal tiene validación de longitud máxima.

**Precondiciones:**
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Completar campos obligatorios
3. Intentar ingresar código postal con más de 10 caracteres: "123456789012"
4. Verificar que el campo limita la entrada a 10 caracteres

**Resultado esperado:**
- ✅ El campo no permite ingresar más de 10 caracteres
- ✅ El atributo `maxLength={10}` está presente en el input

**Selector:**
```javascript
'[name="address_postal_code"][maxlength="10"]'
```

---

### TEST-ADDR-004: Validar campos obligatorios individualmente

**Objetivo:** Verificar que cada campo de dirección muestra su mensaje de error específico.

**Precondiciones:**
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Completar campos obligatorios del inquilino
3. Completar 6 de 7 campos de dirección, dejando uno vacío cada vez:
   - Test A: Dejar vacío "Calle"
   - Test B: Dejar vacío "Número"
   - Test C: Dejar vacío "Piso / Puerta"
   - Test D: Dejar vacío "Código Postal"
   - Test E: Dejar vacío "Localidad"
   - Test F: Dejar vacío "Provincia"
   - Test G: Dejar vacío "País"
4. Intentar guardar en cada caso

**Resultado esperado:**
- ❌ El formulario NO se envía en ningún caso
- ✅ Aparece el mensaje de error específico para el campo vacío
- ✅ Los demás campos no muestran error

---

## 🎯 Grupo 2: Validación de Campos de Dirección en Edición

### TEST-ADDR-005: Validar campos obligatorios en edición de inquilino

**Objetivo:** Verificar que los campos de dirección son obligatorios también en el formulario de edición.

**Precondiciones:**
- Inquilino existente con dirección completa
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/{id}/editar`
2. Verificar que los campos de dirección tienen valores
3. Limpiar todos los campos de dirección (borrar contenido)
4. Intentar guardar cambios

**Resultado esperado:**
- ❌ El formulario NO se envía
- ✅ Aparecen 7 mensajes de error de validación (igual que en creación)
- ✅ Los campos tienen asterisco rojo (*) indicando que son obligatorios

---

### TEST-ADDR-006: Editar inquilino y modificar dirección existente

**Objetivo:** Verificar que se puede modificar una dirección existente.

**Precondiciones:**
- Inquilino con dirección completa
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/{id}/editar`
2. Verificar que los campos de dirección tienen valores
3. Modificar algunos campos:
   - Cambiar Calle y número: "Nueva Calle, 200"
   - Cambiar Código Postal: "28001"
4. Click en "Guardar cambios"

**Resultado esperado:**
- ✅ Los cambios se guardan correctamente
- ✅ Solo los campos modificados se actualizan
- ✅ Los demás campos mantienen sus valores

---

### TEST-ADDR-007: Editar un campo de dirección dejando otros vacíos

**Objetivo:** Verificar que no se puede guardar si falta algún campo de dirección.

**Precondiciones:**
- Inquilino con dirección completa
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/{id}/editar`
2. Modificar solo "Calle": "Nueva Calle"
3. Limpiar "Código Postal" (dejar vacío)
4. Intentar guardar cambios

**Resultado esperado:**
- ❌ El formulario NO se envía
- ✅ Aparece mensaje de error: "El código postal es obligatorio"
- ✅ El campo "Calle" mantiene el nuevo valor
- ✅ Los demás campos mantienen sus valores originales

---

### TEST-ADDR-008: Verificar que los cambios se guardan correctamente en la base de datos

**Objetivo:** Validar la persistencia de datos en la base de datos.

**Precondiciones:**
- Inquilino existente
- Usuario autenticado como admin
- Acceso a la base de datos para verificación

**Pasos:**
1. Editar inquilino y modificar dirección
2. Guardar cambios
3. Ejecutar query en base de datos:
   ```sql
   SELECT address_street, address_floor, address_postal_code, 
          address_city, address_province, address_country
   FROM profiles
   WHERE id = '{lodger_id}';
   ```

**Resultado esperado:**
- ✅ Los valores en la base de datos coinciden con los ingresados
- ✅ Los campos vacíos son NULL
- ✅ No hay error "column not found"

---

---

### TEST-ADDR-008B: Validar asterisco rojo en campos obligatorios

**Objetivo:** Verificar que todos los campos de dirección muestran el asterisco rojo (*) indicando que son obligatorios.

**Precondiciones:**
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Verificar visualmente cada campo de dirección

**Resultado esperado:**
- ✅ Todos los campos de dirección tienen asterisco rojo (*) antes del label:
  - * Calle
  - * Número
  - * Piso / Puerta
  - * Código Postal
  - * Localidad
  - * Provincia
  - * País
- ✅ El asterisco es consistente con otros campos obligatorios (Nombre, Email, etc.)

---

## 🎯 Grupo 3: Visualización en Detalle del Inquilino

### TEST-ADDR-009: Ver detalle de inquilino con dirección completa

**Objetivo:** Verificar que la vista de detalle muestra correctamente todos los campos de dirección.

**Precondiciones:**
- Inquilino con dirección completa
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos`
2. Click en botón "Detalle del Inquilino" (icono FileTextOutlined)
3. Verificar sección "Dirección" dentro de "Datos del Inquilino"

**Resultado esperado:**
- ✅ Se muestra la sección "Dirección" con borde superior
- ✅ Se muestran todos los campos en dos columnas (responsive):
  - Columna izquierda: Calle, Número, Piso / Puerta, Código Postal
  - Columna derecha: Localidad, Provincia, País
- ✅ Todos los valores se muestran correctamente
- ✅ Formato consistente con el resto de Descriptions

**Selectores:**
```javascript
'text=Dirección'
'text=Calle'
'text=Número'
'text=Piso / Puerta'
'text=Código Postal'
'text=Localidad'
'text=Provincia'
'text=País'
```

---

### TEST-ADDR-010: Verificar etiqueta "Dirección" en vista de detalle

**Objetivo:** Verificar que la etiqueta "Dirección" es visible y está correctamente formateada.

**Precondiciones:**
- Inquilino con dirección completa
- Usuario autenticado como admin

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/{id}/detalle-inquilino`
2. Localizar la sección "Dirección" dentro de "Datos del Inquilino"

**Resultado esperado:**
- ✅ La etiqueta "Dirección" es visible en negrita
- ✅ Tiene un borde superior de separación (`borderTop: "1px solid #f0f0f0"`)
- ✅ Está ubicada después de los campos personales (Email, Teléfono, etc.)
- ✅ Los 7 campos de dirección se muestran debajo de la etiqueta (Calle, Número, Piso, CP, Localidad, Provincia, País)

**Selector:**
```javascript
'text=Dirección' // Etiqueta principal
```

---

### TEST-ADDR-011: Ver detalle de inquilino con dirección parcial

**Objetivo:** Verificar que se muestran correctamente direcciones parciales.

**Precondiciones:**
- Inquilino con dirección parcial (solo calle y ciudad)
- Usuario autenticado como admin

**Pasos:**
1. Navegar a detalle del inquilino con dirección parcial
2. Verificar sección "Dirección"

**Resultado esperado:**
- ✅ Los campos con datos se muestran correctamente
- ✅ Los campos vacíos muestran "-"
- ✅ No hay errores de visualización

---

## 📝 Datos de Test Sugeridos

### Dirección Completa
```javascript
const addressDataComplete = {
  street: "Calle Mayor",
  number: "123",  // Nuevo campo
  floor: "3º B",
  postalCode: "28013",
  city: "Madrid",
  province: "Madrid",
  country: "España"
};
```

### Dirección Parcial
```javascript
const addressDataPartial = {
  street: "Avenida Libertad",
  city: "Barcelona"
};
```

### Dirección Alternativa
```javascript
const addressDataAlternative = {
  street: "Paseo de la Castellana",
  number: "100",  // Nuevo campo
  floor: "5º A",
  postalCode: "28046",
  city: "Madrid",
  province: "Madrid",
  country: "España"
};
```

---

## 🔧 Selectores Playwright

### Formulario de Dirección
```javascript
// Campos de entrada
const addressSelectors = {
  street: '[name="address_street"]',
  number: '[name="address_number"]',  // Nuevo campo
  floor: '[name="address_floor"]',
  postalCode: '[name="address_postal_code"]',
  city: '[name="address_city"]',
  province: '[name="address_province"]',
  country: '[name="address_country"]',
};
```

### Vista de Detalle
```javascript
// Labels y valores
const detailSelectors = {
  section: 'text=Dirección',
  streetLabel: 'text=Calle',
  numberLabel: 'text=Número',  // Nuevo campo
  floorLabel: 'text=Piso / Puerta',
  postalCodeLabel: 'text=Código Postal',
  cityLabel: 'text=Localidad',
  provinceLabel: 'text=Provincia',
  countryLabel: 'text=País'
};
```

---

## ✅ Estado de Implementación

- [x] **TEST-ADDR-001** - Crear con dirección completa → `tenant-address-fields.spec.js · 05`
- [x] **TEST-ADDR-002** - Formulario bloqueado sin dirección → `tenant-address-fields.spec.js · 01`
- [x] **TEST-ADDR-003** - Validar maxLength código postal → `tenant-address-fields.spec.js · 03`
- [x] **TEST-ADDR-004** - Cada campo muestra su error específico → `tenant-address-fields.spec.js · 04`
- [x] **TEST-ADDR-005** - Campos obligatorios en edición → `tenant-address-fields.spec.js · 07`
- [x] **TEST-ADDR-006** - Modificar dirección existente → `tenant-address-fields.spec.js · 08`
- [x] **TEST-ADDR-007** - No guardar con campo vacío → `tenant-address-fields.spec.js · 09`
- [ ] **TEST-ADDR-008** - Verificar guardado en BD (requiere SQL Editor Supabase)
- [x] **TEST-ADDR-008B** - Asterisco rojo en campos obligatorios → `tenant-address-fields.spec.js · 02`
- [x] **TEST-ADDR-009** - 7 campos individuales en 2 columnas → `tenant-address-fields.spec.js · 06`
- [x] **TEST-ADDR-010** - Etiqueta "Dirección" visible con borderTop → `tenant-address-fields.spec.js · 06`
- [x] **TEST-ADDR-011** - Sin null/undefined en detalle → `tenant-address-fields.spec.js · 10`
- [x] **TEST-ADDR-012** - Formato responsive (cubierto por ADDR-009)
- [ ] **TEST-ADDR-013** - Verificar columnas en BD (requiere SQL Editor Supabase)
- [ ] **TEST-ADDR-014** - Verificar INSERT en BD (requiere SQL Editor Supabase)
- [ ] **TEST-ADDR-015** - Verificar UPDATE en BD (requiere SQL Editor Supabase)
- ~~**TEST-ADDR-016**~~ - Ya no aplica (campos son obligatorios, no aceptan NULL)

**Total:** 17 test cases, **13 implementados** en `tests/e2e/specs/tenant-address-fields.spec.js`
**Pendiente:** 3 test cases (ADDR-008, 013, 014, 015) — requieren SQL Editor Supabase
**No aplica:** ADDR-016 (campos ya no aceptan NULL)

---

## 📌 Notas para Implementación

1. **Migración requerida:** Antes de ejecutar los tests, asegurarse de que la migración `20260323_add_address_fields_to_profiles.sql` está aplicada en el entorno de test.

2. **Schema cache:** Después de aplicar la migración, ejecutar:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

3. **Cleanup:** Cada test debe limpiar los datos creados para evitar conflictos.

4. **Orden de ejecución:** Los tests pueden ejecutarse en cualquier orden ya que son independientes.

5. **Fixtures:** Considerar crear fixtures con inquilinos de prueba con diferentes estados de dirección.
