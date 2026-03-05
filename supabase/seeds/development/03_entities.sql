-- ============================================================================
-- SEED: Entities (Entidades)
-- Ambiente: development
-- Descripción: Entidades propietarias de alojamientos
-- ============================================================================

-- Insertar entidades de ejemplo
INSERT INTO public.entities (
  id,
  client_account_id,
  name,
  tax_id,
  entity_type,
  email,
  phone,
  address,
  city,
  postal_code,
  country,
  status,
  created_at,
  updated_at
)
VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Propiedades Demo S.L.',
    'B11111111',
    'company',
    'propiedades@demo.com',
    '+34 600 100 001',
    'Calle Propietario 1',
    'Madrid',
    '28001',
    'España',
    'active',
    now(),
    now()
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'García Inmobiliaria',
    'B22222222',
    'company',
    'inmobiliaria@garcia.com',
    '+34 600 100 002',
    'Avenida Inversiones 50',
    'Barcelona',
    '08001',
    'España',
    'active',
    now(),
    now()
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Juan López Pérez',
    '12345678A',
    'individual',
    'juan.lopez@email.com',
    '+34 600 100 003',
    'Calle Personal 15',
    'Valencia',
    '46001',
    'España',
    'active',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  client_account_id = EXCLUDED.client_account_id,
  name = EXCLUDED.name,
  tax_id = EXCLUDED.tax_id,
  entity_type = EXCLUDED.entity_type,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  updated_at = now();

-- Verificación
SELECT 
  e.id,
  e.name,
  e.entity_type,
  ca.name as client_account_name,
  e.status
FROM public.entities e
JOIN public.client_accounts ca ON e.client_account_id = ca.id
ORDER BY e.created_at;
