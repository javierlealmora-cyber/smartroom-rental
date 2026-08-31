/**
 * Helpers compartidos para las Edge Functions del módulo SmartAccessLock (SAL).
 *
 * Patrón de autenticación dual:
 *   - Frontend (JWT de usuario): validar token, verificar rol y tenant.
 *   - n8n / automatización (service_role_key como Bearer): skip JWT, usar payload.
 *
 * Uso:
 *   const ctx = await resolveSalContext(req, body.client_account_id);
 *   if (ctx instanceof Response) return ctx;  // error temprano
 *   const { supabase, actorUserId, actorRole, clientAccountId, isAutomation } = ctx;
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { err, ERROR_CODES } from "./response.ts";

export type SalContext = {
  supabase: SupabaseClient;
  actorUserId: string | null;
  actorRole: string;
  actorEmail: string | null;   // email del admin autenticado (null para automatización)
  clientAccountId: string;
  isAutomation: boolean;
};

/**
 * Detecta si la llamada viene de n8n / proceso automatizado.
 * n8n envía la service_role_key directamente como Bearer.
 */
export function detectAutomationCaller(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return authHeader === `Bearer ${serviceRoleKey}`;
}

/**
 * Crea un cliente Supabase con service_role (bypasa RLS).
 * Usado para todas las operaciones de EF tras validar identidad.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Resuelve el contexto de ejecución SAL.
 *
 * - Si el caller es automatización (n8n): valida que client_account_id esté en el payload.
 * - Si el caller es un usuario: valida JWT, verifica rol admin/superadmin, verifica tenant.
 *
 * @param req           Request entrante
 * @param clientAccountId  UUID del tenant (requerido para ambos flujos)
 * @param requireRoles  Roles permitidos (default: admin + superadmin)
 * @returns SalContext o Response de error
 */
export async function resolveSalContext(
  req: Request,
  clientAccountId: string,
  requireRoles: string[] = ["admin", "superadmin"]
): Promise<SalContext | Response> {
  if (!clientAccountId) {
    return err(ERROR_CODES.VALIDATION, "client_account_id is required", 400);
  }

  const supabase = createServiceClient();
  const isAutomation = detectAutomationCaller(req);

  if (isAutomation) {
    // n8n usa service_role — no hay JWT de usuario
    return {
      supabase,
      actorUserId: null,
      actorRole: "system",
      actorEmail: null,
      clientAccountId,
      isAutomation: true,
    };
  }

  // Validar JWT de usuario
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);
  }

  // Verificar perfil y rol
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_account_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return err(ERROR_CODES.NOT_FOUND, "Profile not found", 404);
  }

  if (!requireRoles.includes(profile.role)) {
    return err(ERROR_CODES.FORBIDDEN, "Insufficient permissions", 403);
  }

  // Superadmin puede operar sobre cualquier tenant
  if (profile.role !== "superadmin") {
    if (profile.client_account_id !== clientAccountId) {
      return err(ERROR_CODES.FORBIDDEN, "Tenant mismatch", 403);
    }
  }

  return {
    supabase,
    actorUserId: user.id,
    actorRole: profile.role,
    actorEmail: user.email ?? null,
    clientAccountId,
    isAutomation: false,
  };
}

export type SalActiveSubscription = {
  subscriptionId: string;
  planId: string;
  saasServiceId: string;
  status: string;
};

/**
 * Devuelve la suscripción SAL activa del client_account, o null si no la hay.
 * Filtra estrictamente por service_code = 'smart_access_lock' (nunca confundir
 * con suscripciones activas a otros servicios SaaS del cliente).
 */
export async function fetchActiveSalSubscription(
  supabase: SupabaseClient,
  clientAccountId: string
): Promise<SalActiveSubscription | null> {
  const { data: service } = await supabase
    .from("saas_services")
    .select("id")
    .eq("code", "smart_access_lock")
    .maybeSingle();

  if (!service) return null;

  const { data: sub } = await supabase
    .from("saas_service_subscriptions")
    .select("id, saas_service_plan_id, status")
    .eq("client_account_id", clientAccountId)
    .eq("saas_service_id", service.id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) return null;

  return {
    subscriptionId: sub.id,
    planId: sub.saas_service_plan_id,
    saasServiceId: service.id,
    status: sub.status,
  };
}

/**
 * Gating de suscripción SAL para uso en Edge Functions.
 * Devuelve Response de error 403 si NO hay suscripción activa del servicio
 * smart_access_lock. Devuelve null en caso satisfactorio.
 *
 * Uso (compatible con las 17 EFs existentes):
 *   const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
 *   if (subErr) return subErr;
 */
export async function assertSalSubscriptionActive(
  supabase: SupabaseClient,
  clientAccountId: string
): Promise<Response | null> {
  const sub = await fetchActiveSalSubscription(supabase, clientAccountId);
  if (!sub) {
    return err(
      ERROR_CODES.FORBIDDEN,
      "SmartAccessLock subscription is not active for this account",
      403
    );
  }
  return null;
}

/**
 * Obtiene la integración TTLock activa de un client_account.
 * Devuelve null si no existe (el caller decide cómo tratar el caso).
 */
export async function getLockIntegration(
  supabase: SupabaseClient,
  clientAccountId: string
): Promise<{
  id: string;
  provider: string;
  status: string;
  provider_client_id: string | null;
  provider_account_id: string | null;
  provider_credentials: { vault_key_ref: string } | null;
  last_sync_at: string | null;
} | null> {
  const { data } = await supabase
    .from("lock_integrations")
    .select(
      "id, provider, status, provider_client_id, provider_account_id, provider_credentials, last_sync_at"
    )
    .eq("client_account_id", clientAccountId)
    .eq("provider", "ttlock")
    .maybeSingle();

  return data ?? null;
}

/**
 * Verifica feature flag en el plan SAL activo del cliente.
 * Devuelve true si el feature está habilitado; false si no existe o está deshabilitado.
 */
export async function hasSalFeature(
  supabase: SupabaseClient,
  clientAccountId: string,
  featureCode: string
): Promise<boolean> {
  const { data } = await supabase
    .from("saas_service_subscriptions")
    .select(
      `
      saas_service_plan_id,
      saas_service_features!inner (
        feature_code,
        is_enabled
      )
    `
    )
    .eq("client_account_id", clientAccountId)
    .eq("status", "active")
    .eq("saas_service_features.feature_code", featureCode)
    .maybeSingle();

  if (!data) return false;

  const features = (data as any).saas_service_features;
  if (!features) return false;

  const feat = Array.isArray(features) ? features[0] : features;
  return feat?.is_enabled === true;
}
