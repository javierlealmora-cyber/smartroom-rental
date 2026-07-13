-- Add name and description columns to saas_service_features
ALTER TABLE saas_service_features
  ADD COLUMN IF NOT EXISTS name        text,
  ADD COLUMN IF NOT EXISTS description text;
