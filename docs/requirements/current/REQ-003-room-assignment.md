# REQ-003: Asignación de Habitaciones e Inquilinos

**Estado:** ✅ Implementado y Consolidado  
**Última actualización:** 2026-03-28  
**Versión:** 1.1

---

## Objetivo

Gestionar el ciclo de vida completo de inquilinos y sus asignaciones a habitaciones, garantizando integridad de datos y prevención de conflictos de ocupación.

---

## Alcance

### Incluye
- Alta de inquilinos (lodgers)
- Asignación de habitaciones por disponibilidad
- Gestión de fechas de entrada y salida
- Prevención de doble asignación (constraint)
- Cálculo de estado derivado de habitaciones
- Proceso de check-out con notas
- Historial de asignaciones
- Invitación automática por email

### No Incluye
- Facturación de rentas (ver REQ-004)
- Gestión de depósitos
- Contratos digitales
- Firma electrónica

---

## Reglas Actuales

### Inquilinos (Lodgers)

#### Estados
- `invited` - Invitado pero no ha creado cuenta
- `active` - Cuenta activa y operativa
- `inactive` - Desactivado (salida completada)

#### Campos Principales
```
Datos personales (en profiles):
- first_name, last_name1, last_name2
- email, phone
- dni, birth_date
- nationality, gender
- address_* (dirección completa)

Datos de inquilino (en lodgers):
- id (UUID)
- profile_id (UUID, FK a profiles)
- client_account_id (UUID)
- created_at, updated_at
```

#### Flujo de Alta
1. **Admin crea inquilino:**
   - Completa datos personales
   - Selecciona fecha de entrada
   - Elige alojamiento
   - Ve habitaciones disponibles
   - Selecciona habitación
   - Confirma asignación

2. **Sistema procesa:**
   - Crea perfil en `profiles` con role='lodger'
   - Crea registro en `lodgers`
   - Crea asignación en `lodger_room_assignments`
   - Envía email de invitación con link de activación

3. **Inquilino activa cuenta:**
   - Accede a link de invitación
   - Establece contraseña
   - Accede a su portal personal

### Asignaciones (Lodger Room Assignments)

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID)
- lodger_id (UUID, FK a lodgers)
- room_id (UUID, FK a rooms)
- accommodation_id (UUID, FK a accommodations)
- move_in_date (DATE) - Fecha de entrada
- move_out_date (DATE) - Fecha de salida (NULL si activo)
- billing_start_date (DATE) - Inicio de facturación
- monthly_rent (DECIMAL)
- deposit_amount (DECIMAL)
- commission_amount (DECIMAL)
- first_month_amount (DECIMAL)
- checkout_notes (TEXT) - Notas del check-out
- created_at, updated_at
```

#### Reglas de Negocio

##### 1. No Solapamiento (CRÍTICO)
**Constraint:** `no_overlapping_assignments`
- Una habitación NO puede tener dos asignaciones solapadas en el tiempo
- Implementado con EXCLUDE constraint usando rangos de fechas
- Usa extensión `btree_gist`

```sql
EXCLUDE USING gist (
  room_id WITH =,
  daterange(move_in_date, COALESCE(move_out_date, '9999-12-31'), '[]') WITH &&
)
```

##### 2. Validaciones Automáticas
**Trigger:** `validate_room_assignment`
- Habitación no puede estar en mantenimiento
- move_out_date >= move_in_date (si existe)
- billing_start_date >= move_in_date (si existe)

##### 3. Estado Derivado de Habitación
**Función:** `get_room_derived_status(room_id)`

Lógica:
```
IF is_maintenance = true THEN
  RETURN 'maintenance'
ELSE IF tiene asignación con move_out_date IS NULL THEN
  RETURN 'occupied'
ELSE IF tiene asignación con move_out_date > TODAY THEN
  RETURN 'pending_checkout'
ELSE
  RETURN 'free'
