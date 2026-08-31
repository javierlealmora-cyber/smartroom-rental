/**
 * conv-core-validate-identity — Wrapper interno de validación de identidad.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar que se aporta al menos phone, profile_id o session_id.
 *   3. Si profile_id presente, tiene prioridad sobre phone.
 *   4. Si session_id presente, cargar identity_data de conv_sessions.
 *   5. Llamar al adapter mock (sin Core real en esta fase).
 *   6. Devolver resultado con identity_level y campos sensibles internos.
 *
 * Niveles que puede devolver: NO_MATCH, MATCH_INACTIVE, PARTIAL_MATCH_ACTIVE, STRONG_MATCH_ACTIVE.
 * Niveles excluidos: el adapter no devuelve niveles no permitidos.
 *
 * Privacidad: no loguear phone, profile_id, full_name, room_label, identity_data ni tokens.
 * Fuente: rules-80 §4.5, SmartConversations identity contract.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultCoreIdentityClient } from "../_shared/smart-conversations/runtime/core-identity-client.ts";

const EF_NAME = 'conv-core-validate-identity';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);

  let body: {
    client_account_id?: unknown;
    phone?: unknown;
    profile_id?: unknown;
    session_id?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, phone, profile_id, session_id } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }

  // Se requiere al menos uno de los identificadores de lookup
  if (!phone && !profile_id && !session_id) {
    return err(ERROR_CODES.VALIDATION, 'Se requiere al menos phone, profile_id o session_id', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Si session_id: cargar identity_data de la sesión ──────────────────────

  let sessionIdentityData: {
    full_name?: string;
    residence_name?: string;
    room_label?: string;
  } | undefined;

  if (session_id && typeof session_id === 'string') {
    const { data: sessionRow } = await supabase
      .from('conv_sessions')
      .select('identity_data')
      .eq('id', session_id)
      .eq('client_account_id', client_account_id)
      .maybeSingle();
    if (sessionRow?.identity_data) {
      sessionIdentityData = sessionRow.identity_data as typeof sessionIdentityData;
    }
  }

  // ── Llamar al adapter mock ─────────────────────────────────────────────────
  // profile_id tiene prioridad — el adapter lo gestiona internamente.
  // No loguear phone, profile_id ni identity_data.

  const result = await defaultCoreIdentityClient.validateIdentity({
    client_account_id,
    phone: typeof phone === 'string' ? phone : undefined,
    profile_id: typeof profile_id === 'string' ? profile_id : undefined,
    identity_data: sessionIdentityData,
  });

  log.info('identidad validada', {
    session_id: typeof session_id === 'string' ? session_id : 'n/a',
    identity_level: result.identity_level,
    // No loguear phone, profile_id, full_name, room_label
  });

  return ok(result);
});
