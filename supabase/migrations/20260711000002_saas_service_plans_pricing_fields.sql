-- Add pricing and validity fields to saas_service_plans
ALTER TABLE saas_service_plans
  ADD COLUMN IF NOT EXISTS start_date              date,
  ADD COLUMN IF NOT EXISTS end_date                date,
  ADD COLUMN IF NOT EXISTS deactivated_at          timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_price           numeric,
  ADD COLUMN IF NOT EXISTS annual_discount_months  int4,
  ADD COLUMN IF NOT EXISTS annual_price            numeric,
  ADD COLUMN IF NOT EXISTS tax_percent             numeric;
