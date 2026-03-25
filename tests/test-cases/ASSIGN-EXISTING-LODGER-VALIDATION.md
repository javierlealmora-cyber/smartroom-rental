# Test Cases: Asignar Inquilino Existente desde Card de Habitación

## 📋 Resumen

Este documento define los casos de prueba E2E para validar la funcionalidad de **"Buscar Inquilino Existente"** desde la card de una habitación libre, que debe mostrar un formulario completo para asignar el inquilino con todos los campos obligatorios.

**Contexto:** Desde la vista de detalle de un alojamiento, al hacer click en "Buscar Inquilino Existente" desde card de habitación, debe aparecer un modal que permita buscar un inquilino sin habitación asignada y completar todos los datos de la asignación usando el componente compartido `RoomAssignmentForm`.

**Implementación actual:**
- ✅ **Componente compartido:** `RoomAssignmentForm.jsx` reutilizado en "Crear Inquilino" y "Asignar Inquilino Existente"
- ✅ **Flujo simplificado:** Modal de búsqueda → Seleccionar inquilino → Modal de asignación con formulario completo
- ✅ **Sin setTimeout:** Eliminado el delay entre modales, flujo directo y sin conflictos

**Spec sugerido:** `tests/e2e/specs/assign-existing-lodger.spec.js`

---

## 🎯 Grupo 1: Navegación y Acceso al Formulario

### TEST-ASSIGN-001: Abrir modal de búsqueda desde card de habitación libre

**Objetivo:** Verificar que el botón "Buscar Inquilino Existente" abre el modal de búsqueda.

**Precondiciones:**
- Usuario autenticado como admin
- Alojamiento con al menos 1 habitación libre
- Al menos 1 inquilino sin habitación asignada en el sistema

**Pasos:**
1. Navegar a `/v2/admin/alojamientos/{id}/habitaciones`
2. Localizar una card de habitación con estado "Libre"
3. Click en botón "Buscar Inquilino Existente >"

**Resultado esperado:**
- ✅ Se abre un modal con título "Asignar inquilino — Hab. {número}"
- ✅ El modal contiene un campo de búsqueda (Select con showSearch)
- ✅ Aparece texto explicativo: "Selecciona un inquilino ya dado de alta..."
- ✅ Hay dos botones en el footer: "Cancelar" y "Crear nuevo inquilino"

**Selectores:**
```javascript
'button:has-text("Buscar Inquilino Existente")'
'.ant-modal-title:has-text("Asignar inquilino")'
'.ant-select-selector[placeholder*="Buscar por nombre o email"]'
'button:has-text("Crear nuevo inquilino")'
```

---

### TEST-ASSIGN-002: Buscar inquilino en el selector

**Objetivo:** Verificar que el campo de búsqueda filtra inquilinos correctamente.

**Precondiciones:**
- Modal de asignación abierto
- Inquilinos existentes: "José López" (sin habitación), "María García" (con habitación)

**Pasos:**
1. Abrir modal de asignación
2. Click en el campo de búsqueda
3. Escribir "José"

**Resultado esperado:**
- ✅ Aparece "José López — jose@example.com" en las opciones
- ✅ "María García" aparece deshabilitada con texto "(Hab. X - Alojamiento Y)"
- ✅ Solo inquilinos sin habitación están habilitados para selección

**Selectores:**
```javascript
'.ant-select-item-option:has-text("José López")'
'.ant-select-item-option-disabled:has-text("María García")'
```

---

### TEST-ASSIGN-003: Mostrar formulario completo al seleccionar inquilino

**Objetivo:** Verificar que al seleccionar un inquilino existente se muestra un formulario completo con todos los campos obligatorios.

**Precondiciones:**
- Modal de asignación abierto
- Inquilino "José López" sin habitación asignada

**Pasos:**
1. Abrir modal de asignación para habitación HAB-106
2. Buscar y seleccionar "José López"

