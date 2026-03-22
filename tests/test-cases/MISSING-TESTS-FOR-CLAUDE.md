# Tests Faltantes para Implementación de Claude

## 📋 Resumen

Este documento lista los tests E2E que faltan por implementar en Playwright para las funcionalidades desarrolladas recientemente.

---

## 🎯 Tests de Validación de Asignación de Habitación (TenantCreate)

**Archivo de casos:** `TENANT-CREATE-ROOM-ASSIGNMENT-VALIDATION.md`  
**Spec sugerido:** `tests/e2e/specs/tenant-create-room-validation.spec.js`

### Tests a Implementar:

- [x] **TEST-001:** Crear inquilino SIN asignación (flujo básico) ✅ Documentado
- [x] **TEST-002:** Validación de campos obligatorios al seleccionar alojamiento ✅ Documentado
- [x] **TEST-003:** Crear inquilino CON asignación completa ✅ Documentado
- [x] **TEST-004:** Visibilidad del botón "Limpiar Asignación" ✅ Documentado
- [x] **TEST-005:** Funcionalidad completa del botón "Limpiar Asignación" ✅ Documentado
- [x] **TEST-006:** Limpiar con checkbox "Pago hasta fin de mes" marcado ✅ Documentado
- [x] **TEST-007:** Deseleccionar alojamiento usando la X del Select ✅ Documentado
- [x] **TEST-008:** Habitación obligatoria con alojamiento seleccionado ✅ Documentado
- [x] **TEST-009:** Fecha obligatoria con alojamiento seleccionado ✅ Documentado
- [x] **TEST-010:** Fianza obligatoria con alojamiento seleccionado ✅ Documentado
- [x] **TEST-011:** Importe hasta fin de mes obligatorio cuando checkbox marcado ✅ Documentado
- [x] **TEST-012:** Cambiar de alojamiento limpia habitación seleccionada ✅ Documentado

**Estado:** ❌ **PENDIENTE DE IMPLEMENTAR EN PLAYWRIGHT**

---

## 🏠 Tests de Validación de Habitación Requerida para Pagadores

**Archivo de casos:** `PAYERS-ROOM-REQUIREMENT-VALIDATION.md`  
**Spec sugerido:** `tests/e2e/specs/payers-room-validation.spec.js`

### Tests a Implementar:

#### Grupo 1: Creación de Inquilino
- [x] **TEST-PAYER-001:** Crear inquilino SIN habitación - No debe permitir añadir pagadores ✅ Documentado
- [x] **TEST-PAYER-002:** Crear inquilino CON habitación - Debe permitir añadir pagadores ✅ Documentado
- [x] **TEST-PAYER-003:** Añadir pagador después de crear inquilino con habitación ✅ Documentado

#### Grupo 2: Edición de Inquilino
- [x] **TEST-PAYER-004:** Editar inquilino SIN habitación - No debe permitir añadir pagadores ✅ Documentado
- [x] **TEST-PAYER-005:** Editar inquilino CON habitación - Debe permitir añadir pagadores ✅ Documentado
- [x] **TEST-PAYER-006:** Asignar habitación y luego añadir pagador ✅ Documentado
- [x] **TEST-PAYER-007:** Checkout de habitación deshabilita gestión de pagadores ✅ Documentado

#### Grupo 3: Funcionalidad de Pagadores
- [x] **TEST-PAYER-008:** Prevenir doble submit al añadir pagador ✅ Documentado
- [x] **TEST-PAYER-009:** Validación de campos obligatorios en modal ✅ Documentado
- [x] **TEST-PAYER-010:** Cambiar tipo de pagador limpia campos ✅ Documentado
- [x] **TEST-PAYER-011:** Editar pagador existente ✅ Documentado
- [x] **TEST-PAYER-012:** Desactivar/Activar pagador ✅ Documentado

**Estado:** ❌ **PENDIENTE DE IMPLEMENTAR EN PLAYWRIGHT**

---

## 🔄 Tests de Flujo Completo de Pagadores (Nuevos)

**Spec sugerido:** `tests/e2e/specs/payers-complete-flow.spec.js`

### Tests Adicionales Recomendados:

#### TEST-PAYER-013: Flujo completo - Crear inquilino con habitación y añadir múltiples pagadores
**Objetivo:** Validar que se pueden añadir varios pagadores a un inquilino

**Pasos:**
1. Crear inquilino con habitación asignada
2. Añadir pagador tipo "Persona Física" (Padre)
3. Añadir pagador tipo "Persona Física" (Madre)
4. Añadir pagador tipo "Empresa" (Empleadora)
5. Verificar que los 3 aparecen en la lista

**Resultado esperado:**
- ✅ 3 pagadores creados correctamente
- ✅ Cada uno con su tipo correcto
- ✅ Todos activos por defecto

---

#### TEST-PAYER-014: Validar que pagadores persisten después de checkout y reasignación
**Objetivo:** Verificar que los pagadores no se eliminan al hacer checkout

