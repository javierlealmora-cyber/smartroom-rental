// =============================================================================
// src/router/RequireTenant.jsx
// =============================================================================
// Guard que verifica que el usuario tiene un tenant activo (client_account).
// - Superadmins quedan exentos (pueden navegar libremente).
// - tenantState "none"            -> redirect /planes con mensaje
// - tenantState "in_progress"     -> redirect /autoregistro-cuenta
// - tenantState "payment_pending" -> redirect /autoregistro-cuenta
// - tenantState "active"          -> permitir acceso
// =============================================================================

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function RequireTenant() {
  const { loading, role, tenantState } = useAuth();

  if (loading) return null;

  // Superadmins bypass all tenant checks
  if (role === "superadmin") return <Outlet />;

  switch (tenantState) {
    case "active":
      return <Outlet />;

    case "in_progress":
    case "payment_pending":
      // User has started onboarding but hasn't completed -- send to wizard
      return <Navigate to="/v2/wizard/contratar" replace />;

    case "none":
    default:
      // User has no tenant at all -- send to plans page
      if (tenantState !== "none") {
        console.error("[RequireTenant] Unexpected tenantState:", tenantState);
      }
      return (
        <Navigate
          to="/v2/planes"
          replace
          state={{ message: "Necesitas contratar un plan para acceder a esta seccion." }}
        />
      );
  }
}
