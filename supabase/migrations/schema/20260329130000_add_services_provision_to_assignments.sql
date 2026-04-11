-- ============================================================================
-- Migración: Añadir campo services_provision_amount a lodger_room_assignments
-- Fecha: 2026-03-29
-- REQ: REQ-003 (Asignación de Habitaciones e Inquilinos)
--
-- Contexto:
--   En el formulario de alta de inquilino (RoomAssignmentForm) se ha añadido
--   el campo "Previsión de Gastos de Servicios (€)", también llamado
--   "Hucha Energética" (Luz, agua, gas).
--
--   Este importe representa la cantidad mensual estimada que el inquilino
--   aportará a la hucha de suministros del alojamiento. Es informativo y
--   complementa al campo prevision_fund_X de accommodations (que es el
--   importe total a nivel de alojamiento, configurado por el administrador).
--
--   El primer pago de este importe comienza el mismo día que el primer pago
--   de la mensualidad: primer día del mes siguiente al check-in.
--   (billing_start_date = move_in_date + 1 mes, inicio de mes)
--
-- Nota sobre billing_start_date:
--   El formulario UI calcula y muestra billing_start_date como el primer día
--   del mes siguiente a move_in_date. El valor se persiste en la columna
--   existente billing_start_date de lodger_room_assignments.
-- ============================================================================

ALTER TABLE public.lodger_room_assignments
  ADD COLUMN IF NOT EXISTS services_provision_amount NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.lodger_room_assignments.services_provision_amount IS
  'Previsión mensual de Gastos de Servicios (€) — Hucha Energética (Luz, agua, gas). '
  'Importe estimado que el inquilino aporta mensualmente a la hucha de suministros. '
  'NULL si no aplica o no fue especificado en el alta. '
  'El primer pago comienza en billing_start_date (primer día del mes siguiente al check-in).';
