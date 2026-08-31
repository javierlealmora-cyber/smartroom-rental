/**
 * conv-core-create-lead — Wrapper interno para crear leads comerciales en Core.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar campos de lead (listing_id, interest_type).
 *   3. NO loguear datos de contacto (PII).
 *   4. NO meter contacto en Activity Log ni conv_admin_notifications.
 *   5. Llamar al adapter mock con backoff (sin Core real en esta fase).
 *   6. Gestionar errores: 4xx no reintenta, 5xx/timeout reintenta.
 *   7. Máximo 3 intentos. Backoff: 1s / 5s / 30s.
 *   8. Al agotar intentos: devolver error controlado.
 *
 * Privacidad: contact (name, phone, email) es PII — nunca loguear, nunca al Activity Log.
 * Fuente: rules-80, rules-75, SmartConversations WF-30.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultCoreLeadClient } from "../_shared/smart-conversations/runtime/core-lead-client.ts";

const EF_NAME = 'conv-core-create-lead';

// Backoff interno para llamadas al Core mock (representa Core real en producción)
const CORE_BACKOFF_SECONDS = [1, 5, 30] as const;
const MAX_CORE_ATTEMPTS    = 3;

// HTTP status ranges
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_CLIENT_ERROR_MAX = 499;
const HTTP_SERVER_ERROR_MIN = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    session_id?:        unknown;
    conv_case_id?:      unknown;
    listing_id?:        unknown;
    interest_type?:     unknown;
    contact?:           unknown;
    preferences?:       unknown;
    source?:            unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const {
    client_account_id, session_id, conv_case_id,
    listing_id, interest_type, contact, preferences, source,
  } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!conv_case_id || typeof conv_case_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'conv_case_id es obligatorio', 400);
  }
  if (!listing_id || typeof listing_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'listing_id es obligatorio', 400);
  }
  if (!interest_type || typeof interest_type !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'interest_type es obligatorio', 400);
  }

  // contact es PII — normalizar sin loguear contenido
  const safeContact =
    contact !== null && typeof contact === 'object' && !Array.isArray(contact)
      ? (contact as Record<string, unknown>)
      : {};

  const safePreferences =
    preferences !== null && typeof preferences === 'object' && !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>)
      : {};

  // ── Llamada al adapter con backoff ────────────────────────────────────────────
  // 4xx → no reintenta. 5xx / timeout → reintenta con backoff 1s / 5s / 30s.
  // Máximo 3 intentos totales. No se ejecuta cuarto intento.

  let attempts     = 0;
  let leadResult:  { lead_id: string; lead_ref: string } | null = null;
  let nonRetryable = false;

  while (attempts < MAX_CORE_ATTEMPTS && !leadResult && !nonRetryable) {
    attempts++;
    try {
      const result = await defaultCoreLeadClient.createLead({
        client_account_id,
        session_id,
        conv_case_id,
        listing_id,
        interest_type,
        // contact pasa al adapter para uso interno — nunca va a logs ni Activity Log
        contact: {
          name:  typeof safeContact['name'] === 'string'  ? safeContact['name']  : undefined,
          phone: typeof safeContact['phone'] === 'string' ? safeContact['phone'] : undefined,
          email: typeof safeContact['email'] === 'string' ? safeContact['email'] : undefined,
        },
        preferences: {
          budget_max:   typeof safePreferences['budget_max'] === 'number'   ? safePreferences['budget_max']   : undefined,
          move_in_date: typeof safePreferences['move_in_date'] === 'string' ? safePreferences['move_in_date'] : undefined,
        },
        source: typeof source === 'string' ? source : 'whatsapp',
      });
      leadResult = result;
    } catch (e: unknown) {
      const errMsg    = e instanceof Error ? e.message : String(e);
      const statusMatch = errMsg.match(/HTTP_STATUS=(\d+)/);
      const statusCode  = statusMatch ? parseInt(statusMatch[1], 10) : HTTP_SERVER_ERROR_MIN;

      if (statusCode >= HTTP_CLIENT_ERROR_MIN && statusCode <= HTTP_CLIENT_ERROR_MAX) {
        // 4xx: no reintenta
        log.warn('Error no retriable al crear lead', {
          attempts: String(attempts),
          status:   String(statusCode),
        });
        nonRetryable = true;
      } else {
        // 5xx / timeout: retriable
        log.warn('Error retriable al crear lead — backoff', { attempts: String(attempts) });
        if (attempts < MAX_CORE_ATTEMPTS) {
          await sleep(CORE_BACKOFF_SECONDS[attempts - 1] * 1000);
        }
      }
    }
  }

  if (!leadResult) {
    // Error controlado — no exponer detalle técnico al usuario
    log.warn('Core lead mock no disponible tras intentos', { attempts: String(attempts) });
    return err(ERROR_CODES.INTERNAL, 'No fue posible crear el lead en este momento', 503);
  }

  // NO loguear datos de contacto — solo IDs opacos
  log.info('lead creado', {
    conv_case_id,
    lead_ref: leadResult.lead_ref,
    // NO loguear: contact, phone, email, name
  });

  return ok(leadResult);
});
