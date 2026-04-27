-- ============================================================================
-- Migración: Vault helpers para Edge Functions SAL
-- Fecha: 2026-04-12
--
-- Crea funciones SECURITY DEFINER en el schema public para que las Edge
-- Functions SAL puedan interactuar con Supabase Vault a través de .rpc().
--
-- El schema vault solo es accesible internamente en PostgreSQL. Las EFs
-- necesitan wrappers públicos para llamarlos via supabase.rpc().
-- ============================================================================

-- ─── Crear secreto en Vault ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sal_vault_create_secret(
  p_secret      text,
  p_name        text,
  p_description text DEFAULT 'SAL integration credential'
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT vault.create_secret(p_secret, p_name, p_description);
$$;

-- ─── Actualizar secreto existente en Vault ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sal_vault_update_secret(
  p_id     uuid,
  p_secret text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT vault.update_secret(p_id, p_secret);
$$;

-- ─── Permisos: solo service_role puede llamar estas funciones ─────────────────
-- Las EFs siempre usan service_role — revocamos acceso al rol public
-- para que no sean invocables desde el cliente web.
REVOKE ALL ON FUNCTION public.sal_vault_create_secret(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sal_vault_update_secret(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sal_vault_create_secret(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sal_vault_update_secret(uuid, text) TO service_role;

-- ─── Notas ───────────────────────────────────────────────────────────────────
-- La lectura de secretos usa vault.decrypted_secrets (vista) directamente:
--   const { data } = await supabase.schema('vault')
--     .from('decrypted_secrets')
--     .select('decrypted_secret')
--     .eq('id', vaultKeyRef)
--     .single();
-- Esto funciona con service_role sin necesidad de wrapper adicional.
