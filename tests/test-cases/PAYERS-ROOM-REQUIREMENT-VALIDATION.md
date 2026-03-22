# Casos de Test: Validación de Habitación Requerida para Pagadores

## Contexto
**Regla de negocio:** Un inquilino **DEBE tener una habitación asignada** antes de poder añadir pagadores. Esta es una condición imprescindible.

---

## TEST-PAYER-001: Crear inquilino SIN habitación - No debe permitir añadir pagadores

**Objetivo:** Verificar que no se pueden añadir pagadores si el inquilino fue creado sin habitación

**Precondiciones:**
- Usuario autenticado como admin
- Existe al menos un alojamiento activo

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos obligatorios de "Datos Personales":
   - Nombre: "María"
   - Primer apellido: "González"
   - Segundo apellido: "Pérez"
   - Email: "maria.gonzalez@example.com"
   - Teléfono: "+34 600 000 002"
   - Documento: "87654321B"
   - Género: "Femenino"
3. **NO seleccionar** ningún alojamiento ni habitación
4. Click en "Registrar Inquilino"
5. Verificar pantalla de éxito

**Resultado esperado:**
- ✅ Inquilino creado exitosamente
- ✅ Pantalla muestra título: "Inquilino Registrado Exitosamente"
- ❌ **NO** se muestra el componente PayersList
- ⚠️ Se muestra Alert warning con:
  - Mensaje: "Sin habitación asignada"
  - Descripción: "El inquilino fue creado sin habitación asignada. Debes asignarle una habitación antes de poder añadir pagadores..."
- ❌ **NO** aparece botón "Añadir Pagador"
- ✅ Botones disponibles: "Finalizar" e "Ir a Editar Inquilino"

**Selectores Playwright:**
```javascript
await expect(page.locator('text=Sin habitación asignada')).toBeVisible();
await expect(page.locator('button:has-text("Añadir Pagador")')).toBeHidden();
await expect(page.locator('.ant-alert-warning')).toBeVisible();
```

---

## TEST-PAYER-002: Crear inquilino CON habitación - Debe permitir añadir pagadores

**Objetivo:** Verificar que SÍ se pueden añadir pagadores si el inquilino fue creado con habitación

**Precondiciones:**
- Usuario autenticado como admin
- Existe alojamiento "Apartamento Principal" con habitación 101 libre

**Pasos:**
1. Navegar a `/v2/admin/inquilinos/nuevo`
2. Rellenar campos obligatorios de "Datos Personales"
3. En "Asignación de Habitación":
   - Seleccionar alojamiento: "Apartamento Principal"
   - Seleccionar habitación: "Hab. 101"
   - Fecha de Check-In: "22/03/2026"
   - Importe de la Fianza: "900"
4. Click en "Registrar Inquilino"
5. Verificar pantalla de éxito

**Resultado esperado:**
- ✅ Inquilino creado exitosamente
- ✅ Se muestra Alert info: "Gestión de Pagadores"
- ✅ Se muestra Card "Pagadores" con componente PayersList
- ✅ Botón "Añadir Pagador" está visible y habilitado
- ✅ Mensaje: "No hay pagadores registrados" (lista vacía)

**Selectores Playwright:**
```javascript
await expect(page.locator('text=Gestión de Pagadores')).toBeVisible();
await expect(page.locator('button:has-text("Añadir Pagador")')).toBeVisible();
await expect(page.locator('.ant-alert-info')).toBeVisible();
```

---

## TEST-PAYER-003: Añadir pagador después de crear inquilino con habitación

**Objetivo:** Verificar flujo completo de añadir pagador en pantalla de creación exitosa

**Precondiciones:**
- Inquilino recién creado con habitación asignada (continuación de TEST-PAYER-002)

**Pasos:**
1. En pantalla de éxito, click en "Añadir Pagador"
2. Verificar que se abre modal "Añadir Pagador"
3. Seleccionar "Persona Física"
4. Rellenar:
   - Nombre: "Carlos"
   - Primer Apellido: "González"
   - Segundo Apellido: "Pérez"
   - Observaciones: "Padre del inquilino"
5. Click en "Añadir"
6. Esperar confirmación