**Resultado esperado:**
- ✅ Se cierra el modal de búsqueda
- ✅ Se abre un formulario/modal con título "Asignación de Habitación (Opcional)" o similar
- ✅ El formulario muestra:
  - **Alojamiento** (select, prellenado)
  - **Habitación** (selector de habitaciones, HAB-106 seleccionada)
  - **Fecha de Check-In** (DatePicker, obligatorio)
  - **Checkbox:** "El inquilino va a pagar desde la fecha de Check-in hasta fin de mes"
  - **Importe a pagar hasta fin de mes** (InputNumber, condicional)
  - **Fecha del primer pago de la mensualidad** (calculado automáticamente)
  - **Importe de la Fianza (€)** (InputNumber, obligatorio)
  - **Importe Comisión (€)** (InputNumber, opcional)
  - **Documentos adjuntos** (sección para subir archivos)

**Nota:** Este es el comportamiento esperado según la imagen adjunta por el usuario.

---

## 🎯 Grupo 2: Validación de Campos Obligatorios

### TEST-ASSIGN-004: Validar campos obligatorios vacíos

**Objetivo:** Verificar que no se puede guardar la asignación sin completar los campos obligatorios.

**Precondiciones:**
- Formulario de asignación abierto para inquilino "José López"
- Habitación HAB-106 seleccionada

**Pasos:**
1. Dejar todos los campos vacíos
2. Click en botón "Guardar" o "Asignar"

**Resultado esperado:**
- ✅ Aparecen mensajes de validación:
  - "La fecha de check-in es obligatoria"
  - "El importe de la fianza es obligatorio"
- ✅ El formulario NO se envía
- ✅ Los campos obligatorios se marcan en rojo

**Selectores:**
```javascript
'.ant-form-item-explain-error:has-text("fecha de check-in")'
'.ant-form-item-explain-error:has-text("fianza")'
```

---

### TEST-ASSIGN-005: Validar fecha de check-in

**Objetivo:** Verificar que la fecha de check-in es obligatoria y válida.

**Precondiciones:**
- Formulario de asignación abierto

**Pasos:**
1. Dejar campo "Fecha de Check-In" vacío
2. Rellenar resto de campos obligatorios
3. Intentar guardar

**Resultado esperado:**
- ✅ Aparece error: "La fecha de check-in es obligatoria"
- ✅ No se permite guardar

**Test adicional:**
1. Seleccionar fecha de check-in: 24/03/2026
2. Verificar que "Fecha del primer pago de la mensualidad" se calcula automáticamente: 01/04/2026

**Resultado esperado:**
- ✅ La fecha del primer pago se calcula como el primer día del mes siguiente

---

### TEST-ASSIGN-006: Validar importe de fianza

**Objetivo:** Verificar que el importe de la fianza es obligatorio y acepta valores numéricos.

**Precondiciones:**
- Formulario de asignación abierto
- Renta mensual de la habitación: 540€

**Pasos:**
1. Dejar campo "Importe de la Fianza" vacío
2. Rellenar resto de campos obligatorios
3. Intentar guardar

**Resultado esperado:**
- ✅ Aparece error: "El importe de la fianza es obligatorio"

**Test adicional:**
1. Introducir importe de fianza: 900€
2. Guardar

**Resultado esperado:**
- ✅ El valor se acepta y guarda correctamente
- ✅ El formato se muestra con 2 decimales: "900.00 €"

---

### TEST-ASSIGN-007: Checkbox "Pagar hasta fin de mes" y campo condicional

**Objetivo:** Verificar que al activar el checkbox aparece el campo "Importe a pagar hasta fin de mes".

**Precondiciones:**
- Formulario de asignación abierto
- Fecha de check-in: 24/03/2026

**Pasos:**
1. Marcar checkbox "El inquilino va a pagar desde la fecha de Check-in hasta fin de mes"
2. Verificar que aparece campo "Importe a pagar hasta fin de mes"
3. Introducir valor: 450€
4. Desmarcar checkbox

**Resultado esperado:**
- ✅ Al marcar checkbox, aparece campo "Importe a pagar hasta fin de mes"
- ✅ Al desmarcar checkbox, el campo desaparece o se deshabilita
- ✅ El valor introducido se guarda si el checkbox está marcado

**Selectores:**
```javascript
'input[type="checkbox"]:has-text("pagar desde la fecha de Check-in")'
'[name="first_month_amount"]'
```

