-- ============================================================================
-- MIGRACIÓN: Índices de Rendimiento Críticos
-- Fecha: 2026-03-26
-- Descripción: Añade índices compuestos para optimizar queries frecuentes
-- Basado en hallazgos de auditoría técnica (H.4)
-- ============================================================================

-- ============================================================================
-- ÍNDICES PARA lodger_room_assignments
-- ============================================================================

-- Índice compuesto para filtrado por inquilino y fecha de salida
-- Usado en: listLodgers, getLodger, queries de estado de inquilino
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_lodger_moveout 
ON public.lodger_room_assignments(lodger_id, move_out_date);

-- Índice compuesto para filtrado por tenant y fecha de salida
-- Usado en: queries multi-tenant con filtrado temporal
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_client_moveout 
ON public.lodger_room_assignments(client_account_id, move_out_date);

-- Índice compuesto para filtrado por habitación y fecha de salida
-- Usado en: verificación de disponibilidad de habitaciones
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_room_moveout 
ON public.lodger_room_assignments(room_id, move_out_date);

-- Índice compuesto para filtrado por alojamiento y fechas
-- Usado en: listados de asignaciones por alojamiento
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_accommodation_dates 
ON public.lodger_room_assignments(accommodation_id, move_in_date, move_out_date);

-- Índice para ordenamiento por fecha de entrada
-- Usado en: listados ordenados cronológicamente
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_movein 
ON public.lodger_room_assignments(move_in_date DESC);

-- ============================================================================
-- ÍNDICES PARA profiles
-- ============================================================================

-- Índice compuesto para filtrado por tenant y rol
-- Usado en: listados de inquilinos, admins, etc.
CREATE INDEX IF NOT EXISTS idx_profiles_client_role 
ON public.profiles(client_account_id, role);

-- Índice compuesto para filtrado por tenant, rol y estado
-- Usado en: conteo de inquilinos activos, validación de límites de plan
CREATE INDEX IF NOT EXISTS idx_profiles_client_role_status 
ON public.profiles(client_account_id, role, onboarding_status);

-- Índice para búsqueda por email (ya existe UNIQUE, pero explícito para queries)
-- CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
-- No necesario, ya existe constraint UNIQUE

-- ============================================================================
-- ÍNDICES PARA rooms
-- ============================================================================

-- Índice compuesto para filtrado por alojamiento y estado
-- Usado en: listados de habitaciones por alojamiento
CREATE INDEX IF NOT EXISTS idx_rooms_accommodation_status 
ON public.rooms(accommodation_id, is_maintenance);

-- Índice compuesto para filtrado por tenant y alojamiento
-- Usado en: queries multi-tenant de habitaciones
CREATE INDEX IF NOT EXISTS idx_rooms_client_accommodation 
ON public.rooms(client_account_id, accommodation_id);

-- ============================================================================
-- ÍNDICES PARA energy_bills
-- ============================================================================

-- Índice compuesto para filtrado por tenant y alojamiento
-- Usado en: listados de facturas por alojamiento
CREATE INDEX IF NOT EXISTS idx_energy_bills_client_accommodation 
ON public.energy_bills(client_account_id, accommodation_id);

-- Índice compuesto para filtrado por alojamiento y período
-- Usado en: búsqueda de facturas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_energy_bills_accommodation_period 
ON public.energy_bills(accommodation_id, period_start, period_end);

-- Índice para filtrado por estado
-- Usado en: listados de facturas pendientes, repartidas, etc.
CREATE INDEX IF NOT EXISTS idx_energy_bills_status 
ON public.energy_bills(status);

-- Índice compuesto para filtrado por tipo de suministro y estado
-- Usado en: listados por tipo (electricidad, agua, gas)
CREATE INDEX IF NOT EXISTS idx_energy_bills_utility_status 
ON public.energy_bills(utility_type, status);

-- ============================================================================
-- ÍNDICES PARA energy_settlements
-- ============================================================================

-- Índice compuesto para filtrado por factura
-- Usado en: obtener liquidaciones de una factura específica
CREATE INDEX IF NOT EXISTS idx_energy_settlements_bill 
ON public.energy_settlements(energy_bill_id);

-- Índice compuesto para filtrado por habitación
-- Usado en: historial de liquidaciones por habitación
CREATE INDEX IF NOT EXISTS idx_energy_settlements_room 
ON public.energy_settlements(room_id);

-- Índice compuesto para filtrado por inquilino
-- Usado en: historial de liquidaciones por inquilino
CREATE INDEX IF NOT EXISTS idx_energy_settlements_lodger 
ON public.energy_settlements(lodger_id);

-- ============================================================================
-- ÍNDICES PARA bulletins
-- ============================================================================

-- Índice compuesto para filtrado por alojamiento y período
-- Usado en: listados de boletines por alojamiento
CREATE INDEX IF NOT EXISTS idx_bulletins_accommodation_period 
ON public.bulletins(accommodation_id, period_start, period_end);

-- Índice compuesto para filtrado por inquilino y período
-- Usado en: historial de boletines de un inquilino
CREATE INDEX IF NOT EXISTS idx_bulletins_lodger_period 
ON public.bulletins(lodger_id, period_start DESC);

-- Índice para filtrado por estado
-- Usado en: listados de boletines publicados, confirmados, etc.
CREATE INDEX IF NOT EXISTS idx_bulletins_status 
ON public.bulletins(status);

-- Índice compuesto para filtrado por habitación y período
-- Usado en: historial de boletines por habitación
CREATE INDEX IF NOT EXISTS idx_bulletins_room_period 
ON public.bulletins(room_id, period_start, period_end);

-- ============================================================================
-- ÍNDICES PARA audit_log
-- ============================================================================

-- Índice compuesto para filtrado por tenant y fecha
-- Usado en: consultas de auditoría por cuenta
CREATE INDEX IF NOT EXISTS idx_audit_log_client_created 
ON public.audit_log(client_account_id, created_at DESC);

-- Índice compuesto para filtrado por entidad
-- Usado en: historial de cambios de una entidad específica
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
ON public.audit_log(entity_type, entity_id, created_at DESC);

-- Índice para filtrado por actor
-- Usado en: actividad de un usuario específico
CREATE INDEX IF NOT EXISTS idx_audit_log_actor 
ON public.audit_log(actor_user_id, created_at DESC);

-- ============================================================================
-- ÍNDICES PARA accommodations
-- ============================================================================

-- Índice compuesto para filtrado por tenant y estado
-- Usado en: listados de alojamientos activos
CREATE INDEX IF NOT EXISTS idx_accommodations_client_status 
ON public.accommodations(client_account_id, status);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON INDEX idx_lodger_room_assignments_lodger_moveout IS 
  'Optimiza queries de asignaciones por inquilino con filtrado temporal';

COMMENT ON INDEX idx_lodger_room_assignments_client_moveout IS 
  'Optimiza queries multi-tenant con filtrado por fecha de salida';

COMMENT ON INDEX idx_lodger_room_assignments_room_moveout IS 
  'Optimiza verificación de disponibilidad de habitaciones';

COMMENT ON INDEX idx_profiles_client_role_status IS 
  'Optimiza conteo de inquilinos activos para validación de límites de plan';

COMMENT ON INDEX idx_energy_bills_accommodation_period IS 
  'Optimiza búsqueda de facturas por rango de fechas';

COMMENT ON INDEX idx_bulletins_lodger_period IS 
  'Optimiza historial de boletines de inquilino ordenado por fecha';

COMMENT ON INDEX idx_audit_log_client_created IS 
  'Optimiza consultas de auditoría ordenadas cronológicamente';
