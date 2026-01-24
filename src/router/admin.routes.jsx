// src/router/admin.routes.jsx
import AdminDashboard from "../pages/admin/Dashboard";
import ApartmentsList from "../pages/admin/apartments/ApartmentsList";
import ApartmentCreate from "../pages/admin/apartments/ApartmentCreate";
import TenantsList from "../pages/admin/tenants/TenantsList";
import OccupancyHistory from "../pages/admin/occupancy/OccupancyHistory";

export const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: <AdminDashboard />,
  },
  {
    path: "/admin/apartments",
    element: <ApartmentsList />,
  },
  {
    path: "/admin/apartments/new",
    element: <ApartmentCreate />,
  },
  {
    path: "/admin/tenants",
    element: <TenantsList />,
  },
  {
    path: "/admin/occupancy",
    element: <OccupancyHistory />,
  },
];
