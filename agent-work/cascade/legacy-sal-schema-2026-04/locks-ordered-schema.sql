DROP TABLE IF EXISTS public.lodger_accompanists CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.lock_notifications CASCADE;
DROP TABLE IF EXISTS public.lock_sync_commands CASCADE;
DROP TABLE IF EXISTS public.lock_records CASCADE;
DROP TABLE IF EXISTS public.lock_credentials CASCADE;
DROP TABLE IF EXISTS public.lock_access_grants CASCADE;
DROP TABLE IF EXISTS public.lock_access_group_scopes CASCADE;
DROP TABLE IF EXISTS public.lock_access_group_members CASCADE;
DROP TABLE IF EXISTS public.lock_access_groups CASCADE;
DROP TABLE IF EXISTS public.lock_access_actors CASCADE;
DROP TABLE IF EXISTS public.lock_placements CASCADE;
DROP TABLE IF EXISTS public.locks CASCADE;
DROP TABLE IF EXISTS public.lock_integrations CASCADE;
DROP TABLE IF EXISTS public.gateway_claim_sessions CASCADE;
DROP TABLE IF EXISTS public.lock_claim_sessions CASCADE;
DROP TABLE IF EXISTS public.gateway_lock_links CASCADE;
DROP TABLE IF EXISTS public.gateways CASCADE;
DROP TABLE IF EXISTS public.provider_account_assignments CASCADE;
DROP TABLE IF EXISTS public.provider_account_pools CASCADE;

CREATE TABLE public.provider_account_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shard_code text NOT NULL,
  provider text NOT NULL DEFAULT 'ttlock'::text,
  ttlock_email text NOT NULL,
  provider_client_id text NOT NULL,
  vault_key_ref uuid,
  status text NOT NULL DEFAULT 'active'::text,
  region text,
  max_locks integer NOT NULL DEFAULT 500,
  max_clients integer NOT NULL DEFAULT 50,
  current_locks_count integer NOT NULL DEFAULT 0,
  current_clients_count integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_token_refresh_at timestamptz,
  PRIMARY KEY (id),
  CONSTRAINT provider_account_pools_shard_code_key UNIQUE (shard_code)
);
CREATE INDEX idx_provider_pools_status ON public.provider_account_pools USING btree (status) WHERE (status = 'active'::text);
CREATE INDEX idx_provider_pools_region ON public.provider_account_pools USING btree (region) WHERE (region IS NOT NULL);


CREATE TABLE public.provider_account_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  pool_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'ttlock'::text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  status text NOT NULL DEFAULT 'active'::text,
  migration_target_pool_id uuid,
  notes text,
  PRIMARY KEY (id),
  CONSTRAINT provider_account_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT provider_account_assignments_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT provider_account_assignments_migration_target_pool_id_fkey FOREIGN KEY (migration_target_pool_id) REFERENCES public.provider_account_pools(id) ,
  CONSTRAINT provider_account_assignments_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) 
);
CREATE UNIQUE INDEX idx_provider_assignments_active_unique ON public.provider_account_assignments USING btree (client_account_id, provider) WHERE (status = 'active'::text);
CREATE INDEX idx_provider_assignments_client ON public.provider_account_assignments USING btree (client_account_id);
CREATE INDEX idx_provider_assignments_pool ON public.provider_account_assignments USING btree (pool_id);


CREATE TABLE public.gateways (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  pool_id uuid,
  provider_gateway_id text NOT NULL,
  name text NOT NULL,
  accommodation_id uuid,
  status text NOT NULL DEFAULT 'claim_pending'::text,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  wifi_ssid text,
  firmware_version text,
  pairing_source text NOT NULL DEFAULT 'app_paired'::text,
  paired_at timestamptz,
  paired_by uuid,
  synced_at timestamptz,
  max_locks_recommended integer NOT NULL DEFAULT 5,
  current_linked_locks integer NOT NULL DEFAULT 0,
  last_connectivity_test_at timestamptz,
  connectivity_test_result jsonb,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT gateways_pool_id_provider_gateway_id_key UNIQUE (pool_id, provider_gateway_id),
  CONSTRAINT gateways_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE SET NULL,
  CONSTRAINT gateways_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT gateways_paired_by_fkey FOREIGN KEY (paired_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT gateways_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) 
);
CREATE INDEX idx_gateways_client ON public.gateways USING btree (client_account_id);
CREATE INDEX idx_gateways_accommodation ON public.gateways USING btree (accommodation_id) WHERE (accommodation_id IS NOT NULL);
CREATE INDEX idx_gateways_status ON public.gateways USING btree (status) WHERE (status = 'active'::text);
CREATE INDEX idx_gateways_pool ON public.gateways USING btree (pool_id);


