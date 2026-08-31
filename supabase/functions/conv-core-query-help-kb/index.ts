/**
 * conv-core-query-help-kb — Wrapper interno para consultar la base de conocimiento de ayuda.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Rechazar profile_id, identity_data, sender_ref, phone (campos no admitidos).
 *   3. Validar input de consulta pública (topic, question).
 *   4. Llamar al adapter mock (sin Core real en esta fase).
 *   5. Devolver solo respuestas públicas/generales sin datos personales.
 *
 * NO devuelve: datos internos de contrato, datos personales, información específica de usuario.
 * Fuente: rules-80, SmartConversations WF-40.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultHelpKbClient } from "../_shared/smart-conversations/runtime/help-kb-client.ts";

const EF_NAME = 'conv-core-query-help-kb';

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  // Rechazar campos PII/internos que no deben venir del exterior
  if ('profile_id' in body) {
    return err(ERROR_CODES.VALIDATION, 'profile_id no está permitido en query-help-kb', 400);
  }
  if ('identity_data' in body) {
    return err(ERROR_CODES.VALIDATION, 'identity_data no está permitido en query-help-kb', 400);
  }
  if ('sender_ref' in body) {
    return err(ERROR_CODES.VALIDATION, 'sender_ref no está permitido en query-help-kb', 400);
  }
  if ('phone' in body || 'phone_number' in body) {
    return err(ERROR_CODES.VALIDATION, 'teléfono no está permitido en query-help-kb', 400);
  }

  const { client_account_id, channel, topic, question } = body as {
    client_account_id?: unknown;
    channel?:           unknown;
    topic?:             unknown;
    question?:          unknown;
  };

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!channel || typeof channel !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'channel es obligatorio', 400);
  }
  if (!question || typeof question !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'question es obligatorio', 400);
  }

  try {
    const result = await defaultHelpKbClient.queryKb({
      client_account_id,
      channel,
      topic:    typeof topic === 'string' ? topic : undefined,
      question,
    });

    log.info('KB consultada', {
      client_account_id,
      topic:  typeof topic === 'string' ? topic : 'none',
      count:  String(result.matches.length),
    });

    // Devolver solo respuestas públicas — sin datos internos de contrato ni PII
    return ok({ matches: result.matches });
  } catch (e: unknown) {
    log.error('Error al consultar KB mock', {
      err: e instanceof Error ? e.message : String(e),
    });
    return err(ERROR_CODES.INTERNAL, 'Error al consultar la base de conocimiento', 500);
  }
});
