// =============================================================================
// src/hooks/useSalSubscription.js
// =============================================================================
// Indica si el cliente activo tiene el módulo SmartAccessLock activo.
//
// Uso:
//   const { salActive, salPlanCode, salLoading, salError } = useSalSubscription();
//
// Reglas:
//   - Si salLoading → no renderizar badges SAL (evitar flash).
//   - Si !salActive → mostrar upgrade card o nada.
//   - Si la query falla → salActive = false (nunca rompe la página).
//   - La query es ligera: solo busca 1 fila activa por client_account.
// =============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useAdminLayout } from "./useAdminLayout";

export function useSalSubscription() {
  const { clientAccountId } = useAdminLayout();
  const [salActive, setSalActive]     = useState(false);
  const [salPlanCode, setSalPlanCode] = useState(null);
  const [salLoading, setSalLoading]   = useState(true);
  const [salError, setSalError]       = useState(null);

  useEffect(() => {
    if (!clientAccountId) {
      setSalLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSalSubscription() {
      try {
        const { data, error } = await supabase
          .from("saas_service_subscriptions")
          .select(`
            id,
            status,
            saas_service_plans (code)
          `)
          .eq("client_account_id", clientAccountId)
          .eq("status", "active")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setSalError(error.message);
          setSalActive(false);
        } else {
          const isActive = !!data;
          setSalActive(isActive);
          setSalPlanCode(data?.saas_service_plans?.code ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setSalError(e.message);
          setSalActive(false);
        }
      } finally {
        if (!cancelled) setSalLoading(false);
      }
    }

    fetchSalSubscription();
    return () => { cancelled = true; };
  }, [clientAccountId]);

  return { salActive, salPlanCode, salLoading, salError };
}
