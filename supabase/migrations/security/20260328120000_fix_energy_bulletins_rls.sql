-- ============================================================================
-- FIX: RLS policies para energy_settlements y bulletins
-- Permite a admin INSERT y DELETE en su propio tenant
-- Detectado: 2026-03-28 — settleEnergyBill devolvía 403 al insertar boletines
-- ============================================================================

-- ── energy_settlements ────────────────────────────────────────────────────

-- Recrear DELETE para admin (antes solo superadmin)
DROP POLICY IF EXISTS "energy_settlements_delete_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_delete_policy"
ON public.energy_settlements FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- Asegurar que INSERT existe y es correcto
DROP POLICY IF EXISTS "energy_settlements_insert_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_insert_policy"
ON public.energy_settlements FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- ── bulletins ─────────────────────────────────────────────────────────────

-- Recrear INSERT (posiblemente faltaba o estaba incorrecta en el DB live)
DROP POLICY IF EXISTS "bulletins_insert_policy" ON public.bulletins;
CREATE POLICY "bulletins_insert_policy"
ON public.bulletins FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- Recrear DELETE para admin (antes solo superadmin)
DROP POLICY IF EXISTS "bulletins_delete_policy" ON public.bulletins;
CREATE POLICY "bulletins_delete_policy"
ON public.bulletins FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);
