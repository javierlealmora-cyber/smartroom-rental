# Test Cases: Check-Out de Inquilinos y Estados Dinámicos

## Descripción General
Este documento define los casos de prueba para validar la funcionalidad de check-out de inquilinos y el cálculo dinámico de estados basado en el histórico de asignaciones.

## Funcionalidades a Validar

### 1. Estados Dinámicos de Inquilinos
### 2. Badge de Estado en Tarjetas
### 3. Modal de Check-Out
### 4. Consumos Moqueados
### 5. Guardado de Check-Out

---

## 1. ESTADOS DINÁMICOS DE INQUILINOS

### Test 1.1: Estado "Invitado" (invited)
**Precondiciones:**
- Inquilino existe en la base de datos
- NO tiene asignaciones en `lodger_room_assignments`

**Pasos:**
1. Cargar lista de inquilinos
2. Buscar inquilino sin asignaciones
3. Calcular estado con `getLodgerStatus(lodger)`

**Resultado Esperado:**
- Estado retornado: `'invited'`
- Badge muestra: "Invitado" (azul)

---

### Test 1.2: Estado "Activo" (active)
**Precondiciones:**
- Inquilino tiene asignación en `lodger_room_assignments`
- `move_in_date` está presente
- `move_out_date` es NULL

**Pasos:**
1. Cargar inquilino con asignación activa
2. Verificar que `move_out_date` es NULL
3. Calcular estado con `getLodgerStatus(lodger)`

**Resultado Esperado:**
- Estado retornado: `'active'`
- Badge muestra: "Activo" (verde)

**Datos de Prueba:**
```javascript
{
  id: "lodger-1",
  full_name: "Andrea Ramirez",
  assignments: [
    {
      id: "assign-1",
      move_in_date: "2025-03-20",
      move_out_date: null,
      room_id: "room-1"
    }
  ]
}
```

---

### Test 1.3: Estado "Pendiente de Baja" (pending_checkout)
**Precondiciones:**
- Inquilino tiene asignación
- `move_in_date` está presente
- `move_out_date` es una fecha FUTURA

**Pasos:**
1. Cargar inquilino con check-out programado
2. Verificar que `move_out_date` > fecha actual
3. Calcular estado con `getLodgerStatus(lodger)`

**Resultado Esperado:**
- Estado retornado: `'pending_checkout'`
- Badge muestra: "Pendiente baja" (naranja)

**Datos de Prueba:**
```javascript
{
  id: "lodger-2",
  full_name: "Felipe Morillo",
  assignments: [
    {
      id: "assign-2",
      move_in_date: "2025-01-15",
      move_out_date: "2026-06-30", // Fecha futura
      room_id: "room-2"
    }
  ]
}
```

---

### Test 1.4: Estado "Inactivo" (inactive)
**Precondiciones:**
- Inquilino tiene asignación
- `move_in_date` está presente
- `move_out_date` es una fecha PASADA o HOY

**Pasos:**
1. Cargar inquilino con check-out vencido
2. Verificar que `move_out_date` <= fecha actual
3. Calcular estado con `getLodgerStatus(lodger)`

**Resultado Esperado:**
- Estado retornado: `'inactive'`
- Badge muestra: "Inactivo" (gris)

**Datos de Prueba:**
```javascript
{
  id: "lodger-3",
  full_name: "Juan Pérez",
  assignments: [
    {
      id: "assign-3",
      move_in_date: "2024-01-01",
      move_out_date: "2025-12-31", // Fecha pasada
      room_id: "room-3"
    }
  ]
}
```

---

### Test 1.5: Múltiples Asignaciones - Usar la Más Reciente
**Precondiciones:**
- Inquilino tiene MÚLTIPLES asignaciones
- Asignaciones tienen diferentes fechas de check-in

**Pasos:**
1. Cargar inquilino con histórico de asignaciones
2. Verificar que hay múltiples registros
3. Calcular estado con `getLodgerStatus(lodger)`
4. Verificar que se usa la asignación con `move_in_date` más reciente

**Resultado Esperado:**
- Se ordena por `move_in_date DESC`
- Se toma el primer registro (más reciente)
- Estado se calcula basándose en esa asignación

**Datos de Prueba:**
```javascript
{
  id: "lodger-4",
  full_name: "María García",
  assignments: [
    {
      id: "assign-4a",
      move_in_date: "2024-01-01",
      move_out_date: "2024-06-30",
      room_id: "room-4"
    },
    {
      id: "assign-4b",
      move_in_date: "2024-07-01",
      move_out_date: "2025-01-15",
      room_id: "room-5"
    },
    {
      id: "assign-4c",
      move_in_date: "2025-02-01", // MÁS RECIENTE
      move_out_date: null,
      room_id: "room-6"
    }
  ]
}
// Resultado esperado: 'active' (basado en assign-4c)
```

