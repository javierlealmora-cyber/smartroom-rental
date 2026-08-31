// src/router/RequireSalSubscription.jsx
//
// Guard de rutas para el módulo SmartAccessLock.
// Aplica el gating de suscripción descrito en `rules-20-tenant-activation-and-lifecycle.md`.
//
// Uso:
//   <Route element={<RequireSalSubscription />}>
//     <Route path="/v2/admin/smart-access" element={<SalGestion />} />
//     ...
//   </Route>
//
// Comportamiento:
//   - Mientras se resuelve el estado: pantalla de carga.
//   - Sin suscripción activa: redirect a /v2/admin (o pantalla de "no contratado").
//   - Superadmin: bypass (para poder inspeccionar cualquier cuenta).

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "../providers/AuthProvider";
import { useSalSubscription } from "../hooks/useSalSubscription";

export default function RequireSalSubscription() {
  const { profile } = useAuth();
  const { isLoading, isActive } = useSalSubscription();

  // Superadmin siempre puede entrar (inspección multi-tenant)
  if (profile?.role === "superadmin") return <Outlet />;

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isActive) {
    return <Navigate to="/v2/admin" replace />;
  }

  return <Outlet />;
}
