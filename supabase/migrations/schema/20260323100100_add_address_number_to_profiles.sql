-- Añadir campo address_number a profiles
-- Este campo separa el número de la calle del nombre de la calle

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_number text;

-- Comentario: Este campo permite almacenar el número de la calle por separado
-- para una mejor estructuración de la dirección
