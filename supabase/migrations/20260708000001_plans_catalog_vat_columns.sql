-- Migración: añadir columnas vat_applicable y vat_percentage a plans_catalog
-- Requerido por el formulario de edición de planes (PlanDetail / PlanCreate)

ALTER TABLE plans_catalog
  ADD COLUMN IF NOT EXISTS vat_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_percentage numeric(5,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
