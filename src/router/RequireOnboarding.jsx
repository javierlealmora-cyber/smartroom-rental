// =============================================================================
// src/router/RequireOnboarding.jsx
// =============================================================================
// Guard que redirige a /v2/wizard/contratar si el usuario no tiene
// onboarding completo (onboarding_status != 'active').
// Superadmins quedan exentos (pueden navegar libremente).
// =============================================================================

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function RequireOnboarding() {
  const { loading, role, onboardingStatus } = useAuth();

  if (loading) return null;

  // Superadmins no necesitan onboarding
  if (role === "superadmin") return <Outlet />;

  // Si onboarding no esta completo, redirigir al wizard
  if (onboardingStatus !== "active") {
    return <Navigate to="/v2/wizard/contratar" replace />;
  }

  return <Outlet />;
}