**Pasos:**
1. Inquilino con habitación y 2 pagadores
2. Hacer checkout de la habitación
3. Verificar que pagadores siguen en la lista (solo lectura)
4. Asignar nueva habitación
5. Verificar que se puede añadir más pagadores
6. Verificar que los pagadores anteriores siguen ahí

**Resultado esperado:**
- ✅ Pagadores persisten después de checkout
- ✅ No se pueden añadir nuevos sin habitación
- ✅ Al reasignar habitación, se puede añadir más pagadores
- ✅ Todos los pagadores (antiguos y nuevos) visibles

---

#### TEST-PAYER-015: Validar límite de caracteres en campos de texto
**Objetivo:** Verificar que no hay errores con textos largos

**Pasos:**
1. Crear pagador con nombres muy largos (>100 caracteres)
2. Crear pagador con observaciones muy largas (>500 caracteres)
3. Verificar que se guardan correctamente
4. Verificar que se muestran correctamente en la lista

**Resultado esperado:**
- ✅ Campos aceptan textos largos
- ✅ No hay errores de base de datos
- ✅ UI muestra correctamente (con truncado si es necesario)

---

#### TEST-PAYER-016: Validar búsqueda y filtrado de pagadores (si existe)
**Objetivo:** Si hay funcionalidad de búsqueda, validarla

**Pasos:**
1. Crear inquilino con 5+ pagadores
2. Buscar por nombre
3. Filtrar por tipo (Persona Física / Empresa)
4. Filtrar por estado (Activo / Inactivo)

**Resultado esperado:**
- ✅ Búsqueda funciona correctamente
- ✅ Filtros se aplican correctamente
- ✅ Resultados son precisos

**Estado:** ⚠️ **VERIFICAR SI EXISTE ESTA FUNCIONALIDAD**

---

## 📊 Tests de Integración de Base de Datos

**Spec sugerido:** `tests/e2e/specs/database-integration.spec.js`

### Tests Recomendados:

#### TEST-DB-001: Verificar que payer_rental tiene estructura correcta
**Objetivo:** Validar que la tabla en DEV coincide con el baseline

**Pasos:**
1. Ejecutar query para obtener columnas de `payer_rental`
2. Verificar que existen: `payer_type`, `first_name`, `last_name1`, `last_name2`, `legal_name`, `notes`
3. Verificar que NO existe: `entity_id`
4. Verificar constraints

**Resultado esperado:**
- ✅ Estructura coincide con baseline actualizado
- ✅ Campos directos presentes
- ✅ Sin referencias a `entity_id`

---

#### TEST-DB-002: Verificar que profiles tiene campos de inquilino
**Objetivo:** Validar que la migración se aplicó correctamente

**Pasos:**
1. Ejecutar query para obtener columnas de `profiles`
2. Verificar campos: `first_name`, `last_name1`, `last_name2`, `nickname`, `phone`, `document_id`, `gender`
3. Verificar constraint de `onboarding_status`

**Resultado esperado:**
- ✅ Todos los campos de inquilino presentes
- ✅ Constraint incluye: 'invited', 'pending_checkout', 'inactive'

---

## 🎨 Tests de UI/UX

**Spec sugerido:** `tests/e2e/specs/ui-ux-validation.spec.js`

### Tests Recomendados:

#### TEST-UI-001: Validar estilos y responsive de PayersList
**Objetivo:** Verificar que el componente se ve bien en diferentes tamaños

**Pasos:**
1. Abrir lista de pagadores en desktop (1920x1080)
2. Abrir en tablet (768x1024)
3. Abrir en mobile (375x667)
4. Verificar que todos los elementos son accesibles

**Resultado esperado:**
- ✅ Responsive funciona correctamente
- ✅ Botones accesibles en todos los tamaños
- ✅ Texto legible
- ✅ No hay overflow horizontal

---

#### TEST-UI-002: Validar accesibilidad (a11y) de formularios
**Objetivo:** Verificar que los formularios son accesibles

**Pasos:**
1. Navegar con teclado (Tab, Enter, Escape)
2. Verificar labels y aria-labels
3. Verificar mensajes de error son anunciados
4. Verificar focus visible

**Resultado esperado:**
- ✅ Navegación por teclado funciona
- ✅ Screen readers pueden leer todo
- ✅ Focus visible en todos los elementos
- ✅ Cumple WCAG 2.1 AA

---

## 🔒 Tests de Seguridad y Permisos

**Spec sugerido:** `tests/e2e/specs/security-permissions.spec.js`

### Tests Recomendados:

#### TEST-SEC-001: Validar que solo admin puede gestionar pagadores
**Objetivo:** Verificar permisos de rol

**Pasos:**
1. Login como admin → puede ver y editar pagadores
2. Login como viewer → NO puede editar pagadores
3. Login como inquilino → NO puede ver sección de pagadores

**Resultado esperado:**
- ✅ Admin: acceso completo
- ✅ Viewer: solo lectura
- ✅ Lodger: sin acceso

