// src/hooks/useSalSubscription.js
//
// Hook para consultar el estado de la suscripción SmartAccessLock del tenant
// actual y la configuración de plan derivada (rules-21).
//
// Este hook es la única fuente de verdad en frontend para decidir si:
//  - Mostrar la entrada del módulo en el menú lateral.
//  - Permitir la navegación a /v2/admin/smart-access.
//  - Habilitar botones de operativa (crear cerradura, actor, grupo, etc.).
//
// La validación autoritativa siempre ocurre en Edge Functions. Este hook es UX.
//
// Uso:
//   const { isActive, config, isLoading } = useSalSubscription();
//   if (isLoading) return <Spinner />;
//   if (!isActive) return <ContractPrompt />;
//   if ((config?.maxLocks ?? 0) - currentLocks < 3) showWarning();

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../providers/AuthProvider";

const SAL_SERVICE_CODE = "smart_access_lock";

// Mapeo de feature_code (BBDD) → clave tipada del objeto de configuración
// (contract-subscription-plan-configuration.md).
const BOOLEAN_FEATURE_KEYS = {
  provider_integration:    "providerIntegration",
  common_areas:            "commonAreas",
  multiple_locks_per_room: "multipleLocksPerRoom",
  multiple_locks_per_area: "multipleLocksPerArea",
  actors:                  "actorsEnabled",
  access_groups:           "accessGroupsEnabled",
  lodger_auto_grant:       "lodgerAutoGrant",
  group_auto_grant:        "groupAutoGrant",
  remote_unlock:           "remoteUnlock",
  audit_logs:              "auditLogs",
  notifications_email:     "notificationsEmail",
  notifications_sms:       "notificationsSms",
  notifications_whatsapp:  "notificationsWhatsapp",
  provider_local_ble:      "providerLocalBle",
};

const NUMERIC_FEATURE_KEYS = {
  max_locks:    "maxLocks",
  max_actors:   "maxActors",
  max_groups:   "maxGroups",
  max_gateways: "maxGateways",
};

function defaultConfig() {
  const base = {};
  for (const key of Object.values(BOOLEAN_FEATURE_KEYS)) base[key] = false;
  for (const key of Object.values(NUMERIC_FEATURE_KEYS)) base[key] = 0;
  return base;
}

function mapFeaturesToConfig(features, planMeta) {
  const config = defaultConfig();
  for (const row of features ?? []) {
    if (row.feature_code in BOOLEAN_FEATURE_KEYS) {
      config[BOOLEAN_FEATURE_KEYS[row.feature_code]] = row.is_enabled === true;
      continue;
    }
    if (row.feature_code in NUMERIC_FEATURE_KEYS) {
      const raw = row.config?.value;
      if (raw === null || raw === undefined) {
        config[NUMERIC_FEATURE_KEYS[row.feature_code]] = null;
      } else {
        const parsed = Number(raw);
        config[NUMERIC_FEATURE_KEYS[row.feature_code]] = Number.isFinite(parsed) ? parsed : 0;
      }
    }
  }
  return {
    ...config,
    planId: planMeta.planId,
    planCode: planMeta.planCode,
    subscriptionId: planMeta.subscriptionId,
    resolvedAt: new Date().toISOString(),
  };
}

export function useSalSubscription() {
  const { profile } = useAuth();
  const clientAccountId = profile?.client_account_id ?? null;

  const [state, setState] = useState({
    isLoading: true,
    isActive: false,
    config: null,
    error: null,
  });

  useEffect(() => {
    if (!clientAccountId) {
      return;
    }

    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // 1. Servicio SAL
      const { data: service, error: serviceErr } = await supabase
        .from("saas_services")
        .select("id")
        .eq("code", SAL_SERVICE_CODE)
        .maybeSingle();

      if (cancelled) return;
      if (serviceErr || !service) {
        setState({ isLoading: false, isActive: false, config: null, error: serviceErr?.message ?? null });
        return;
      }

      // 2. Suscripción activa del tenant
      const { data: sub, error: subErr } = await supabase
        .from("saas_service_subscriptions")
        .select("id, saas_service_plan_id, status")
        .eq("client_account_id", clientAccountId)
        .eq("saas_service_id", service.id)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;
      if (subErr || !sub) {
        setState({ isLoading: false, isActive: false, config: null, error: subErr?.message ?? null });
        return;
      }

      // 3. Plan
      const { data: plan } = await supabase
        .from("saas_service_plans")
        .select("id, code")
        .eq("id", sub.saas_service_plan_id)
        .maybeSingle();

      if (cancelled) return;

      // 4. Features del plan
      const { data: features } = await supabase
        .from("saas_service_features")
        .select("feature_code, is_enabled, config")
        .eq("saas_service_plan_id", sub.saas_service_plan_id);

      if (cancelled) return;

      const config = mapFeaturesToConfig(features, {
        planId: plan?.id ?? sub.saas_service_plan_id,
        planCode: plan?.code ?? "unknown",
        subscriptionId: sub.id,
      });

      setState({ isLoading: false, isActive: true, config, error: null });
    })().catch((e) => {
      if (!cancelled) {
        setState({ isLoading: false, isActive: false, config: null, error: e?.message ?? String(e) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clientAccountId]);

  // Sin tenant: no hay nada que resolver — se deriva en el render sin setState.
  // Con tenant: se toma del estado interno resuelto por el effect.
  return useMemo(() => {
    if (!clientAccountId) {
      return { isLoading: false, isActive: false, config: null, error: null };
    }
    return {
      isLoading: state.isLoading,
      isActive: state.isActive,
      config: state.config,
      error: state.error,
    };
  }, [clientAccountId, state]);
}
