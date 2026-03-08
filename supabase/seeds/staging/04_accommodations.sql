-- ============================================================================
-- SEEDS: accommodations
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Alojamientos (39 total: 3 por entidad) - idempotente
-- Patrón: 2 alojamientos con reparto equitativo, 1 con prorrateado
-- ============================================================================

-- Insertar o actualizar alojamientos
INSERT INTO public.accommodations (
  id, client_account_id, owner_entity_id, name, 
  address_line1, city, province, postal_code, status,
  utilities_included, split_electricity, split_water, split_gas,
  split_mode_electricity, split_mode_water, split_mode_gas
)
VALUES
  -- ========== BASIC USER 1 (3 alojamientos) ==========
  ('acc-basic1-1'::uuid, 'ca-basic-user1-0001'::uuid, 'entity-basic1-payer'::uuid, 'Basic Rentals - Downtown',
   'Calle Alcalá 100', 'Madrid', 'Madrid', '28009', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-basic1-2'::uuid, 'ca-basic-user1-0001'::uuid, 'entity-basic1-payer'::uuid, 'Basic Rentals - Uptown',
   'Calle Princesa 50', 'Madrid', 'Madrid', '28008', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-basic1-3'::uuid, 'ca-basic-user1-0001'::uuid, 'entity-basic1-payer'::uuid, 'Basic Rentals - Suburbs',
   'Avenida América 200', 'Madrid', 'Madrid', '28028', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== BASIC USER 2 (3 alojamientos) ==========
  ('acc-basic2-1'::uuid, 'ca-basic-user2-0002'::uuid, 'entity-basic2-payer'::uuid, 'Urban Living - Central',
   'Rambla Catalunya 75', 'Barcelona', 'Barcelona', '08008', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-basic2-2'::uuid, 'ca-basic-user2-0002'::uuid, 'entity-basic2-payer'::uuid, 'Urban Living - East',
   'Carrer Marina 120', 'Barcelona', 'Barcelona', '08013', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-basic2-3'::uuid, 'ca-basic-user2-0002'::uuid, 'entity-basic2-payer'::uuid, 'Urban Living - West',
   'Avinguda Diagonal 300', 'Barcelona', 'Barcelona', '08019', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== INVESTOR ENTITY 1 - Premium Properties (3 alojamientos) ==========
  ('acc-inv1-1-1'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-payer'::uuid, 'Premium Properties - North',
   'Calle Castellana 150', 'Madrid', 'Madrid', '28046', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv1-1-2'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-payer'::uuid, 'Premium Properties - South',
   'Calle Atocha 80', 'Madrid', 'Madrid', '28012', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv1-1-3'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-payer'::uuid, 'Premium Properties - Center',
   'Plaza Mayor 5', 'Madrid', 'Madrid', '28012', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== INVESTOR ENTITY 1 - Elite Residences (3 alojamientos) ==========
  ('acc-inv1-2-1'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-owner1'::uuid, 'Elite Residences - Tower A',
   'Paseo Recoletos 25', 'Madrid', 'Madrid', '28004', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv1-2-2'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-owner1'::uuid, 'Elite Residences - Tower B',
   'Calle Goya 60', 'Madrid', 'Madrid', '28001', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv1-2-3'::uuid, 'ca-investor-ent1-0003'::uuid, 'entity-inv1-owner1'::uuid, 'Elite Residences - Tower C',
   'Calle Ortega y Gasset 40', 'Madrid', 'Madrid', '28006', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== INVESTOR ENTITY 4 - Smart Housing (3 alojamientos) ==========
  ('acc-inv4-1-1'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-payer'::uuid, 'Smart Housing - Marina',
   'Calle Marina 100', 'Valencia', 'Valencia', '46005', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv4-1-2'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-payer'::uuid, 'Smart Housing - Ruzafa',
   'Calle Sueca 45', 'Valencia', 'Valencia', '46006', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv4-1-3'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-payer'::uuid, 'Smart Housing - Benimaclet',
   'Avenida Primado Reig 80', 'Valencia', 'Valencia', '46020', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== INVESTOR ENTITY 4 - Modern Living (3 alojamientos) ==========
  ('acc-inv4-2-1'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-owner1'::uuid, 'Modern Living - Malvarrosa',
   'Paseo Marítimo 200', 'Valencia', 'Valencia', '46011', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv4-2-2'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-owner1'::uuid, 'Modern Living - Cabanyal',
   'Calle Reina 90', 'Valencia', 'Valencia', '46011', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-inv4-2-3'::uuid, 'ca-investor-ent4-0004'::uuid, 'entity-inv4-owner1'::uuid, 'Modern Living - Algirós',
   'Avenida Blasco Ibáñez 150', 'Valencia', 'Valencia', '46022', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== BUSINESS ENTITY 2 - Corporate Housing (3 alojamientos) ==========
  ('acc-bus2-1-1'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-payer'::uuid, 'Corporate Housing - Triana',
   'Calle Betis 50', 'Sevilla', 'Sevilla', '41010', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus2-1-2'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-payer'::uuid, 'Corporate Housing - Centro',
   'Calle Tetuán 20', 'Sevilla', 'Sevilla', '41001', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus2-1-3'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-payer'::uuid, 'Corporate Housing - Nervión',
   'Avenida Luis Montoto 100', 'Sevilla', 'Sevilla', '41018', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== BUSINESS ENTITY 2 - Business Suites (3 alojamientos) ==========
  ('acc-bus2-2-1'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-owner1'::uuid, 'Business Suites - Macarena',
   'Calle Resolana 30', 'Sevilla', 'Sevilla', '41003', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus2-2-2'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-owner1'::uuid, 'Business Suites - Los Remedios',
   'Calle Asunción 60', 'Sevilla', 'Sevilla', '41011', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus2-2-3'::uuid, 'ca-business-ent2-0005'::uuid, 'entity-bus2-owner1'::uuid, 'Business Suites - Este',
   'Avenida Ramón y Cajal 40', 'Sevilla', 'Sevilla', '41005', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== BUSINESS ENTITY 5 - Executive Rentals (3 alojamientos) ==========
  ('acc-bus5-1-1'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-payer'::uuid, 'Executive Rentals - Abando',
   'Calle Ercilla 25', 'Bilbao', 'Vizcaya', '48011', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus5-1-2'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-payer'::uuid, 'Executive Rentals - Indautxu',
   'Calle Colón de Larreátegui 15', 'Bilbao', 'Vizcaya', '48001', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus5-1-3'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-payer'::uuid, 'Executive Rentals - Deusto',
   'Avenida Lehendakari Aguirre 50', 'Bilbao', 'Vizcaya', '48014', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== BUSINESS ENTITY 5 - Professional Housing (3 alojamientos) ==========
  ('acc-bus5-2-1'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-owner1'::uuid, 'Professional Housing - Casco Viejo',
   'Calle Somera 10', 'Bilbao', 'Vizcaya', '48005', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus5-2-2'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-owner1'::uuid, 'Professional Housing - Rekalde',
   'Calle Autonomía 30', 'Bilbao', 'Vizcaya', '48010', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-bus5-2-3'::uuid, 'ca-business-ent5-0006'::uuid, 'entity-bus5-owner1'::uuid, 'Professional Housing - Basurto',
   'Calle Sabino Arana 20', 'Bilbao', 'Vizcaya', '48013', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== AGENCY ENTITY 3 - Global Property (3 alojamientos) ==========
  ('acc-age3-1-1'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-payer'::uuid, 'Global Property - Centro Histórico',
   'Calle Granada 15', 'Málaga', 'Málaga', '29015', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age3-1-2'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-payer'::uuid, 'Global Property - Pedregalejo',
   'Paseo Marítimo Este 100', 'Málaga', 'Málaga', '29017', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age3-1-3'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-payer'::uuid, 'Global Property - Teatinos',
   'Avenida Velázquez 80', 'Málaga', 'Málaga', '29010', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== AGENCY ENTITY 3 - International Housing (3 alojamientos) ==========
  ('acc-age3-2-1'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-owner1'::uuid, 'International Housing - La Malagueta',
   'Paseo de Reding 25', 'Málaga', 'Málaga', '29016', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age3-2-2'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-owner1'::uuid, 'International Housing - Carretera de Cádiz',
   'Avenida Velázquez 200', 'Málaga', 'Málaga', '29004', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age3-2-3'::uuid, 'ca-agency-ent3-0007'::uuid, 'entity-age3-owner1'::uuid, 'International Housing - Ciudad Jardín',
   'Calle Héroe de Sostoa 50', 'Málaga', 'Málaga', '29014', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== AGENCY ENTITY 6 - Worldwide Rentals (3 alojamientos) ==========
  ('acc-age6-1-1'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-payer'::uuid, 'Worldwide Rentals - Casco Histórico',
   'Calle Don Jaime I 40', 'Zaragoza', 'Zaragoza', '50001', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age6-1-2'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-payer'::uuid, 'Worldwide Rentals - Delicias',
   'Avenida Navarra 100', 'Zaragoza', 'Zaragoza', '50010', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age6-1-3'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-payer'::uuid, 'Worldwide Rentals - Actur',
   'Calle María Zambrano 60', 'Zaragoza', 'Zaragoza', '50018', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated'),
  
  -- ========== AGENCY ENTITY 6 - Universal Housing (3 alojamientos) ==========
  ('acc-age6-2-1'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-owner1'::uuid, 'Universal Housing - Universidad',
   'Calle Pedro Cerbuna 12', 'Zaragoza', 'Zaragoza', '50009', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age6-2-2'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-owner1'::uuid, 'Universal Housing - Centro',
   'Calle Manifestación 30', 'Zaragoza', 'Zaragoza', '50003', 'active',
   true, true, true, true, 'equal', 'equal', 'equal'),
  ('acc-age6-2-3'::uuid, 'ca-agency-ent6-0008'::uuid, 'entity-age6-owner1'::uuid, 'Universal Housing - Romareda',
   'Avenida Gómez Laguna 80', 'Zaragoza', 'Zaragoza', '50012', 'active',
   true, true, true, true, 'prorated', 'prorated', 'prorated')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  postal_code = EXCLUDED.postal_code,
  status = EXCLUDED.status,
  utilities_included = EXCLUDED.utilities_included,
  split_electricity = EXCLUDED.split_electricity,
  split_water = EXCLUDED.split_water,
  split_gas = EXCLUDED.split_gas,
  split_mode_electricity = EXCLUDED.split_mode_electricity,
  split_mode_water = EXCLUDED.split_mode_water,
  split_mode_gas = EXCLUDED.split_mode_gas,
  updated_at = now();

-- Verificación
SELECT 'Alojamientos insertados/actualizados:' as status;
SELECT COUNT(*) as total_accommodations FROM public.accommodations;

SELECT 
  ca.plan_code,
  e.legal_name as entity,
  COUNT(a.id) as num_accommodations
FROM public.accommodations a
JOIN public.entities e ON a.owner_entity_id = e.id
JOIN public.client_accounts ca ON a.client_account_id = ca.id
GROUP BY ca.plan_code, e.legal_name
ORDER BY ca.plan_code, e.legal_name;