---

## 🎯 Grupo 3: Selección de Habitación

### TEST-ASSIGN-008: Selector de habitaciones muestra solo habitaciones libres

**Objetivo:** Verificar que el selector de habitaciones solo muestra habitaciones disponibles del alojamiento.

**Precondiciones:**
- Formulario de asignación abierto
- Alojamiento "Apartamento Principal" con:
  - HAB-101: Ocupada
  - HAB-102: Ocupada
  - HAB-106: Libre (seleccionada por defecto)

**Pasos:**
1. Click en selector de habitaciones
2. Verificar opciones disponibles

**Resultado esperado:**
- ✅ Aparece HAB-106 (Libre) - 540€/mes - seleccionada
- ✅ HAB-101 y HAB-102 NO aparecen o aparecen deshabilitadas
- ✅ Solo habitaciones con estado "Libre" están disponibles

**Selectores:**
```javascript
'.ant-select-item:has-text("HAB-106")'
'.ant-select-item:has-text("Libre")'
```

---

### TEST-ASSIGN-009: Cambiar habitación actualiza precio sugerido

**Objetivo:** Verificar que al cambiar de habitación se actualiza el precio de renta sugerido.

**Precondiciones:**
- Formulario de asignación abierto
- Alojamiento con múltiples habitaciones libres:
  - HAB-106: 540€/mes
  - HAB-107: 600€/mes

**Pasos:**
1. Habitación inicial: HAB-106 (540€/mes)
2. Cambiar a HAB-107
3. Verificar campo de renta mensual

**Resultado esperado:**
- ✅ El campo de renta se actualiza a 600€
- ✅ El campo de fianza se recalcula (si está en automático)

**Nota:** Verificar si el campo de renta es editable o solo lectura.

---

## 🎯 Grupo 4: Cálculo Automático de Fechas e Importes

### TEST-ASSIGN-010: Cálculo automático de fecha del primer pago

**Objetivo:** Verificar que la fecha del primer pago se calcula automáticamente como el primer día del mes siguiente al check-in.

**Precondiciones:**
- Formulario de asignación abierto

**Pasos:**
1. Seleccionar fecha de check-in: 24/03/2026
2. Verificar campo "Fecha del primer pago de la mensualidad"

**Resultado esperado:**
- ✅ Fecha del primer pago: 01/04/2026
- ✅ El campo es de solo lectura (no editable)

**Test adicional:**
- Check-in: 01/03/2026 → Primer pago: 01/04/2026
- Check-in: 31/03/2026 → Primer pago: 01/04/2026
- Check-in: 15/12/2025 → Primer pago: 01/01/2026

---

### TEST-ASSIGN-011: Sugerencia de importe de fianza

**Objetivo:** Verificar que el sistema sugiere un importe de fianza (ej. 2 meses de renta).

**Precondiciones:**
- Formulario de asignación abierto
- Habitación HAB-106: 540€/mes

**Pasos:**
1. Verificar valor inicial del campo "Importe de la Fianza"

**Resultado esperado:**
- ✅ El campo sugiere 900€ (540€ * 2 meses) como valor por defecto
- ✅ El valor es editable por el usuario

**Nota:** Verificar si este cálculo automático está implementado o es manual.

---

## 🎯 Grupo 5: Documentos Adjuntos

### TEST-ASSIGN-012: Subir documento durante la asignación

**Objetivo:** Verificar que se pueden subir documentos al crear la asignación.

**Precondiciones:**
- Formulario de asignación abierto
- Archivo de prueba: `contrato.pdf` (2MB)

**Pasos:**
1. Scroll hasta sección "Documentos adjuntos"
2. Click en "Subir documento"
3. Seleccionar archivo `contrato.pdf`
4. Verificar que el archivo aparece en la lista

**Resultado esperado:**
- ✅ El archivo se sube correctamente
- ✅ Aparece en la lista con nombre "contrato.pdf"
- ✅ Se puede eliminar antes de guardar la asignación

**Selectores:**
```javascript
'button:has-text("Subir documento")'
'.ant-upload-list-item:has-text("contrato.pdf")'
```

