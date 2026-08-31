
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