---

## 2. BADGE DE ESTADO EN TARJETAS

### Test 2.1: Badge en Tarjeta de Inquilino (TenantsList)
**Precondiciones:**
- Vista de lista de inquilinos cargada
- Inquilino tiene estado calculado

**Pasos:**
1. Navegar a `/v2/admin/inquilinos`
2. Localizar tarjeta de inquilino
3. Verificar presencia de badge

**Resultado Esperado:**
- Badge aparece debajo de la fecha de check-in
- Color correcto según estado:
  - Verde para "Activo"
  - Naranja para "Pendiente baja"
  - Gris para "Inactivo"
  - Azul para "Invitado"

**Ubicación del Badge:**
```
Andrea Ramirez Collado
andrea@gmail.com
658623589
Check-in: 24/3/2026
[Activo] ← Badge aquí
```

---

### Test 2.2: Badge en Tarjeta de Habitación (AccommodationDetail)
**Precondiciones:**
- Vista de alojamiento cargada
- Habitación tiene inquilino asignado

**Pasos:**
1. Navegar a `/v2/admin/alojamientos/{id}`
2. Ir al tab "Habitaciones"
3. Localizar habitación ocupada
4. Verificar badge junto al nombre del inquilino

**Resultado Esperado:**
- Badge aparece a la derecha del nombre del inquilino
- Debajo de la imagen de la habitación

**Ubicación del Badge:**
```
Andrea Ramirez Collado    [Activo] ← Badge aquí
Entrada 24/03/2026
```

---

## 3. MODAL DE CHECK-OUT

### Test 3.1: Abrir Modal desde Tarjeta de Inquilino
**Precondiciones:**
- Inquilino con estado "Activo"
- Vista de lista de inquilinos

**Pasos:**
1. Localizar inquilino activo
2. Click en botón rojo de check-out (icono LogoutOutlined)
3. Verificar apertura del modal

**Resultado Esperado:**
- Modal se abre
- Título: "Check-Out — {nombre del inquilino}"
- Muestra información de la habitación actual
- Formulario visible con todos los campos

---

### Test 3.2: Campos del Modal de Check-Out
**Precondiciones:**
- Modal de check-out abierto

**Pasos:**
1. Verificar presencia de todos los campos

**Resultado Esperado:**
Campos presentes:
- ✅ Info de habitación (readonly)
- ✅ Fecha de entrada (readonly)
- ✅ **Fecha de Check-Out** (DatePicker, obligatorio)
- ✅ Fianza pagada (readonly, calculado)
- ✅ Consumos pendientes (readonly, moqueados):
  - Agua
  - Electricidad
  - Gas
  - Subtotal
- ✅ Total a liquidar (readonly, calculado)
- ✅ Observaciones (TextArea, opcional, max 500 caracteres)
- ✅ Aviso informativo
- ✅ Botones: Cancelar, Confirmar Check-Out

---

### Test 3.3: Validación de Fecha de Check-Out
**Precondiciones:**
- Modal de check-out abierto
- Inquilino con `move_in_date` = "2025-03-20"

**Pasos:**
1. Intentar seleccionar fecha anterior a check-in
2. Verificar mensaje de error

**Resultado Esperado:**
- Error: "La fecha no puede ser anterior a la entrada"
- No permite enviar el formulario

**Datos de Prueba:**
```
move_in_date: 2025-03-20
checkout_date_invalida: 2025-03-15 ❌
checkout_date_valida: 2025-06-30 ✅
```

---

### Test 3.4: Cálculo Automático de Consumos al Cambiar Fecha
**Precondiciones:**
- Modal de check-out abierto
- `move_in_date` = "2025-01-01"

**Pasos:**
1. Seleccionar fecha de check-out: "2025-04-01"
2. Verificar que aparecen consumos moqueados
3. Cambiar fecha a "2025-07-01"
4. Verificar que consumos se recalculan

**Resultado Esperado:**
- Consumos se calculan automáticamente al cambiar fecha
- Valores cambian según días de estancia
- Fórmula: `meses = Math.ceil(días / 30)`
- Consumos base por mes:
  - Agua: 15-25€/mes
  - Electricidad: 25-45€/mes
  - Gas: 10-25€/mes

**Ejemplo:**
```
move_in_date: 2025-01-01
checkout_date: 2025-04-01
días: 90
meses: 3

Consumos aproximados:
- Agua: 45-75€
- Electricidad: 75-135€
- Gas: 30-75€
```

---

### Test 3.5: Cálculo de Total a Devolver
**Precondiciones:**
- Modal de check-out abierto
- Consumos moqueados generados

**Pasos:**
1. Verificar fianza pagada
2. Verificar subtotal de consumos
3. Verificar total a devolver

