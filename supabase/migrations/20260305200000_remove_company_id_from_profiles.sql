-- ============================================================================
-- MIGRATION: Eliminar company_id de profiles
-- Fecha: 2026-03-05
-- Descripción: Elimina la columna company_id de la tabla profiles y sus
--              dependencias (índices, constraints, políticas RLS)
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar políticas RLS que usan company_id
-- ============================================================================
-- Eliminar políticas que referencian company_id si existen
DO $$ 
BEGIN
  -- Buscar y eliminar políticas que usen company_id
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname LIKE '%company%'
  ) THEN
    -- Eliminar políticas relacionadas con company
    DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update profiles in their company" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Eliminar índices relacionados con company_id
-- ============================================================================
DROP INDEX IF EXISTS public.idx_profiles_company_id;
DROP INDEX IF EXISTS public.idx_profiles_company;

-- ============================================================================
-- PASO 3: Eliminar foreign key constraint
-- ============================================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_company_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_company_id_fkey;
  END IF;
END $$;

-- ============================================================================
-- PASO 4: Eliminar columna company_id
-- ============================================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN company_id;
  END IF;
END $$;

-- ============================================================================
-- PASO 5: Recrear políticas RLS sin company_id
-- ============================================================================
-- Política: Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Admins y superadmins pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin', 'api')
    )
  );

-- Política: Admins y superadmins pueden actualizar perfiles
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin', 'api')
    )
  );

-- ============================================================================
-- PASO 6: Comentarios de documentación
-- ============================================================================
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario - company_id eliminado en migración 20260305200000';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que la columna fue eliminada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    RAISE EXCEPTION 'ERROR: La columna company_id todavía existe en profiles';
  ELSE
    RAISE NOTICE 'OK: La columna company_id fue eliminada exitosamente de profiles';
  END IF;
END $$;
