-- ============================================================================
-- MIGRACIÓN: Vistas Materializadas para Rendimiento
-- Fecha: 2026-03-26
-- Tipo: Performance
-- Descripción: Vistas materializadas y vistas para optimizar queries frecuentes
-- ============================================================================

-- ============================================================================
-- PARTE 1: VISTAS MATERIALIZADAS
-- ============================================================================

-- Vista materializada para estadísticas de ocupación del dashboard
-- Evita cálculos repetitivos en cada carga del dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_occupancy_stats AS
SELECT 
  ca.id as client_account_id,
  COUNT(DISTINCT a.id) as total_accommodations,
  COUNT(DISTINCT r.id) as total_rooms,
  COUNT(DISTINCT CASE WHEN r.is_maintenance = false THEN r.id END) as available_rooms,
  COUNT(DISTINCT CASE WHEN r.is_maintenance = true THEN r.id END) as maintenance_rooms,
  COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'lodger' AND p.onboarding_status = 'active') as active_lodgers,
  COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'lodger' AND p.onboarding_status = 'invited') as invited_lodgers,
  COUNT(DISTINCT lra.id) FILTER (WHERE lra.move_out_date IS NULL) as active_assignments,
  COUNT(DISTINCT lra.id) FILTER (WHERE lra.move_out_date > CURRENT_DATE) as pending_checkouts,
  COALESCE(SUM(lra.monthly_rent) FILTER (WHERE lra.move_out_date IS NULL), 0) as total_monthly_revenue,
  NOW() as last_refresh
FROM client_accounts ca
LEFT JOIN accommodations a ON a.client_account_id = ca.id AND a.status = 'active'
LEFT JOIN rooms r ON r.accommodation_id = a.id
LEFT JOIN profiles p ON p.client_account_id = ca.id
LEFT JOIN lodger_room_assignments lra ON lra.client_account_id = ca.id
GROUP BY ca.id;

-- Índice único en vista materializada para refresh concurrente
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_occupancy_stats_client 
ON mv_occupancy_stats(client_account_id);

COMMENT ON MATERIALIZED VIEW mv_occupancy_stats IS 
  'Estadísticas pre-calculadas de ocupación para dashboard. Refrescar cada hora o tras cambios importantes.';

-- ============================================================================
-- PARTE 2: VISTAS NORMALES
-- ============================================================================

-- Vista para asignaciones activas con datos relacionados
-- Simplifica queries frecuentes y evita joins repetitivos
CREATE OR REPLACE VIEW v_active_assignments AS
SELECT 
  lra.id,
  lra.client_account_id,
  lra.lodger_id,
  lra.room_id,
  lra.accommodation_id,
  lra.move_in_date,
  lra.move_out_date,
  lra.billing_start_date,
  lra.monthly_rent,
  lra.deposit_amount,
  lra.commission_amount,
  lra.first_month_amount,
  lra.created_at,
  lra.updated_at,
  -- Datos del inquilino
  p.full_name as lodger_name,
  p.email as lodger_email,
  p.phone as lodger_phone,
  p.onboarding_status as lodger_status,
  -- Datos de la habitación
  r.number as room_number,
  r.type as room_type,
  r.floor as room_floor,
  r.is_maintenance as room_is_maintenance,
  -- Datos del alojamiento
  a.name as accommodation_name,
  a.address_street as accommodation_street,
  a.address_city as accommodation_city,
  -- Estado derivado
  CASE 
    WHEN lra.move_out_date IS NULL THEN 'active'
    WHEN lra.move_out_date > CURRENT_DATE THEN 'pending_checkout'
    ELSE 'inactive'
  END as assignment_status
FROM lodger_room_assignments lra
JOIN profiles p ON p.id = lra.lodger_id
JOIN rooms r ON r.id = lra.room_id
JOIN accommodations a ON a.id = lra.accommodation_id
WHERE lra.move_out_date IS NULL 
   OR lra.move_out_date > CURRENT_DATE;

COMMENT ON VIEW v_active_assignments IS 
  'Vista de asignaciones activas con todos los datos relacionados. Usar en lugar de joins manuales.';

-- ============================================================================
-- ÍNDICES ADICIONALES PARA QUERIES FRECUENTES
-- ============================================================================

-- Índice para búsqueda de asignaciones por rango de fechas
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_date_range 
ON lodger_room_assignments(client_account_id, move_in_date, move_out_date)
WHERE move_out_date IS NOT NULL;

-- Índice para profiles por role y status
CREATE INDEX IF NOT EXISTS idx_profiles_role_status 
ON profiles(role, onboarding_status, client_account_id)
WHERE role = 'lodger';

-- Índice para billing_records por tenant y fecha
CREATE INDEX IF NOT EXISTS idx_billing_records_tenant_date 
ON billing_records(client_account_id, billing_date DESC, status);
