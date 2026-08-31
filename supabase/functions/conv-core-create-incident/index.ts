/**
 * conv-core-create-incident — Wrapper interno para crear incidencias via IncidentIntegrationPort.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar campos de incidencia (incident_type, urgency, description).
 *   3. Cargar conv_sessions para obtener profile_id, room_id y accommodation_id internamente.
 *   4. NO aceptar profile_id, room_id ni accommodation_id desde el payload externo ni desde n8n.
 *   5. Delegar a IncidentIntegrationPort vía incidents-addon-adapter (Opción A).
 *   6. Modo por defecto: mock — real mode bloqueado por configuración en esta fase.
 *
 * Idempotency:
 *   Estrategia: CONSUMER_IDEMPOTENCY_HASH_DERIVED — clave derivada de client_account_id + conv_case_id.
 *   Estado persistencia: CONSUMER_IDEMPOTENCY_PERSISTENCE_PENDING — sin store durable en esta fase.
 *
 * Privacidad: description, profile_id, room_id, accommodation_id, identity_data — no loguear.
 * Fuente: rules-75, rules-90, SmartConversations WF-20.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { createIncident } from "../_shared/smart-conversations/adapters/incidents-addon-adapter.ts";
import {
  generateIncidentTitle,
  TitleValidationError,
} from "../_shared/smart-conversations/adapters/incidents-title-generator.ts";
import {
  INCIDENT_SOURCE_SYSTEM,
  deriveIncidentIdempotencyKey,
  resolveIncidentSourceChannel,
  assertSourceChannelNotOverridden,
  resolveTenantFromContext,
} from "../_shared/smart-conversations/incidents-integration-port.ts";
import type { InternalCreateIncidentCommand } from "../_shared/smart-conversations/incidents-integration-port.ts";

const EF_NAME = 'conv-core-create-incident';

// Mapeo de incident_types internos SC → categorías canónicas del provider
const INCIDENT_TYPE_TO_CATEGORY: Readonly<Record<string, string>> = {
  fuga_agua:              'maintenance',
  ruido_vecinos:          'noise',
  calefaccion:            'maintenance',
  electricidad:           'maintenance',
  puerta_acceso:          'security',
  limpieza:               'other',
  averia_electrodomestico:'maintenance',
  instalaciones:          'maintenance',
  factura:                'billing',
};

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
    session_id?:        unknown;
    conv_case_id?:      unknown;
    incident_type?:     unknown;
    urgency?:           unknown;
    description?:       unknown;
    source?:            unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, conv_case_id, incident_type, urgency, description, source } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!conv_case_id || typeof conv_case_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'conv_case_id es obligatorio', 400);
  }
  if (!incident_type || typeof incident_type !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'incident_type es obligatorio', 400);
  }
  if (!urgency || typeof urgency !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'urgency es obligatorio', 400);
  }
  if (!description || typeof description !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'description es obligatorio', 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar conv_cases server-side — client_account_id y session_id se obtienen del caso.
  // El tenant NO proviene del body; n8n/WF-20 no puede seleccionar ni sobrescribir el tenant.
  const { data: caseRow, error: caseErr } = await supabase
    .from('conv_cases')
    .select('client_account_id, session_id')
    .eq('id', conv_case_id)
    .maybeSingle();

  if (caseErr || !caseRow) {
    log.error('Caso no encontrado para create-incident', { conv_case_id });
    return err(ERROR_CODES.NOT_FOUND, 'Caso no encontrado', 404);
  }

  // ── Cargar conv_sessions — profile_id, identity_data, channel y client_account_id se obtienen AQUÍ ──
  // Ninguno de estos campos se acepta desde el payload externo ni desde n8n/WF-20.
  // Sin filtro de tenant: el tenant se valida cruzando case y session, no desde el body.
  const { data: sessionRow, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('profile_id, identity_data, client_account_id, channel')
    .eq('id', session_id)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    log.error('Sesión no encontrada para create-incident', { session_id });
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  // ── Resolución server-side del tenant (CONSUMER_TENANT_CONTEXT_RESOLVED_SERVER_SIDE) ──
  // case.client_account_id = session.client_account_id, y el body es solo valor declarado.
  // Mismatch en cualquier sentido → fail-closed, sin invocar el adapter.
  let resolvedTenantId: string;
  try {
    resolvedTenantId = resolveTenantFromContext(
      caseRow,
      sessionRow,
      session_id,
      typeof client_account_id === 'string' ? client_account_id : null,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INCIDENT_TENANT_MISMATCH';
    log.warn('Tenant resolution failed — fail-closed', { conv_case_id, session_id });
    return err(ERROR_CODES.VALIDATION, msg, 422);
  }

  const profileId = typeof sessionRow.profile_id === 'string' ? sessionRow.profile_id : null;
  if (!profileId) {
    log.warn('Perfil no identificado en sesión', {});
    return err(ERROR_CODES.VALIDATION, 'Perfil de usuario no disponible en sesión', 422);
  }

  // Extraer room_id y accommodation_id de identity_data — nunca desde el payload externo
  const identData = (sessionRow.identity_data ?? {}) as Record<string, unknown>;
  const roomId = typeof identData['room_id'] === 'string' ? identData['room_id'] : null;
  const accommodationId = typeof identData['accommodation_id'] === 'string'
    ? identData['accommodation_id'] : null;

  if (!accommodationId) {
    log.warn('accommodation_id no disponible en sesión', {});
    return err(ERROR_CODES.VALIDATION, 'accommodation_id no disponible en sesión', 422);
  }

  // ── Resolución fail-closed del canal (CONSUMER_SOURCE_CHANNEL_RESOLVED_SERVER_SIDE) ──
  // Fuente canónica: conv_session.channel. body.source es solo valor declarado que no puede
  // sobrescribir el canal persistido. Canal desconocido o ausente → error, sin adapter.
  let sourceChannel: 'whatsapp' | 'webchat';
  try {
    sourceChannel = resolveIncidentSourceChannel(sessionRow.channel);
    assertSourceChannelNotOverridden(sourceChannel, source);
  } catch {
    log.warn('Canal inválido o mismatch body vs sesión — fail-closed', {});
    return err(ERROR_CODES.VALIDATION, 'INCIDENT_SOURCE_CHANNEL_INVALID', 422);
  }

  // Mapear incident_type SC → category del provider (desconocidos → 'other')
  const category = INCIDENT_TYPE_TO_CATEGORY[incident_type] ?? 'other';

  // Generar título determinista para el provider (TITLE_MIN=5, TITLE_MAX=120)
  let title: string;
  try {
    title = generateIncidentTitle(category, description);
  } catch (e) {
    if (e instanceof TitleValidationError) {
      log.warn('No se pudo generar título válido', {});
      return err(ERROR_CODES.VALIDATION, 'No se pudo generar un título válido para la incidencia', 422);
    }
    throw e;
  }

  // Idempotency key derivado con HMAC-SHA256 (IMPLEMENTED_DERIVED_OPAQUE).
  // La referencia de operación es conv_case_id validado server-side — no vacío, no del body.
  // El secreto es server-side únicamente; real/canary requieren INCIDENTS_IDEMPOTENCY_SECRET.
  // CONSUMER_IDEMPOTENCY_PERSISTENCE_PENDING: no hay store durable del lado consumer en esta fase.
  const idempotencySecret = Deno.env.get('INCIDENTS_IDEMPOTENCY_SECRET');
  const integrationMode = Deno.env.get('INCIDENTS_ADDON_INTEGRATION_MODE') ?? 'mock';
  if ((integrationMode === 'real' || integrationMode === 'canary') && !idempotencySecret) {
    log.warn('INCIDENTS_IDEMPOTENCY_SECRET requerido para modo real/canary', {});
    return err(ERROR_CODES.INTERNAL, 'INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED', 503);
  }
  const idempotencyKey = await deriveIncidentIdempotencyKey(
    resolvedTenantId,
    conv_case_id,
    idempotencySecret ?? 'offline-mock-not-real',
  );

  const cmd: InternalCreateIncidentCommand = {
    contract_version: '1.0',
    client_account_id: resolvedTenantId,
    request_id: crypto.randomUUID(),
    correlation_id: conv_case_id,
    idempotency_key: idempotencyKey,
    source_system: INCIDENT_SOURCE_SYSTEM,
    source_channel: sourceChannel,
    actor: { type: 'system_service', service_name: EF_NAME },
    requester_profile_id: profileId,  // resuelto server-side — NUNCA desde n8n/WF-20
    incident: {
      accommodation_id: accommodationId,
      room_id: roomId,
      category,
      title,
      description,
      urgency_proposal: urgency,
      // external_request_reference omitido del DTO interno — el adapter envía null al root
    },
  };

  // Delegar a IncidentIntegrationPort vía adapter (Opción A — facade de compatibilidad).
  // Modo mock por defecto — real mode bloqueado hasta que INCIDENTS_ADDON_BASE_URL esté configurado.
  const adapterResult = await createIncident(cmd);

  if (!adapterResult.ok) {
    log.warn('Adapter no creó incidencia', { conv_case_id, error_code: adapterResult.error_code });
    return err(ERROR_CODES.INTERNAL, 'No fue posible crear la incidencia en este momento', 503);
  }

  const incident = adapterResult.data!;
  log.info('incidencia creada', {
    conv_case_id,
    incident_ref: incident.incident_reference ?? 'N/A',
    // No loguear profile_id, room_id, accommodation_id, description
  });

  // Mapear al formato que espera WF-20 (incident_ref sin "ence")
  return ok({
    incident_id: incident.incident_id,
    incident_ref: incident.incident_reference ?? null,
  });
});
