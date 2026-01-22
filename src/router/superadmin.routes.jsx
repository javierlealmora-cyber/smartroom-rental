import CompaniesList from "../pages/superadmin/companies/CompaniesList";
import CompanyCreate from "../pages/superadmin/companies/CompanyCreate";

export const superadminRoutes = [
  {
    path: "/superadmin/companies",
    element: <CompaniesList />,
  },
  {
    path: "/superadmin/companies/new",
    element: <CompanyCreate />,
  },
];
