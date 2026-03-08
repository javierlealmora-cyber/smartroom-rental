-- ============================================================================
-- DATOS ESTÁTICOS: plans_catalog
-- Ambiente: DEVELOPMENT
-- Descripción: Catálogo de planes de suscripción (idempotente)
-- ============================================================================

-- Insertar o actualizar planes
INSERT INTO public.plans_catalog (
  code, name, description, status, start_date,
  monthly_price, annual_discount_months, tax_percent,
  max_owners, max_accommodations, max_rooms,
  max_admin_users, max_associated_admins, max_api_users, max_viewer_users,
  branding_enabled, logo_allowed, theme_editable,
  allows_multi_owner, allows_owner_change, allows_receipt_upload,
  services, visible_for_new_accounts
) VALUES
(
  'basic', 'Basic',
  'Plan básico para pequeños propietarios con hasta 3 alojamientos',
  'active', '2024-01-01',
  29.99, 2, 21,
  1, 3, 20,
  1, 0, 0, 0,
  false, false, false,
  false, false, true,
  '["encuestas"]'::jsonb,
  true
),
(
  'investor', 'Investor',
  'Plan para inversores con múltiples propiedades y empresas fiscales',
  'active', '2024-01-01',
  79.99, 2, 21,
  5, 8, 60,
  2, 1, 1, 0,
  true, true, true,
  true, false, true,
  '["encuestas","lavanderia","tickets_incidencias"]'::jsonb,
  true
),
(
  'business', 'Business',
  'Plan empresarial con alojamientos ilimitados y servicios avanzados',
  'active', '2024-01-01',
  149.99, 2, 21,
  10, -1, -1,
  3, 2, 3, 0,
  true, true, true,
  true, false, true,
  '["encuestas","lavanderia","limpieza","tickets_incidencias","informes_avanzados"]'::jsonb,
  true
),
(
  'agency', 'Agency',
  'Plan para agencias con gestión multi-empresa y cambio de propietarios',
  'active', '2024-01-01',
  299.99, 2, 21,
  -1, -1, -1,
  3, 2, 5, -1,
  true, true, true,
  true, true, true,
  '["encuestas","lavanderia","limpieza","tickets_incidencias","whatsapp_soporte","informes_avanzados"]'::jsonb,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  monthly_price = EXCLUDED.monthly_price,
  annual_discount_months = EXCLUDED.annual_discount_months,
  tax_percent = EXCLUDED.tax_percent,
  max_owners = EXCLUDED.max_owners,
  max_accommodations = EXCLUDED.max_accommodations,
  max_rooms = EXCLUDED.max_rooms,
  max_admin_users = EXCLUDED.max_admin_users,
  max_associated_admins = EXCLUDED.max_associated_admins,
  max_api_users = EXCLUDED.max_api_users,
  max_viewer_users = EXCLUDED.max_viewer_users,
  branding_enabled = EXCLUDED.branding_enabled,
  logo_allowed = EXCLUDED.logo_allowed,
  theme_editable = EXCLUDED.theme_editable,
  allows_multi_owner = EXCLUDED.allows_multi_owner,
  allows_owner_change = EXCLUDED.allows_owner_change,
  allows_receipt_upload = EXCLUDED.allows_receipt_upload,
  services = EXCLUDED.services,
  visible_for_new_accounts = EXCLUDED.visible_for_new_accounts,
  updated_at = now();

-- Verificación
SELECT 'Planes insertados/actualizados:' as status;
SELECT code, name, monthly_price, status FROM public.plans_catalog ORDER BY monthly_price;
