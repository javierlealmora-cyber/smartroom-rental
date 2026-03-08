-- ============================================================================
-- BASELINE CERO: Índices
-- Descripción: Índices optimizados para todas las tablas
-- ============================================================================

-- ============================================================================
-- TABLA: plans_catalog
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_plans_catalog_status ON public.plans_catalog (status);
CREATE INDEX IF NOT EXISTS idx_plans_catalog_code ON public.plans_catalog (code);
CREATE INDEX IF NOT EXISTS idx_plans_catalog_visible ON public.plans_catalog (visible_for_new_accounts) WHERE status = 'active';

-- ============================================================================
-- TABLA: client_accounts
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_client_accounts_slug ON public.client_accounts (slug);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON public.client_accounts (status);
CREATE INDEX IF NOT EXISTS idx_client_accounts_plan_code ON public.client_accounts (plan_code);
CREATE INDEX IF NOT EXISTS idx_client_accounts_stripe_customer ON public.client_accounts (stripe_customer_id);

-- ============================================================================
-- TABLA: profiles
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_client_account ON public.profiles (client_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles (onboarding_status);

-- ============================================================================
-- TABLA: entities
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_entities_client_account ON public.entities (client_account_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.entities (type);
CREATE INDEX IF NOT EXISTS idx_entities_client_type ON public.entities (client_account_id, type);
CREATE INDEX IF NOT EXISTS idx_entities_status ON public.entities (status);
CREATE INDEX IF NOT EXISTS idx_entities_tax_id ON public.entities (tax_id);

-- ============================================================================
-- TABLA: accommodations
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_accommodations_client_account ON public.accommodations (client_account_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_owner ON public.accommodations (owner_entity_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_status ON public.accommodations (status);
CREATE INDEX IF NOT EXISTS idx_accommodations_city ON public.accommodations (city);

-- ============================================================================
-- TABLA: rooms
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_accommodation ON public.rooms (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_rooms_client_account ON public.rooms (client_account_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_accommodation_number ON public.rooms (accommodation_id, number);

-- ============================================================================
-- TABLA: lodgers
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lodgers_client_account ON public.lodgers (client_account_id);
CREATE INDEX IF NOT EXISTS idx_lodgers_room ON public.lodgers (room_id);
CREATE INDEX IF NOT EXISTS idx_lodgers_email ON public.lodgers (email);
CREATE INDEX IF NOT EXISTS idx_lodgers_status ON public.lodgers (status);
CREATE INDEX IF NOT EXISTS idx_lodgers_check_in_date ON public.lodgers (check_in_date);

-- ============================================================================
-- TABLA: services_catalog
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_services_catalog_client_account ON public.services_catalog (client_account_id);
CREATE INDEX IF NOT EXISTS idx_services_catalog_category ON public.services_catalog (category);
CREATE INDEX IF NOT EXISTS idx_services_catalog_status ON public.services_catalog (status);

-- ============================================================================
-- TABLA: accommodation_services
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_accommodation_services_accommodation ON public.accommodation_services (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_services_service ON public.accommodation_services (service_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_services_client_account ON public.accommodation_services (client_account_id);

-- ============================================================================
-- TABLA: lodger_services
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lodger_services_lodger ON public.lodger_services (lodger_id);
CREATE INDEX IF NOT EXISTS idx_lodger_services_service ON public.lodger_services (service_id);
CREATE INDEX IF NOT EXISTS idx_lodger_services_client_account ON public.lodger_services (client_account_id);
CREATE INDEX IF NOT EXISTS idx_lodger_services_usage_date ON public.lodger_services (usage_date);
CREATE INDEX IF NOT EXISTS idx_lodger_services_status ON public.lodger_services (status);

-- ============================================================================
-- TABLA: stripe_events
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON public.stripe_events (stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events (type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events (processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events (created_at);

-- ============================================================================
-- TABLA: energy_bills
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_energy_bills_client_account ON public.energy_bills (client_account_id);
CREATE INDEX IF NOT EXISTS idx_energy_bills_accommodation ON public.energy_bills (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_energy_bills_period ON public.energy_bills (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_energy_bills_status ON public.energy_bills (status);

-- ============================================================================
-- TABLA: energy_readings
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_energy_readings_client_account ON public.energy_readings (client_account_id);
CREATE INDEX IF NOT EXISTS idx_energy_readings_accommodation ON public.energy_readings (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_energy_readings_room ON public.energy_readings (room_id);
CREATE INDEX IF NOT EXISTS idx_energy_readings_date ON public.energy_readings (reading_date);

-- ============================================================================
-- TABLA: energy_settlements
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_energy_settlements_client_account ON public.energy_settlements (client_account_id);
CREATE INDEX IF NOT EXISTS idx_energy_settlements_bill ON public.energy_settlements (energy_bill_id);
CREATE INDEX IF NOT EXISTS idx_energy_settlements_room ON public.energy_settlements (room_id);
CREATE INDEX IF NOT EXISTS idx_energy_settlements_lodger ON public.energy_settlements (lodger_id);

-- ============================================================================
-- TABLA: bulletins
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bulletins_client_account ON public.bulletins (client_account_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_accommodation ON public.bulletins (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_room ON public.bulletins (room_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_lodger ON public.bulletins (lodger_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_status ON public.bulletins (status);
CREATE INDEX IF NOT EXISTS idx_bulletins_period ON public.bulletins (period_start, period_end);

-- ============================================================================
-- TABLA: audit_log
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_client_account ON public.audit_log (client_account_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_user_id);

-- ============================================================================
-- TABLA: incidents
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_client_account ON public.incidents (client_account_id);
CREATE INDEX IF NOT EXISTS idx_incidents_lodger ON public.incidents (lodger_id);
CREATE INDEX IF NOT EXISTS idx_incidents_room ON public.incidents (room_id);
CREATE INDEX IF NOT EXISTS idx_incidents_accommodation ON public.incidents (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents (category);

-- ============================================================================
-- TABLA: lodger_room_assignments
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_client_account ON public.lodger_room_assignments (client_account_id);
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_lodger ON public.lodger_room_assignments (lodger_id);
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_room ON public.lodger_room_assignments (room_id);
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_status ON public.lodger_room_assignments (status);
CREATE INDEX IF NOT EXISTS idx_lodger_room_assignments_dates ON public.lodger_room_assignments (start_date, end_date);

-- Verificación
SELECT 'Índices creados exitosamente (todas las tablas)' as status;
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
