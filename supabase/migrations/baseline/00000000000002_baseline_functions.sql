-- ============================================================================
-- BASELINE CERO: Funciones SQL
-- Descripción: Funciones helper para triggers y RLS
-- ============================================================================

-- ============================================================================
-- FUNCIÓN 1: update_updated_at_column
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Actualiza automáticamente el campo updated_at';

-- ============================================================================
-- FUNCIÓN 2: get_my_role
-- ============================================================================
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

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

COMMENT ON FUNCTION public.get_my_role() IS 'Obtiene el rol del usuario actual';

-- ============================================================================
-- FUNCIÓN 3: get_my_client_account_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_client_account_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT client_account_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_account_id() TO authenticated;

COMMENT ON FUNCTION public.get_my_client_account_id() IS 'Obtiene el client_account_id del usuario actual';

-- Verificación
SELECT 'Funciones creadas exitosamente:' as status;
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('update_updated_at_column', 'get_my_role', 'get_my_client_account_id');
