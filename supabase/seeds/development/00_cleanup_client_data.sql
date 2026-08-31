-- =====================================================
-- LIMPIEZA DE DATOS DE CUENTAS CLIENTE EN DEVELOPMENT
-- =====================================================
-- Este script elimina TODOS los datos relacionados con cuentas cliente
-- PRESERVA: Datos de superadmin, planes, y datos estáticos
-- =====================================================

-- ─── 0. Eliminar datos SAL antes de deshabilitar triggers ────────────────────
-- IMPORTANTE: session_replication_role='replica' desactiva FK CASCADE.
-- Las tablas SAL NO se eliminan en cascada al borrar client_accounts,
-- así que hay que borrarlas explícitamente ANTES para evitar filas huérfanas
-- con UUIDs obsoletos que rompan la idempotencia del seed 09_sal_shard_seed.sql.
-- Se usan bloques DO con IF EXISTS para que el script sea seguro si las
-- migraciones SAL no están aplicadas en el entorno.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_gateway_links') THEN
    DELETE FROM public.lock_gateway_links;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_access_grants') THEN
    DELETE FROM public.lock_access_grants;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_credentials') THEN
    DELETE FROM public.lock_credentials;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_notifications') THEN
    DELETE FROM public.lock_notifications;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_records') THEN
    DELETE FROM public.lock_records;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_claim_sessions') THEN
    DELETE FROM public.lock_claim_sessions;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_sync_commands') THEN
    DELETE FROM public.lock_sync_commands;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'locks') THEN
    DELETE FROM public.locks;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_placements') THEN
    DELETE FROM public.lock_placements;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_access_group_members') THEN
    DELETE FROM public.lock_access_group_members;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_access_group_scopes') THEN
    DELETE FROM public.lock_access_group_scopes;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_access_groups') THEN
    DELETE FROM public.lock_access_groups;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_access_actors') THEN
    DELETE FROM public.lock_access_actors;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_gateway_claim_sessions') THEN
    DELETE FROM public.lock_gateway_claim_sessions;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_gateways') THEN
    DELETE FROM public.lock_gateways;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_integrations') THEN
    DELETE FROM public.lock_integrations;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'saas_service_subscriptions') THEN
    DELETE FROM public.saas_service_subscriptions;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'lock_provider_pool_assignments') THEN
    DELETE FROM public.lock_provider_pool_assignments;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'common_areas') THEN
    DELETE FROM public.common_areas;
  END IF;
END $$;

-- Deshabilitar triggers temporalmente para evitar problemas de cascada
SET session_replication_role = 'replica';

-- 1. Eliminar asignaciones de inquilinos a habitaciones
DELETE FROM lodger_room_assignments;

-- 2. Eliminar habitaciones
DELETE FROM rooms;

-- 4. Eliminar alojamientos
DELETE FROM accommodations;

-- 5. Eliminar entidades
DELETE FROM entities;

-- 6. Eliminar cuentas cliente
DELETE FROM client_accounts;

-- 7. Eliminar profiles de usuarios que NO son superadmin
DELETE FROM profiles
WHERE role != 'superadmin';

-- 8. Eliminar usuarios de auth.users que NO son superadmin
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM profiles WHERE role = 'superadmin'
);

-- Rehabilitar triggers
SET session_replication_role = 'origin';

-- Verificación de limpieza
SELECT 
  'client_accounts' as tabla, COUNT(*) as registros FROM client_accounts
UNION ALL
SELECT 'entities', COUNT(*) FROM entities
UNION ALL
SELECT 'accommodations', COUNT(*) FROM accommodations
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'lodger_room_assignments', COUNT(*) FROM lodger_room_assignments
UNION ALL
SELECT 'profiles (no superadmin)', COUNT(*) FROM profiles WHERE role != 'superadmin'
UNION ALL
SELECT 'auth.users (no superadmin)', COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'superadmin');

SELECT '✅ Base de datos limpia - Solo queda superadmin' as status;
