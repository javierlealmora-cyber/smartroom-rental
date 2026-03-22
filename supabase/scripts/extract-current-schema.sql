-- Script para extraer esquema actual de tablas críticas en DEV
-- Ejecutar en Supabase SQL Editor y copiar resultados

-- ============================================================================
-- TABLA: payer_rental - Estructura completa
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payer_rental'
ORDER BY ordinal_position;

-- ============================================================================
-- TABLA: profiles - Solo campos de inquilino (añadidos recientemente)
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'first_name', 'last_name', 'last_name1', 'last_name2',
    'nickname', 'document_type', 'document_id', 'gender',
    'birth_date', 'nationality', 'phone',
    'emergency_contact_name', 'emergency_contact_phone'
  )
ORDER BY column_name;

-- ============================================================================
-- CONSTRAINTS de payer_rental
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'payer_rental';

-- ============================================================================
-- CHECK CONSTRAINTS de profiles (onboarding_status)
-- ============================================================================
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND contype = 'c'
  AND conname LIKE '%onboarding%';