CREATE TABLE public.lock_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'ttlock'::text,
  status text NOT NULL DEFAULT 'disconnected'::text,
  provider_account_id text,
  provider_client_id text,
  provider_credentials jsonb,
  webhook_configured boolean NOT NULL DEFAULT false,
  webhook_url text,
  webhook_secret text,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  locks_synced_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  pool_id uuid,
  installation_status text NOT NULL DEFAULT 'incomplete'::text,
  connectivity_status text NOT NULL DEFAULT 'unknown'::text,
  validation_status text NOT NULL DEFAULT 'not_validated'::text,
  validated_locks_count integer NOT NULL DEFAULT 0,
  unvalidated_locks_count integer NOT NULL DEFAULT 0,
  gateway_count integer NOT NULL DEFAULT 0,
  active_locks_count integer NOT NULL DEFAULT 0,
  ttlock_platform text NOT NULL DEFAULT 'intl'::text,
  PRIMARY KEY (id),
  CONSTRAINT lock_integrations_client_account_id_provider_key UNIQUE (client_account_id, provider),
  CONSTRAINT lock_integrations_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_integrations_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) ON DELETE SET NULL
);
CREATE INDEX idx_lock_integrations_client ON public.lock_integrations USING btree (client_account_id);
CREATE INDEX idx_lock_integrations_status ON public.lock_integrations USING btree (status) WHERE (status = 'connected'::text);
CREATE INDEX idx_lock_integrations_pool ON public.lock_integrations USING btree (pool_id) WHERE (pool_id IS NOT NULL);
CREATE INDEX idx_lock_integrations_installation ON public.lock_integrations USING btree (installation_status);
CREATE TRIGGER lock_integrations_updated_at BEFORE UPDATE ON public.lock_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_integration_id uuid NOT NULL,
  provider text NOT NULL,
  provider_lock_id text NOT NULL,
  name text NOT NULL,
  display_name text,
  model text,
  battery_level integer,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  firmware_version text,
  supports_remote_unlock boolean NOT NULL DEFAULT false,
  supports_auto_lock boolean NOT NULL DEFAULT false,
  supports_passage_mode boolean NOT NULL DEFAULT false,
  raw_data jsonb,
  synced_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  pool_id uuid,
  status text NOT NULL DEFAULT 'discovered'::text,
  pairing_source text NOT NULL DEFAULT 'synced'::text,
  paired_at timestamptz,
  paired_by uuid,
  claim_session_id uuid,
  gateway_id uuid,
  gateway_link_id uuid,
  gateway_validation_status text NOT NULL DEFAULT 'not_validated'::text,
  lock_key_vault_ref uuid,
  installation_complete boolean NOT NULL DEFAULT false,
  quarantine_reason text,
  offboarding_initiated_at timestamptz,
  offboarding_completed_at timestamptz,
  last_remote_operation_at timestamptz,
  last_remote_operation_result text,
  PRIMARY KEY (id),
  CONSTRAINT locks_lock_integration_id_provider_lock_id_key UNIQUE (lock_integration_id, provider_lock_id),
  CONSTRAINT locks_claim_session_id_fkey FOREIGN KEY (claim_session_id) REFERENCES public.lock_claim_sessions(id) ON DELETE SET NULL,
  CONSTRAINT locks_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT locks_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.gateways(id) ON DELETE SET NULL,
  CONSTRAINT locks_gateway_link_id_fkey FOREIGN KEY (gateway_link_id) REFERENCES public.gateway_lock_links(id) ON DELETE SET NULL,
  CONSTRAINT locks_lock_integration_id_fkey FOREIGN KEY (lock_integration_id) REFERENCES public.lock_integrations(id) ,
  CONSTRAINT locks_paired_by_fkey FOREIGN KEY (paired_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT locks_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) ON DELETE SET NULL
);
CREATE INDEX idx_locks_integration ON public.locks USING btree (lock_integration_id);
CREATE INDEX idx_locks_active ON public.locks USING btree (client_account_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_locks_client ON public.locks USING btree (client_account_id);
CREATE INDEX idx_locks_status ON public.locks USING btree (client_account_id, status);
CREATE INDEX idx_locks_pool ON public.locks USING btree (pool_id) WHERE (pool_id IS NOT NULL);
CREATE INDEX idx_locks_quarantine ON public.locks USING btree (status) WHERE (status = 'quarantine'::text);
CREATE INDEX idx_locks_active_status ON public.locks USING btree (client_account_id) WHERE (status = 'active'::text);
CREATE INDEX idx_locks_gateway ON public.locks USING btree (gateway_id) WHERE (gateway_id IS NOT NULL);
CREATE TRIGGER locks_updated_at BEFORE UPDATE ON public.locks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.gateway_lock_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL,
  lock_id uuid NOT NULL,
  client_account_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  physical_validation_status text NOT NULL DEFAULT 'not_validated'::text,
  last_validated_at timestamptz,
  validation_test_result jsonb,
  invalidation_reason text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid,
  notes text,
  PRIMARY KEY (id),
  CONSTRAINT gateway_lock_links_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT gateway_lock_links_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.gateways(id) ON DELETE CASCADE,
  CONSTRAINT gateway_lock_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT gateway_lock_links_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_gateway_lock_links_one_active ON public.gateway_lock_links USING btree (lock_id) WHERE (is_active = true);
CREATE INDEX idx_gateway_lock_links_gateway ON public.gateway_lock_links USING btree (gateway_id);
CREATE INDEX idx_gateway_lock_links_lock ON public.gateway_lock_links USING btree (lock_id);
CREATE INDEX idx_gateway_lock_links_client ON public.gateway_lock_links USING btree (client_account_id);
CREATE INDEX idx_gateway_lock_links_validation ON public.gateway_lock_links USING btree (physical_validation_status) WHERE (is_active = true);


CREATE TABLE public.lock_claim_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  pool_id uuid,
  lock_id uuid,
  provider_lock_id text,
  lock_mac text,
  claim_type text NOT NULL DEFAULT 'app_paired'::text,
  status text NOT NULL DEFAULT 'open'::text,
  initiated_by uuid NOT NULL,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + '24:00:00'::interval),
  validation_metadata jsonb,
  error_reason text,
  PRIMARY KEY (id),
  CONSTRAINT lock_claim_sessions_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT lock_claim_sessions_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT lock_claim_sessions_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT lock_claim_sessions_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ON DELETE SET NULL,
  CONSTRAINT lock_claim_sessions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) 
);
CREATE INDEX idx_claim_sessions_client ON public.lock_claim_sessions USING btree (client_account_id);
CREATE INDEX idx_claim_sessions_status ON public.lock_claim_sessions USING btree (status) WHERE (status = 'open'::text);
CREATE INDEX idx_claim_sessions_provider_lock ON public.lock_claim_sessions USING btree (provider_lock_id) WHERE (provider_lock_id IS NOT NULL);
CREATE INDEX idx_claim_sessions_expires ON public.lock_claim_sessions USING btree (expires_at) WHERE (status = 'open'::text);


