-- ============================================================================
-- REQ-015 — Habitación compartida con acompañante
-- Migración 1/3 — Flag is_shared en rooms (solo informativo para UX)
-- ============================================================================
-- Fecha: 2026-05-03
-- Autor: javierlealmora-cyber
-- Plan: C:\Users\javie\.windsurf\plans\habitacion-compartida-acompanante-133d20.md
-- Regla: @.windsurf/rules/shared-rooms.md
--
-- Notas:
--  - is_shared NO altera el modelo de capacidad ni la regla
--    "1 asignación activa por habitación" (EXCLUDE no_overlapping_assignments).
--  - Default false → cero regresión sobre datos existentes.
-- ============================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rooms.is_shared IS
  'Flag UX informativo: indica si la habitación está pensada para uso compartido (titular + acompañante). No altera la capacidad ni los estados derivados.';
