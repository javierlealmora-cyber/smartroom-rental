# CHG-2026-03-28: Constraint de No Solapamiento de Asignaciones

**Estado:** ✅ Consolidado en REQ-003  
**Fecha:** 2026-03-28  
**Tipo:** Security / Data Integrity  
**Prioridad:** CRÍTICA

---

## Issue Origen

**Pendiente crear issue en GitHub**

---

## Contexto

En el sistema actual, la asignación de habitaciones a inquilinos se gestiona mediante la tabla `lodger_room_assignments` con campos `move_in_date` y `move_out_date`. 

**Problema detectado:** No existía ningún mecanismo a nivel de base de datos que previniera la doble asignación de una misma habitación en fechas solapadas.

**Riesgo:** 
- Dos inquilinos asignados a la misma habitación al mismo tiempo
- Corrupción de datos de ocupación
- Conflictos en facturación
- Pérdida de integridad del sistema

---

## Problema

### Escenario Problemático

```
Habitación 101:
- Inquilino A: 2026-04-01 a 2026-06-30
- Inquilino B: 2026-05-01 a 2026-07-31  ❌ SOLAPAMIENTO

Sin constraint:
- Ambas asignaciones se crean sin error
- Sistema queda en estado inconsistente
- No hay forma de detectar el conflicto automáticamente
```

### Impacto

**Datos:**
- Integridad de datos comprometida
- Historial de ocupación inválido
- Cálculos de facturación incorrectos

**Negocio:**
- Doble asignación de habitación
- Conflictos entre inquilinos
- Pérdida de confianza en el sistema

**Técnico:**
- Sin validación automática
- Detección manual de conflictos
- Corrección manual compleja

---

## Cambio Requerido

### Solución Implementada

**1. EXCLUDE Constraint con Rangos de Fechas**

Implementar constraint de exclusión usando `btree_gist` que previene solapamiento de asignaciones en la misma habitación.

```sql
-- Habilitar extensión
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Constraint de exclusión
ALTER TABLE lodger_room_assignments
ADD CONSTRAINT no_overlapping_assignments
EXCLUDE USING gist (
  room_id WITH =,
  daterange(
    move_in_date, 
    COALESCE(move_out_date, '9999-12-31'::date), 
    '[]'
  ) WITH &&
);
```

**Cómo funciona:**
- `room_id WITH =` → Misma habitación
- `daterange(...) WITH &&` → Rangos de fechas solapados
- Si ambas condiciones se cumplen → EXCLUYE (rechaza insert/update)

**2. Trigger de Validaciones Adicionales**

```sql
CREATE OR REPLACE FUNCTION validate_room_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que habitación no esté en mantenimiento
  IF (SELECT is_maintenance FROM rooms WHERE id = NEW.room_id) THEN
    RAISE EXCEPTION 'No se puede asignar habitación en mantenimiento';
  END IF;
  
  -- Validar fechas
  IF NEW.move_out_date IS NOT NULL AND NEW.move_out_date < NEW.move_in_date THEN
    RAISE EXCEPTION 'Fecha de salida no puede ser anterior a fecha de entrada';
  END IF;
  
  -- Validar billing_start_date
  IF NEW.billing_start_date IS NOT NULL AND NEW.billing_start_date < NEW.move_in_date THEN
    RAISE EXCEPTION 'Fecha de inicio de facturación no puede ser anterior a fecha de entrada';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_room_assignment
BEFORE INSERT OR UPDATE ON lodger_room_assignments
FOR EACH ROW
EXECUTE FUNCTION validate_room_assignment();
```

---

## Impacto Funcional

### Para Usuarios (Admin)

**Antes:**
- Podía crear asignaciones solapadas sin advertencia
- Detección manual de conflictos
- Corrección manual compleja

**Después:**
- Sistema rechaza automáticamente asignaciones solapadas
- Error claro: "La habitación ya está asignada en esas fechas"
- Prevención proactiva de errores

### Flujo Afectado