---

### TEST-ASSIGN-013: Validar tipos de archivo permitidos

**Objetivo:** Verificar que solo se permiten tipos de archivo válidos.

**Precondiciones:**
- Formulario de asignación abierto

**Pasos:**
1. Intentar subir archivo `.exe` o `.zip`
2. Verificar mensaje de error

**Resultado esperado:**
- ✅ Aparece error: "Tipo de archivo no permitido"
- ✅ Solo se aceptan: PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX

---

## 🎯 Grupo 6: Guardar Asignación

### TEST-ASSIGN-014: Guardar asignación con todos los campos obligatorios

**Objetivo:** Verificar que se puede guardar la asignación correctamente con todos los campos obligatorios.

**Precondiciones:**
- Formulario de asignación abierto
- Inquilino: José López
- Habitación: HAB-106

**Pasos:**
1. Rellenar campos:
   - Fecha de Check-In: 24/03/2026
   - Importe de la Fianza: 900€
   - Importe Comisión: (vacío)
2. Click en "Guardar" o "Asignar Habitación"

**Resultado esperado:**
- ✅ Aparece mensaje de éxito: "Inquilino asignado correctamente"
- ✅ Se cierra el formulario
- ✅ La card de la habitación HAB-106 ahora muestra:
  - Estado: "Ocupada"
  - Nombre del inquilino: "José López"
  - Renta: 540€/mes
- ✅ El inquilino aparece en la lista de inquilinos del alojamiento

**Selectores:**
```javascript
'button:has-text("Guardar")'
'.ant-message-success:has-text("asignado correctamente")'
'.ant-tag:has-text("Ocupada")'
```

---

### TEST-ASSIGN-015: Verificar persistencia en base de datos

**Objetivo:** Validar que la asignación se guarda correctamente en la tabla `lodger_room_assignments`.

**Precondiciones:**
- Asignación guardada en TEST-ASSIGN-014

