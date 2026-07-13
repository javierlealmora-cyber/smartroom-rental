-- Migration: Rename services tables to benefits
-- Date: 2026-07-08
-- Description: Renames services_* tables to benefits_* for terminology consistency
--   - services_catalog → benefits_catalog
--   - accommodation_services → benefits_accommodation
--   - lodger_services → benefits_lodger
-- Also renames RLS policies to match new table names

-- Step 1: Rename tables
ALTER TABLE public.services_catalog RENAME TO benefits_catalog;
ALTER TABLE public.accommodation_services RENAME TO benefits_accommodation;
ALTER TABLE public.lodger_services RENAME TO benefits_lodger;

-- Step 2: Rename RLS policies for benefits_catalog
ALTER POLICY services_catalog_delete_policy ON benefits_catalog RENAME TO benefits_catalog_delete_policy;
ALTER POLICY services_catalog_insert_policy ON benefits_catalog RENAME TO benefits_catalog_insert_policy;
ALTER POLICY services_catalog_select_policy ON benefits_catalog RENAME TO benefits_catalog_select_policy;
ALTER POLICY services_catalog_update_policy ON benefits_catalog RENAME TO benefits_catalog_update_policy;
ALTER POLICY tenant_services_catalog ON benefits_catalog RENAME TO tenant_benefits_catalog;

-- Step 3: Rename RLS policies for benefits_accommodation
ALTER POLICY accommodation_services_delete_policy ON benefits_accommodation RENAME TO benefits_accommodation_delete_policy;
ALTER POLICY accommodation_services_insert_policy ON benefits_accommodation RENAME TO benefits_accommodation_insert_policy;
ALTER POLICY accommodation_services_select_policy ON benefits_accommodation RENAME TO benefits_accommodation_select_policy;
ALTER POLICY accommodation_services_update_policy ON benefits_accommodation RENAME TO benefits_accommodation_update_policy;
ALTER POLICY tenant_accommodation_services ON benefits_accommodation RENAME TO tenant_benefits_accommodation;

-- Step 4: Rename RLS policies for benefits_lodger
ALTER POLICY lodger_services_delete_policy ON benefits_lodger RENAME TO benefits_lodger_delete_policy;
ALTER POLICY lodger_services_insert_policy ON benefits_lodger RENAME TO benefits_lodger_insert_policy;
ALTER POLICY lodger_services_select_policy ON benefits_lodger RENAME TO benefits_lodger_select_policy;
ALTER POLICY lodger_services_update_policy ON benefits_lodger RENAME TO benefits_lodger_update_policy;
ALTER POLICY tenant_lodger_services ON benefits_lodger RENAME TO tenant_benefits_lodger;

-- Step 5: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
