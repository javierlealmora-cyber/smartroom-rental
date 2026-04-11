-- ============================================================================
-- Migración: Añadir campos de Previsión de Fondo por suministro
-- Fecha: 2026-03-29
-- REQ: REQ-009 (Configuración de Reparto de Suministros por Alojamiento)
--
-- Contexto:
--   El panel "Configuración de Consumo" en AccommodationDetail.jsx ha sido
--   rediseñado con tres columnas independientes (Electricidad, Agua, Gas).
--   Cada suministro tiene:
--     - split_X (bool): "No Incluido en el Alquiler" → gestiona si se reparte
--     - split_mode_X ('equal'|'meter'): modo de reparto activo
--     - prevision_fund_X (numeric): importe de referencia mensual — NUEVO
--
-- Semántica del toggle principal en UI (inversión respecto al campo DB):
--   UI field `included_X = true`  → BD `split_X = false`  (incluido, no se reparte)
--   UI field `included_X = false` → BD `split_X = true`   (no incluido, se reparte)
--   El toggle aparece VERDE por defecto (split_X = false) mostrando
--   "Incluido en el Alquiler". Al apagarlo aparecen las opciones de reparto.
--
-- Modos de reparto conectados a settleEnergyBill:
--   'equal' → hasReadings = false → fracción diaria (igual por habitación/día)
--   'meter' → hasReadings = true solo si existen lecturas reales en energy_readings
--   Las lecturas estimadas se generan cuando kwhTotal === 0 && total_kwh > 0,
--   independientemente del modo, para alimentar el Visor de Consumos.
--
-- Exclusión mutua en UI:
--   "Reparto Igualitario" ON → "Medidor" deshabilitado automáticamente
--   "Medidor" ON → "Igualitario" desactivado automáticamente
--
-- Gastos adicionales (extra_costs JSONB):
--   Cada elemento ahora incluye campo 'period': 'monthly'|'annual'
--   Sustituye al antiguo 'split_mode' por elemento.
--   No requiere cambio de esquema por ser JSONB flexible.
--
-- Campos mantenidos por compatibilidad (ya no usados en reparto):
--   utilities_included, has_individual_meters
-- ============================================================================

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS prevision_fund_electricity NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prevision_fund_water       NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prevision_fund_gas         NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.accommodations.prevision_fund_electricity IS
  'Importe mensual de previsión de fondo para Electricidad (€). '
  'Referencia para el administrador al calcular el fondo de reserva. '
  'Visible en UI solo cuando split_electricity = true (No Incluido en Alquiler).';

COMMENT ON COLUMN public.accommodations.prevision_fund_water IS
  'Importe mensual de previsión de fondo para Agua (€). '
  'Visible en UI solo cuando split_water = true (No Incluido en Alquiler).';

COMMENT ON COLUMN public.accommodations.prevision_fund_gas IS
  'Importe mensual de previsión de fondo para Gas (€). '
  'Visible en UI solo cuando split_gas = true (No Incluido en Alquiler).';