**Resultado Esperado:**
- Fórmula: `Total = Fianza - Consumos`
- Si Total >= 0: Fondo verde, texto verde
- Si Total < 0: Fondo rojo, texto rojo

**Datos de Prueba:**
```javascript
// Caso 1: Total positivo
fianza: 1080.00€
consumos: 155.50€
total: 924.50€ ✅ (verde)

// Caso 2: Total negativo
fianza: 500.00€
consumos: 650.00€
total: -150.00€ ❌ (rojo)
```

---

### Test 3.6: Aviso según Fecha Seleccionada
**Precondiciones:**
- Modal de check-out abierto

**Pasos:**
1. Seleccionar fecha = HOY
2. Verificar mensaje de aviso
3. Seleccionar fecha FUTURA
4. Verificar cambio de mensaje

**Resultado Esperado:**
- Si fecha = hoy: "La fecha es hoy, se dará de baja inmediatamente"
- Si fecha > hoy: "La fecha es futura, quedará pendiente de baja"
- Tipo de alerta: `info`

---

## 4. CONSUMOS MOQUEADOS

### Test 4.1: Generación de Consumos Moqueados
**Precondiciones:**
- Función `generateMockedConsumptions` disponible

**Pasos:**
1. Llamar función con fechas de prueba
2. Verificar estructura del resultado

**Resultado Esperado:**
```javascript
const result = generateMockedConsumptions("2025-01-01", "2025-04-01");

// Estructura esperada:
{
  water: 45.23,        // Number, 2 decimales
  electricity: 78.56,  // Number, 2 decimales
  gas: 32.18          // Number, 2 decimales
}

// Validaciones:
- water >= 45 && water <= 75 (3 meses * 15-25€)
- electricity >= 75 && electricity <= 135 (3 meses * 25-45€)
- gas >= 30 && gas <= 75 (3 meses * 10-25€)
```

---

### Test 4.2: Consumos con Diferentes Períodos
**Precondiciones:**
- Función `generateMockedConsumptions` disponible

**Pasos:**
1. Probar con 1 mes de estancia
2. Probar con 6 meses de estancia
3. Probar con 1 año de estancia

**Resultado Esperado:**
```javascript
// 1 mes (30 días)
generateMockedConsumptions("2025-01-01", "2025-01-31")
// water: 15-25€, electricity: 25-45€, gas: 10-25€

// 6 meses (180 días)
generateMockedConsumptions("2025-01-01", "2025-07-01")
// water: 90-150€, electricity: 150-270€, gas: 60-150€

// 12 meses (365 días)
generateMockedConsumptions("2025-01-01", "2026-01-01")
// water: 180-300€, electricity: 300-540€, gas: 120-300€
```

---

## 5. GUARDADO DE CHECK-OUT

### Test 5.1: Guardar Check-Out con Fecha Actual
**Precondiciones:**
- Modal de check-out abierto
- Inquilino activo con asignación

**Pasos:**
1. Seleccionar fecha de check-out = HOY
2. Añadir observaciones: "Habitación en buen estado"
3. Click en "Confirmar Check-Out"
4. Verificar guardado en base de datos

**Resultado Esperado:**
- UPDATE en `lodger_room_assignments`:
  ```sql
  UPDATE lodger_room_assignments
  SET 
    move_out_date = '2026-03-25',
    checkout_notes = 'Habitación en buen estado'
  WHERE id = {assignment_id}
  ```
- Mensaje de éxito: "Check-out realizado. El inquilino ha sido dado de baja."
- Modal se cierra
- Lista se recarga
- Estado del inquilino cambia a "Inactivo"

---

### Test 5.2: Guardar Check-Out con Fecha Futura
**Precondiciones:**
- Modal de check-out abierto

**Pasos:**
1. Seleccionar fecha de check-out = FUTURO (ej: 30/06/2026)
2. Añadir observaciones
3. Click en "Confirmar Check-Out"

**Resultado Esperado:**
- UPDATE en `lodger_room_assignments`:
  ```sql
  UPDATE lodger_room_assignments
  SET 
    move_out_date = '2026-06-30',
    checkout_notes = '...'
  WHERE id = {assignment_id}
  ```
- Mensaje de éxito: "Check-out programado para 30/06/2026"
- Estado del inquilino cambia a "Pendiente baja"

---

### Test 5.3: Cancelar Check-Out
**Precondiciones:**
- Modal de check-out abierto
- Formulario parcialmente completado

**Pasos:**
1. Llenar algunos campos
2. Click en "Cancelar"

**Resultado Esperado:**
- Modal se cierra
- NO se guarda nada en base de datos
- Formulario se resetea
- Estado de consumos moqueados se limpia

---