**Pasos:**
1. Ejecutar query SQL:
```sql
SELECT 
  lodger_id,
  room_id,
  accommodation_id,
  move_in_date,
  billing_start_date,
  monthly_rent,
  deposit_amount,
  commission_amount,
  first_month_amount
FROM lodger_room_assignments
WHERE lodger_id = '{jose_lopez_id}'
AND room_id = '{hab_106_id}'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
```json
{
  "lodger_id": "{jose_lopez_id}",
  "room_id": "{hab_106_id}",
  "accommodation_id": "{apartamento_principal_id}",
  "move_in_date": "2026-03-24",
  "billing_start_date": "2026-04-01",
  "monthly_rent": 540.00,
  "deposit_amount": 900.00,
  "commission_amount": null,
  "first_month_amount": null
}
```

**Validaciones:**
- ✅ Todos los campos obligatorios están presentes
- ✅ Las fechas están en formato ISO (YYYY-MM-DD)
- ✅ Los importes son numéricos con 2 decimales

---

## 🎯 Grupo 7: Casos Edge y Validaciones

### TEST-ASSIGN-016: Cancelar asignación sin guardar

**Objetivo:** Verificar que se puede cancelar la asignación sin guardar cambios.

**Precondiciones:**
- Formulario de asignación abierto
- Campos parcialmente rellenados

**Pasos:**
1. Rellenar algunos campos
2. Click en "Cancelar"

**Resultado esperado:**
- ✅ Se cierra el formulario
- ✅ No se guarda ninguna asignación
- ✅ La habitación sigue en estado "Libre"
- ✅ No aparece confirmación de pérdida de datos (opcional)

---

### TEST-ASSIGN-017: Intentar asignar inquilino con habitación activa

**Objetivo:** Verificar que no se puede asignar un inquilino que ya tiene habitación.

**Precondiciones:**
- Inquilino "María García" con habitación HAB-101 asignada
- Modal de búsqueda abierto

**Pasos:**
1. Buscar "María García"
2. Verificar que aparece deshabilitada
3. Intentar seleccionarla

**Resultado esperado:**
- ✅ La opción aparece deshabilitada
- ✅ Muestra texto: "(Hab. 101 - Apartamento Principal)"
- ✅ No se puede seleccionar
- ✅ Mensaje informativo: "Solo se muestran inquilinos sin habitación asignada"

---

### TEST-ASSIGN-018: Validar importe de comisión opcional

**Objetivo:** Verificar que el campo de comisión es opcional y acepta valores válidos.

**Precondiciones:**
- Formulario de asignación abierto

**Pasos:**
1. Dejar campo "Importe Comisión" vacío
2. Guardar asignación

**Resultado esperado:**
- ✅ La asignación se guarda correctamente
- ✅ El campo `commission_amount` en BD es `null`

**Test adicional:**
1. Introducir comisión: 150€
2. Guardar

**Resultado esperado:**
- ✅ El valor se guarda correctamente: 150.00

---

### TEST-ASSIGN-019: Fecha de check-in en el pasado

**Objetivo:** Verificar el comportamiento cuando se selecciona una fecha de check-in pasada.

**Precondiciones:**
- Formulario de asignación abierto
- Fecha actual: 24/03/2026

**Pasos:**
1. Seleccionar fecha de check-in: 20/03/2026 (4 días atrás)
2. Verificar cálculo de fecha del primer pago

**Resultado esperado:**
- ⚠️ Opción A: Se permite y calcula primer pago: 01/04/2026
- ⚠️ Opción B: Aparece warning: "La fecha de check-in es anterior a hoy"
- ✅ El sistema debe permitir fechas pasadas para registros históricos

---

### TEST-ASSIGN-020: Recargar página sin guardar

**Objetivo:** Verificar que los cambios no guardados se pierden al recargar.

**Precondiciones:**
- Formulario de asignación abierto
- Campos rellenados pero no guardados

**Pasos:**
1. Rellenar todos los campos
2. Recargar página (F5)
3. Volver a abrir modal de asignación

**Resultado esperado:**
- ✅ Los campos aparecen vacíos
- ✅ No se guardó ninguna asignación
- ✅ La habitación sigue en estado "Libre"

---

## 📝 Datos de Test Sugeridos

### Inquilinos de Prueba
```javascript
const testLodgers = [
  {
    id: "lodger-001",
    full_name: "José Antonio López Fernández",
    email: "jose@example.com",
    has_assignment: false,
  },
  {
    id: "lodger-002",
    full_name: "María Rosa Martínez Díaz",
    email: "maria@example.com",
    has_assignment: true,
    current_room: "HAB-101",
    current_accommodation: "Apartamento Principal",
  },
  {
    id: "lodger-003",
    full_name: "Pedro García Sánchez",
    email: "pedro@example.com",
    has_assignment: false,
  },
];
```

### Habitaciones de Prueba
```javascript
const testRooms = [
  { number: "HAB-101", status: "occupied", monthly_rent: 450 },
  { number: "HAB-102", status: "occupied", monthly_rent: 350 },
  { number: "HAB-103", status: "occupied", monthly_rent: 400 },
  { number: "HAB-104", status: "occupied", monthly_rent: 452 },
  { number: "HAB-105", status: "occupied", monthly_rent: 560 },
  { number: "HAB-106", status: "free", monthly_rent: 540 },
];
```

### Datos de Asignación Completos
```javascript
const assignmentData = {
  lodger_id: "lodger-001",
  room_id: "room-hab-106",
  accommodation_id: "acc-001",
  move_in_date: "2026-03-24",
  billing_start_date: "2026-04-01", // Calculado automáticamente
  monthly_rent: 540.00,
  deposit_amount: 900.00,
  commission_amount: null,
  first_month_amount: 450.00, // Solo si checkbox marcado
  pay_until_end_of_month: true,
};
```

---

## 🔧 Selectores Playwright

### Modal de Búsqueda
```javascript
const SEARCH_MODAL_SELECTORS = {
  modal: '.ant-modal:has-text("Asignar inquilino")',
  searchInput: '.ant-select-selector[placeholder*="Buscar por nombre"]',
  lodgerOption: (name) => `.ant-select-item:has-text("${name}")`,
  cancelButton: 'button:has-text("Cancelar")',
  createNewButton: 'button:has-text("Crear nuevo inquilino")',
};
```

### Formulario de Asignación
```javascript
const ASSIGNMENT_FORM_SELECTORS = {
  accommodationSelect: '[name="accommodation_id"]',
  roomSelect: '[name="room_id"]',
  checkInDate: '[name="move_in_date"]',
  payUntilEndCheckbox: 'input[type="checkbox"]',
  firstMonthAmount: '[name="first_month_amount"]',
  billingStartDate: '[name="billing_start_date"]', // Solo lectura
  depositAmount: '[name="deposit_amount"]',
  commissionAmount: '[name="commission_amount"]',
  uploadButton: 'button:has-text("Subir documento")',
  saveButton: 'button:has-text("Guardar")',
  cancelButton: 'button:has-text("Cancelar")',
};
```

### Card de Habitación
```javascript
const ROOM_CARD_SELECTORS = {
  card: (roomNumber) => `.ant-card:has-text("${roomNumber}")`,
  status: '.ant-tag',
  price: 'text*="€/mes"',
  searchLodgerButton: 'button:has-text("Buscar Inquilino Existente")',
  createLodgerButton: 'button:has-text("Crear Inquilino Nuevo")',
};
```

---

## 📊 Estado de Implementación

- [ ] **TEST-ASSIGN-001** - Abrir modal de búsqueda
- [ ] **TEST-ASSIGN-002** - Buscar inquilino en selector
- [ ] **TEST-ASSIGN-003** - Mostrar formulario completo al seleccionar
- [ ] **TEST-ASSIGN-004** - Validar campos obligatorios vacíos
- [ ] **TEST-ASSIGN-005** - Validar fecha de check-in
- [ ] **TEST-ASSIGN-006** - Validar importe de fianza
- [ ] **TEST-ASSIGN-007** - Checkbox y campo condicional
- [ ] **TEST-ASSIGN-008** - Selector de habitaciones libres
- [ ] **TEST-ASSIGN-009** - Cambiar habitación actualiza precio
- [ ] **TEST-ASSIGN-010** - Cálculo automático de fecha primer pago
- [ ] **TEST-ASSIGN-011** - Sugerencia de importe de fianza
- [ ] **TEST-ASSIGN-012** - Subir documento
- [ ] **TEST-ASSIGN-013** - Validar tipos de archivo
- [ ] **TEST-ASSIGN-014** - Guardar asignación completa
- [ ] **TEST-ASSIGN-015** - Verificar persistencia en BD (SQL)
- [ ] **TEST-ASSIGN-016** - Cancelar sin guardar
- [ ] **TEST-ASSIGN-017** - Inquilino con habitación activa
- [ ] **TEST-ASSIGN-018** - Comisión opcional
- [ ] **TEST-ASSIGN-019** - Fecha de check-in pasada
- [ ] **TEST-ASSIGN-020** - Recargar sin guardar

**Total:** 20 test cases documentados  
**Implementados:** 0 test cases  
**Pendientes:** 20 test cases (18 E2E + 2 SQL)

---

## 📌 Notas para Implementación

### **Implementación Actual (Componente Compartido)**

**Arquitectura:**
```
RoomAssignmentForm.jsx (componente compartido)
├── Usado en: TenantCreate.jsx (crear inquilino con asignación opcional)
└── Usado en: AccommodationDetail.jsx (asignar inquilino existente)
```

**Flujo implementado:**
1. Usuario hace click en "Buscar Inquilino Existente" → Modal de búsqueda
2. Usuario selecciona inquilino → Modal de búsqueda se cierra
3. Modal de asignación se abre con `RoomAssignmentForm`
4. Formulario prellenado con:
   - Alojamiento (deshabilitado)
   - Habitación (prellenada)
   - Fecha de check-in (hoy)
   - Fianza (2 meses de renta)
5. Usuario completa campos y guarda

**Ventajas de esta implementación:**
- ✅ Código reutilizable (un solo componente)
- ✅ Consistencia UX entre crear y asignar
- ✅ Sin setTimeout ni conflictos de modales
- ✅ Mantenibilidad mejorada
- ✅ Formulario ya probado en TenantCreate

### **Componente RoomAssignmentForm**

**Props:**
- `form`: Instancia de Ant Design Form
- `accommodations`: Array de alojamientos disponibles
- `preselectedAccId`: ID de alojamiento prellenado
- `preselectedRoomId`: ID de habitación prellenada
- `required`: Si los campos son obligatorios
- `allowAccommodationChange`: Permitir cambiar alojamiento

**Campos incluidos:**
- Selector de alojamiento
- Grid de habitaciones (visual con estado y precio)
- Fecha de Check-In
- Checkbox "pagar hasta fin de mes"
- Importe hasta fin de mes (condicional)
- Fecha del primer pago (calculada automáticamente)
- Importe de la Fianza
- Importe de Comisión

### **Campos Obligatorios Confirmados**

Según la imagen adjunta:
1. ✅ **Fecha de Check-In** (obligatorio)
2. ✅ **Importe de la Fianza** (obligatorio)
3. ⚠️ **Importe a pagar hasta fin de mes** (obligatorio si checkbox marcado)
4. ⚠️ **Importe Comisión** (opcional)

### **Cálculos Automáticos**

1. **Fecha del primer pago de la mensualidad:**
   ```javascript
   const billingStartDate = dayjs(moveInDate).add(1, 'month').startOf('month');
   // Ejemplo: Check-in 24/03/2026 → Primer pago 01/04/2026
   ```

2. **Sugerencia de fianza:**
   ```javascript
   const suggestedDeposit = monthlyRent * 2;
   // Ejemplo: Renta 540€ → Fianza sugerida 1080€
   ```

---

## 🔗 Queries SQL para Verificación

### Ver asignación creada
```sql
SELECT 
  lra.id,
  p.full_name AS lodger_name,
  r.number AS room_number,
  a.name AS accommodation_name,
  lra.move_in_date,
  lra.billing_start_date,
  lra.monthly_rent,
  lra.deposit_amount,
  lra.commission_amount,
  lra.first_month_amount
