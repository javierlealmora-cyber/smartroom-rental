-- ============================================================================
-- MIGRACIÓN: Añadir columnas prevision_fund a tabla accommodations
-- Fecha: 2026-04-02
-- Tipo: Schema
-- REQ/CHG: REQ-009 (Configuración de Reparto de Suministros), CHG-2026-04-02
-- Issue: BUG-050
-- Descripción:
--   El panel "Configuración de Consumo" en AccommodationDetail.jsx muestra
--   un campo "Previsión de Fondo" (€/mes) por cada suministro (Electricidad,
--   Agua, Gas). Cuando el admin guarda el alojamiento, el UPDATE incluye
--   prevision_fund_electricity/water/gas pero esas columnas no existían en
--   la tabla accommodations → error "Could not find the column in schema cache".
--
--   Esta migración sustituye el borrador 20260329120000_add_prevision_fund_to_accommodations.sql
--   que no llegó a ejecutarse y tenía conflicto de timestamp con
--   20260329120000_fix_entities_nullable_fields.sql.
--
-- Semántica de los campos:
--   prevision_fund_electricity — Importe mensual de referencia para el fondo
--     de reserva de electricidad (€). Solo relevante cuando split_electricity=true.
--   prevision_fund_water — Ídem para agua.
--   prevision_fund_gas   — Ídem para gas.
--
-- Impacto sin esta migración:
--   Cualquier intento de guardar un alojamiento falla con error 400 de PostgREST.
-- ============================================================================


-- ============================================================================
-- PARTE 1: VALIDACIÓN PRE-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'accommodations'
      AND column_name  = 'prevision_fund_electricity'
  ) THEN
    RAISE NOTICE 'BUG-050: columna prevision_fund_electricity ya existe — migración omitida.';
  ELSE
    RAISE NOTICE 'BUG-050: añadiendo columnas prevision_fund a accommodations...';
  END IF;
END $$;


-- ============================================================================
-- PARTE 2: CAMBIOS DE ESTRUCTURA
-- ============================================================================

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS prevision_fund_electricity NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prevision_fund_water       NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prevision_fund_gas         NUMERIC(10,2) NOT NULL DEFAULT 0;


-- ============================================================================
-- PARTE 3: COMENTARIOS
-- ============================================================================

COMMENT ON COLUMN public.accommodations.prevision_fund_electricity IS
  'Importe mensual de previsión de fondo para Electricidad (€). '
  'Referencia para el administrador al calcular el fondo de reserva. '
  'Solo relevante cuando split_electricity = true (suministro no incluido en alquiler).';

COMMENT ON COLUMN public.accommodations.prevision_fund_water IS
  'Importe mensual de previsión de fondo para Agua (€). '
  'Solo relevante cuando split_water = true (suministro no incluido en alquiler).';

COMMENT ON COLUMN public.accommodations.prevision_fund_gas IS
  'Importe mensual de previsión de fondo para Gas (€). '
  'Solo relevante cuando split_gas = true (suministro no incluido en alquiler).';


-- ============================================================================
-- PARTE 4: VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'accommodations'
      AND column_name  = 'prevision_fund_electricity'
  ) THEN
    RAISE EXCEPTION 'BUG-050: ERROR — columna prevision_fund_electricity no se creó correctamente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'accommodations'
      AND column_name  = 'prevision_fund_water'
  ) THEN
    RAISE EXCEPTION 'BUG-050: ERROR — columna prevision_fund_water no se creó correctamente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'accommodations'
      AND column_name  = 'prevision_fund_gas'
  ) THEN
    RAISE EXCEPTION 'BUG-050: ERROR — columna prevision_fund_gas no se creó correctamente.';
  END IF;

  RAISE NOTICE 'BUG-050: migración completada correctamente — 3 columnas prevision_fund añadidas a accommodations.';
END $$;
