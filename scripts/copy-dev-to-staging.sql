-- ========================================
-- Script para copiar datos de DEV a STAGING
-- Proyecto: SmartRoom Rental
-- Fecha: 2026-03-01
-- ========================================

-- IMPORTANTE: Este script debe ejecutarse en STAGING
-- Los usuarios auth.users deben crearse manualmente después

BEGIN;

-- ========================================
-- 1. CLIENT ACCOUNTS
-- ========================================

-- Cuenta Superadmin: Manuel Inversor
INSERT INTO public.client_accounts (
  id, name, slug, plan_code, billing_cycle, status, start_date,
  branding_name, branding_primary_color, branding_secondary_color, branding_logo_url,
  created_at, updated_at
) VALUES (
  '1473348b-bd76-493a-940d-77faef7fec05',
  'Manuel Inversor',
  'manuel-inversor',
  'investor',
  'annual',
  'active',
  '2026-02-15',
  'Axpe Inversores',
  '#143885',
  '#eab806',
  'www.axpe.com',
  '2026-02-15 19:38:59.131136+00',
  '2026-02-15 19:38:59.379525+00'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- Cuenta con más datos: Enrique Admin Investor
INSERT INTO public.client_accounts (
  id, name, slug, plan_code, billing_cycle, status, start_date,
  branding_name, branding_primary_color, branding_secondary_color,
  contact_email, contact_phone,
  created_at, updated_at
) VALUES (
  '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
  'Enrique Admin Investor',
  'enrique-admin-investor',
  'investor',
  'annual',
  'active',
  '2026-02-17',
  'Dycsa Admin Investor SL',
  '#ec7846',
  '#1043b1',
  'investordycsa@housingspacesolutions.com',
  '626322547',
  '2026-02-17 18:13:50.416264+00',
  '2026-02-22 09:46:09.911379+00'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- 2. ENTITIES (Propietarios y Pagadores)
-- ========================================

INSERT INTO public.entities (
  id, client_account_id, type, status, legal_type, legal_name,
  tax_id, billing_email, phone,
  country, province, city, zip, street, street_number,
  created_at, updated_at
) VALUES 
  -- Owner entity - Dycsa Investor Madrid S.L.
  (
    'bea71c04-98d2-4e9d-afc3-0802fde1e212',
    '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
    'owner',
    'active',
    'persona_juridica',
    'Dycsa Investor Madrid S.L.',
    'B585656585',
    'Inversordycsanorte@housingspacesolutions.com',
    '658525478',
    'Espana',
    'Madrid',
    'Madrid',
    '28003',
    'Calle Pez',
    '3',
    '2026-02-22 09:47:57.245619+00',
    '2026-02-22 10:37:23.113182+00'
  ),
  -- Payer entity - Enrique (persona física)
  (
    '6f5f34ea-89ba-469a-90cc-0977808597d5',
    '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
    'payer',
    'active',
    'persona_fisica',
    NULL,
    'B56585254',
    'investordycsa@housingspacesolutions.com',
    '5458254',
    'Espana',
    'Madrid',
    'Madrid',
    '28545',
    'Calle Luna',
    '8',
    '2026-02-17 18:13:50.531867+00',
    '2026-02-22 17:35:15.932868+00'
  ),
  -- Owner entity - Enrique (persona física)
  (
    '3ab334b6-d83b-4a6c-8c90-7db3849a5f8e',
    '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
    'owner',
    'active',
    'persona_fisica',
    NULL,
    'B56585254',
    'investordycsa@housingspacesolutions.com',
    '5458254',
    'Espana',
    'Madrid',
    'Madrid',
    '28545',
    'Calle Luna',
    '8',
    '2026-02-17 18:13:50.603779+00',
    '2026-02-22 20:54:46.102583+00'
  )
ON CONFLICT (id) DO UPDATE SET
  updated_at = EXCLUDED.updated_at;

-- Actualizar first_name, last_name para personas físicas
UPDATE public.entities 
SET first_name = 'Enrique', 
    last_name1 = 'Admin', 
    last_name2 = 'Investor'
WHERE id IN ('6f5f34ea-89ba-469a-90cc-0977808597d5', '3ab334b6-d83b-4a6c-8c90-7db3849a5f8e');

-- ========================================
-- 3. ACCOMMODATIONS
-- ========================================

INSERT INTO public.accommodations (
  id, client_account_id, owner_entity_id, name,
  address_line1, address_line2, postal_code, city, country,
  status, utilities_included,
  split_electricity, split_water, split_gas,
  split_mode_electricity, split_mode_water, split_mode_gas,
  extra_costs, has_individual_meters,
  created_at, updated_at
) VALUES
  -- Residencia Dycsa Madrid Norte
  (
    '47690a93-05af-4fdb-8ac1-c8d3af6b3263',
    '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
    'bea71c04-98d2-4e9d-afc3-0802fde1e212',
    'Residencia Dycsa Madrid Norte',
    'Calle Luna 5 5º',
    '5',
    '28554',
    'Madrid',
    'España',
    'active',
    true,
    false,
    false,
    false,
    'equal',
    'equal',
    'equal',
    '[]'::jsonb,
    false,
    '2026-02-22 10:10:57.068948+00',
    '2026-02-22 10:38:02.309902+00'
  ),
  -- Residencia Dycsa Madrid Sur
  (
    'aa515883-6b3a-4d36-ac58-9f5806f6a111',
    '866fb84e-d9ab-4717-9c1e-569c6f1c89eb',
    'bea71c04-98d2-4e9d-afc3-0802fde1e212',
    'Residencia Dycsa Madrid Sur',
    'Calle Luna 4 4º 4',
    '4',
    '28554',
    'Madrid',
    'España',
    'active',
    false,
    true,
    true,
    true,
    'prorated',
    'equal',
    'equal',
    '[{"name":"Basura","split_mode":"equal"},{"name":"Wifi","split_mode":"equal"}]'::jsonb,
    false,
    '2026-02-22 10:13:50.593873+00',
    '2026-02-25 18:29:58.437236+00'
  )
ON CONFLICT (id) DO UPDATE SET
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- 4. ROOMS
-- ========================================

INSERT INTO public.rooms (
  id, accommodation_id, client_account_id, number,
  monthly_rent, square_meters, bathroom_type, kitchen_type,
  status, created_at, updated_at
) VALUES
  -- Rooms de Residencia Norte
  ('a2ce233a-4e08-4167-b94d-6ce60a826465', '47690a93-05af-4fdb-8ac1-c8d3af6b3263', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '01', 450.00, 23.00, 'suite', 'suite', 'occupied', '2026-02-22 10:10:57.13833+00', '2026-02-22 10:44:42.975541+00'),
  ('29cd153f-fb3f-421d-b073-509b64f3b827', '47690a93-05af-4fdb-8ac1-c8d3af6b3263', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '02', 450.00, 18.00, 'private', 'private', 'occupied', '2026-02-22 10:10:57.13833+00', '2026-02-22 12:30:11.392772+00'),
  ('992afd8f-18c4-4061-bc2f-d2413c12d22d', '47690a93-05af-4fdb-8ac1-c8d3af6b3263', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '03', 450.00, 23.00, 'private', 'private', 'free', '2026-02-22 10:10:57.13833+00', '2026-02-22 10:10:57.13833+00'),
  ('b92f8848-551b-407c-bb95-f0a7f113f24b', '47690a93-05af-4fdb-8ac1-c8d3af6b3263', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '04', 450.00, 22.00, 'suite', 'suite', 'free', '2026-02-22 10:10:57.13833+00', '2026-02-22 10:10:57.13833+00'),
  -- Rooms de Residencia Sur
  ('6afa57c6-b88e-423e-a207-ceefc324efec', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '01', 450.00, 15.00, 'private', 'suite', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-25 18:29:58.437236+00'),
  ('dabb50f7-c01a-4867-a362-94fee4a88ed3', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '02', 450.00, 23.00, 'private', 'private', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-25 18:29:58.437236+00'),
  ('a55f69e8-bebd-41fc-86a7-1f9749a72c7b', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '03', 450.00, 15.00, 'suite', 'private', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-22 10:19:04.41457+00'),
  ('91a96e51-8476-4984-b82f-7aa31130c377', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '04', 450.00, 28.00, 'private', 'private', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-24 20:24:56.575854+00'),
  ('90d88741-4c91-4cd3-a3fc-cd4b76458e55', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '05', 450.00, 22.00, 'suite', 'suite', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-25 18:29:58.437236+00'),
  ('b0c14dab-e64c-4693-85ca-5aa98bf28285', 'aa515883-6b3a-4d36-ac58-9f5806f6a111', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', '06', 450.00, 29.00, 'private', 'shared', 'occupied', '2026-02-22 10:13:50.664378+00', '2026-02-25 18:29:58.437236+00')
ON CONFLICT (id) DO UPDATE SET
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- 5. LODGERS
-- ========================================

INSERT INTO public.lodgers (
  id, client_account_id, full_name, email, phone, document_id,
  status, gender, first_name, last_name1, last_name2,
  created_at, updated_at
) VALUES
  ('e414ffb5-8f95-4de5-b8cf-2f616cc1f95f', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Pepe Martinez Lopez', 'user1axpe@housingspacesolutions.com', '658525458', '054558754L', 'active', 'male', NULL, NULL, NULL, '2026-02-22 10:19:04.269849+00', '2026-02-22 23:32:50.334436+00'),
  ('0952d2e5-3073-4103-a0e9-68c72b799708', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Pedro Rubio Martin', 'user2dycsa@housingspacesolutions.com', '65223254', '25854584K', 'active', 'male', NULL, NULL, NULL, '2026-02-22 10:44:42.809813+00', '2026-02-22 23:32:44.235133+00'),
  ('bcffd497-9e4b-4e3a-8607-eef7cc6b486a', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'María Santos Rodriguez', 'maria@gmail.com', '658520125', '5458254K', 'active', 'female', NULL, NULL, NULL, '2026-02-22 12:30:11.244088+00', '2026-02-22 23:32:38.209826+00'),
  ('d0ef90bc-00b2-4cbb-aedd-df18adbcb641', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'María Luisa Martin  Jimenez', 'marialuisa@gmail.com', '626308685', '5254254Y', 'active', 'female', 'María Luisa', 'Martin ', 'Jimenez', '2026-02-24 20:24:56.450694+00', '2026-02-24 20:24:56.623295+00'),
  ('b2000001-0000-0000-0000-000000000001', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Carlos Méndez López', 'carlos.demo@smartroom.es', '611000001', '12345671A', 'active', 'male', 'Carlos', 'Méndez', 'López', '2026-02-25 18:29:58.437236+00', '2026-02-25 18:29:58.437236+00'),
  ('b2000001-0000-0000-0000-000000000002', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Lucía Fernández García', 'lucia.demo@smartroom.es', '611000002', '12345672B', 'active', 'female', 'Lucía', 'Fernández', 'García', '2026-02-25 18:29:58.437236+00', '2026-02-25 18:29:58.437236+00'),
  ('b2000001-0000-0000-0000-000000000003', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Ahmed Khalil Hassan', 'ahmed.demo@smartroom.es', '611000003', 'X1234567C', 'active', 'male', 'Ahmed', 'Khalil', 'Hassan', '2026-02-25 18:29:58.437236+00', '2026-02-25 18:29:58.437236+00'),
  ('b2000001-0000-0000-0000-000000000004', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Sofía Torres Vega', 'sofia.demo@smartroom.es', '611000004', '12345674D', 'active', 'female', 'Sofía', 'Torres', 'Vega', '2026-02-25 18:29:58.437236+00', '2026-02-25 18:29:58.437236+00')
ON CONFLICT (id) DO UPDATE SET
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- ========================================
-- USUARIOS A CREAR MANUALMENTE
-- ========================================

/*
IMPORTANTE: Los siguientes usuarios deben ser creados manualmente en Supabase Auth Dashboard
o mediante invitaciones por email, ya que auth.users no permite inserciones directas.

SUPERADMIN:
- Email: adminaxpe@housingspacesolutions.com
- Full Name: Manuel Inversor
- User ID (debe ser): df1ddcf8-765b-4fd2-9d90-2a5daf77086d
- Role: admin
- Client Account ID: 1473348b-bd76-493a-940d-77faef7fec05

ADMIN ENRIQUE:
- Email: investordycsa@housingspacesolutions.com
- Full Name: Enrique Admin Inversor
- User ID (debe ser): b02a41e2-3bcf-49a1-83aa-f2df9e2d9a16
- Role: admin
- Client Account ID: 866fb84e-d9ab-4717-9c1e-569c6f1c89eb

LODGER USERS (opcionales para testing):
- user2dycsa@housingspacesolutions.com (Pedro Rubio Martin)
- carlos.demo@smartroom.es (Carlos Méndez López)
- lucia.demo@smartroom.es (Lucía Fernández García)
- ahmed.demo@smartroom.es (Ahmed Khalil Hassan)
- sofia.demo@smartroom.es (Sofía Torres Vega)

Después de crear los usuarios, ejecutar este script para crear sus profiles:
*/

-- Script para DESPUÉS de crear usuarios en Auth
/*
INSERT INTO public.profiles (
  id, role, client_account_id, full_name, email, onboarding_status, is_primary_admin
) VALUES
  ('df1ddcf8-765b-4fd2-9d90-2a5daf77086d', 'admin', '1473348b-bd76-493a-940d-77faef7fec05', 'Manuel Inversor', 'adminaxpe@housingspacesolutions.com', 'active', true),
  ('b02a41e2-3bcf-49a1-83aa-f2df9e2d9a16', 'admin', '866fb84e-d9ab-4717-9c1e-569c6f1c89eb', 'Enrique Admin Inversor', 'investordycsa@housingspacesolutions.com', 'active', true)
ON CONFLICT (id) DO UPDATE SET updated_at = now();
*/
