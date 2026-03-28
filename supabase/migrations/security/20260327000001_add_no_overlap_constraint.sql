-- ============================================================================
-- MIGRACIÓN: Constraint de No Solapamiento de Asignaciones
-- Fecha: 2026-03-27
-- Tipo: Security
-- Descripción: Prevenir doble asignación de habitaciones con constraint de exclusión
-- ============================================================================

-- Habilitar extensión para constraint de exclusión
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Constraint para prevenir solapamiento de asignaciones en la misma habitación
-- CRÍTICO: Previene doble asignación de habitaciones
DO $$
BEGIN
  -- Verificar si el constraint ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'no_overlapping_assignments'
  ) THEN
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
  END IF;
END $$;

COMMENT ON CONSTRAINT no_overlapping_assignments ON lodger_room_assignments IS 
  'Previene asignaciones solapadas en la misma habitación. CRÍTICO para integridad de negocio.';

-- ============================================================================
-- TRIGGER PARA VALIDACIONES ADICIONALES
-- ============================================================================

-- Trigger para validar asignaciones antes de insert/update
CREATE OR REPLACE FUNCTION validate_room_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_overlapping_count INT;
  v_room_maintenance BOOLEAN;
BEGIN
  -- Verificar que la habitación no esté en mantenimiento
  SELECT is_maintenance INTO v_room_maintenance
  FROM rooms
  WHERE id = NEW.room_id;
  
  IF v_room_maintenance THEN
    RAISE EXCEPTION 'No se puede asignar una habitación en mantenimiento';
  END IF;
  
  -- Verificar fechas válidas
  IF NEW.move_out_date IS NOT NULL AND NEW.move_out_date < NEW.move_in_date THEN
    RAISE EXCEPTION 'La fecha de salida no puede ser anterior a la fecha de entrada';
  END IF;
  
  -- Verificar billing_start_date
  IF NEW.billing_start_date IS NOT NULL AND NEW.billing_start_date < NEW.move_in_date THEN
    RAISE EXCEPTION 'La fecha de inicio de facturación no puede ser anterior a la fecha de entrada';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trg_validate_room_assignment ON lodger_room_assignments;
CREATE TRIGGER trg_validate_room_assignment
BEFORE INSERT OR UPDATE ON lodger_room_assignments
FOR EACH ROW
EXECUTE FUNCTION validate_room_assignment();

COMMENT ON FUNCTION validate_room_assignment IS 
  'Valida asignaciones de habitaciones: no en mantenimiento, fechas válidas, etc.';

COMMENT ON EXTENSION btree_gist IS 
  'Extensión necesaria para constraints de exclusión con rangos de fechas.';
