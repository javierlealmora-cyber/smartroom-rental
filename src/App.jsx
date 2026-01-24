import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RequireRole from "./router/RequireRole";
import { AuthProvider } from "./providers/AuthProvider";
import Login from "./pages/auth/Login";

// Páginas de Visión General
import ClientesOverview from "./pages/clientes/ClientesOverview";
import AlojamientosOverview from "./pages/alojamientos/AlojamientosOverview";
import ConsumosOverview from "./pages/consumos/ConsumosOverview";
import UsuarioOverview from "./pages/usuario/UsuarioOverview";

// Páginas de Clientes (Superadmin)
import CompaniesList from "./pages/superadmin/companies/CompaniesList";
import CompanyCreate from "./pages/superadmin/companies/CompanyCreate";

// Páginas de Alojamientos
import ApartmentsList from "./pages/admin/apartments/ApartmentsList";
import ApartmentCreate from "./pages/admin/apartments/ApartmentCreate";
import TenantsList from "./pages/admin/tenants/TenantsList";
import OccupancyHistory from "./pages/admin/occupancy/OccupancyHistory";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login */}
          <Route path="/auth/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Rutas CLIENTES - Solo Superadmin */}
              <Route element={<RequireRole allow={["superadmin"]} />}>
                <Route path="/clientes" element={<ClientesOverview />} />
                <Route path="/clientes/empresas" element={<CompaniesList />} />
                <Route path="/clientes/empresas/nueva" element={<CompanyCreate />} />
                <Route
                  path="/clientes/planes"
                  element={<div style={{ padding: 40 }}>Planes (próximamente)</div>}
                />
                <Route
                  path="/clientes/servicios"
                  element={<div style={{ padding: 40 }}>Servicios (próximamente)</div>}
                />
                <Route
                  path="/clientes/configuracion"
                  element={<div style={{ padding: 40 }}>Configuración (próximamente)</div>}
                />
              </Route>

              {/* Rutas ALOJAMIENTOS - Superadmin y Admin */}
              <Route element={<RequireRole allow={["superadmin", "admin"]} />}>
                <Route path="/alojamientos" element={<AlojamientosOverview />} />
                <Route path="/alojamientos/gestion" element={<ApartmentsList />} />
                <Route path="/alojamientos/gestion/nuevo" element={<ApartmentCreate />} />
                <Route path="/alojamientos/inquilinos" element={<TenantsList />} />
                <Route path="/alojamientos/ocupacion" element={<OccupancyHistory />} />
              </Route>

              {/* Rutas CONSUMOS - Superadmin y Admin */}
              <Route element={<RequireRole allow={["superadmin", "admin"]} />}>
                <Route path="/consumos" element={<ConsumosOverview />} />
                <Route
                  path="/consumos/registros"
                  element={<div style={{ padding: 40 }}>Registros Estimados (próximamente)</div>}
                />
                <Route
                  path="/consumos/visor"
                  element={<div style={{ padding: 40 }}>Visor Consumo (próximamente)</div>}
                />
                <Route
                  path="/consumos/facturas"
                  element={<div style={{ padding: 40 }}>Facturas Eléctricas (próximamente)</div>}
                />
                <Route
                  path="/consumos/liquidacion"
                  element={<div style={{ padding: 40 }}>Liquidación (próximamente)</div>}
                />
                <Route
                  path="/consumos/boletines"
                  element={<div style={{ padding: 40 }}>Boletines (próximamente)</div>}
                />
                <Route
                  path="/consumos/hucha-energetica"
                  element={<div style={{ padding: 40 }}>Hucha Energética (próximamente)</div>}
                />
                <Route
                  path="/consumos/hucha-energia"
                  element={<div style={{ padding: 40 }}>Hucha de Energía (próximamente)</div>}
                />
                <Route
                  path="/consumos/hucha-gas"
                  element={<div style={{ padding: 40 }}>Hucha de Gas (próximamente)</div>}
                />
                <Route
                  path="/consumos/hucha-agua"
                  element={<div style={{ padding: 40 }}>Hucha de Agua (próximamente)</div>}
                />
                <Route
                  path="/consumos/fianzas"
                  element={<div style={{ padding: 40 }}>Fianzas (próximamente)</div>}
                />
              </Route>

              {/* Rutas USUARIO - Todos los roles */}
              <Route path="/usuario" element={<UsuarioOverview />} />
              <Route
                path="/usuario/consumos"
                element={<div style={{ padding: 40 }}>Mis Consumos (próximamente)</div>}
              />
              <Route
                path="/usuario/boletines"
                element={<div style={{ padding: 40 }}>Mis Boletines (próximamente)</div>}
              />
              <Route
                path="/usuario/servicios"
                element={<div style={{ padding: 40 }}>Servicios (próximamente)</div>}
              />
              <Route
                path="/usuario/incidencias"
                element={<div style={{ padding: 40 }}>Incidencias (próximamente)</div>}
              />
              <Route
                path="/usuario/encuestas"
                element={<div style={{ padding: 40 }}>Encuestas (próximamente)</div>}
              />
              <Route
                path="/usuario/configuracion"
                element={<div style={{ padding: 40 }}>Configuración (próximamente)</div>}
              />
              <Route
                path="/usuario/personalizacion"
                element={<div style={{ padding: 40 }}>Personalización (próximamente)</div>}
              />
            </Route>
          </Route>

          {/* Root - Redirigir según rol */}
          <Route path="/" element={<Navigate to="/alojamientos" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