END IF
```

##### 4. Disponibilidad
Una habitación está disponible si:
- `is_maintenance = false`
- NO tiene asignación activa (move_out_date IS NULL)
- NO tiene asignación solapada con fechas solicitadas

### Proceso de Check-Out

#### Flujo
1. Admin accede a asignación activa
2. Establece fecha de salida (move_out_date)
3. Añade notas de check-out (opcional)
4. Confirma check-out
5. Sistema actualiza asignación
6. Estado de habitación cambia a 'free' o 'pending_checkout'

#### Validaciones
- move_out_date >= move_in_date
- move_out_date no puede ser en el pasado (salvo casos especiales)
- Verificar que no hay consumos pendientes de liquidar

---

## Casos Válidos

### CV-001: Alta de Inquilino con Asignación
**Precondiciones:**
- Habitación disponible
- Fechas válidas

**Flujo:**
1. Admin accede a "Inquilinos"
2. Click en "Nuevo Inquilino"
3. Completa datos personales
4. Selecciona fecha entrada: 2026-04-01
5. Elige alojamiento "Edificio Central"
6. Sistema muestra habitaciones disponibles desde 2026-04-01
7. Selecciona habitación 101
8. Establece renta mensual: 450€
9. Confirma
10. Sistema crea inquilino y asignación
11. Sistema envía email de invitación

**Resultado esperado:** 
- Inquilino creado con status 'invited'
- Asignación creada con move_in_date = 2026-04-01
- Habitación 101 estado = 'occupied' desde 2026-04-01
- Email enviado

---

### CV-002: Check-Out de Inquilino
**Precondiciones:**
- Asignación activa (move_out_date IS NULL)

**Flujo:**
1. Admin accede a inquilino activo
2. Click en "Realizar Check-Out"
3. Selecciona fecha salida: 2026-06-30
4. Añade notas: "Habitación en buen estado"
5. Confirma
6. Sistema actualiza move_out_date = 2026-06-30
7. Sistema actualiza checkout_notes
8. Estado habitación cambia a 'pending_checkout'

**Resultado esperado:**
- Asignación actualizada
- Habitación disponible desde 2026-07-01

---

### CV-003: Consultar Disponibilidad
**Precondiciones:**
- Alojamiento con habitaciones

**Flujo:**
1. Admin selecciona alojamiento
2. Establece rango de fechas: 2026-05-01 a 2026-05-31
3. Sistema consulta disponibilidad
4. Sistema muestra habitaciones libres en ese rango

**Resultado esperado:** 
- Solo habitaciones sin solapamiento en esas fechas

---

### CV-004: Reasignación de Habitación
**Precondiciones:**
- Inquilino activo en habitación A
- Habitación B disponible

**Flujo:**
1. Admin realiza check-out de habitación A
2. Admin crea nueva asignación a habitación B
3. Sistema valida disponibilidad
4. Sistema crea nueva asignación

**Resultado esperado:**
- Dos asignaciones en historial
- Habitación A libre
- Habitación B ocupada

---

## Casos Inválidos

### CI-001: Doble Asignación (CRÍTICO)
**Flujo:**
1. Habitación 101 ocupada del 2026-04-01 al 2026-06-30
2. Admin intenta asignar habitación 101 del 2026-05-01 al 2026-07-31
3. Sistema detecta solapamiento

**Resultado esperado:** 
- Error: "La habitación ya está asignada en esas fechas"
- Constraint `no_overlapping_assignments` previene insert

---

### CI-002: Asignar Habitación en Mantenimiento
**Flujo:**
1. Habitación 102 marcada is_maintenance = true
2. Admin intenta asignar inquilino

**Resultado esperado:**
- Error: "No se puede asignar habitación en mantenimiento"
- Trigger `validate_room_assignment` previene insert

---

### CI-003: Fecha Salida Anterior a Entrada
**Flujo:**
1. Admin establece move_in_date = 2026-05-01
2. Admin establece move_out_date = 2026-04-15

**Resultado esperado:**
- Error: "Fecha de salida no puede ser anterior a fecha de entrada"
- Trigger valida fechas

---

### CI-004: Check-Out con Consumos Pendientes
**Flujo:**
1. Admin intenta check-out
2. Inquilino tiene factura de energía sin liquidar

**Resultado esperado:**
- Advertencia: "Hay consumos pendientes de liquidar"
- Permitir continuar con confirmación

---

## Impacto Frontend

### Componentes Principales
- `src/pages/Lodgers.jsx` - Listado de inquilinos
- `src/pages/LodgerDetail.jsx` - Detalle de inquilino
- `src/components/Lodger/LodgerForm.jsx` - Formulario de alta
- `src/components/Lodger/AssignmentForm.jsx` - Asignación de habitación
- `src/components/Lodger/CheckoutForm.jsx` - Proceso de check-out
- `src/components/Room/RoomAvailability.jsx` - Consulta disponibilidad

### Flujos de Usuario
1. **Alta de Inquilino:**
   - Wizard multi-paso
   - Validación de disponibilidad en tiempo real
   - Previsualización de asignación

2. **Gestión de Asignaciones:**
   - Ver asignaciones activas
   - Ver historial
   - Realizar check-out
   - Reasignar habitación

3. **Consulta de Disponibilidad:**
   - Calendario visual
   - Filtros por alojamiento
   - Filtros por rango de fechas

### Manejo de Errores
```javascript
try {
  await createAssignment(data);
} catch (error) {
  if (error.code === '23P01') { // EXCLUDE constraint
    showError('La habitación ya está asignada en esas fechas');
  } else if (error.message.includes('mantenimiento')) {
    showError('No se puede asignar habitación en mantenimiento');
  }
}
```

---

## Impacto Base de Datos

### Tablas Involucradas

#### lodgers
```sql
- id (UUID, PK)
- profile_id (UUID, FK a profiles)
- client_account_id (UUID, FK)
- created_at, updated_at
```

#### lodger_room_assignments
```sql
- id (UUID, PK)
- client_account_id (UUID, FK)
- lodger_id (UUID, FK)
- room_id (UUID, FK)
- accommodation_id (UUID, FK)
- move_in_date (DATE)
- move_out_date (DATE)
- billing_start_date (DATE)
- monthly_rent (DECIMAL)
- checkout_notes (TEXT)
- created_at, updated_at