**Resultado esperado:**
- ✅ Modal se abre correctamente
- ✅ Formulario se envía sin errores
- ✅ Mensaje de éxito: "Pagador añadido correctamente"
- ✅ Modal se cierra
- ✅ Pagador aparece en la lista con:
  - Nombre: "Carlos González Pérez"
  - Tag verde: "Activo"
  - Tag: "Persona Física"
  - Observaciones: "Padre del inquilino"
- ✅ Botones "Editar" y "Desactivar" disponibles

---

## TEST-PAYER-004: Editar inquilino SIN habitación - No debe permitir añadir pagadores

**Objetivo:** Verificar que en la edición tampoco se permiten pagadores sin habitación

**Precondiciones:**
- Existe inquilino "Andrea Ramirez Collado" sin habitación asignada (creado en TEST-PAYER-001)

**Pasos:**
1. Navegar a lista de inquilinos: `/v2/admin/inquilinos`
2. Buscar inquilino "Andrea Ramirez Collado"
3. Click en "Ver detalle" o en el nombre
4. Scroll hasta sección "Pagadores"

**Resultado esperado:**
- ✅ Sección "Habitación actual" muestra: "Sin habitación asignada"
- ✅ Sección "Pagadores" muestra Card con título "Pagadores"
- ⚠️ Se muestra Alert warning:
  - Mensaje: "Habitación requerida"
  - Descripción: "El inquilino debe tener una habitación asignada antes de poder añadir pagadores. Por favor, asigna una habitación primero."
- ❌ **NO** aparece botón "Añadir Pagador"
- ❌ **NO** se muestra lista de pagadores

**Selectores Playwright:**
```javascript
await expect(page.locator('text=Sin habitación asignada')).toBeVisible();
await expect(page.locator('text=Habitación requerida')).toBeVisible();
await expect(page.locator('button:has-text("Añadir Pagador")')).toBeHidden();
```

---

## TEST-PAYER-005: Editar inquilino CON habitación - Debe permitir añadir pagadores

**Objetivo:** Verificar que en la edición SÍ se permiten pagadores con habitación

**Precondiciones:**
- Existe inquilino con habitación asignada

**Pasos:**
1. Navegar a edición de inquilino con habitación
2. Scroll hasta sección "Pagadores"
3. Verificar estado de la sección

**Resultado esperado:**
- ✅ Sección "Habitación actual" muestra habitación asignada
- ✅ Sección "Pagadores" muestra Card con botón "Añadir Pagador"
- ✅ Botón "Añadir Pagador" está visible y habilitado
- ✅ Lista de pagadores se carga correctamente (puede estar vacía)
- ❌ **NO** se muestra Alert de warning

---

## TEST-PAYER-006: Asignar habitación y luego añadir pagador

**Objetivo:** Verificar que al asignar habitación a inquilino sin ella, se habilita la gestión de pagadores

**Precondiciones:**
- Existe inquilino "Andrea Ramirez Collado" sin habitación (TEST-PAYER-004)
- Existe habitación libre disponible

**Pasos:**
1. Navegar a edición del inquilino sin habitación
2. En sección "Habitación actual", click en "Asignar Habitación"
3. Seleccionar alojamiento y habitación
4. Rellenar fecha de check-in y fianza
5. Click en "Asignar"
6. Esperar confirmación y recarga de página
7. Scroll hasta sección "Pagadores"

**Resultado esperado:**
- ✅ Habitación asignada correctamente
- ✅ Sección "Habitación actual" muestra la nueva habitación
- ✅ Sección "Pagadores" ahora muestra botón "Añadir Pagador"
- ❌ Alert warning "Habitación requerida" desaparece
- ✅ Se puede añadir pagadores normalmente

---

## TEST-PAYER-007: Checkout de habitación deshabilita gestión de pagadores

**Objetivo:** Verificar que al hacer checkout, se deshabilita la gestión de pagadores

**Precondiciones:**
- Existe inquilino con habitación asignada y pagadores registrados

**Pasos:**
1. Navegar a edición del inquilino con habitación
2. Verificar que sección "Pagadores" está habilitada
3. En sección "Habitación actual", click en "Dar de baja"
4. Confirmar checkout con fecha de salida
5. Esperar confirmación y recarga
6. Scroll hasta sección "Pagadores"

