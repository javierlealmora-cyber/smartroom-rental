-- ============================================================================
-- Políticas RLS para saas_service_subscriptions
-- Permite a admins leer y crear/actualizar suscripciones de su propia cuenta.
-- ============================================================================

-- Función helper: obtiene el client_account_id del usuario autenticado
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

-- Habilitar RLS si no estaba habilitado
ALTER TABLE public.saas_service_subscriptions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas que puedan existir
DROP POLICY IF EXISTS "subscriptions_superadmin_all"    ON public.saas_service_subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_select"      ON public.saas_service_subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_insert"      ON public.saas_service_subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_update"      ON public.saas_service_subscriptions;

-- Superadmin: acceso total
CREATE POLICY "subscriptions_superadmin_all"
  ON public.saas_service_subscriptions
  FOR ALL
  TO authenticated
  USING      (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

-- Admin: puede leer sus propias suscripciones
CREATE POLICY "subscriptions_admin_select"
  ON public.saas_service_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'
    AND client_account_id = get_my_client_account_id()
  );

-- Admin: puede insertar suscripciones de su cuenta
CREATE POLICY "subscriptions_admin_insert"
  ON public.saas_service_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND client_account_id = get_my_client_account_id()
  );

-- Admin: puede actualizar suscripciones de su cuenta (para upsert)
CREATE POLICY "subscriptions_admin_update"
  ON public.saas_service_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    AND client_account_id = get_my_client_account_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND client_account_id = get_my_client_account_id()
  );
