/**
 * conv-identity-progressive — Flujo progresivo de identificación (WF-IDENTITY).
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar provided_field (full_name | residence_name | room_label).
 *   3. Cargar conv_sessions.identity_data.
 *   4. Persistir el campo proporcionado en identity_data (sin phone_number).
 *   5. Si faltan campos → pedir el siguiente.
 *   6. Si hay datos suficientes → llamar a conv-core-validate-identity.
 *   7. Si PARTIAL_MATCH_ACTIVE o STRONG_MATCH_ACTIVE → actualizar sesión, publicar actividad.
 *   8. Si NO_MATCH → incrementar identity_attempts.
 *   9. Máximo 3 intentos (MAX_IDENTITY_ATTEMPTS). Al tercer fallo: escalar.
 *  10. No iniciar cuarto intento.
 *  11. Si hay conv_case_id → llamar a conv-escalate-case (fire-and-log).
 *  12. No degradar identity_level.
 *  13. No loguear provided_value, phone, profile_id ni identity_data.
 *
 * Privacidad: provided_value, identity_data y profile_id son sensibles — no loguear.
 * Fuente: rules-80 §4.5, rules-50, SmartConversations identity contract.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { canAdvanceIdentityLevel } from "../_shared/smart-conversations/runtime/identity-level.ts";

const EF_NAME = 'conv-identity-progressive';
const MAX_IDENTITY_ATTEMPTS = 3;
const VALID_IDENTITY_FIELDS = ['full_name', 'residence_name', 'room_label'] as const;
const PUBLISHABLE_LEVELS = ['PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE'] as const;

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  let body: {
    client_account_id?: unknown;
    session_id?: unknown;
    provided_field?: unknown;
    provided_value?: unknown;
    conv_case_id?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, provided_field, provided_value, conv_case_id } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }

  // provided_field debe ser uno de los campos válidos de identidad progresiva
  if (!provided_field || !(VALID_IDENTITY_FIELDS as readonly string[]).includes(provided_field as string)) {
    return err(ERROR_CODES.VALIDATION, 'provided_field inválido', 400);
  }

  const field = provided_field as string;

  if (!provided_value || typeof provided_value !== 'string' || (provided_value as string).trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'provided_value es obligatorio', 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesión ──────────────────────────────────────────────────────────

  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, identity_level, identity_data, identity_attempts, active_case_id')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  // ── Persistir campo (sin phone_number) ────────────────────────────────────

  const currentIdentityData = (session.identity_data as Record<string, unknown>) ?? {};
  const newIdentityData: Record<string, unknown> = { ...currentIdentityData };
  newIdentityData[field] = provided_value;
  // phone_number nunca se almacena en identity_data
  delete newIdentityData['phone_number'];

  await supabase
    .from('conv_sessions')
    .update({ identity_data: newIdentityData })
    .eq('id', session_id);

  // ── ¿Faltan campos? ────────────────────────────────────────────────────────

  const nextField = VALID_IDENTITY_FIELDS.find(f => !newIdentityData[f]);
  if (nextField) {
    log.info('campo persistido — solicitando siguiente', {
      session_id,
      next_field: nextField,
    });
    return ok({ response_type: 'identity_more_input_required', session_id, next_field: nextField });
  }

  // Todos los campos presentes — verificar intentos antes de llamar a validación
  const currentAttempts: number = (session.identity_attempts as number) ?? 0;

  if (currentAttempts >= MAX_IDENTITY_ATTEMPTS) {
    // No iniciar cuarto intento
    log.warn('máximo de intentos alcanzado — escalando', {
      session_id,
      identity_attempts: String(currentAttempts),
    });
    return escalate(session_id, client_account_id, conv_case_id, supabaseUrl, serviceRoleKey, log);
  }

  // ── Llamar a conv-core-validate-identity ──────────────────────────────────

  let identityLevel = 'NO_MATCH';
  let resolvedProfileId: string | undefined;

  try {
    const validateRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-validate-identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_account_id, session_id }),
    });
    if (validateRes.ok) {
      const vData = await validateRes.json() as {
        data?: { identity_level?: string; profile_id?: string };
      };
      identityLevel = vData?.data?.identity_level ?? 'NO_MATCH';
      resolvedProfileId = vData?.data?.profile_id;
    }
  } catch (e: unknown) {
    log.warn('Error al llamar conv-core-validate-identity', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  // ── Resultado: avance de identidad ────────────────────────────────────────

  const currentLevel: string = session.identity_level ?? 'NO_MATCH';

  if (canAdvanceIdentityLevel(currentLevel, identityLevel)) {
    const sessionUpdate: Record<string, unknown> = { identity_level: identityLevel };
    if (resolvedProfileId) sessionUpdate['profile_id'] = resolvedProfileId;

    await supabase
      .from('conv_sessions')
      .update(sessionUpdate)
      .eq('id', session_id);

    // Publicar conv_identity_validated solo para PARTIAL o STRONG (fire-and-log)
    if ((PUBLISHABLE_LEVELS as readonly string[]).includes(identityLevel)) {
      fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          event_type: 'conv_identity_validated',
          source: 'smartconversations',
          client_account_id,
          timestamp: new Date().toISOString(),
          // Payload sin PII: solo session_id (opaco) e identity_level (enum)
          data: { session_id, identity_level: identityLevel },
        }),
      }).catch((e: unknown) => {
        log.warn('publish conv_identity_validated falló (no bloquea)', {
          err: e instanceof Error ? e.message : String(e),
        });
      });
    }

    log.info('identidad validada', { session_id, identity_level: identityLevel });

    return ok({ response_type: 'identity_validated', session_id, identity_level: identityLevel });
  }

  // ── Resultado: NO_MATCH — incrementar intentos ────────────────────────────

  const newAttempts = currentAttempts + 1;

  await supabase
    .from('conv_sessions')
    .update({ identity_attempts: newAttempts })
    .eq('id', session_id);

  log.warn('intento de identidad fallido', {
    session_id,
    identity_attempts: String(newAttempts),
  });

  if (newAttempts >= MAX_IDENTITY_ATTEMPTS) {
    return escalate(session_id, client_account_id, conv_case_id, supabaseUrl, serviceRoleKey, log);
  }

  // Hay intentos restantes: pedir datos desde el inicio
  return ok({ response_type: 'identity_more_input_required', session_id, next_field: 'full_name' });
});

// ---------------------------------------------------------------------------
// Helper: escalado por fallo de identidad
// ---------------------------------------------------------------------------

function escalate(
  session_id: string,
  client_account_id: string,
  conv_case_id: unknown,
  supabaseUrl: string,
  serviceRoleKey: string,
  log: ReturnType<typeof import('../_shared/smart-conversations/ef-logger.ts').createSafeLogger>,
): Response {
  // Si hay conv_case_id activo, escalar el caso (fire-and-log — no bloquea)
  if (conv_case_id && typeof conv_case_id === 'string') {
    fetch(`${supabaseUrl}/functions/v1/conv-escalate-case`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        client_account_id,
        conv_case_id,
        reason: 'identity_failed',
      }),
    }).catch((e: unknown) => {
      log.warn('conv-escalate-case falló al escalar identidad (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });
  }

  return ok({
    response_type: 'identity_escalated',
    session_id,
    reason: 'identity_failed',
  });
}
