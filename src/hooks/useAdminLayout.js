// =============================================================================
// src/hooks/useAdminLayout.js
// =============================================================================
// Hook compartido para obtener branding y userName reales
// desde AuthProvider + TenantProvider, para usar en V2Layout de admin pages.
// =============================================================================

import { useAuth } from "../providers/AuthProvider";
import { useTenant } from "../providers/TenantProvider";

const PLAN_LABELS = {
  basic: "Plan Basic",
  agent: "Plan Agent",
  pro: "Plan Pro",
  enterprise: "Plan Enterprise",
};

export function useAdminLayout() {
  const { user, profile, clientAccountId } = useAuth();
  const { branding: tenantBranding, planCode, accountName } = useTenant();

  const userName =
    user?.user_metadata?.full_name ||
    profile?.full_name ||
    user?.email ||
    "Usuario";

  const planLabel = planCode ? (PLAN_LABELS[planCode] || planCode) : null;

  const companyBranding = {
    name: tenantBranding?.name || "SmartRoom",
    logoText: (tenantBranding?.name || "S").charAt(0),
    logoUrl: tenantBranding?.logo_url || null,
    primaryColor: tenantBranding?.primary_color || "#111827",
    secondaryColor: tenantBranding?.secondary_color || "#3B82F6",
    planLabel,
  };

  return { userName, companyBranding, clientAccountId, planCode };
}
