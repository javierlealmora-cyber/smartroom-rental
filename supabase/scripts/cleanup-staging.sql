-- ============================================================================
-- SCRIPT: Limpiar STAGING completamente
-- Fecha: 2026-03-08
-- Descripción: Elimina TODAS las tablas, funciones, triggers, policies, etc.
-- ADVERTENCIA: Este script es DESTRUCTIVO. Solo usar en STAGING.
-- ============================================================================

\echo '=========================================='
\echo 'LIMPIANDO STAGING - INICIO'
\echo '=========================================='

-- ============================================================================
-- PASO 1: Deshabilitar RLS temporalmente
-- ============================================================================
\echo 'Paso 1/6: Deshabilitando RLS...'

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Eliminar todas las políticas RLS
-- ============================================================================
\echo 'Paso 2/6: Eliminando políticas RLS...'

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- PASO 3: Eliminar todas las tablas (CASCADE elimina dependencias)
-- ============================================================================
\echo 'Paso 3/6: Eliminando tablas...'

DROP TABLE IF EXISTS public.lodger_services CASCADE;
DROP TABLE IF EXISTS public.accommodation_services CASCADE;
DROP TABLE IF EXISTS public.services_catalog CASCADE;
DROP TABLE IF EXISTS public.lodgers CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.accommodations CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;
DROP TABLE IF EXISTS public.stripe_events CASCADE;
DROP TABLE IF EXISTS public.client_accounts CASCADE;
DROP TABLE IF EXISTS public.plans_catalog CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Eliminar vistas
DROP VIEW IF EXISTS public.payer_entities_view CASCADE;
DROP VIEW IF EXISTS public.owner_entities_view CASCADE;

-- ============================================================================
-- PASO 4: Eliminar funciones
-- ============================================================================
\echo 'Paso 4/6: Eliminando funciones...'

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_client_account_id() CASCADE;

-- ============================================================================
-- PASO 5: Limpiar storage buckets (solo políticas, buckets se mantienen)
-- ============================================================================
\echo 'Paso 5/6: Limpiando políticas de storage...'

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%accommodation_invoices%' OR policyname LIKE '%room_contracts%'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
  END LOOP;
END $$;

-- ============================================================================
-- PASO 6: Eliminar usuarios de auth.users (excepto superadmin)
-- ============================================================================
\echo 'Paso 6/6: Limpiando auth.users...'
\echo 'NOTA: Los usuarios deben eliminarse via Supabase Admin API'
\echo 'Este paso se ejecuta en el script Node.js de deployment'

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
\echo ''
\echo '=========================================='
\echo 'VERIFICACIÓN'
\echo '=========================================='

\echo 'Tablas restantes en public:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

\echo ''
\echo 'Funciones restantes en public:'
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;

\echo ''
\echo '=========================================='
\echo 'LIMPIEZA COMPLETADA'
\echo '=========================================='
