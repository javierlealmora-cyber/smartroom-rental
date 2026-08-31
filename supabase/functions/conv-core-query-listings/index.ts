/**
 * conv-core-query-listings — Wrapper interno para consultar publicaciones disponibles.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Rechazar profile_id, identity_data, sender_ref (no son campos de consulta pública).
 *   3. Validar input de filtros públicos.
 *   4. Llamar al adapter mock (sin Core real en esta fase).
 *   5. Devolver solo campos públicos del anuncio.
 *
 * NO devuelve: assignment_id, room_id interno, dirección exacta no pública, datos de contrato.
 * Fuente: rules-80, SmartConversations WF-30.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultCoreListingsClient } from "../_shared/smart-conversations/runtime/core-listings-client.ts";

const EF_NAME = 'conv-core-query-listings';

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
    return err(ERROR_CODES.VALIDATION, 'profile_id no está permitido en query-listings', 400);
  }
  if ('identity_data' in body) {
    return err(ERROR_CODES.VALIDATION, 'identity_data no está permitido en query-listings', 400);
  }
  if ('sender_ref' in body) {
    return err(ERROR_CODES.VALIDATION, 'sender_ref no está permitido en query-listings', 400);
  }

  const { client_account_id, channel, filters } = body as {
    client_account_id?: unknown;
    channel?:           unknown;
    filters?:           unknown;
  };

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!channel || typeof channel !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'channel es obligatorio', 400);
  }

  const safeFilters =
    filters !== null && typeof filters === 'object' && !Array.isArray(filters)
      ? (filters as Record<string, unknown>)
      : {};

  try {
    const result = await defaultCoreListingsClient.queryListings({
      client_account_id,
      channel,
      filters: {
        location:    typeof safeFilters['location'] === 'string'   ? safeFilters['location']    : undefined,
        budget_max:  typeof safeFilters['budget_max'] === 'number' ? safeFilters['budget_max']  : undefined,
        move_in_date: typeof safeFilters['move_in_date'] === 'string' ? safeFilters['move_in_date'] : undefined,
        room_type:   typeof safeFilters['room_type'] === 'string'  ? safeFilters['room_type']   : undefined,
      },
    });

    log.info('listings consultados', {
      client_account_id,
      count: String(result.listings.length),
    });

    // Devolver solo campos públicos — sin assignment_id, room_id, dirección exacta
    return ok({ listings: result.listings });
  } catch (e: unknown) {
    log.error('Error al consultar listings mock', {
      err: e instanceof Error ? e.message : String(e),
    });
    return err(ERROR_CODES.INTERNAL, 'Error al consultar publicaciones', 500);
  }
});
