-- ============================================================================
-- REQ-015 — Habitación compartida con acompañante
-- Migración 3/3 — FK accompanist_id en lodger_room_assignments
-- ============================================================================
-- Fecha: 2026-05-03
-- Autor: javierlealmora-cyber
--
-- Notas:
--  - Nullable: una asignación puede existir sin acompañante (caso normal).
--  - ON DELETE SET NULL: si el acompañante se borrase físicamente
--    (caso prohibido pero por seguridad), no se rompe la asignación.
--  - Índice parcial WHERE accompanist_id IS NOT NULL: optimiza
--    búsquedas y JOIN del buscador de inquilinos.
-- ============================================================================

ALTER TABLE public.lodger_room_assignments
  ADD COLUMN IF NOT EXISTS accompanist_id uuid NULL
  REFERENCES public.lodger_accompanists(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.lodger_room_assignments.accompanist_id IS
  'FK opcional al acompañante de la asignación (REQ-015). En reassign_room la Edge debe arrastrar este id por código a la nueva asignación.';

CREATE INDEX IF NOT EXISTS idx_assignments_accompanist
  ON public.lodger_room_assignments (accompanist_id)
  WHERE accompanist_id IS NOT NULL;
