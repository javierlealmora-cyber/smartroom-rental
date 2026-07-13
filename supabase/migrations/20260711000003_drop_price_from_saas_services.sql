-- Remove price_amount and billing_period from saas_services (these live in saas_service_plans)
ALTER TABLE saas_services
  DROP COLUMN IF EXISTS price_amount,
  DROP COLUMN IF EXISTS billing_period;