**Resultado esperado:**
- ✅ Checkout realizado correctamente
- ✅ Sección "Habitación actual" muestra: "Sin habitación asignada"
- ⚠️ Sección "Pagadores" muestra Alert warning: "Habitación requerida"
- ❌ Botón "Añadir Pagador" desaparece
- ✅ Pagadores existentes siguen visibles en la lista (solo lectura)
- ❌ **NO** se pueden añadir nuevos pagadores
- ✅ Botones "Editar" y "Desactivar" de pagadores existentes siguen funcionando

---

## TEST-PAYER-008: Prevenir doble submit al añadir pagador

**Objetivo:** Verificar que no se crea pagador duplicado al hacer doble click

**Precondiciones:**
- Inquilino con habitación asignada
- Sección "Pagadores" habilitada

**Pasos:**
1. Navegar a edición del inquilino
2. Click en "Añadir Pagador"
3. Rellenar formulario:
   - Tipo: "Persona Física"
   - Nombre: "Laura"
   - Primer Apellido: "Martínez"
   - Segundo Apellido: "Sánchez"
4. Hacer **doble click rápido** en botón "Añadir"
5. Esperar respuesta

**Resultado esperado:**
- ✅ Botón "Añadir" se deshabilita después del primer click
- ✅ Modal muestra spinner de carga en el botón
- ✅ Solo se crea **UN** pagador (no duplicado)
- ✅ Mensaje de éxito aparece una sola vez
- ✅ Lista muestra solo un registro de "Laura Martínez Sánchez"

**Selectores Playwright:**
```javascript
// Verificar que botón se deshabilita
await page.click('button:has-text("Añadir")');
await expect(page.locator('.ant-modal-confirm-btns button.ant-btn-primary')).toBeDisabled();

// Verificar que solo hay un registro
const payerItems = await page.locator('.ant-list-item').count();
expect(payerItems).toBe(1);
```

---

## TEST-PAYER-009: Validación de campos obligatorios en modal de pagador

**Objetivo:** Verificar validaciones del formulario de pagador

**Precondiciones:**
- Inquilino con habitación asignada

**Pasos:**
1. Click en "Añadir Pagador"
2. Seleccionar "Persona Física"
3. **NO rellenar** ningún campo
4. Click en "Añadir"

**Resultado esperado:**
- ❌ Formulario NO se envía
- ❌ Muestra errores de validación:
  - "El nombre es obligatorio"
  - "El primer apellido es obligatorio"
- ✅ Modal permanece abierto
- ✅ Campos con error tienen borde rojo

---

## TEST-PAYER-010: Cambiar tipo de pagador limpia campos

**Objetivo:** Verificar que al cambiar de "Persona Física" a "Empresa" se limpian los campos

**Precondiciones:**
- Inquilino con habitación asignada

**Pasos:**
1. Click en "Añadir Pagador"
2. Seleccionar "Persona Física"
3. Rellenar:
   - Nombre: "Pedro"
   - Primer Apellido: "López"
4. Cambiar a "Empresa"
5. Verificar campos

**Resultado esperado:**
- ✅ Campos "Nombre", "Primer Apellido", "Segundo Apellido" desaparecen
- ✅ Aparece campo "Nombre de la Empresa"
- ✅ Campo "Observaciones" se mantiene
- ✅ Valores anteriores no se transfieren

---

## TEST-PAYER-011: Editar pagador existente

**Objetivo:** Verificar que se puede editar un pagador existente

**Precondiciones:**
- Inquilino con habitación y pagador "Carlos González Pérez" registrado

**Pasos:**
1. En lista de pagadores, click en botón "Editar" del pagador
2. Verificar que modal se abre con datos pre-cargados
3. Cambiar "Observaciones" a: "Padre y avalista"
4. Click en "Guardar"

**Resultado esperado:**
- ✅ Modal se abre con título "Editar Pagador"
- ✅ Campos pre-cargados con datos actuales
- ✅ Cambio se guarda correctamente
- ✅ Mensaje: "Pagador actualizado correctamente"
- ✅ Lista se actualiza mostrando nueva observación

---

## TEST-PAYER-012: Desactivar/Activar pagador

**Objetivo:** Verificar toggle de estado del pagador

**Precondiciones:**
- Inquilino con habitación y pagador activo

