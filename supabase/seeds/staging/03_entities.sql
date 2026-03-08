-- ============================================================================
-- SEEDS: entities
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Entidades fiscales (payer/owner) - idempotente
-- ============================================================================

-- Insertar o actualizar entidades
INSERT INTO public.entities (id, client_account_id, type, status, legal_type, legal_name, tax_id, billing_email, phone, country, province, city, zip, street, street_number)
VALUES
  -- ========== BASIC USER 1 (1 entidad) ==========
  ('entity-basic1-payer'::uuid, 'ca-basic-user1-0001'::uuid, 'payer', 'active', 'persona_fisica', 'Basic Rentals Co.', 'B12345678', 'billing@basicrentals.com', '+34600111111', 'España', 'Madrid', 'Madrid', '28001', 'Calle Gran Vía', '1'),
  
  -- ========== BASIC USER 2 (1 entidad) ==========
  ('entity-basic2-payer'::uuid, 'ca-basic-user2-0002'::uuid, 'payer', 'active', 'persona_juridica', 'Urban Living Spaces SL', 'B87654321', 'billing@urbanlivingspaces.com', '+34600222222', 'España', 'Barcelona', 'Barcelona', '08001', 'Passeig de Gràcia', '10'),
  
  -- ========== INVESTOR ENTITY 1 (2 entidades) ==========
  ('entity-inv1-payer'::uuid, 'ca-investor-ent1-0003'::uuid, 'payer', 'active', 'persona_juridica', 'Premium Properties Group SL', 'I11111111', 'billing@premiumproperties.com', '+34600333333', 'España', 'Madrid', 'Madrid', '28002', 'Calle Serrano', '20'),
  ('entity-inv1-owner1'::uuid, 'ca-investor-ent1-0003'::uuid, 'owner', 'active', 'persona_juridica', 'Elite Residences LLC', 'I22222222', 'info@eliteresidences.com', '+34600444444', 'España', 'Madrid', 'Madrid', '28003', 'Calle Velázquez', '30'),
  
  -- ========== INVESTOR ENTITY 4 (2 entidades) ==========
  ('entity-inv4-payer'::uuid, 'ca-investor-ent4-0004'::uuid, 'payer', 'active', 'persona_juridica', 'Smart Housing Solutions SL', 'I33333333', 'billing@smarthousing.com', '+34600555555', 'España', 'Valencia', 'Valencia', '46001', 'Calle Colón', '15'),
  ('entity-inv4-owner1'::uuid, 'ca-investor-ent4-0004'::uuid, 'owner', 'active', 'persona_juridica', 'Modern Living Investments SA', 'I44444444', 'info@modernliving.com', '+34600666666', 'España', 'Valencia', 'Valencia', '46002', 'Avenida del Puerto', '25'),
  
  -- ========== BUSINESS ENTITY 2 (2 entidades) ==========
  ('entity-bus2-payer'::uuid, 'ca-business-ent2-0005'::uuid, 'payer', 'active', 'persona_juridica', 'Corporate Housing Corp SL', 'B11111111', 'billing@corporatehousing.com', '+34600777777', 'España', 'Sevilla', 'Sevilla', '41001', 'Avenida de la Constitución', '5'),
  ('entity-bus2-owner1'::uuid, 'ca-business-ent2-0005'::uuid, 'owner', 'active', 'persona_juridica', 'Business Suites International SA', 'B22222222', 'info@businesssuites.com', '+34600888888', 'España', 'Sevilla', 'Sevilla', '41002', 'Calle Sierpes', '12'),
  
  -- ========== BUSINESS ENTITY 5 (2 entidades) ==========
  ('entity-bus5-payer'::uuid, 'ca-business-ent5-0006'::uuid, 'payer', 'active', 'persona_juridica', 'Executive Rentals Group SL', 'B33333333', 'billing@executiverentals.com', '+34600999999', 'España', 'Bilbao', 'Bilbao', '48001', 'Gran Vía Don Diego López de Haro', '8'),
  ('entity-bus5-owner1'::uuid, 'ca-business-ent5-0006'::uuid, 'owner', 'active', 'persona_juridica', 'Professional Housing Network SA', 'B44444444', 'info@professionalhousing.com', '+34601000000', 'España', 'Bilbao', 'Bilbao', '48002', 'Calle Iparraguirre', '18'),
  
  -- ========== AGENCY ENTITY 3 (2 entidades) ==========
  ('entity-age3-payer'::uuid, 'ca-agency-ent3-0007'::uuid, 'payer', 'active', 'persona_juridica', 'Global Property Management SL', 'A11111111', 'billing@globalpropertymanagement.com', '+34601111111', 'España', 'Málaga', 'Málaga', '29001', 'Calle Larios', '3'),
  ('entity-age3-owner1'::uuid, 'ca-agency-ent3-0007'::uuid, 'owner', 'active', 'persona_juridica', 'International Housing Agency SA', 'A22222222', 'info@internationalhousing.com', '+34601222222', 'España', 'Málaga', 'Málaga', '29002', 'Paseo del Parque', '7'),
  
  -- ========== AGENCY ENTITY 6 (2 entidades) ==========
  ('entity-age6-payer'::uuid, 'ca-agency-ent6-0008'::uuid, 'payer', 'active', 'persona_juridica', 'Worldwide Rentals Network SL', 'A33333333', 'billing@worldwiderentals.com', '+34601333333', 'España', 'Zaragoza', 'Zaragoza', '50001', 'Paseo Independencia', '22'),
  ('entity-age6-owner1'::uuid, 'ca-agency-ent6-0008'::uuid, 'owner', 'active', 'persona_juridica', 'Universal Housing Services SA', 'A44444444', 'info@universalhousing.com', '+34601444444', 'España', 'Zaragoza', 'Zaragoza', '50002', 'Calle Alfonso I', '14')
ON CONFLICT (id) DO UPDATE SET
  client_account_id = EXCLUDED.client_account_id,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  legal_type = EXCLUDED.legal_type,
  legal_name = EXCLUDED.legal_name,
  tax_id = EXCLUDED.tax_id,
  billing_email = EXCLUDED.billing_email,
  phone = EXCLUDED.phone,
  country = EXCLUDED.country,
  province = EXCLUDED.province,
  city = EXCLUDED.city,
  zip = EXCLUDED.zip,
  street = EXCLUDED.street,
  street_number = EXCLUDED.street_number,
  updated_at = now();

-- Verificación
SELECT 'Entidades insertadas/actualizadas:' as status;
SELECT 
  e.legal_name,
  e.type,
  ca.name as client_account,
  ca.plan_code
FROM public.entities e
JOIN public.client_accounts ca ON e.client_account_id = ca.id
ORDER BY ca.plan_code, e.type, e.legal_name;

-- Resumen por tipo
SELECT 
  ca.plan_code,
  e.type,
  COUNT(*) as count
FROM public.entities e
JOIN public.client_accounts ca ON e.client_account_id = ca.id
GROUP BY ca.plan_code, e.type
ORDER BY ca.plan_code, e.type;