CREATE TABLE public.gateway_claim_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  pool_id uuid,
  gateway_id uuid,
  provider_gateway_id text,
  status text NOT NULL DEFAULT 'open'::text,
  initiated_by uuid NOT NULL,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  wifi_ssid text,
  expires_at timestamptz NOT NULL DEFAULT (now() + '24:00:00'::interval),
  error_reason text,
  PRIMARY KEY (id),
  CONSTRAINT gateway_claim_sessions_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT gateway_claim_sessions_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.gateways(id) ON DELETE SET NULL,
  CONSTRAINT gateway_claim_sessions_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT gateway_claim_sessions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) 
);
CREATE INDEX idx_gateway_claim_sessions_client ON public.gateway_claim_sessions USING btree (client_account_id);
CREATE INDEX idx_gateway_claim_sessions_status ON public.gateway_claim_sessions USING btree (status) WHERE (status = ANY (ARRAY['open'::text, 'wifi_configured'::text]));
CREATE INDEX idx_gateway_claim_sessions_expires ON public.gateway_claim_sessions USING btree (expires_at) WHERE (status = ANY (ARRAY['open'::text, 'wifi_configured'::text]));


CREATE TABLE public.lock_placements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_id uuid NOT NULL,
  placement_type text NOT NULL,
  accommodation_id uuid,
  room_id uuid,
  common_area_id uuid,
  lock_purpose text NOT NULL DEFAULT 'entry_door'::text,
  display_name text,
  auto_assign_to_lodger boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_placements_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ,
  CONSTRAINT lock_placements_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_placements_common_area_id_fkey FOREIGN KEY (common_area_id) REFERENCES public.common_areas(id) ,
  CONSTRAINT lock_placements_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ,
  CONSTRAINT lock_placements_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) 
);
CREATE UNIQUE INDEX idx_lock_placements_one_active ON public.lock_placements USING btree (lock_id) WHERE (is_active = true);
CREATE INDEX idx_lock_placements_client ON public.lock_placements USING btree (client_account_id);
CREATE INDEX idx_lock_placements_lock ON public.lock_placements USING btree (lock_id);
CREATE INDEX idx_lock_placements_room ON public.lock_placements USING btree (room_id) WHERE (room_id IS NOT NULL);
CREATE INDEX idx_lock_placements_accommodation ON public.lock_placements USING btree (accommodation_id);
CREATE INDEX idx_lock_placements_common_area ON public.lock_placements USING btree (common_area_id) WHERE (common_area_id IS NOT NULL);
CREATE TRIGGER lock_placements_updated_at BEFORE UPDATE ON public.lock_placements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_access_actors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  actor_type text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_access_actors_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) 
);
CREATE INDEX idx_lock_actors_client ON public.lock_access_actors USING btree (client_account_id);
CREATE INDEX idx_lock_actors_active ON public.lock_access_actors USING btree (client_account_id, is_active) WHERE (is_active = true);
CREATE TRIGGER lock_access_actors_updated_at BEFORE UPDATE ON public.lock_access_actors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_access_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  credential_policy jsonb NOT NULL DEFAULT '{"type": "pin", "validity": "permanent", "auto_renew": false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  group_type text NOT NULL DEFAULT 'custom'::text,
  credential_type text NOT NULL DEFAULT 'pin'::text,
  validity_days integer NOT NULL DEFAULT 30,
  auto_renew boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  CONSTRAINT lock_access_groups_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) 
);
CREATE INDEX idx_lock_groups_client ON public.lock_access_groups USING btree (client_account_id);
CREATE TRIGGER lock_access_groups_updated_at BEFORE UPDATE ON public.lock_access_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_access_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lock_access_group_id uuid NOT NULL,
  lock_access_actor_id uuid NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  added_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_access_group_members_lock_access_group_id_lock_access__key UNIQUE (lock_access_group_id, lock_access_actor_id),
  CONSTRAINT lock_access_group_members_lock_access_actor_id_fkey FOREIGN KEY (lock_access_actor_id) REFERENCES public.lock_access_actors(id) ,
  CONSTRAINT lock_access_group_members_lock_access_group_id_fkey FOREIGN KEY (lock_access_group_id) REFERENCES public.lock_access_groups(id) 
);
CREATE INDEX idx_lock_group_members_group ON public.lock_access_group_members USING btree (lock_access_group_id);
CREATE INDEX idx_lock_group_members_actor ON public.lock_access_group_members USING btree (lock_access_actor_id);
CREATE TRIGGER lock_access_group_members_updated_at BEFORE UPDATE ON public.lock_access_group_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_access_group_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lock_access_group_id uuid NOT NULL,
  client_account_id uuid NOT NULL,
  scope_type text NOT NULL,
  accommodation_id uuid,
  room_id uuid,
  common_area_id uuid,
  lock_id uuid,
  time_policy jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_access_group_scopes_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ,
  CONSTRAINT lock_access_group_scopes_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_access_group_scopes_common_area_id_fkey FOREIGN KEY (common_area_id) REFERENCES public.common_areas(id) ,
  CONSTRAINT lock_access_group_scopes_lock_access_group_id_fkey FOREIGN KEY (lock_access_group_id) REFERENCES public.lock_access_groups(id) ,
  CONSTRAINT lock_access_group_scopes_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ,
  CONSTRAINT lock_access_group_scopes_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) 
);
CREATE INDEX idx_lock_group_scopes_group ON public.lock_access_group_scopes USING btree (lock_access_group_id);
CREATE INDEX idx_lock_group_scopes_client ON public.lock_access_group_scopes USING btree (client_account_id);
CREATE TRIGGER lock_access_group_scopes_updated_at BEFORE UPDATE ON public.lock_access_group_scopes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_access_grants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  grant_type text NOT NULL,
  lodger_id uuid,
  lock_access_actor_id uuid,
  lock_access_group_id uuid,
  lock_access_group_member_id uuid,
  lock_id uuid NOT NULL,
  lock_placement_id uuid,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  status text NOT NULL DEFAULT 'pending'::text,
  source_type text NOT NULL,
  source_id uuid,
  revoked_at timestamptz,
  revoked_by text,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_access_grants_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_access_grants_lock_access_actor_id_fkey FOREIGN KEY (lock_access_actor_id) REFERENCES public.lock_access_actors(id) ,
  CONSTRAINT lock_access_grants_lock_access_group_id_fkey FOREIGN KEY (lock_access_group_id) REFERENCES public.lock_access_groups(id) ,
  CONSTRAINT lock_access_grants_lock_access_group_member_id_fkey FOREIGN KEY (lock_access_group_member_id) REFERENCES public.lock_access_group_members(id) ,
  CONSTRAINT lock_access_grants_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ,
  CONSTRAINT lock_access_grants_lock_placement_id_fkey FOREIGN KEY (lock_placement_id) REFERENCES public.lock_placements(id) ,
  CONSTRAINT lock_access_grants_lodger_id_fkey FOREIGN KEY (lodger_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE INDEX idx_lock_grants_client ON public.lock_access_grants USING btree (client_account_id);
CREATE INDEX idx_lock_grants_lodger ON public.lock_access_grants USING btree (lodger_id) WHERE (lodger_id IS NOT NULL);
CREATE INDEX idx_lock_grants_actor ON public.lock_access_grants USING btree (lock_access_actor_id) WHERE (lock_access_actor_id IS NOT NULL);
CREATE INDEX idx_lock_grants_lock ON public.lock_access_grants USING btree (lock_id);
CREATE INDEX idx_lock_grants_active ON public.lock_access_grants USING btree (client_account_id, status) WHERE (status = 'active'::text);
CREATE TRIGGER lock_access_grants_updated_at BEFORE UPDATE ON public.lock_access_grants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_access_grant_id uuid NOT NULL,
  lock_id uuid NOT NULL,
  credential_type text NOT NULL,
  credential_value text,
  provider_credential_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  issued_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  provider_sync_status text NOT NULL DEFAULT 'pending'::text,
  provider_synced_at timestamptz,
  provider_sync_error text,
  provider_sync_retries integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_credentials_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_credentials_lock_access_grant_id_fkey FOREIGN KEY (lock_access_grant_id) REFERENCES public.lock_access_grants(id) ,
  CONSTRAINT lock_credentials_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) 
);
CREATE INDEX idx_lock_credentials_grant ON public.lock_credentials USING btree (lock_access_grant_id);
CREATE INDEX idx_lock_credentials_lock ON public.lock_credentials USING btree (lock_id);
CREATE INDEX idx_lock_credentials_active ON public.lock_credentials USING btree (status) WHERE (status = 'active'::text);
CREATE INDEX idx_lock_credentials_pending_sync ON public.lock_credentials USING btree (provider_sync_status) WHERE (provider_sync_status = ANY (ARRAY['pending'::text, 'error'::text]));
CREATE TRIGGER lock_credentials_updated_at BEFORE UPDATE ON public.lock_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.lock_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_id uuid NOT NULL,
  lock_credential_id uuid,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL,
  actor_description text,
  provider_record_id text NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_records_lock_id_provider_record_id_key UNIQUE (lock_id, provider_record_id),
  CONSTRAINT lock_records_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_records_lock_credential_id_fkey FOREIGN KEY (lock_credential_id) REFERENCES public.lock_credentials(id) ,
  CONSTRAINT lock_records_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) 
);
CREATE INDEX idx_lock_records_client ON public.lock_records USING btree (client_account_id);
CREATE INDEX idx_lock_records_lock_time ON public.lock_records USING btree (lock_id, event_at DESC);
CREATE INDEX idx_lock_records_event_type ON public.lock_records USING btree (event_type, event_at DESC);


