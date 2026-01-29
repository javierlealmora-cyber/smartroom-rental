-- ============================================================================
-- MIGRACION: Agregar campos de contacto a la tabla companies
-- Fecha: 2026-01-26
-- Descripcion: Agrega campos para informacion de contacto y updated_at
-- ============================================================================

-- Agregar campo contact_name si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN contact_name TEXT;
  END IF;
END $$;

-- Agregar campo contact_email si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN contact_email TEXT;
  END IF;
END $$;

-- Agregar campo contact_phone si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN contact_phone TEXT;
  END IF;
END $$;

-- Agregar campo updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'companies'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Crear trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- VERIFICACION
-- ============================================================================
-- Ejecutar despues de la migracion para verificar:
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'companies'
ORDER BY ordinal_position;
*/