CONSTRAINT no_overlapping_assignments EXCLUDE ...
```

### Funciones SQL

#### get_room_derived_status(room_id UUID)
```sql
-- Calcula estado derivado de habitación
-- Retorna: 'free' | 'occupied' | 'pending_checkout' | 'maintenance'
```

### Triggers

#### validate_room_assignment
```sql
-- Ejecuta BEFORE INSERT OR UPDATE
-- Valida:
--   - Habitación no en mantenimiento
--   - Fechas válidas
--   - billing_start_date válido
```

### Constraints

#### no_overlapping_assignments (CRÍTICO)
```sql
-- EXCLUDE constraint con btree_gist
-- Previene solapamiento de asignaciones
-- Usa rangos de fechas
```

### Migraciones Relacionadas
- `00000000000001_baseline_schema.sql` - Tablas iniciales
- `20260317120000_add_lodger_fields_to_profiles.sql` - Campos de inquilino
- `20260323100000_add_address_fields_to_profiles.sql` - Dirección
- `20260323100100_add_address_number_to_profiles.sql` - Número dirección
- `20260325140000_add_checkout_notes_to_assignments.sql` - Notas check-out
- `20260325150000_remove_status_from_assignments.sql` - Estado derivado
- `20260325150100_remove_status_from_rooms.sql` - Estado derivado
- `20260327000001_add_no_overlap_constraint.sql` - Constraint crítico
- `20260326000003_add_helper_functions.sql` - Funciones helper

---

## Tests Asociados

### Tests E2E
- 🟡 `tests/e2e/lodger-crud.spec.js` - CRUD inquilinos (parcial)
- 🟡 `tests/e2e/room-assignment.spec.js` - Asignaciones (parcial)
- ❌ `tests/e2e/checkout-process.spec.js` - Check-out (falta)
- ❌ `tests/e2e/room-availability.spec.js` - Disponibilidad (falta)

### Tests Críticos Faltantes
- ❌ **Test de constraint no solapamiento** (CRÍTICO)
- ❌ Test de trigger de validación
- ❌ Test de función get_room_derived_status()
- ❌ Test de proceso completo de check-out

### Cobertura
- **E2E:** 40% (mejorable)
- **Unitarios:** 30% (mejorable)
- **Críticos:** 0% (**CRÍTICO**)

---

## Issues Relacionados

- **CRÍTICO:** Crear test automatizado de constraint no solapamiento
- **ALTO:** Crear tests de validaciones de trigger
- **MEDIO:** Mejorar UX de consulta de disponibilidad
- Crear issue para implementar calendario visual

---

## Observaciones

### Fortalezas
- Constraint de no solapamiento previene corrupción de datos
- Estado derivado evita inconsistencias
- Validaciones automáticas en BD
- Historial completo de asignaciones

### Limitaciones Conocidas
- No hay validación de consumos pendientes en BD
- Check-out no valida depósitos
- No hay calendario visual de disponibilidad
- Invitación por email requiere servicio externo

### Mejoras Futuras
- Implementar calendario visual de ocupación
- Añadir validación de depósitos en check-out
- Implementar contratos digitales
- Añadir firma electrónica
- Mejorar proceso de reasignación

### Dependencias Críticas
- **Constraint no_overlapping_assignments:** Integridad de datos
- **Trigger validate_room_assignment:** Validaciones
- **Función get_room_derived_status():** Cálculo de estados
- **Edge Function manage_lodger:** Invitación por email

### Riesgos
- **CRÍTICO:** Sin tests del constraint, riesgo de regresión
- **ALTO:** Validaciones solo en BD, no en frontend
- **MEDIO:** Proceso de check-out complejo sin tests

---

## Referencias

- **Código:** `src/pages/Lodgers.jsx`, `src/components/Lodger/`
- **Edge Function:** `supabase/functions/manage_lodger/`
- **Migraciones:** `20260327000001_add_no_overlap_constraint.sql`
- **Tests:** `tests/e2e/lodger-crud.spec.js`
- **CHG relacionado:** `CHG-2026-03-28-add-no-overlap-assignment.md`

---

**Consolidado desde:**
- Baseline inicial del sistema
- Requisitos funcionales originales
- CHG-2026-03-28-add-no-overlap-assignment
- Implementación actual en producción
- Análisis de integridad de datos