**Estado:** ⚠️ **VERIFICAR IMPLEMENTACIÓN DE PERMISOS**

---

#### TEST-SEC-002: Validar que no se pueden inyectar scripts en campos de texto
**Objetivo:** Prevenir XSS

**Pasos:**
1. Intentar crear pagador con nombre: `<script>alert('XSS')</script>`
2. Intentar crear con observaciones: `<img src=x onerror=alert('XSS')>`
3. Verificar que se sanitiza correctamente

**Resultado esperado:**
- ✅ Scripts no se ejecutan
- ✅ Texto se escapa correctamente
- ✅ No hay vulnerabilidades XSS

---

## 📈 Tests de Rendimiento

**Spec sugerido:** `tests/e2e/specs/performance.spec.js`

### Tests Recomendados:

#### TEST-PERF-001: Validar tiempo de carga de lista de pagadores
**Objetivo:** Verificar que la carga es rápida

**Pasos:**
1. Crear inquilino con 50 pagadores
2. Medir tiempo de carga de la lista
3. Verificar que es < 2 segundos

**Resultado esperado:**
- ✅ Carga en < 2 segundos
- ✅ No hay lag en la UI
- ✅ Paginación funciona (si existe)

---

## 📝 Resumen de Prioridades

### 🔴 Alta Prioridad (Implementar Primero)
1. ✅ **TENANT-CREATE-ROOM-ASSIGNMENT-VALIDATION** (12 tests) - Documentado
2. ✅ **PAYERS-ROOM-REQUIREMENT-VALIDATION** (12 tests) - Documentado
3. ❌ **TEST-PAYER-013:** Flujo completo múltiples pagadores - **FALTA DOCUMENTAR**
4. ❌ **TEST-PAYER-014:** Persistencia después de checkout - **FALTA DOCUMENTAR**

### 🟡 Media Prioridad
5. ❌ **TEST-DB-001:** Validar estructura de payer_rental - **FALTA DOCUMENTAR**
6. ❌ **TEST-DB-002:** Validar campos de inquilino en profiles - **FALTA DOCUMENTAR**
7. ❌ **TEST-PAYER-015:** Límite de caracteres - **FALTA DOCUMENTAR**

### 🟢 Baja Prioridad (Opcional)
8. ❌ **TEST-UI-001:** Responsive - **FALTA DOCUMENTAR**
9. ❌ **TEST-UI-002:** Accesibilidad - **FALTA DOCUMENTAR**
10. ❌ **TEST-SEC-001:** Permisos - **FALTA DOCUMENTAR**
11. ❌ **TEST-SEC-002:** XSS - **FALTA DOCUMENTAR**
12. ❌ **TEST-PERF-001:** Rendimiento - **FALTA DOCUMENTAR**

---

## 🚀 Comandos para Claude

```bash
# Ejecutar todos los tests de validación de asignación
npx playwright test tests/e2e/specs/tenant-create-room-validation.spec.js

# Ejecutar todos los tests de pagadores
npx playwright test tests/e2e/specs/payers-room-validation.spec.js

# Ejecutar tests de flujo completo
npx playwright test tests/e2e/specs/payers-complete-flow.spec.js

# Ejecutar tests de base de datos
npx playwright test tests/e2e/specs/database-integration.spec.js

# Ejecutar todos los tests E2E
npx playwright test

# Con UI mode para debugging
npx playwright test --ui

# Generar reporte
npx playwright test --reporter=html
```

---

## 📚 Archivos de Referencia

- `tests/test-cases/TENANT-CREATE-ROOM-ASSIGNMENT-VALIDATION.md` - 12 casos documentados
- `tests/test-cases/PAYERS-ROOM-REQUIREMENT-VALIDATION.md` - 12 casos documentados
- `src/pages/v2/admin/tenants/TenantCreate.jsx` - Componente a testear
- `src/pages/v2/admin/tenants/TenantEdit.jsx` - Componente a testear
- `src/pages/v2/admin/tenants/components/PayersList.jsx` - Componente a testear
- `src/services/payers.service.js` - Servicio de pagadores

---

## ✅ Checklist para Claude

- [ ] Implementar TEST-001 a TEST-012 (validación asignación)
- [ ] Implementar TEST-PAYER-001 a TEST-PAYER-012 (validación pagadores)
- [ ] Implementar TEST-PAYER-013 (múltiples pagadores)
- [ ] Implementar TEST-PAYER-014 (persistencia checkout)
- [ ] Implementar TEST-DB-001 (estructura payer_rental)
- [ ] Implementar TEST-DB-002 (campos profiles)
- [ ] Ejecutar todos los tests y verificar que pasan
- [ ] Generar reporte HTML
- [ ] Documentar tests fallidos (si los hay)
- [ ] Crear issues para bugs encontrados

---

**Última actualización:** 2026-03-22  
**Total de tests documentados:** 24  
**Total de tests pendientes de implementar:** 30+
