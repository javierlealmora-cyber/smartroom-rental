import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import SuperadminLayout from "./layouts/SuperadminLayout";
import { superadminRoutes } from "./router/superadmin.routes";

import RequireAuth from "./router/RequireAuth";
import RequireRole from "./router/RequireRole";
import { AuthProvider } from "./providers/AuthProvider";

import Login from "./pages/auth/Login";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login */}
          <Route path="/auth/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<RequireAuth />}>
            {/* Superadmin con layout específico */}
            <Route element={<RequireRole allow={["superadmin"]} />}>
              <Route element={<SuperadminLayout />}>
                {superadminRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>
            </Route>

            {/* Otras rutas con MainLayout */}
            <Route element={<MainLayout />}>
              <Route path="/admin" element={<div style={{ padding: 40 }}>Admin (POC)</div>} />
              <Route path="/api" element={<div style={{ padding: 40 }}>API (POC)</div>} />
              <Route path="/student" element={<div style={{ padding: 40 }}>Student (POC)</div>} />
            </Route>
          </Route>

          {/* Root */}
          <Route path="/" element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
