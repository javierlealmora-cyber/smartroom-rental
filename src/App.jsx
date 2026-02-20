import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./router/RequireAuth";
import RequireRole from "./router/RequireRole";
import RequireTenant from "./router/RequireTenant";
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
import ApartmentEdit from "./pages/admin/apartments/ApartmentEdit";
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

// v2 - Admin Entities
import EntitiesListV2 from "./pages/v2/admin/entities/EntitiesList";
import EntityCreateV2 from "./pages/v2/admin/entities/EntityCreate";
import EntityEditV2 from "./pages/v2/admin/entities/EntityEdit";

// v2 - Admin Servicios
import ServicesListAdminV2 from "./pages/v2/admin/services/ServicesList";

// v2 - Admin Energía
import EnergyBillsListV2 from "./pages/v2/admin/energy/EnergyBillsList";
import EnergyBillCreateV2 from "./pages/v2/admin/energy/EnergyBillCreate";

// v2 - Lodger (formerly Student)
import LodgerDashboard from "./pages/v2/lodger/LodgerDashboard";

// v2 - Superadmin Plans (DBSU-PC)
import PlansListV2 from "./pages/v2/superadmin/plans/PlansList";
import PlanCreateV2 from "./pages/v2/superadmin/plans/PlanCreate";
import PlanDetailV2 from "./pages/v2/superadmin/plans/PlanDetail";

// v2 - Superadmin Services (DBSU-GS)
import ServicesListV2 from "./pages/v2/superadmin/services/ServicesList";

// v2 - Autoregistro (RCCP)
import AutoRegistroCuenta from "./pages/v2/autoregistro/AutoRegistroCuenta";

// v2 - 3 Portales de Login
import CommercialLogin from "./pages/v2/auth/CommercialLogin";
import ManagerLogin from "./pages/v2/manager/auth/ManagerLogin";
import LodgerLogin from "./pages/v2/lodger/auth/LodgerLogin";
import AuthCallback from "./pages/v2/auth/AuthCallback";

