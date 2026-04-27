-- ============================================================================
-- Migración: Estandarización de campos de dirección en tabla accommodations
-- Fecha: 2026-04-12
-- Descripción: Renombra y reorganiza columnas de dirección para usar 
--              nomenclatura estándar con prefijo 'address_' consistente
-- ============================================================================

-- Modelo estándar de dirección (7 campos):
-- 1. address_street     → Calle / Vía
-- 2. address_number     → Número
-- 3. address_floor      → Piso / Puerta / Escalera
-- 4. address_postal_code → Código Postal
-- 5. address_city       → Ciudad / Municipio
-- 6. address_province   → Provincia
-- 7. address_country    → País

-- PASO 1: Renombrar columnas existentes
ALTER TABLE public.accommodations RENAME COLUMN street_number TO address_number;
ALTER TABLE public.accommodations RENAME COLUMN floor TO address_floor;
ALTER TABLE public.accommodations RENAME COLUMN postal_code TO address_postal_code;
ALTER TABLE public.accommodations RENAME COLUMN city TO address_city;
ALTER TABLE public.accommodations RENAME COLUMN province TO address_province;
ALTER TABLE public.accommodations RENAME COLUMN country TO address_country;

-- PASO 2: Añadir nueva columna address_street
ALTER TABLE public.accommodations ADD COLUMN address_street text;

-- PASO 3: Migrar datos de address_line1 a address_street
-- IMPORTANTE: address_line1 contiene concatenación (calle + número + piso)
-- Solo migramos si NO hay datos desglosados (address_number IS NULL)
UPDATE public.accommodations 
SET address_street = address_line1 
WHERE address_line1 IS NOT NULL 
  AND address_number IS NULL;

-- PASO 4: Concatenar door en address_floor si existe
UPDATE public.accommodations 
SET address_floor = CASE
  WHEN address_floor IS NOT NULL AND door IS NOT NULL THEN 
    CONCAT(address_floor, ' ', door)
  WHEN door IS NOT NULL THEN 
    door
  ELSE 
    address_floor
END
WHERE door IS NOT NULL AND door != '';

-- PASO 5: Migrar address_line2 a address_floor si está vacío
-- address_line2 se usaba para bloque/escalera
UPDATE public.accommodations 
SET address_floor = CASE
  WHEN address_floor IS NOT NULL AND address_line2 IS NOT NULL THEN 
    CONCAT(address_floor, ' ', address_line2)
  WHEN address_line2 IS NOT NULL THEN 
    address_line2
  ELSE 
    address_floor
END
WHERE address_line2 IS NOT NULL 
  AND address_line2 != '';

-- PASO 6: Eliminar columnas antiguas
ALTER TABLE public.accommodations DROP COLUMN door;
ALTER TABLE public.accommodations DROP COLUMN address_line1;
ALTER TABLE public.accommodations DROP COLUMN address_line2;

-- Comentarios para documentación
COMMENT ON COLUMN public.accommodations.address_street IS 'Calle o vía (ej: Calle Mayor, Avda. de la Constitución)';
COMMENT ON COLUMN public.accommodations.address_number IS 'Número de la vía';
COMMENT ON COLUMN public.accommodations.address_floor IS 'Piso, puerta, escalera, bloque, etc.';
COMMENT ON COLUMN public.accommodations.address_postal_code IS 'Código postal (5 dígitos)';
COMMENT ON COLUMN public.accommodations.address_city IS 'Ciudad o municipio';
COMMENT ON COLUMN public.accommodations.address_province IS 'Provincia';
COMMENT ON COLUMN public.accommodations.address_country IS 'País (por defecto: España)';

-- Recargar caché de PostgREST para que reconozca los nuevos nombres
NOTIFY pgrst, 'reload schema';
