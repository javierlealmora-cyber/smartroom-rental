import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "../services/supabaseClient";

const TenantContext = createContext(null);

const DEFAULT_BRANDING = {
  name: "SmartRoom Rental Platform",
  logo_url: null,
  primary_color: "#111827",
  secondary_color: null,
};

export function TenantProvider({ children }) {
  const { isAuthenticated, role, clientAccountId, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyCssVars = (branding) => {
      document.documentElement.style.setProperty(
        "--sr-primary",
        branding?.primary_color || DEFAULT_BRANDING.primary_color
      );
      if (branding?.secondary_color) {
        document.documentElement.style.setProperty(
          "--sr-secondary",
          branding.secondary_color
        );
      }
    };

    const load = async () => {
      if (authLoading) return;

      // No autenticado o superadmin → branding default
      if (!isAuthenticated || role === "superadmin") {
        setTenant(null);
        applyCssVars(DEFAULT_BRANDING);
        setLoading(false);
        return;
      }

      // Sin client_account → branding default
      if (!clientAccountId) {
        setTenant(null);
        applyCssVars(DEFAULT_BRANDING);
        setLoading(false);
        return;
      }

      // Cargar datos directamente de client_accounts (evita Edge Function whoami)
      setLoading(true);
      try {
        const { data: account, error: accountError } = await supabase
          .from("client_accounts")
          .select("name, plan_code, billing_cycle, status, branding_name, branding_primary_color, branding_secondary_color, branding_logo_url")
          .eq("id", clientAccountId)
          .single();

        if (accountError) throw accountError;

        if (account) {
          const tenantData = {
            client_account_id: clientAccountId,
            plan_code: account.plan_code,
            billing_cycle: account.billing_cycle,
            account_status: account.status,
            branding: {
              name: account.branding_name || account.name,
              logo_url: account.branding_logo_url,
              primary_color: account.branding_primary_color,
              secondary_color: account.branding_secondary_color,
            },
          };
          setTenant(tenantData);
          applyCssVars(tenantData.branding);
        } else {
          setTenant(null);
          applyCssVars(DEFAULT_BRANDING);
        }
      } catch (err) {
        console.warn("[TenantProvider] client_accounts error (non-blocking):", err.message);
        setTenant(null);
        applyCssVars(DEFAULT_BRANDING);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated, role, clientAccountId, authLoading]);

  const value = useMemo(
    () => ({
      tenant,
      loading,
      planCode: tenant?.plan_code ?? null,
      billingCycle: tenant?.billing_cycle ?? null,
      accountStatus: tenant?.account_status ?? null,
      branding: tenant?.branding ?? DEFAULT_BRANDING,
    }),
    [tenant, loading]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
