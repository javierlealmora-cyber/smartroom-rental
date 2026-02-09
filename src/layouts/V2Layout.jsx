// =============================================================================
// src/layouts/V2Layout.jsx
// =============================================================================
// Layout común para todas las páginas v2
// Incluye: Header con branding y Breadcrumbs
// Sin sidebar - navegación mediante breadcrumbs y accesos en cada página
// =============================================================================

import { useNavigate, useLocation } from "react-router-dom";

// Configuración de branding por rol
const BRANDING_CONFIG = {
  superadmin: {
    name: "SmartRent Systems",
    tagline: "Panel de Administración",
    logoText: "SR",
    primaryColor: "#111827",
    secondaryColor: "#3B82F6",
  },
};

// Breadcrumb routes mapping
const BREADCRUMB_ROUTES = {
  // Superadmin
  "/v2/superadmin": [{ label: "Dashboard", path: "/v2/superadmin" }],
  "/v2/superadmin/cuentas": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas" },
  ],
  "/v2/superadmin/cuentas/nueva": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas" },
    { label: "Nueva Cuenta", path: null },
  ],
  "/v2/superadmin/planes": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Gestión de Planes", path: "/v2/superadmin/planes" },
  ],
  "/v2/superadmin/planes/nuevo": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Gestión de Planes", path: "/v2/superadmin/planes" },
    { label: "Nuevo Plan", path: null },
  ],
  "/v2/superadmin/servicios": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Catálogo de Servicios", path: "/v2/superadmin/servicios" },
  ],
  "/v2/superadmin/servicios/nuevo": [
    { label: "Dashboard", path: "/v2/superadmin" },
    { label: "Catálogo de Servicios", path: "/v2/superadmin/servicios" },
    { label: "Nuevo Servicio", path: null },
  ],
  // Admin
  "/v2/admin": [{ label: "Dashboard", path: "/v2/admin" }],
  "/v2/admin/alojamientos": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
  ],
  "/v2/admin/alojamientos/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
    { label: "Nuevo Alojamiento", path: null },
  ],
  "/v2/admin/inquilinos": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
  ],
  "/v2/admin/inquilinos/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Nuevo Inquilino", path: null },
  ],
  // Student
  "/v2/student": [{ label: "Inicio", path: "/v2/student" }],
  "/v2/student/consumo": [
    { label: "Inicio", path: "/v2/student" },
    { label: "Mi Consumo", path: "/v2/student/consumo" },
  ],
  "/v2/student/boletines": [
    { label: "Inicio", path: "/v2/student" },
    { label: "Boletines", path: "/v2/student/boletines" },
  ],
  "/v2/student/servicios": [
    { label: "Inicio", path: "/v2/student" },
    { label: "Servicios", path: "/v2/student/servicios" },
  ],
  "/v2/student/encuestas": [
    { label: "Inicio", path: "/v2/student" },
    { label: "Encuestas", path: "/v2/student/encuestas" },
  ],
  "/v2/student/incidencias": [
    { label: "Inicio", path: "/v2/student" },
    { label: "Incidencias", path: "/v2/student/incidencias" },
  ],
};

export default function V2Layout({
  children,
  role = "superadmin",
  companyBranding = null,
  customBreadcrumbs = null,
  userName = "Usuario",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener branding según rol
  const getBranding = () => {
    if (role === "superadmin") {
      return BRANDING_CONFIG.superadmin;
    }
    // Para admin y student, usar branding de la empresa
    if (companyBranding) {
      return {
        name: companyBranding.name || "Empresa",
        tagline: role === "admin" ? "Panel de Gestión" : "Portal del Inquilino",
        logoText: companyBranding.logoText || companyBranding.name?.charAt(0) || "E",
        logoUrl: companyBranding.logoUrl || null,
        primaryColor: companyBranding.primaryColor || "#111827",
        secondaryColor: companyBranding.secondaryColor || "#3B82F6",
      };
    }
    // Fallback
    return {
      name: "SmartRent",
      tagline: role === "admin" ? "Panel de Gestión" : "Portal del Inquilino",
      logoText: "SR",
      primaryColor: "#111827",
      secondaryColor: "#3B82F6",
    };
  };

  const branding = getBranding();

  // Obtener breadcrumbs
  const getBreadcrumbs = () => {
    if (customBreadcrumbs) return customBreadcrumbs;

    // Buscar ruta exacta
    if (BREADCRUMB_ROUTES[location.pathname]) {
      return BREADCRUMB_ROUTES[location.pathname];
    }

    // Buscar rutas dinámicas (con :id)
    const pathParts = location.pathname.split("/");
    for (const [route, breadcrumbs] of Object.entries(BREADCRUMB_ROUTES)) {
      const routeParts = route.split("/");
      if (routeParts.length === pathParts.length) {
        const matches = routeParts.every((part, i) => part === pathParts[i] || part.startsWith(":"));
        if (matches) {
          return breadcrumbs;
        }
      }
    }

    return [{ label: "Inicio", path: `/${role === "superadmin" ? "v2/superadmin" : role === "admin" ? "v2/admin" : "v2/student"}` }];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    navigate("/auth/logout");
  };

  return (
    <div style={styles.container}>
      {/* Header con Branding */}
      <header style={{ ...styles.header, backgroundColor: branding.primaryColor }}>
        <div style={styles.headerLeft}>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" style={styles.headerLogo} />
          ) : (
            <div style={{ ...styles.headerLogoPlaceholder, backgroundColor: branding.secondaryColor }}>
              {branding.logoText}
            </div>
          )}
          <div style={styles.headerText}>
            <span style={styles.headerName}>{branding.name}</span>
            <span style={styles.headerTagline}>{branding.tagline}</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{userName}</span>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div style={styles.breadcrumbContainer}>
        {breadcrumbs.map((crumb, index) => (
          <span key={index} style={styles.breadcrumbWrapper}>
            {crumb.path ? (
              <span
                style={styles.breadcrumbLink}
                onClick={() => navigate(crumb.path)}
              >
                {crumb.label}
              </span>
            ) : (
              <span style={styles.breadcrumbCurrent}>{crumb.label}</span>
            )}
            {index < breadcrumbs.length - 1 && (
              <span style={styles.breadcrumbSeparator}>/</span>
            )}
          </span>
        ))}
      </div>

      {/* Main Content */}
      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    color: "#FFFFFF",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    objectFit: "cover",
  },
  headerLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerText: {
    display: "flex",
    flexDirection: "column",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerTagline: {
    fontSize: 12,
    opacity: 0.8,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: "500",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  // Breadcrumbs
  breadcrumbContainer: {
    padding: "16px 32px",
    fontSize: 14,
    color: "#6B7280",
  },
  breadcrumbWrapper: {
    display: "inline-flex",
    alignItems: "center",
  },
  breadcrumbLink: {
    color: "#3B82F6",
    cursor: "pointer",
    transition: "color 0.2s ease",
  },
  breadcrumbCurrent: {
    color: "#374151",
    fontWeight: "500",
  },
  breadcrumbSeparator: {
    margin: "0 8px",
    color: "#9CA3AF",
  },

  // Content
  content: {
    padding: "0 32px 32px 32px",
  },
};
