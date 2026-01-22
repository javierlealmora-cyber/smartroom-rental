-- ============================================================================
-- MIGRACIÓN: Arreglar recursión infinita en políticas RLS
-- Fecha: 2026-01-22
-- Descripción: Elimina políticas RLS con recursión y crea políticas correctas
--              para el modelo multi-tenant de SmartRent Systems
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar todas las políticas RLS existentes (con recursión)
-- ============================================================================

-- Deshabilitar RLS temporalmente para hacer limpieza
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes en companies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'companies' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON companies', policy_record.policyname);
    END LOOP;
END $$;

-- Eliminar todas las políticas existentes en profiles
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Crear función helper para obtener rol del usuario
-- (SIN hacer consultas recursivas a profiles)
-- ============================================================================

-- Función para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Función para obtener la company_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- PASO 3: Políticas RLS para COMPANIES
-- ============================================================================

-- Habilitar RLS en companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- SELECT: Superadmin ve todo, Admin/Tenant ven solo su company
CREATE POLICY "companies_select_policy"
ON companies
FOR SELECT
TO authenticated
USING (
  -- Superadmin ve todas las empresas
  get_my_role() = 'superadmin'
  OR
  -- Admin y Tenant ven solo su empresa
  (get_my_role() IN ('admin', 'tenant') AND id = get_my_company_id())
);

-- INSERT: Solo Superadmin puede crear empresas
CREATE POLICY "companies_insert_policy"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
);

-- UPDATE: Superadmin puede actualizar todas, Admin solo su empresa
CREATE POLICY "companies_update_policy"
ON companies
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND id = get_my_company_id())
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND id = get_my_company_id())
);

-- DELETE: Solo Superadmin puede eliminar empresas
CREATE POLICY "companies_delete_policy"
ON companies
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
);

-- ============================================================================
-- PASO 4: Políticas RLS para PROFILES
-- ============================================================================

-- Habilitar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Cada usuario ve su perfil, Superadmin ve todo, Admin ve perfiles de su company
CREATE POLICY "profiles_select_policy"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Superadmin ve todos los perfiles
  get_my_role() = 'superadmin'
  OR
  -- Cada usuario ve su propio perfil
  id = auth.uid()
  OR
  -- Admin ve perfiles de su empresa
  (get_my_role() = 'admin' AND company_id = get_my_company_id())
);

-- INSERT: Permitir creación de perfil al registrarse (vía trigger de auth.users)
CREATE POLICY "profiles_insert_policy"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Solo puede crear su propio perfil o ser superadmin
  id = auth.uid()
  OR
  get_my_role() = 'superadmin'
);

-- UPDATE: Cada usuario puede actualizar su perfil, Superadmin puede actualizar todos
CREATE POLICY "profiles_update_policy"
ON profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND company_id = get_my_company_id())
)
WITH CHECK (
  id = auth.uid()
  OR
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND company_id = get_my_company_id())
);

-- DELETE: Solo Superadmin puede eliminar perfiles
CREATE POLICY "profiles_delete_policy"
ON profiles
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
);

-- ============================================================================
-- PASO 5: Grants y permisos
-- ============================================================================

-- Asegurar que authenticated puede acceder a las funciones helper
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Query para verificar que las políticas se crearon correctamente
-- (Ejecutar después de la migración)
/*
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression
FROM pg_policies
WHERE tablename IN ('companies', 'profiles')
ORDER BY tablename, policyname;
*/

-- ============================================================================
-- NOTAS DE LA MIGRACIÓN
-- ============================================================================

-- PROBLEMA ORIGINAL:
--   Las políticas RLS tenían recursión infinita porque hacían subconsultas
--   a la misma tabla para verificar permisos.
--
-- SOLUCIÓN:
--   Usar funciones helper (get_my_role, get_my_company_id) marcadas como
--   SECURITY DEFINER que hacen la consulta una sola vez y cachean el resultado.
--   Estas funciones son STABLE, lo que permite a PostgreSQL optimizarlas.
--
-- IMPORTANTE:
--   Las funciones helper están marcadas como SECURITY DEFINER, lo que significa
--   que se ejecutan con permisos del propietario (superusuario de la BD).
--   Esto evita la recursión porque bypasean RLS internamente, pero son seguras
--   porque solo devuelven información del usuario actual (auth.uid()).
