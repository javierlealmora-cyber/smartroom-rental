-- ============================================================================
-- SEED: Companies (Empresas) - DEPRECATED
-- Ambiente: development
-- Descripción: TABLA ELIMINADA - Este seed ya no se usa
-- Fecha eliminación: 2026-03-05
-- Migración: 20260305200001_remove_companies_table.sql
-- ============================================================================

-- ⚠️ NOTA: La tabla companies fue eliminada en la migración 20260305200001
-- Este archivo se mantiene solo como referencia histórica
-- NO ejecutar este seed

/*
-- Insertar empresas de ejemplo (DEPRECATED)
INSERT INTO public.companies (
  id,
  name,
  tax_id,
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
    '11111111-1111-1111-1111-111111111111',
    'SmartRoom Demo',
    'B12345678',
    'demo@smartroom.com',
    '+34 600 000 001',
    'Calle Demo 1',
    'Madrid',
    '28001',
    'España',
    'active',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Alojamientos García',
    'B23456789',
    'info@garcia.com',
    '+34 600 000 002',
    'Avenida Principal 25',
    'Barcelona',
    '08001',
    'España',
    'active',
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Residencias López',
    'B34567890',
    'contacto@lopez.com',
    '+34 600 000 003',
    'Plaza Mayor 10',
    'Valencia',
    '46001',
    'España',
    'active',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tax_id = EXCLUDED.tax_id,
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
  id,
  name,
  city,
  status
FROM public.companies
ORDER BY created_at;
*/
