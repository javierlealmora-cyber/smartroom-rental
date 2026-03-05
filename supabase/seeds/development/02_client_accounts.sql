-- ============================================================================
-- SEED: Client Accounts (Cuentas de Cliente)
-- Ambiente: development
-- Descripción: Cuentas de cliente (company_id eliminado en migración 20260305200001)
-- ============================================================================

-- Insertar client accounts de ejemplo
INSERT INTO public.client_accounts (
  id,
  name,
  status,
  plan_id,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Cuenta Demo Principal',
    'active',
    NULL,
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Cuenta García Madrid',
    'active',
    NULL,
    now(),
    now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Cuenta López Valencia',
    'active',
    NULL,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = now();

-- Verificación
SELECT 
  ca.id,
  ca.name,
  ca.status
FROM public.client_accounts ca
ORDER BY ca.created_at;
