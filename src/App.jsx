import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RequireRole from "./router/RequireRole";
import { AuthProvider } from "./providers/AuthProvider";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import Logout from "./pages/auth/Logout";

// Páginas de Visión General
import ClientesOverview from "./pages/clientes/ClientesOverview";
import AlojamientosOverview from "./pages/alojamientos/AlojamientosOverview";
import ConsumosOverview from "./pages/consumos/ConsumosOverview";
import UsuarioOverview from "./pages/usuario/UsuarioOverview";

// Páginas de Clientes (Superadmin)
import CompaniesList from "./pages/superadmin/companies/CompaniesList";
import CompanyCreate from "./pages/superadmin/companies/CompanyCreate";
import ClientesConfig from "./pages/clientes/ClientesConfig";

// Páginas de Planes (Superadmin)
import PlansList from "./pages/clientes/planes/PlansList";
import PlanCreate from "./pages/clientes/planes/PlanCreate";
import PlanEdit from "./pages/clientes/planes/PlanEdit";
import PlanDetail from "./pages/clientes/planes/PlanDetail";

// Páginas de Servicios (Superadmin)
import ServicesList from "./pages/clientes/servicios/ServicesList";
import ServiceCreate from "./pages/clientes/servicios/ServiceCreate";
import ServiceEdit from "./pages/clientes/servicios/ServiceEdit";
import ServiceDetail from "./pages/clientes/servicios/ServiceDetail";

// Páginas de Alojamientos
import ApartmentsList from "./pages/admin/apartments/ApartmentsList";
import ApartmentCreate from "./pages/admin/apartments/ApartmentCreate";
import TenantsList from "./pages/admin/tenants/TenantsList";
import OccupancyHistory from "./pages/admin/occupancy/OccupancyHistory";

// Páginas de Consumos
import RegistrosEstimados from "./pages/consumos/RegistrosEstimados";
import VisorConsumo from "./pages/consumos/VisorConsumo";
import FacturasElectricas from "./pages/consumos/FacturasElectricas";
import Liquidacion from "./pages/consumos/Liquidacion";
import BoletinesConsumo from "./pages/consumos/BoletinesConsumo";
import HuchaEnergetica from "./pages/consumos/HuchaEnergetica";
import HuchaEnergia from "./pages/consumos/HuchaEnergia";
import HuchaGas from "./pages/consumos/HuchaGas";
import HuchaAgua from "./pages/consumos/HuchaAgua";
import Fianzas from "./pages/consumos/Fianzas";

// Páginas de Usuario
import MisConsumos from "./pages/usuario/MisConsumos";
import MisBoletines from "./pages/usuario/MisBoletines";
import UsuarioServicios from "./pages/usuario/UsuarioServicios";
import Incidencias from "./pages/usuario/Incidencias";
import Encuestas from "./pages/usuario/Encuestas";
import UsuarioConfig from "./pages/usuario/UsuarioConfig";
import Personalizacion from "./pages/usuario/Personalizacion";

// =============================================
// NUEVA ESTRUCTURA v2 (client_accounts)
// NOTA: Rama paralela independiente - NO afecta a las rutas existentes
// =============================================

// v2 - Superadmin
import DashboardSuperadminV2 from "./pages/v2/superadmin/DashboardSuperadmin";
import ClientAccountsListV2 from "./pages/v2/superadmin/ClientAccountsList";
import ClientAccountCreateV2 from "./pages/v2/superadmin/ClientAccountCreate";
import ClientAccountDetailV2 from "./pages/v2/superadmin/ClientAccountDetail";

// v2 - Admin
import DashboardAdminV2 from "./pages/v2/admin/DashboardAdmin";
import AccommodationsListV2 from "./pages/v2/admin/accommodations/AccommodationsList";
import AccommodationCreateV2 from "./pages/v2/admin/accommodations/AccommodationCreate";
import TenantsListV2 from "./pages/v2/admin/tenants/TenantsList";
import TenantCreateV2 from "./pages/v2/admin/tenants/TenantCreate";