// Páginas públicas (web comercial)
import Landing from "./pages/public/Landing";
import PlanesPage from "./pages/public/PlanesPage";
import Registro from "./pages/public/Registro";
import ContactoPage from "./pages/public/ContactoPage";
import LegalTerminos from "./pages/public/LegalTerminos";
import LegalPrivacidad from "./pages/public/LegalPrivacidad";
import LegalCookies from "./pages/public/LegalCookies";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    console.log("[App] location:", location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
        <Routes>
          {/* =============================================
             AUTH — 3 Portales de Login
             ============================================= */}
          <Route path="/v2/auth/login" element={<CommercialLogin />} />
          <Route path="/v2/admin/auth/login" element={<ManagerLogin />} />
          <Route path="/v2/lodger/auth/login" element={<LodgerLogin />} />
          <Route path="/v2/auth/logout" element={<Logout />} />
          <Route path="/v2/auth/reset-password" element={<ResetPassword />} />
          <Route path="/v2/auth/callback" element={<AuthCallback />} />

          {/* Legacy manager login redirect */}
          <Route path="/v2/manager/auth/login" element={<Navigate to="/v2/admin/auth/login" replace />} />

          {/* Legacy auth redirects */}
          <Route path="/auth/login" element={<Navigate to="/v2/auth/login" replace />} />
          <Route path="/auth/logout" element={<Logout />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Navigate to="/v2/auth/login" replace />} />

          {/* =============================================
             LEGACY v1 — Rutas protegidas (NO tocar)
             ============================================= */}
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
                <Route path="/alojamientos/gestion/:id/editar" element={<ApartmentEdit />} />
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
             PÁGINAS PÚBLICAS (web comercial) — bajo /v2/
             ============================================= */}
          <Route path="/v2" element={<Landing />} />
          <Route path="/v2/planes" element={<PlanesPage />} />
          <Route path="/v2/registro" element={<Registro />} />
          <Route path="/v2/contacto" element={<ContactoPage />} />
          <Route path="/v2/legal/terminos" element={<LegalTerminos />} />
          <Route path="/v2/legal/privacidad" element={<LegalPrivacidad />} />
          <Route path="/v2/legal/cookies" element={<LegalCookies />} />

          {/* Backward-compat redirects for old public URLs */}
          <Route path="/" element={<Navigate to="/v2" replace />} />
          <Route path="/planes" element={<Navigate to="/v2/planes" replace />} />
          <Route path="/registro" element={<Navigate to="/v2/registro" replace />} />
          <Route path="/contacto" element={<Navigate to="/v2/contacto" replace />} />
          <Route path="/legal/terminos" element={<Navigate to="/v2/legal/terminos" replace />} />
          <Route path="/legal/privacidad" element={<Navigate to="/v2/legal/privacidad" replace />} />
          <Route path="/legal/cookies" element={<Navigate to="/v2/legal/cookies" replace />} />

          {/* Autoregistro / Wizard */}
          <Route path="/v2/wizard/contratar" element={<AutoRegistroCuenta />} />
          <Route path="/autoregistro-cuenta" element={<Navigate to="/v2/wizard/contratar" replace />} />

          {/* =============================================
             RUTAS v2 PROTEGIDAS — Superadmin
             ============================================= */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole allow={["superadmin"]} />}>
              <Route path="/v2/superadmin" element={<DashboardSuperadminV2 />} />
              <Route path="/v2/superadmin/cuentas" element={<ClientAccountsListV2 />} />
              <Route path="/v2/superadmin/cuentas/nueva" element={<ClientAccountCreateV2 />} />
              <Route path="/v2/superadmin/cuentas/:id" element={<ClientAccountDetailV2 />} />
              <Route path="/v2/superadmin/cuentas/:id/editar" element={<ClientAccountDetailV2 />} />
              <Route path="/v2/superadmin/cuentas/:id/usuarios" element={<ClientAccountDetailV2 />} />

              {/* v2 - Superadmin Plans (DBSU-PC) */}
              <Route path="/v2/superadmin/planes" element={<PlansListV2 />} />
              <Route path="/v2/superadmin/planes/nuevo" element={<PlanCreateV2 />} />
              <Route path="/v2/superadmin/planes/:id" element={<PlanDetailV2 />} />
              <Route path="/v2/superadmin/planes/:id/editar" element={<PlanDetailV2 />} />

              {/* v2 - Superadmin Services (DBSU-GS) */}
              <Route path="/v2/superadmin/servicios" element={<ServicesListV2 />} />
            </Route>
          </Route>

          {/* =============================================
             RUTAS v2 PROTEGIDAS — Admin + Lodger
             ============================================= */}
          <Route element={<RequireAuth loginPath="/v2/admin/auth/login" />}>
            <Route element={<RequireRole allow={["superadmin", "admin", "api", "agent", "viewer"]} />}>
              <Route path="/v2/admin" element={<DashboardAdminV2 />} />
              <Route path="/v2/admin/dashboard" element={<DashboardAdminV2 />} />
              <Route path="/v2/admin/entidades" element={<EntitiesListV2 />} />
              <Route path="/v2/admin/entidades/nueva" element={<EntityCreateV2 />} />
              <Route path="/v2/admin/entidades/:id/editar" element={<EntityEditV2 />} />
              <Route path="/v2/admin/alojamientos" element={<AccommodationsListV2 />} />
              <Route path="/v2/admin/alojamientos/nuevo" element={<AccommodationCreateV2 />} />
              <Route path="/v2/admin/inquilinos" element={<TenantsListV2 />} />
              <Route path="/v2/admin/inquilinos/nuevo" element={<TenantCreateV2 />} />
              <Route path="/v2/admin/servicios" element={<ServicesListAdminV2 />} />
              <Route path="/v2/admin/energia/facturas" element={<EnergyBillsListV2 />} />
              <Route path="/v2/admin/energia/facturas/nueva" element={<EnergyBillCreateV2 />} />
            </Route>
          </Route>

          {/* Legacy manager redirects */}
          <Route path="/v2/manager" element={<Navigate to="/v2/admin" replace />} />
          <Route path="/v2/manager/dashboard" element={<Navigate to="/v2/admin/dashboard" replace />} />

          <Route element={<RequireAuth loginPath="/v2/lodger/auth/login" />}>
            <Route path="/v2/lodger/dashboard" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/consumo" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/boletines" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/servicios" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/encuestas" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/incidencias" element={<LodgerDashboard />} />
            <Route path="/v2/lodger/perfil" element={<LodgerDashboard />} />
          </Route>

          {/* Legacy student → lodger redirects */}
          <Route path="/v2/student" element={<Navigate to="/v2/lodger/dashboard" replace />} />
          <Route path="/v2/student/*" element={<Navigate to="/v2/lodger/dashboard" replace />} />

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/v2" replace />} />
        </Routes>
  );
}
