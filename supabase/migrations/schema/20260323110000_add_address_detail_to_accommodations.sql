-- Añadir campos de dirección desglosada a accommodations
-- Estos campos se usan en AccommodationEdit.jsx pero no existían en la tabla

ALTER TABLE public.accommodations
  ADD COLUMN IF NOT EXISTS street_number text,
  ADD COLUMN IF NOT EXISTS floor text,
  ADD COLUMN IF NOT EXISTS door text;

-- Comentario: Estos campos complementan address_line1 y address_line2 para permitir
-- una dirección más estructurada en el formulario de edición de alojamientos
