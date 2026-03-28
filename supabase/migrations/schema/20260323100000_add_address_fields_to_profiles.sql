-- Añadir campos de dirección a profiles
-- Estos campos fueron añadidos en el frontend (LodgerFormFields.jsx) pero faltaba la migración

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_floor text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_province text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'España';

-- Comentario: Estos campos son opcionales y permiten almacenar la dirección completa del inquilino