FROM lodger_room_assignments lra
JOIN profiles p ON lra.lodger_id = p.id
JOIN rooms r ON lra.room_id = r.id
JOIN accommodations a ON lra.accommodation_id = a.id
WHERE lra.lodger_id = '{lodger_id}'
AND lra.move_out_date IS NULL
ORDER BY lra.created_at DESC;
```

### Verificar estado de habitación
```sql
SELECT 
  r.number,
  r.status,
  r.monthly_rent,
  COUNT(lra.id) AS active_assignments
FROM rooms r
LEFT JOIN lodger_room_assignments lra 
  ON r.id = lra.room_id 
  AND lra.move_out_date IS NULL
WHERE r.id = '{room_id}'
GROUP BY r.id, r.number, r.status, r.monthly_rent;
```

### Verificar inquilinos sin habitación
```sql
SELECT 
  p.id,
  p.full_name,
  p.email,
  COUNT(lra.id) AS active_assignments
FROM profiles p
LEFT JOIN lodger_room_assignments lra 
  ON p.id = lra.lodger_id 
  AND lra.move_out_date IS NULL
WHERE p.client_account_id = '{client_account_id}'
GROUP BY p.id, p.full_name, p.email
HAVING COUNT(lra.id) = 0
ORDER BY p.full_name;
```

---

## ⚠️ Advertencias y Consideraciones

1. **Comportamiento actual:** La asignación se hace automáticamente sin mostrar formulario. Esto NO coincide con el requisito del usuario.

2. **Cambio de flujo requerido:** Se necesita implementar un formulario completo intermedio antes de guardar la asignación.

3. **Validaciones:** Asegurar que todos los campos obligatorios se validan tanto en frontend como en backend.

4. **Documentos:** Verificar si los documentos se pueden subir durante la creación de la asignación o solo después.

5. **Cálculo de fechas:** Confirmar la lógica de cálculo de "fecha del primer pago" (primer día del mes siguiente al check-in).

6. **Fianza sugerida:** Confirmar si la fianza debe ser 2 meses de renta o es configurable.
