// =============================================================================
// src/hooks/useAdminLayout.js
// =============================================================================
// Hook compartido para obtener branding y userName reales
// desde AuthProvider + TenantProvider, para usar en V2Layout de admin pages.
// =============================================================================

import { useAuth } from "../providers/AuthProvider";
import { useTenant } from "../providers/TenantProvider";

export function useAdminLayout() {
  const { user, profile, clientAccountId } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const userName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Usuario";

  const companyBranding = {
    name: tenantBranding?.name || "SmartRoom",
    logoText: (tenantBranding?.name || "S").charAt(0),
    logoUrl: tenantBranding?.logo_url || null,
    primaryColor: tenantBranding?.primary_color || "#111827",
    secondaryColor: tenantBranding?.secondary_color || "#3B82F6",
  };

  return { userName, companyBranding, clientAccountId };
}
