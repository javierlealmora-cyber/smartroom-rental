import SuperadminDashboard from "../pages/superadmin/Dashboard";
import CompaniesList from "../pages/superadmin/companies/CompaniesList";
import CompanyCreate from "../pages/superadmin/companies/CompanyCreate";

export const superadminRoutes = [
  {
    path: "/superadmin/dashboard",
    element: <SuperadminDashboard />,
  },
  {
    path: "/superadmin/companies",
    element: <CompaniesList />,
  },
  {
    path: "/superadmin/companies/new",
    element: <CompanyCreate />,
  },
  {
    path: "/superadmin/plans",
    element: <div style={{ padding: 32 }}><h1>Planes de Empresas</h1><p>Próximamente...</p></div>,
  },
  {
    path: "/superadmin/services",
    element: <div style={{ padding: 32 }}><h1>Gestión de Servicios</h1><p>Próximamente...</p></div>,
  },
  {
    path: "/superadmin/settings",
    element: <div style={{ padding: 32 }}><h1>Configuración</h1><p>Próximamente...</p></div>,
  },
];
