/**
 * conv-core-create-help-ticket — Wrapper interno para crear tickets de ayuda en Core.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar campos del ticket (topic, summary, session_id, conv_case_id).
 *   3. NO loguear summary si puede contener texto de usuario.
 *   4. NO aceptar profile_id, identity_data ni phone desde payload externo.
 *   5. Llamar al adapter mock con backoff (sin Core real en esta fase).
 *   6. Gestionar errores: 4xx no reintenta, 5xx/timeout reintenta.
 *   7. Máximo 3 intentos. Backoff: 1s / 5s / 30s.
 *   8. Al agotar intentos: devolver error controlado.
 *
 * Privacidad: summary puede contener texto de usuario — nunca loguear.
 * Fuente: rules-80, rules-75, SmartConversations WF-40.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultCoreHelpTicketClient } from "../_shared/smart-conversations/runtime/core-help-ticket-client.ts";

const EF_NAME = 'conv-core-create-help-ticket';

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
    topic?:             unknown;
    summary?:           unknown;
    source?:            unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  // Rechazar campos PII/internos desde payload externo
  const rawBody = body as Record<string, unknown>;
  if ('profile_id' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'profile_id no está permitido en create-help-ticket', 400);
  }
  if ('identity_data' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'identity_data no está permitido en create-help-ticket', 400);
  }
  if ('phone' in rawBody || 'phone_number' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'teléfono no está permitido en create-help-ticket', 400);
  }

  const { client_account_id, session_id, conv_case_id, topic, summary, source } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!conv_case_id || typeof conv_case_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'conv_case_id es obligatorio', 400);
  }
  if (!topic || typeof topic !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'topic es obligatorio', 400);
  }

  const safeSummary = typeof summary === 'string' ? summary : 'Solicitud de ayuda';

  // ── Llamada al adapter con backoff ────────────────────────────────────────────
  // 4xx → no reintenta. 5xx / timeout → reintenta con backoff 1s / 5s / 30s.
  // Máximo 3 intentos totales. No se ejecuta cuarto intento.

  let attempts      = 0;
  let ticketResult: { help_ticket_id: string; help_ticket_ref: string } | null = null;
  let nonRetryable  = false;

  while (attempts < MAX_CORE_ATTEMPTS && !ticketResult && !nonRetryable) {
    attempts++;
    try {
      const result = await defaultCoreHelpTicketClient.createHelpTicket({
        client_account_id,
        session_id,
        conv_case_id,
        topic,
        summary: safeSummary,  // summary no va a logs
        source: typeof source === 'string' ? source : 'whatsapp',
      });
      ticketResult = result;
    } catch (e: unknown) {
      const errMsg    = e instanceof Error ? e.message : String(e);
      const statusMatch = errMsg.match(/HTTP_STATUS=(\d+)/);
      const statusCode  = statusMatch ? parseInt(statusMatch[1], 10) : HTTP_SERVER_ERROR_MIN;

      if (statusCode >= HTTP_CLIENT_ERROR_MIN && statusCode <= HTTP_CLIENT_ERROR_MAX) {
        // 4xx: no reintenta
        log.warn('Error no retriable al crear help ticket', {
          attempts: String(attempts),
          status:   String(statusCode),
        });
        nonRetryable = true;
      } else {
        // 5xx / timeout: retriable
        log.warn('Error retriable al crear help ticket — backoff', { attempts: String(attempts) });
        if (attempts < MAX_CORE_ATTEMPTS) {
          await sleep(CORE_BACKOFF_SECONDS[attempts - 1] * 1000);
        }
      }
    }
  }

  if (!ticketResult) {
    // Error controlado — no exponer detalle técnico al usuario
    log.warn('Core help ticket mock no disponible tras intentos', { attempts: String(attempts) });
    return err(ERROR_CODES.INTERNAL, 'No fue posible crear el ticket de ayuda en este momento', 503);
  }

  // NO loguear summary — solo IDs opacos
  log.info('help ticket creado', {
    conv_case_id,
    help_ticket_ref: ticketResult.help_ticket_ref,
    // NO loguear: summary
  });

  return ok(ticketResult);
});