CREATE TABLE public.lock_sync_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_id uuid NOT NULL,
  pool_id uuid NOT NULL,
  command_type text NOT NULL,
  command_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  priority integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  executed_at timestamptz,
  completed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  error_message text,
  result_payload jsonb,
  dedupe_key text,
  PRIMARY KEY (id),
  CONSTRAINT lock_sync_commands_dedupe_key_key UNIQUE (dedupe_key),
  CONSTRAINT lock_sync_commands_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  CONSTRAINT lock_sync_commands_lock_id_fkey FOREIGN KEY (lock_id) REFERENCES public.locks(id) ON DELETE CASCADE,
  CONSTRAINT lock_sync_commands_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.provider_account_pools(id) 
);
CREATE INDEX idx_sync_commands_pending ON public.lock_sync_commands USING btree (status, priority, created_at) WHERE (status = 'pending'::text);
CREATE INDEX idx_sync_commands_lock ON public.lock_sync_commands USING btree (lock_id);
CREATE INDEX idx_sync_commands_client ON public.lock_sync_commands USING btree (client_account_id);
CREATE INDEX idx_sync_commands_executing ON public.lock_sync_commands USING btree (executed_at) WHERE (status = 'executing'::text);


CREATE TABLE public.lock_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lock_access_actor_id uuid,
  lodger_id uuid,
  lock_credential_id uuid,
  recipient_email text,
  recipient_phone text,
  notification_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email'::text,
  template_code text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lock_notifications_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT lock_notifications_lock_access_actor_id_fkey FOREIGN KEY (lock_access_actor_id) REFERENCES public.lock_access_actors(id) ,
  CONSTRAINT lock_notifications_lock_credential_id_fkey FOREIGN KEY (lock_credential_id) REFERENCES public.lock_credentials(id) ,
  CONSTRAINT lock_notifications_lodger_id_fkey FOREIGN KEY (lodger_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE INDEX idx_lock_notifications_client ON public.lock_notifications USING btree (client_account_id);
CREATE INDEX idx_lock_notifications_pending ON public.lock_notifications USING btree (status, retry_count) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]));
CREATE INDEX idx_lock_notifications_actor ON public.lock_notifications USING btree (lock_access_actor_id) WHERE (lock_access_actor_id IS NOT NULL);
CREATE INDEX idx_lock_notifications_lodger ON public.lock_notifications USING btree (lodger_id) WHERE (lodger_id IS NOT NULL);
CREATE TRIGGER lock_notifications_updated_at BEFORE UPDATE ON public.lock_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;

CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  lodger_id uuid,
  room_id uuid,
  accommodation_id uuid,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT incidents_accommodation_id_fkey FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ,
  CONSTRAINT incidents_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ,
  CONSTRAINT incidents_lodger_id_fkey FOREIGN KEY (lodger_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT incidents_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) 
);

CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at;

CREATE TABLE public.lodger_accompanists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name1 text NOT NULL,
  last_name2 text,
  nickname text,
  document_type text,
  document_id text,
  gender text,
  birth_date date,
  nationality text,
  email text,
  phone text,
  address_street text,
  address_number text,
  address_floor text,
  address_postal_code text,
  address_city text,
  address_province text,
  address_country text DEFAULT 'España'::text,
  notes text,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT lodger_accompanists_client_account_id_fkey FOREIGN KEY (client_account_id) REFERENCES public.client_accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_accompanist_account ON public.lodger_accompanists USING btree (client_account_id);
CREATE INDEX idx_accompanist_document ON public.lodger_accompanists USING btree (lower(document_id));
CREATE INDEX idx_accompanist_email ON public.lodger_accompanists USING btree (lower(email));
CREATE TRIGGER update_lodger_accompanists_updated_at BEFORE UPDATE ON public.lodger_accompanists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column;