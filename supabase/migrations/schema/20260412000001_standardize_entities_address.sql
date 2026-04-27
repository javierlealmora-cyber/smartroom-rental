-- ============================================================================
-- Migración: Estandarización de campos de dirección en tabla entities
-- Fecha: 2026-04-12
-- Descripción: Renombra columnas de dirección para usar nomenclatura estándar
--              con prefijo 'address_' consistente en toda la aplicación
-- ============================================================================

-- Modelo estándar de dirección (7 campos):
-- 1. address_street     → Calle / Vía
-- 2. address_number     → Número
-- 3. address_floor      → Piso / Puerta / Escalera
-- 4. address_postal_code → Código Postal
-- 5. address_city       → Ciudad / Municipio
-- 6. address_province   → Provincia
-- 7. address_country    → País

-- Renombrar columnas de entities
ALTER TABLE public.entities RENAME COLUMN street TO address_street;
ALTER TABLE public.entities RENAME COLUMN street_number TO address_number;
ALTER TABLE public.entities RENAME COLUMN address_extra TO address_floor;
ALTER TABLE public.entities RENAME COLUMN zip TO address_postal_code;
ALTER TABLE public.entities RENAME COLUMN city TO address_city;
ALTER TABLE public.entities RENAME COLUMN province TO address_province;
ALTER TABLE public.entities RENAME COLUMN country TO address_country;

-- Comentarios para documentación
COMMENT ON COLUMN public.entities.address_street IS 'Calle o vía (ej: Calle Mayor, Avda. de la Constitución)';
COMMENT ON COLUMN public.entities.address_number IS 'Número de la vía';
COMMENT ON COLUMN public.entities.address_floor IS 'Piso, puerta, escalera, bloque, etc.';
COMMENT ON COLUMN public.entities.address_postal_code IS 'Código postal (5 dígitos)';
COMMENT ON COLUMN public.entities.address_city IS 'Ciudad o municipio';
COMMENT ON COLUMN public.entities.address_province IS 'Provincia';
COMMENT ON COLUMN public.entities.address_country IS 'País (por defecto: España)';

-- Recargar caché de PostgREST para que reconozca los nuevos nombres
NOTIFY pgrst, 'reload schema';