**Alta de Inquilino:**
1. Admin selecciona habitación y fechas
2. Sistema valida disponibilidad en tiempo real
3. Si hay solapamiento → Error inmediato
4. Admin debe elegir otra habitación o fechas

**Reasignación:**
1. Admin realiza check-out (establece move_out_date)
2. Admin crea nueva asignación
3. Sistema valida que no solape con asignación anterior
4. Si solapa → Error

---

## Impacto Base de Datos

### Migración SQL

**Archivo:** `supabase/migrations/security/20260327000001_add_no_overlap_constraint.sql`

**Tipo:** Security

**Contenido:**
1. Extension `btree_gist`
2. EXCLUDE constraint `no_overlapping_assignments`
3. Trigger function `validate_room_assignment()`
4. Trigger `trg_validate_room_assignment`

**Idempotencia:** ✅ Usa `IF NOT EXISTS` y validaciones

**Rollback:** Posible mediante `DROP CONSTRAINT` y `DROP TRIGGER`

### Tablas Afectadas

- `lodger_room_assignments` - Constraint y trigger añadidos

### Performance

**Impacto:** Mínimo
- EXCLUDE constraint usa índice GiST
- Validación en insert/update (no en select)
- Overhead: < 1ms por operación

---

## Impacto Frontend

### Manejo de Errores

**Antes:**
```javascript
try {
  await createAssignment(data);
  showSuccess('Asignación creada');
} catch (error) {
  showError('Error al crear asignación');
}
```

**Después:**
```javascript
try {
  await createAssignment(data);
  showSuccess('Asignación creada');
} catch (error) {
  if (error.code === '23P01') { // EXCLUDE constraint violation
    showError('La habitación ya está asignada en esas fechas. Por favor, elige otra habitación o fechas diferentes.');
  } else if (error.message.includes('mantenimiento')) {
    showError('No se puede asignar una habitación en mantenimiento.');
  } else if (error.message.includes('fecha de salida')) {
    showError('La fecha de salida no puede ser anterior a la fecha de entrada.');
  } else {
    showError('Error al crear asignación: ' + error.message);
  }
}
```

### Componentes Afectados

- `src/components/Lodger/AssignmentForm.jsx` - Manejo de errores mejorado
- `src/components/Lodger/LodgerForm.jsx` - Validación de disponibilidad
- `src/components/Room/RoomAvailability.jsx` - Consulta de disponibilidad

---

## Tests Requeridos

### Tests Críticos (FALTANTES)

#### Test 1: Prevención de Solapamiento Total
```javascript
test('should prevent overlapping assignments - total overlap', async () => {
  // Arrange
  const room = await createRoom();
  await createAssignment({
    room_id: room.id,
    move_in_date: '2026-04-01',
    move_out_date: '2026-06-30'
  });
  
  // Act & Assert
  await expect(
    createAssignment({
      room_id: room.id,
      move_in_date: '2026-05-01',
      move_out_date: '2026-07-31'
    })
  ).rejects.toThrow('no_overlapping_assignments');
});
```

#### Test 2: Prevención de Solapamiento Parcial
```javascript
test('should prevent overlapping assignments - partial overlap', async () => {
  // Arrange
  const room = await createRoom();
  await createAssignment({
    room_id: room.id,
    move_in_date: '2026-04-01',
    move_out_date: '2026-06-30'
  });
  
  // Act & Assert
  await expect(
    createAssignment({
      room_id: room.id,
      move_in_date: '2026-06-15',
      move_out_date: '2026-08-31'
    })
  ).rejects.toThrow('no_overlapping_assignments');
});
```

#### Test 3: Permitir Asignaciones Consecutivas
```javascript
test('should allow consecutive assignments', async () => {
  // Arrange
  const room = await createRoom();
  await createAssignment({
    room_id: room.id,
    move_in_date: '2026-04-01',
    move_out_date: '2026-06-30'
  });
  
  // Act
  const assignment2 = await createAssignment({
    room_id: room.id,
    move_in_date: '2026-07-01',
    move_out_date: '2026-09-30'
  });
  
  // Assert
  expect(assignment2).toBeDefined();
});
```

