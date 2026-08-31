/**
 * conv-core-get-tenant-features
 *
 * Devuelve los servicios activos y límites de plan para un tenant.
 * Consulta las tres tablas del modelo de activación por niveles:
 *   - Level 2 WA  : conv_wa_sessions.status = 'active'
 *   - Level 2 WC  : conv_wc_configs.is_active = true
 *   - Level 3     : conv_service_activations.is_active = true
 *
 * Autenticación: service_role only (EF interna).
 * Contrato: TenantFeaturesResponse (contracts.ts)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";

const EF_NAME = 'conv-core-get-tenant-features';

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

  let body: { client_account_id?: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id } = body;
  if (!client_account_id) {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Level 3: servicios activos por canal
  const { data: activations, error: activationsError } = await supabase
    .from('conv_service_activations')
    .select('service_code, channel, config, is_active')
    .eq('client_account_id', client_account_id)
    .eq('is_active', true);

  if (activationsError) {
    log.error('Error al leer conv_service_activations', { client_account_id, err: activationsError.message });
    return err(ERROR_CODES.INTERNAL, 'Error al leer activaciones', 500);
  }

  // Level 2 WhatsApp
  const { data: waSessions } = await supabase
    .from('conv_wa_sessions')
    .select('status')
    .eq('client_account_id', client_account_id)
    .eq('status', 'active')
    .limit(1);

  // Level 2 WebChat
  const { data: wcConfigs } = await supabase
    .from('conv_wc_configs')
    .select('is_active')
    .eq('client_account_id', client_account_id)
    .eq('is_active', true)
    .limit(1);

  const waActive = (waSessions?.length ?? 0) > 0;
  const wcActive = (wcConfigs?.length ?? 0) > 0;

  // Construir services_active respetando la activación por nivel
  type ServiceEntry = { service_code: string; channels: string[]; config?: unknown };
  const serviceMap = new Map<string, ServiceEntry>();

  for (const act of activations ?? []) {
    const channelActive =
      (act.channel === 'whatsapp' && waActive) ||
      (act.channel === 'webchat' && wcActive);
    if (!channelActive) continue;

    if (!serviceMap.has(act.service_code)) {
      serviceMap.set(act.service_code, {
        service_code: act.service_code,
        channels: [],
        ...(act.config ? { config: act.config } : {}),
      });
    }
    serviceMap.get(act.service_code)!.channels.push(act.channel);
  }

  const services_active = Array.from(serviceMap.values());

  // plan_limits: la lectura de suscripciones se implementa en fases posteriores
  const plan_limits = {
    max_cases_per_month: 0,
    ai_enabled: false,
    webchat_enabled: wcActive,
    whatsapp_enabled: waActive,
  };

  log.info('tenant features resolved', {
    client_account_id,
    services_count: services_active.length,
    wa_active: waActive,
    wc_active: wcActive,
  });

  return ok({ services_active, plan_limits });
});
