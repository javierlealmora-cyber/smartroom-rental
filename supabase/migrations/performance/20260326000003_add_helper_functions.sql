-- ============================================================================
-- MIGRACIÓN: Funciones Helper para Lógica de Negocio
-- Fecha: 2026-03-26
-- Tipo: Performance
-- Descripción: Funciones SQL para centralizar lógica y optimizar queries
-- ============================================================================

-- ============================================================================
-- FUNCIONES DE CÁLCULO DE ESTADO
-- ============================================================================

-- Función para calcular estado derivado de habitación
-- Centraliza lógica que estaba duplicada en frontend
CREATE OR REPLACE FUNCTION get_room_derived_status(p_room_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_is_maintenance BOOLEAN;
  v_active_assignment RECORD;
BEGIN
  -- Verificar si está en mantenimiento
  SELECT is_maintenance INTO v_is_maintenance
  FROM rooms
  WHERE id = p_room_id;
  
  IF v_is_maintenance THEN
    RETURN 'maintenance';
  END IF;
  
  -- Buscar asignación activa o futura
  SELECT * INTO v_active_assignment
  FROM lodger_room_assignments
  WHERE room_id = p_room_id
    AND (move_out_date IS NULL OR move_out_date > CURRENT_DATE)
  ORDER BY move_in_date DESC
  LIMIT 1;
  
  -- Determinar estado según asignación
  IF v_active_assignment IS NULL THEN
    RETURN 'free';
  ELSIF v_active_assignment.move_out_date IS NULL THEN
    RETURN 'occupied';
  ELSIF v_active_assignment.move_out_date > CURRENT_DATE THEN
    RETURN 'pending_checkout';
  ELSE
    RETURN 'free';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_room_derived_status IS 
  'Calcula el estado real de una habitación basado en asignaciones activas y mantenimiento.';

-- ============================================================================
-- FUNCIONES DE MANTENIMIENTO
-- ============================================================================

-- Función para refrescar vista materializada de ocupación
CREATE OR REPLACE FUNCTION refresh_occupancy_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_occupancy_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_occupancy_stats IS 
  'Refresca la vista materializada de estadísticas de ocupación. Llamar tras cambios importantes.';

-- ============================================================================
-- FUNCIONES DE BILLING AUTOMÁTICO
-- ============================================================================

-- Función para generar billing mensual automático
CREATE OR REPLACE FUNCTION generate_monthly_billing()
RETURNS TABLE(
  created_count INT,
  total_amount DECIMAL
) AS $$
DECLARE
  v_assignment RECORD;
  v_billing_id UUID;
  v_created_count INT := 0;
  v_total_amount DECIMAL := 0;
BEGIN
  -- Para cada asignación activa
  FOR v_assignment IN
    SELECT 
      lra.*,
      p.full_name as lodger_name,
      p.email as lodger_email
    FROM lodger_room_assignments lra
    JOIN profiles p ON p.id = lra.lodger_id
    WHERE lra.move_out_date IS NULL 
       OR lra.move_out_date > CURRENT_DATE
  LOOP
    -- Verificar si ya existe billing para este mes
    IF NOT EXISTS (
      SELECT 1 FROM billing_records
      WHERE lodger_room_assignment_id = v_assignment.id
        AND billing_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND billing_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    ) THEN
      -- Crear registro de billing
      INSERT INTO billing_records (
        client_account_id,
        lodger_room_assignment_id,
        billing_date,
        amount,
        status,
        description
      ) VALUES (
        v_assignment.client_account_id,
        v_assignment.id,
        CURRENT_DATE,
        v_assignment.monthly_rent,
        'pending',
        'Renta mensual - ' || TO_CHAR(CURRENT_DATE, 'Month YYYY')
      )
      RETURNING id INTO v_billing_id;
      
      v_created_count := v_created_count + 1;
      v_total_amount := v_total_amount + v_assignment.monthly_rent;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_created_count, v_total_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_monthly_billing IS 
  'Genera registros de billing mensual para todas las asignaciones activas. Ejecutar mensualmente vía cron.';

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================

-- Para refrescar estadísticas de ocupación:
-- SELECT refresh_occupancy_stats();

-- Para generar billing mensual:
-- SELECT * FROM generate_monthly_billing();

-- Para obtener estado de una habitación:
-- SELECT get_room_derived_status('<room_id>');
