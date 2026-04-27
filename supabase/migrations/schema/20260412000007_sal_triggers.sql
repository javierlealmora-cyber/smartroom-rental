-- ============================================================================
-- Migración: SAL — Triggers de asignación automática de accesos
-- Fecha: 2026-04-12
-- REQ: REQ-014 (SmartAccessLock)
--
-- Crea dos triggers sobre lodger_room_assignments que invocan Edge Functions SAL:
--
--   1. after_room_assignment_insert
--      Dispara sal-process-room-assignment al asignar habitación a un inquilino.
--      Concede automáticamente los accesos configurados (auto_assign_to_lodger=true).
--
--   2. after_move_out_set
--      Dispara sal-process-checkout cuando se registra move_out_date.
--      Revoca inmediatamente todos los accesos activos del inquilino.
--
-- ⚠️  PREREQUISITO: extensión pg_net habilitada en Supabase.
--     Activar desde: Dashboard → Database → Extensions → pg_net
--
-- ⚠️  VARIABLES DE CONFIGURACIÓN (postgresql.conf o Supabase secrets):
--     app.sal_ef_base_url   — URL base de las Edge Functions (sin trailing slash)
--                             Ejemplo: https://<project>.supabase.co/functions/v1
--     app.service_role_key  — service_role key del proyecto Supabase
--
-- ALTERNATIVA sin pg_net:
--   Configurar Database Webhooks en el Dashboard de Supabase:
--   • Tabla: lodger_room_assignments | Evento: INSERT   → sal-process-room-assignment
--   • Tabla: lodger_room_assignments | Evento: UPDATE   → sal-process-checkout
--     (filtrar en la Edge Function: solo procesar si move_out_date cambió a NOT NULL)
--
-- Comportamiento ante fallos:
--   Los triggers fallan silenciosamente si pg_net no está disponible o las
--   variables no están configuradas. El job de n8n "Room assignments sin grants"
--   (ejecución horaria) detecta asignaciones sin grants y reconcilia.
--
-- Requiere: 20260412000001–20260412000006 ejecutadas
-- ============================================================================

-- ─── Función: auto-grant al asignar habitación ───────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_sal_room_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ef_url  text;
  v_svc_key text;
BEGIN
  -- Leer variables de configuración (true = no lanzar error si no existen)
  BEGIN
    v_ef_url  := current_setting('app.sal_ef_base_url',  true);
    v_svc_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Variables no configuradas: fallo silencioso.
    -- n8n reconciliará la asignación sin grants en el siguiente ciclo horario.
    RETURN NEW;
  END;

  IF v_ef_url IS NULL OR v_ef_url = ''
     OR v_svc_key IS NULL OR v_svc_key = '' THEN
    RETURN NEW;
  END IF;

  -- Llamada asíncrona a la Edge Function (no bloquea la transacción principal)
  PERFORM net.http_post(
    url     := v_ef_url || '/sal-process-room-assignment',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    ),
    body    := jsonb_build_object('lodger_room_assignment_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallo silencioso: n8n reconciliará en el siguiente ciclo horario.
  RETURN NEW;
END;
$$;

-- ─── Función: revocar accesos al hacer checkout ───────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_sal_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ef_url  text;
  v_svc_key text;
BEGIN
  BEGIN
    v_ef_url  := current_setting('app.sal_ef_base_url',  true);
    v_svc_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_ef_url IS NULL OR v_ef_url = ''
     OR v_svc_key IS NULL OR v_svc_key = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_ef_url || '/sal-process-checkout',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    ),
    body    := jsonb_build_object('lodger_room_assignment_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ─── Trigger: post-INSERT en lodger_room_assignments ─────────────────────────
-- Se dispara cada vez que se crea una nueva asignación de habitación.

DROP TRIGGER IF EXISTS after_room_assignment_insert ON public.lodger_room_assignments;

CREATE TRIGGER after_room_assignment_insert
  AFTER INSERT ON public.lodger_room_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sal_room_assignment();

-- ─── Trigger: post-UPDATE move_out_date en lodger_room_assignments ─────────────
-- Solo se dispara cuando move_out_date pasa de NULL a un valor (inicio de checkout).
-- No se dispara si se modifica de una fecha a otra (correcciones administrativas).

DROP TRIGGER IF EXISTS after_move_out_set ON public.lodger_room_assignments;

CREATE TRIGGER after_move_out_set
  AFTER UPDATE OF move_out_date ON public.lodger_room_assignments
  FOR EACH ROW
  WHEN (
    OLD.move_out_date IS DISTINCT FROM NEW.move_out_date
    AND NEW.move_out_date IS NOT NULL
  )
  EXECUTE FUNCTION public.trigger_sal_checkout();

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'after_room_assignment_insert'
  ) THEN
    RAISE EXCEPTION 'Trigger after_room_assignment_insert no creado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'after_move_out_set'
  ) THEN
    RAISE EXCEPTION 'Trigger after_move_out_set no creado';
  END IF;

  RAISE NOTICE 'Migración 20260412000007 completada correctamente';
END $$;
