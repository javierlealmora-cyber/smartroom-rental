-- ============================================================================
-- Migración: Añadir 'estimated' como fuente válida en energy_readings
-- Fecha: 2026-03-29
-- REQ: REQ-007 (settleEnergyBill), REQ-008 (VisorConsumo)
--
-- Motivo:
--   settleEnergyBill genera lecturas estimadas (source='estimated') cuando:
--     - total_kwh > 0 en la factura, Y
--     - no existen lecturas reales (api/manual/import) para el período
--   Fórmula: kwh = total_kwh_factura / totalDías / n_habitaciones_activas_ese_día
--   Una lectura por habitación activa por día durante todo el período de la factura.
--
--   El CHECK constraint anterior solo permitía 'manual', 'api', 'import',
--   lo que causaba el error:
--     "new row for relation energy_readings violates check constraint
--      energy_readings_source_check"
--   al intentar repartir una factura sin lecturas reales de contador.
--
-- Ciclo de vida de las lecturas estimadas:
--   - CREADAS en:  settleEnergyBill (paso 5b) — idempotente (DELETE antes de INSERT)
--   - BORRADAS en: unsettleEnergyBill — limpia todas las 'estimated' del período
--   - EXCLUIDAS de: el cálculo de hasReadings en settleEnergyBill (paso 5):
--       .neq("source", "estimated")
--     para evitar contaminación entre facturas consecutivas que comparten
--     la fecha límite del período.
--
-- Impacto en el Visor de Consumos (REQ-008):
--   Las lecturas 'estimated' son la fuente primaria del gráfico cuando no hay
--   contadores inteligentes. El VisorConsumo las consulta igual que las reales.
--   Solo si energy_readings está vacía para el período se activa el fallback
--   a energy_bills (mostrando coste en € en lugar de kWh).
--
-- Nota sobre valores iguales por habitación:
--   La fórmula distribuye el mismo kWh/día a todas las habitaciones activas
--   simultáneamente. Los totales mensuales pueden diferir entre habitaciones
--   si tienen fechas de entrada/salida distintas dentro del mes.
-- ============================================================================

ALTER TABLE public.energy_readings
  DROP CONSTRAINT IF EXISTS energy_readings_source_check;

ALTER TABLE public.energy_readings
  ADD CONSTRAINT energy_readings_source_check
    CHECK (source IN ('manual', 'api', 'import', 'estimated'));

COMMENT ON COLUMN public.energy_readings.source IS
  'Origen de la lectura: '
  'api=contador inteligente/n8n, '
  'manual=entrada manual por el administrador, '
  'import=importación masiva desde fichero, '
  'estimated=generada automáticamente por settleEnergyBill cuando no hay '
  'lecturas reales (kwh = total_kwh_factura / totalDías / n_habitaciones_activas_ese_día). '
  'Las lecturas estimated se borran al deshacer el reparto (unsettleEnergyBill).';