// v2 - Student
import StudentDashboardV2 from "./pages/v2/student/StudentDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/logout" element={<Logout />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />

          {/* Rutas protegidas */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Rutas CLIENTES - Solo Superadmin */}
              <Route element={<RequireRole allow={["superadmin"]} />}>
                <Route path="/clientes" element={<ClientesOverview />} />
                <Route path="/clientes/empresas" element={<CompaniesList />} />
                <Route path="/clientes/empresas/nueva" element={<CompanyCreate />} />

                {/* Planes de Suscripción */}
                <Route path="/clientes/planes" element={<PlansList />} />
                <Route path="/clientes/planes/new" element={<PlanCreate />} />
                <Route path="/clientes/planes/:id" element={<PlanDetail />} />
                <Route path="/clientes/planes/:id/edit" element={<PlanEdit />} />

                {/* Servicios */}
                <Route path="/clientes/servicios" element={<ServicesList />} />
                <Route path="/clientes/servicios/new" element={<ServiceCreate />} />
                <Route path="/clientes/servicios/:id" element={<ServiceDetail />} />
                <Route path="/clientes/servicios/:id/edit" element={<ServiceEdit />} />

                <Route path="/clientes/configuracion" element={<ClientesConfig />} />
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
                <Route path="/consumos/registros" element={<RegistrosEstimados />} />
                <Route path="/consumos/visor" element={<VisorConsumo />} />
                <Route path="/consumos/facturas" element={<FacturasElectricas />} />
                <Route path="/consumos/liquidacion" element={<Liquidacion />} />
                <Route path="/consumos/boletines" element={<BoletinesConsumo />} />
                <Route path="/consumos/hucha-energetica" element={<HuchaEnergetica />} />
                <Route path="/consumos/hucha-energia" element={<HuchaEnergia />} />
                <Route path="/consumos/hucha-gas" element={<HuchaGas />} />
                <Route path="/consumos/hucha-agua" element={<HuchaAgua />} />
                <Route path="/consumos/fianzas" element={<Fianzas />} />
              </Route>

              {/* Rutas USUARIO - Todos los roles */}
              <Route path="/usuario" element={<UsuarioOverview />} />
              <Route path="/usuario/consumos" element={<MisConsumos />} />
              <Route path="/usuario/boletines" element={<MisBoletines />} />
              <Route path="/usuario/servicios" element={<UsuarioServicios />} />
              <Route path="/usuario/incidencias" element={<Incidencias />} />
              <Route path="/usuario/encuestas" element={<Encuestas />} />
              <Route path="/usuario/configuracion" element={<UsuarioConfig />} />
              <Route path="/usuario/personalizacion" element={<Personalizacion />} />
            </Route>
          </Route>

          {/* =============================================
             RUTAS v2 - Nueva estructura con client_accounts
             NOTA: Rama paralela independiente - NO afecta a las rutas existentes
             ============================================= */}

          {/* v2 - Superadmin */}
          <Route path="/v2/superadmin" element={<DashboardSuperadminV2 />} />
          <Route path="/v2/superadmin/cuentas" element={<ClientAccountsListV2 />} />
          <Route path="/v2/superadmin/cuentas/nueva" element={<ClientAccountCreateV2 />} />
          <Route path="/v2/superadmin/cuentas/:id" element={<ClientAccountDetailV2 />} />
          <Route path="/v2/superadmin/cuentas/:id/editar" element={<ClientAccountDetailV2 />} />
          <Route path="/v2/superadmin/cuentas/:id/usuarios" element={<ClientAccountDetailV2 />} />

          {/* v2 - Admin */}
          <Route path="/v2/admin" element={<DashboardAdminV2 />} />
          <Route path="/v2/admin/alojamientos" element={<AccommodationsListV2 />} />
          <Route path="/v2/admin/alojamientos/nuevo" element={<AccommodationCreateV2 />} />
          <Route path="/v2/admin/inquilinos" element={<TenantsListV2 />} />
          <Route path="/v2/admin/inquilinos/nuevo" element={<TenantCreateV2 />} />

          {/* v2 - Student/Inquilino */}
          <Route path="/v2/student" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/consumo" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/boletines" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/servicios" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/encuestas" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/incidencias" element={<StudentDashboardV2 />} />
          <Route path="/v2/student/perfil" element={<StudentDashboardV2 />} />

          {/* Root - Redirigir según rol */}
          <Route path="/" element={<Navigate to="/alojamientos" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
