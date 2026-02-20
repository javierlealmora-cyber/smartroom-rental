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
  const { loading, user, profile, profileLoading, role, tenantState } = useAuth();

  if (loading || (user && profileLoading)) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        Cargando...
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        No se ha podido cargar tu perfil. Cierra sesion y vuelve a iniciar.
      </div>
    );
  }

  // Superadmins bypass all tenant checks
  if (role === "superadmin") return <Outlet />;

  switch (tenantState) {
    case "active":
      return <Outlet />;

    case "in_progress":
    case "payment_pending":
      // User has started onboarding but hasn't completed -- send to wizard
      console.warn("[RequireTenant] Redirecting to wizard", { role, tenantState });
      return <Navigate to="/v2/wizard/contratar" replace />;

    case "none":
    default:
      // User has no tenant at all -- send to plans page
      if (tenantState !== "none") {
        console.error("[RequireTenant] Unexpected tenantState:", tenantState);
      }
      console.warn("[RequireTenant] Redirecting to plans (no active tenant)", { role, tenantState });
      return (
        <Navigate
          to="/v2/planes"
          replace
          state={{ message: "Necesitas contratar un plan para acceder a esta seccion." }}
        />
      );
  }
}
