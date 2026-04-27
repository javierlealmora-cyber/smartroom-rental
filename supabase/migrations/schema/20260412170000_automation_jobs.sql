-- ============================================================================
-- MIGRACIÓN: 20260412170000_automation_jobs.sql
-- Tablas de trazabilidad para workflows de n8n (SmartAccessLock)
--
-- Crea:
--   1. automation_jobs       — job lógico (schedule, manual, reconciliation)
--   2. automation_job_runs   — cada intento de ejecución (1..N por job)
--
-- n8n usa service_role para INSERT/UPDATE (bypasa RLS).
-- El frontend lee via RLS: admin ve solo los jobs de su client_account.
--
-- Requiere: baseline schema + 20260412000001–000007
-- ============================================================================

-- ─── 1. automation_jobs ──────────────────────────────────────────────────────
-- Un registro por trabajo lógico.
-- Para jobs programados (schedule): uno por ventana temporal por tenant.
-- Para jobs manuales: uno por solicitud del usuario.

CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  workflow_name       text        NOT NULL,
  job_type            text        NOT NULL
                      CHECK (job_type IN ('schedule','manual','reconciliation','batch','webhook')),
  status              text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','partial','failed','cancelled')),
  -- dedupe_key previene ejecuciones duplicadas en la misma ventana temporal.
  -- Formato schedule: '<workflow>:<client_id>:<ventana>'  p.ej. 'sal-sync-locks-full:uuid:2026-04-12-08'
  -- Formato manual:   '<workflow>:<scope_id>:<uuid>'       — sin deduplicación intencional
  dedupe_key          text,
  payload             jsonb       NOT NULL DEFAULT '{}',
  source              text        NOT NULL
                      CHECK (source IN (
                        'n8n_schedule','user_manual','superadmin',
                        'db_webhook','stripe_webhook'
                      )),
  requested_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  started_at          timestamptz,
  finished_at         timestamptz,
  next_retry_at       timestamptz,
  attempt_number      int         NOT NULL DEFAULT 0,
  max_attempts        int         NOT NULL DEFAULT 3,
  last_error          text,
  result_summary      jsonb,
  -- ID de ejecución en n8n para correlación con logs de n8n
  n8n_execution_id    text,
  UNIQUE NULLS NOT DISTINCT (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_jobs_client
  ON public.automation_jobs (client_account_id);

-- Índice para que n8n encuentre rápidamente jobs pendientes
CREATE INDEX IF NOT EXISTS idx_automation_jobs_pending
  ON public.automation_jobs (workflow_name, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_automation_jobs_created
  ON public.automation_jobs (created_at DESC);

-- ─── 2. automation_job_runs ──────────────────────────────────────────────────
-- Un registro por intento de ejecución.
-- Un automation_job puede tener múltiples runs (intentos + reintentos).
-- Los workflows de alta frecuencia (WF-02 sync estado, WF-03 sync records)
-- pueden insertar runs sin job padre (automation_job_id = NULL) para no
-- saturar automation_jobs con miles de filas diarias.

CREATE TABLE IF NOT EXISTS public.automation_job_runs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_job_id   uuid        REFERENCES public.automation_jobs(id) ON DELETE SET NULL,
  client_account_id   uuid        REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  workflow_name       text        NOT NULL,
  attempt_number      int         NOT NULL DEFAULT 1,
  status              text        NOT NULL
                      CHECK (status IN ('started','completed','partial','failed')),
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  duration_ms         int         GENERATED ALWAYS AS (
                        CASE WHEN finished_at IS NOT NULL
                          THEN EXTRACT(EPOCH FROM (finished_at - started_at))::int * 1000
                          ELSE NULL
                        END
                      ) STORED,
  n8n_execution_id    text,
  items_processed     int         NOT NULL DEFAULT 0,
  items_failed        int         NOT NULL DEFAULT 0,
  error_message       text,
  -- Detalle de resultados: { synced_locks, records_synced, grants_created, errors: [...] }
  result_detail       jsonb
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job
  ON public.automation_job_runs (automation_job_id)
  WHERE automation_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_runs_client
  ON public.automation_job_runs (client_account_id, started_at DESC);

-- Índice para consultas de historial por workflow (pantalla SalJobsList)
CREATE INDEX IF NOT EXISTS idx_job_runs_workflow
  ON public.automation_job_runs (workflow_name, started_at DESC);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
-- n8n usa service_role → bypasa RLS para INSERT/UPDATE/DELETE.
-- El frontend (admin/agent) solo lee los jobs de su account.

ALTER TABLE public.automation_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_job_runs ENABLE ROW LEVEL SECURITY;

-- automation_jobs: SELECT
CREATE POLICY "automation_jobs_select"
ON public.automation_jobs FOR SELECT TO authenticated
USING (
  client_account_id IS NULL                           -- jobs globales (superadmin)
  OR get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- automation_jobs: INSERT (solo admin puede crear jobs manuales desde el frontend)
CREATE POLICY "automation_jobs_insert"
ON public.automation_jobs FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin', 'superadmin')
  AND (
    client_account_id IS NULL
    OR client_account_id = get_my_client_account_id()
  )
);

-- automation_job_runs: SELECT
CREATE POLICY "automation_job_runs_select"
ON public.automation_job_runs FOR SELECT TO authenticated
USING (
  client_account_id IS NULL
  OR get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- ─── 4. Verificación ─────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'automation_jobs'
  ) THEN
    RAISE EXCEPTION 'Tabla automation_jobs no creada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'automation_job_runs'
  ) THEN
    RAISE EXCEPTION 'Tabla automation_job_runs no creada';
  END IF;

  RAISE NOTICE 'Migración 20260412170000 completada correctamente';
END $$;