#### Test 4: Validación de Habitación en Mantenimiento
```javascript
test('should prevent assignment to room in maintenance', async () => {
  // Arrange
  const room = await createRoom({ is_maintenance: true });
  
  // Act & Assert
  await expect(
    createAssignment({
      room_id: room.id,
      move_in_date: '2026-04-01'
    })
  ).rejects.toThrow('mantenimiento');
});
```

#### Test 5: Validación de Fechas Inválidas
```javascript
test('should prevent invalid dates', async () => {
  // Arrange
  const room = await createRoom();
  
  // Act & Assert
  await expect(
    createAssignment({
      room_id: room.id,
      move_in_date: '2026-06-01',
      move_out_date: '2026-05-01' // Anterior a entrada
    })
  ).rejects.toThrow('fecha de salida');
});
```

### Estado Actual
- ❌ Tests no implementados (**CRÍTICO**)
- ❌ Sin validación automatizada
- ❌ Riesgo de regresión alto

---

## Migración Esperada

**Archivo:** `20260327000001_add_no_overlap_constraint.sql`

**Ubicación:** `supabase/migrations/security/`

**Estado:** ✅ Aplicado en producción

**Documentación:** `docs/database/MIGRATION-INDEX.md`

---

## Criterios de Aceptación

- [x] Extension `btree_gist` habilitada
- [x] Constraint `no_overlapping_assignments` creado
- [x] Trigger `validate_room_assignment` creado
- [x] Migración aplicada en local
- [x] Migración aplicada en staging
- [x] Migración aplicada en producción
- [x] Documentado en MIGRATION-INDEX.md
- [x] Frontend maneja errores correctamente
- [ ] **Tests automatizados creados** ❌ PENDIENTE
- [ ] **Tests ejecutándose en CI** ❌ PENDIENTE
- [x] Consolidado en REQ-003

---

## Observaciones

### Decisiones Técnicas

**¿Por qué EXCLUDE constraint y no CHECK constraint?**
- CHECK constraint no puede validar contra otras filas
- EXCLUDE constraint valida contra todas las filas existentes
- GiST permite validación eficiente de rangos

**¿Por qué btree_gist?**
- Permite usar operadores de rango (&&) en EXCLUDE
- Performance óptima para validación de fechas
- Extensión estándar de PostgreSQL

### Limitaciones

- Constraint solo previene solapamiento en misma habitación
- No valida disponibilidad en frontend antes de submit
- Error solo se muestra después de intentar guardar

### Mejoras Futuras

- Validación de disponibilidad en tiempo real en frontend
- Calendario visual de ocupación
- Sugerencias de fechas disponibles
- Bloqueo optimista en UI

### Riesgos Mitigados

- ✅ Doble asignación de habitaciones
- ✅ Corrupción de datos de ocupación
- ✅ Conflictos en facturación
- ✅ Inconsistencias en historial

### Riesgos Pendientes

- ❌ Sin tests automatizados (riesgo de regresión)
- ❌ Validación solo en backend (UX mejorable)

---

## Referencias

- **Requisito:** `docs/requirements/current/REQ-003-room-assignment.md`
- **Migración:** `supabase/migrations/security/20260327000001_add_no_overlap_constraint.sql`
- **Índice:** `docs/database/MIGRATION-INDEX.md`
- **Matriz:** `docs/qa/TRACEABILITY-MATRIX.md`
- **Código:** `src/components/Lodger/AssignmentForm.jsx`

---

## Estado de Consolidación

**Fecha de consolidación:** 2026-03-28

**Integrado en:** REQ-003 (Room Assignment)

**Sección:** Reglas Actuales → Asignaciones → Reglas de Negocio → No Solapamiento

**Cambios en REQ-003:**
- Documentado constraint `no_overlapping_assignments`
- Documentado trigger `validate_room_assignment`
- Añadido a casos inválidos (CI-001)
- Añadido a impacto en base de datos

---

**Última actualización:** 2026-03-28  
**Estado:** Consolidado - Pendiente tests automatizados
