-- ============================================================================
-- BACKUP MANUAL DE DEVELOPMENT - 2026-03-05
-- Tablas que serán afectadas por las migraciones
-- ============================================================================

-- Backup de companies (será eliminada)
-- SELECT * FROM public.companies;

-- Backup de profiles (company_id será eliminado)
-- SELECT * FROM public.profiles;

-- Backup de client_accounts (company_id será eliminado)
-- SELECT * FROM public.client_accounts;

-- NOTA: Este es un backup de referencia manual
-- Las migraciones son idempotentes y pueden revertirse con supabase db reset
