import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { isLodgerRole, isManagerRole } from "../constants/roles";

export default function RequireRole({ allow = [] }) {
  const { user, profile, profileLoading, loading } = useAuth();

  // Wait for auth AND profile to finish loading before evaluating role
  if (loading || profileLoading) {
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

  const role = profile?.role;
  if (!role) {
    // If allow specifies a portal, go to the appropriate login.
    const wantsLodger = allow.some((r) => isLodgerRole(r));
    const wantsAdmin = allow.some((r) => isManagerRole(r));
    const wantsSuperadmin = allow.includes("superadmin");
    console.warn("[RequireRole] Redirecting (no role)", {
      allow,
      wantsLodger,
      wantsAdmin,
      wantsSuperadmin,
    });
    if (wantsLodger) return <Navigate to="/v2/lodger/auth/login" replace />;
    if (wantsAdmin) return <Navigate to="/v2/admin/auth/login" replace />;
    if (wantsSuperadmin) return <Navigate to="/v2/auth/login" replace />;
    return <Navigate to="/v2/auth/login" replace />;
  }
  if (!allow.includes(role)) {
    // Wrong portal: redirect to the permitted portal login.
    const wantsLodger = allow.some((r) => isLodgerRole(r));
    const wantsAdmin = allow.some((r) => isManagerRole(r));
    const wantsSuperadmin = allow.includes("superadmin");
    console.warn("[RequireRole] Redirecting (role not allowed)", {
      role,
      allow,
      wantsLodger,
      wantsAdmin,
      wantsSuperadmin,
    });
    if (wantsLodger) return <Navigate to="/v2/lodger/auth/login" replace />;
    if (wantsAdmin) return <Navigate to="/v2/admin/auth/login" replace />;
    if (wantsSuperadmin) return <Navigate to="/v2/auth/login" replace />;
    return <Navigate to="/v2/auth/login" replace />;
  }

  return <Outlet />;
}
