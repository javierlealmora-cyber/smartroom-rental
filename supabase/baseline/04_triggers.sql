-- ============================================================================
-- BASELINE CERO: Triggers
-- Descripción: Triggers para updated_at en todas las tablas
-- ============================================================================

-- ============================================================================
-- TRIGGERS: updated_at
-- ============================================================================

-- plans_catalog
DROP TRIGGER IF EXISTS update_plans_catalog_updated_at ON public.plans_catalog;
CREATE TRIGGER update_plans_catalog_updated_at
  BEFORE UPDATE ON public.plans_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- client_accounts
DROP TRIGGER IF EXISTS update_client_accounts_updated_at ON public.client_accounts;
CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON public.client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- entities
DROP TRIGGER IF EXISTS update_entities_updated_at ON public.entities;
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- accommodations
DROP TRIGGER IF EXISTS update_accommodations_updated_at ON public.accommodations;
CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- rooms
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- lodgers
DROP TRIGGER IF EXISTS update_lodgers_updated_at ON public.lodgers;
CREATE TRIGGER update_lodgers_updated_at
  BEFORE UPDATE ON public.lodgers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- services_catalog
DROP TRIGGER IF EXISTS update_services_catalog_updated_at ON public.services_catalog;
CREATE TRIGGER update_services_catalog_updated_at
  BEFORE UPDATE ON public.services_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- accommodation_services
DROP TRIGGER IF EXISTS update_accommodation_services_updated_at ON public.accommodation_services;
CREATE TRIGGER update_accommodation_services_updated_at
  BEFORE UPDATE ON public.accommodation_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- lodger_services
DROP TRIGGER IF EXISTS update_lodger_services_updated_at ON public.lodger_services;
CREATE TRIGGER update_lodger_services_updated_at
  BEFORE UPDATE ON public.lodger_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- energy_bills
DROP TRIGGER IF EXISTS update_energy_bills_updated_at ON public.energy_bills;
CREATE TRIGGER update_energy_bills_updated_at
  BEFORE UPDATE ON public.energy_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- bulletins
DROP TRIGGER IF EXISTS update_bulletins_updated_at ON public.bulletins;
CREATE TRIGGER update_bulletins_updated_at
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- incidents
DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- lodger_room_assignments
DROP TRIGGER IF EXISTS update_lodger_room_assignments_updated_at ON public.lodger_room_assignments;
CREATE TRIGGER update_lodger_room_assignments_updated_at
  BEFORE UPDATE ON public.lodger_room_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verificación
SELECT 'Triggers creados exitosamente (15 triggers)' as status;
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE 'update_%_updated_at'
ORDER BY tgrelid::regclass::text;
