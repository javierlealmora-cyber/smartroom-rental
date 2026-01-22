import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
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
            <Route element={<MainLayout />}>
              {/* superadmin */}
              <Route element={<RequireRole allow={["superadmin"]} />}>
                {superadminRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>

              {/* placeholders (POC) */}
              <Route path="/admin" element={<div style={{ padding: 40 }}>Admin (POC)</div>} />
              <Route path="/api" element={<div style={{ padding: 40 }}>API (POC)</div>} />
              <Route path="/student" element={<div style={{ padding: 40 }}>Student (POC)</div>} />
            </Route>
          </Route>

          {/* Root */}
          <Route path="/" element={<Navigate to="/superadmin/companies" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
