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
  address, city, province, zip, country, status,
  energy_distribution_type
)
VALUES
  -- ========== BASIC USER 1 (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Basic Rentals - Downtown',
   'Calle Alcalá 100', 'Madrid', 'Madrid', '28009', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Basic Rentals - Uptown',
   'Calle Princesa 50', 'Madrid', 'Madrid', '28008', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 'Basic Rentals - Suburbs',
   'Avenida América 200', 'Madrid', 'Madrid', '28028', 'España', 'active', 'by_consumption'),
  
  -- ========== BASIC USER 2 (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Urban Living - Central',
   'Rambla Catalunya 75', 'Barcelona', 'Barcelona', '08008', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Urban Living - East',
   'Carrer Marina 120', 'Barcelona', 'Barcelona', '08013', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 'Urban Living - West',
   'Avinguda Diagonal 300', 'Barcelona', 'Barcelona', '08019', 'España', 'active', 'by_consumption'),
  
  -- ========== INVESTOR ENTITY 1 - Premium Properties (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Premium Properties - North',
   'Calle Castellana 150', 'Madrid', 'Madrid', '28046', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Premium Properties - South',
   'Calle Atocha 80', 'Madrid', 'Madrid', '28012', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000003'::uuid, 'Premium Properties - Center',
   'Plaza Mayor 5', 'Madrid', 'Madrid', '28012', 'España', 'active', 'by_consumption'),
  
  -- ========== INVESTOR ENTITY 1 - Elite Residences (3 alojamientos) ==========
  ('30000000-0000-0000-0000-00000000000a'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 'Elite Residences - Tower A',
   'Paseo Recoletos 25', 'Madrid', 'Madrid', '28004', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000000b'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 'Elite Residences - Tower B',
   'Calle Goya 60', 'Madrid', 'Madrid', '28001', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000000c'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000004'::uuid, 'Elite Residences - Tower C',
   'Calle Ortega y Gasset 40', 'Madrid', 'Madrid', '28006', 'España', 'active', 'by_consumption'),
  
  -- ========== INVESTOR ENTITY 4 - Smart Housing (3 alojamientos) ==========
  ('30000000-0000-0000-0000-00000000000d'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, 'Smart Housing - Marina',
   'Calle Marina 100', 'Valencia', 'Valencia', '46005', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000000e'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, 'Smart Housing - Ruzafa',
   'Calle Sueca 45', 'Valencia', 'Valencia', '46006', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000000f'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000005'::uuid, 'Smart Housing - Benimaclet',
   'Avenida Primado Reig 80', 'Valencia', 'Valencia', '46020', 'España', 'active', 'by_consumption'),
  
  -- ========== INVESTOR ENTITY 4 - Modern Living (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 'Modern Living - Malvarrosa',
   'Paseo Marítimo 200', 'Valencia', 'Valencia', '46011', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000011'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 'Modern Living - Cabanyal',
   'Calle Reina 90', 'Valencia', 'Valencia', '46011', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000012'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '20000000-0000-0000-0000-000000000006'::uuid, 'Modern Living - Algirós',
   'Avenida Blasco Ibáñez 150', 'Valencia', 'Valencia', '46022', 'España', 'active', 'by_consumption'),
  
  -- ========== BUSINESS ENTITY 2 - Corporate Housing (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000013'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, 'Corporate Housing - Triana',
   'Calle Betis 50', 'Sevilla', 'Sevilla', '41010', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000014'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, 'Corporate Housing - Centro',
   'Calle Tetuán 20', 'Sevilla', 'Sevilla', '41001', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000007'::uuid, 'Corporate Housing - Nervión',
   'Avenida Luis Montoto 100', 'Sevilla', 'Sevilla', '41018', 'España', 'active', 'by_consumption'),
  
  -- ========== BUSINESS ENTITY 2 - Business Suites (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000016'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, 'Business Suites - Macarena',
   'Calle Resolana 30', 'Sevilla', 'Sevilla', '41003', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000017'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, 'Business Suites - Los Remedios',
   'Calle Asunción 60', 'Sevilla', 'Sevilla', '41011', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000018'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '20000000-0000-0000-0000-000000000008'::uuid, 'Business Suites - Este',
   'Avenida Ramón y Cajal 40', 'Sevilla', 'Sevilla', '41005', 'España', 'active', 'by_consumption'),
  
  -- ========== BUSINESS ENTITY 5 - Executive Rentals (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000019'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000009'::uuid, 'Executive Rentals - Abando',
   'Calle Ercilla 25', 'Bilbao', 'Vizcaya', '48011', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000001a'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000009'::uuid, 'Executive Rentals - Indautxu',
   'Calle Colón de Larreátegui 15', 'Bilbao', 'Vizcaya', '48001', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000001b'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-000000000009'::uuid, 'Executive Rentals - Deusto',
   'Avenida Lehendakari Aguirre 50', 'Bilbao', 'Vizcaya', '48014', 'España', 'active', 'by_consumption'),
  
  -- ========== BUSINESS ENTITY 5 - Professional Housing (3 alojamientos) ==========
  ('30000000-0000-0000-0000-00000000001c'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-00000000000a'::uuid, 'Professional Housing - Casco Viejo',
   'Calle Somera 10', 'Bilbao', 'Vizcaya', '48005', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000001d'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-00000000000a'::uuid, 'Professional Housing - Rekalde',
   'Calle Autonomía 30', 'Bilbao', 'Vizcaya', '48010', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000001e'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '20000000-0000-0000-0000-00000000000a'::uuid, 'Professional Housing - Basurto',
   'Calle Sabino Arana 20', 'Bilbao', 'Vizcaya', '48013', 'España', 'active', 'by_consumption'),
  
  -- ========== AGENCY ENTITY 3 - Global Property (3 alojamientos) ==========
  ('30000000-0000-0000-0000-00000000001f'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000b'::uuid, 'Global Property - Centro Histórico',
   'Calle Granada 15', 'Málaga', 'Málaga', '29015', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000020'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000b'::uuid, 'Global Property - Pedregalejo',
   'Paseo Marítimo Este 100', 'Málaga', 'Málaga', '29017', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000021'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000b'::uuid, 'Global Property - Teatinos',
   'Avenida Velázquez 80', 'Málaga', 'Málaga', '29010', 'España', 'active', 'by_consumption'),
  
  -- ========== AGENCY ENTITY 3 - International Housing (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000022'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000c'::uuid, 'International Housing - La Malagueta',
   'Paseo de Reding 25', 'Málaga', 'Málaga', '29016', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000023'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000c'::uuid, 'International Housing - Carretera de Cádiz',
   'Avenida Velázquez 200', 'Málaga', 'Málaga', '29004', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000024'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '20000000-0000-0000-0000-00000000000c'::uuid, 'International Housing - Ciudad Jardín',
   'Calle Héroe de Sostoa 50', 'Málaga', 'Málaga', '29014', 'España', 'active', 'by_consumption'),
  
  -- ========== AGENCY ENTITY 6 - Worldwide Rentals (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000025'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000d'::uuid, 'Worldwide Rentals - Casco Histórico',
   'Calle Don Jaime I 40', 'Zaragoza', 'Zaragoza', '50001', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000026'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000d'::uuid, 'Worldwide Rentals - Delicias',
   'Avenida Navarra 100', 'Zaragoza', 'Zaragoza', '50010', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000027'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000d'::uuid, 'Worldwide Rentals - Actur',
   'Calle María Zambrano 60', 'Zaragoza', 'Zaragoza', '50018', 'España', 'active', 'by_consumption'),
  
  -- ========== AGENCY ENTITY 6 - Universal Housing (3 alojamientos) ==========
  ('30000000-0000-0000-0000-000000000028'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000e'::uuid, 'Universal Housing - Universidad',
   'Calle Pedro Cerbuna 12', 'Zaragoza', 'Zaragoza', '50009', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-000000000029'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000e'::uuid, 'Universal Housing - Centro',
   'Calle Manifestación 30', 'Zaragoza', 'Zaragoza', '50003', 'España', 'active', 'equal'),
  ('30000000-0000-0000-0000-00000000002a'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '20000000-0000-0000-0000-00000000000e'::uuid, 'Universal Housing - Romareda',
   'Avenida Gómez Laguna 80', 'Zaragoza', 'Zaragoza', '50012', 'España', 'active', 'by_consumption')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  zip = EXCLUDED.zip,
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  energy_distribution_type = EXCLUDED.energy_distribution_type,
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
