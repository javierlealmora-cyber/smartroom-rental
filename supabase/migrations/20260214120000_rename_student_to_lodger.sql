-- ============================================================
-- Migration: Rename role 'student' to 'lodger' in profiles
-- Date: 2026-02-14
-- Description: Unify terminology - students are now "lodgers"
--              (inquilinos). No CHECK constraint exists on the
--              role column, so a simple UPDATE suffices.
--              RLS policies use get_my_role() which reads the
--              value dynamically — no policy changes needed.
-- ============================================================

UPDATE profiles SET role = 'lodger' WHERE role = 'student';