### Test 5.4: Cerrar Modal con X
**Precondiciones:**
- Modal de check-out abierto

**Pasos:**
1. Click en X (cerrar) del modal

**Resultado Esperado:**
- Mismo comportamiento que "Cancelar"
- Modal se cierra sin guardar

---

## 6. INTEGRACIÓN CON VISTAS

### Test 6.1: Actualización de Estado Después de Check-Out
**Precondiciones:**
- Inquilino activo visible en lista

**Pasos:**
1. Hacer check-out con fecha = HOY
2. Esperar recarga de datos
3. Verificar cambio de badge

**Resultado Esperado:**
- Badge cambia de "Activo" (verde) a "Inactivo" (gris)
- Botón de check-out desaparece (solo para activos)

---

### Test 6.2: Botón de Check-Out Solo para Activos
**Precondiciones:**
- Lista de inquilinos con diferentes estados

**Pasos:**
1. Localizar inquilino "Activo"
2. Verificar presencia de botón de check-out
3. Localizar inquilino "Inactivo"
4. Verificar ausencia de botón de check-out

**Resultado Esperado:**
- Botón visible solo si `getLodgerStatus(lodger) === 'active'`
- Botón tiene clase `danger` (rojo)
- Icono: `LogoutOutlined`

---

### Test 6.3: Carga de Todas las Asignaciones
**Precondiciones:**
- Vista de lista de inquilinos

**Pasos:**
1. Verificar query de carga de datos
2. Comprobar que se cargan TODAS las asignaciones

**Resultado Esperado:**
```javascript
// Query debe incluir:
const { data: allAssignments } = await supabase
  .from("lodger_room_assignments")
  .select("id, lodger_id, move_in_date, move_out_date, room_id, accommodation_id, deposit_amount")
  .in("lodger_id", lodgerIds);

// NO debe filtrar por status='active'
// Debe traer TODO el histórico
```

---

## 7. CASOS EDGE

### Test 7.1: Inquilino Sin Asignación Activa Pero Con Histórico
**Precondiciones:**
- Inquilino tiene asignaciones pasadas
- Todas con `move_out_date` en el pasado

**Pasos:**
1. Cargar inquilino
2. Calcular estado

**Resultado Esperado:**
- Estado: "Inactivo"
- NO debe mostrar botón de check-out

---

### Test 7.2: Check-Out Sin Observaciones
**Precondiciones:**
- Modal de check-out abierto

**Pasos:**
1. Seleccionar fecha
2. Dejar observaciones vacío
3. Confirmar

**Resultado Esperado:**
- Se guarda correctamente
- `checkout_notes` = NULL en base de datos

---

### Test 7.3: Fianza en 0 o NULL
**Precondiciones:**
- Asignación sin fianza (`deposit_amount` = 0 o NULL)

**Pasos:**
1. Abrir modal de check-out
2. Verificar cálculos

**Resultado Esperado:**
- Fianza pagada: 0,00 €
- Total a devolver: -{consumos} (negativo)
- Fondo rojo

---

## 8. FORMATO Y VISUALIZACIÓN

### Test 8.1: Formato de Moneda
**Precondiciones:**
- Modal de check-out con consumos

**Pasos:**
1. Verificar formato de todos los importes

**Resultado Esperado:**
- Formato: `1.234,56 €`
- Separador de miles: punto
- Separador de decimales: coma
- Símbolo de euro al final

---

### Test 8.2: Formato de Fechas
**Precondiciones:**
- Tarjetas de inquilino y modal de check-out

**Pasos:**
1. Verificar formato de fechas

**Resultado Esperado:**
- Formato: `DD/MM/YYYY`
- Ejemplo: `24/03/2026`

---

## RESUMEN DE VALIDACIONES

### Funciones Clave a Implementar:
1. ✅ `getLodgerStatus(lodger)` - Calcula estado dinámico
2. ✅ `getLodgerStatusColor(status)` - Retorna color del Tag
3. ✅ `getLodgerStatusLabel(status)` - Retorna texto del Tag
4. ✅ `generateMockedConsumptions(moveInDate, checkOutDate)` - Genera consumos
5. ✅ `formatCurrency(amount)` - Formatea moneda

### Componentes a Modificar:
1. ✅ `TenantsList.jsx` - Badge + botón + modal
2. ✅ `AccommodationDetail.jsx` - Badge en tarjeta de habitación

### Base de Datos:
- Tabla: `lodger_room_assignments`
- Campos a actualizar:
  - `move_out_date` (DATE)
  - `checkout_notes` (TEXT, nullable)

### Estados Posibles:
- `invited` - Sin asignaciones
- `active` - Check-in sin check-out
- `pending_checkout` - Check-out futuro
- `inactive` - Check-out pasado/hoy