**Pasos:**
1. En lista de pagadores, click en "Desactivar"
2. Esperar confirmación
3. Verificar cambio de estado
4. Click en "Activar"
5. Verificar cambio de estado

**Resultado esperado:**
- ✅ Al desactivar:
  - Mensaje: "Pagador desactivado correctamente"
  - Tag cambia de verde "Activo" a gris "Inactivo"
  - Botón cambia a "Activar"
- ✅ Al activar:
  - Mensaje: "Pagador activado correctamente"
  - Tag cambia a verde "Activo"
  - Botón cambia a "Desactivar"

---

## Resumen de Validaciones

| Escenario | Habitación Asignada | Botón "Añadir Pagador" | Alert Mostrado |
|-----------|---------------------|------------------------|----------------|
| Crear inquilino sin habitación | ❌ No | ❌ Oculto | ⚠️ Warning "Sin habitación" |
| Crear inquilino con habitación | ✅ Sí | ✅ Visible | ℹ️ Info "Gestión de Pagadores" |
| Editar inquilino sin habitación | ❌ No | ❌ Oculto | ⚠️ Warning "Habitación requerida" |
| Editar inquilino con habitación | ✅ Sí | ✅ Visible | ❌ Ninguno |
| Después de checkout | ❌ No | ❌ Oculto | ⚠️ Warning "Habitación requerida" |

---

## Comandos para Claude (Playwright)

```bash
# Test individual
npx playwright test tests/e2e/specs/payers-room-validation.spec.js -g "TEST-PAYER-001"

# Todos los tests de validación de pagadores
npx playwright test tests/e2e/specs/payers-room-validation.spec.js

# Con UI mode para debugging
npx playwright test tests/e2e/specs/payers-room-validation.spec.js --ui

# Solo tests de creación
npx playwright test tests/e2e/specs/payers-room-validation.spec.js -g "Crear inquilino"

# Solo tests de edición
npx playwright test tests/e2e/specs/payers-room-validation.spec.js -g "Editar inquilino"
```

---

## Selectores Importantes para Claude

```javascript
// Componente PayersList
'button:has-text("Añadir Pagador")'           // Botón añadir
'.ant-alert-warning'                           // Alert de warning
'text=Habitación requerida'                    // Mensaje de error
'text=Sin habitación asignada'                 // Mensaje en TenantCreate

// Modal de pagador
'.ant-modal-title:has-text("Añadir Pagador")' // Título modal
'input[id*="first_name"]'                      // Campo nombre
'input[id*="last_name1"]'                      // Campo apellido 1
'input[id*="legal_name"]'                      // Campo empresa
'button:has-text("Añadir")'                    // Botón submit

// Lista de pagadores
'.ant-list-item'                               // Items de lista
'.ant-tag:has-text("Activo")'                 // Tag de estado
'button:has-text("Editar")'                    // Botón editar
'button:has-text("Desactivar")'               // Botón desactivar

// Sección habitación
'text=Habitación actual'                       // Título sección
'text=Sin habitación asignada'                 // Estado sin habitación
```

---

## Notas para Implementación

1. **Setup necesario:**
   - Crear alojamientos con habitaciones libres
   - Crear inquilinos de prueba con y sin habitación
   - Limpiar datos después de cada test

2. **Validaciones críticas:**
   - Verificar que `hasRoomAssignment` prop se pasa correctamente
   - Comprobar renderizado condicional del Alert
   - Verificar que botón "Añadir Pagador" está oculto cuando no hay habitación
   - Validar que `loadPayers()` no se ejecuta si `hasRoomAssignment = false`

3. **Edge cases a probar:**
   - Inquilino con habitación → checkout → ya no puede añadir pagadores
   - Inquilino sin habitación → asignar habitación → ahora sí puede añadir pagadores
   - Doble submit del formulario de pagador
   - Cambio de tipo de pagador (Persona Física ↔ Empresa)

4. **Assertions importantes:**
   ```javascript
   // Verificar que componente no se renderiza
   await expect(page.locator('button:has-text("Añadir Pagador")')).toBeHidden();
   
   // Verificar Alert warning
   await expect(page.locator('.ant-alert-warning')).toBeVisible();
   
   // Verificar que no hay duplicados
   const count = await page.locator('.ant-list-item').count();
   expect(count).toBe(1);
   ```
