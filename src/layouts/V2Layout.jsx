// =============================================================================
// src/layouts/V2Layout.jsx
// =============================================================================
// Layout comun para todas las paginas v2
// Incluye: Header con branding, Sidebar de navegacion (admin/superadmin), Breadcrumbs
// =============================================================================

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";

// ─── Menus de navegacion por rol ─────────────────────────────────────────────

const ADMIN_NAV = [
  { label: "Dashboard", path: "/v2/admin", icon: "📊" },
  { type: "section", label: "Gestión" },
  { label: "Entidades", path: "/v2/admin/entidades", icon: "🏛️" },
  { label: "Alojamientos", path: "/v2/admin/alojamientos", icon: "🏠" },
  { label: "Inquilinos", path: "/v2/admin/inquilinos", icon: "👥" },
  { label: "Servicios Inquilinos", path: "/v2/admin/inquilinos/servicios", icon: "🔖" },
  { type: "section", label: "Servicios y Energía" },
  { label: "Catálogo de Servicios", path: "/v2/admin/servicios", icon: "🔧" },
  { label: "Facturas de Energía", path: "/v2/admin/energia/facturas", icon: "⚡" },
  { label: "Liquidaciones", path: "/v2/admin/energia/liquidaciones", icon: "📑" },
  { label: "Boletines", path: "/v2/admin/boletines", icon: "🔔" },
];

const SUPERADMIN_NAV = [
  { label: "Dashboard", path: "/v2/superadmin", icon: "📊" },
  { type: "section", label: "Plataforma" },
  { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas", icon: "🏢" },
  { label: "Planes", path: "/v2/superadmin/planes", icon: "📋" },
  { label: "Servicios", path: "/v2/superadmin/servicios", icon: "🔧" },
];

const LODGER_NAV = [
  { label: "Mi Panel", path: "/v2/lodger/dashboard", icon: "🏠" },
  { label: "Mi Consumo", path: "/v2/lodger/consumo", icon: "⚡" },
  { label: "Servicios", path: "/v2/lodger/servicios", icon: "🔧" },
  { label: "Boletines", path: "/v2/lodger/boletines", icon: "📢" },
];

// ─── Breadcrumb routes mapping ────────────────────────────────────────────────

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
  "/v2/admin/entidades": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
  ],
  "/v2/admin/entidades/nueva": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
    { label: "Nueva", path: null },
  ],
  "/v2/admin/entidades/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
    { label: "Editar", path: null },
  ],
  "/v2/admin/alojamientos": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
  ],
  "/v2/admin/alojamientos/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
    { label: "Nuevo Alojamiento", path: null },
  ],
  "/v2/admin/alojamientos/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
    { label: "Editar", path: null },
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
  "/v2/admin/inquilinos/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Editar", path: null },
  ],
  "/v2/admin/servicios": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Servicios", path: "/v2/admin/servicios" },
  ],
  "/v2/admin/servicios/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Servicios", path: "/v2/admin/servicios" },
    { label: "Nuevo Servicio", path: null },
  ],
  "/v2/admin/servicios/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Servicios", path: "/v2/admin/servicios" },
    { label: "Editar", path: null },
  ],
  "/v2/admin/energia/facturas": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Facturas de Energía", path: "/v2/admin/energia/facturas" },
  ],
  "/v2/admin/energia/facturas/nueva": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Facturas de Energía", path: "/v2/admin/energia/facturas" },
    { label: "Nueva Factura", path: null },
  ],
  "/v2/admin/energia/facturas/:id": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Facturas de Energía", path: "/v2/admin/energia/facturas" },
    { label: "Detalle", path: null },
  ],
  "/v2/admin/energia/facturas/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Facturas de Energía", path: "/v2/admin/energia/facturas" },
    { label: "Editar", path: null },
  ],
  "/v2/admin/energia/liquidaciones": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Liquidaciones", path: "/v2/admin/energia/liquidaciones" },
  ],
  "/v2/admin/boletines": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Boletines", path: "/v2/admin/boletines" },
  ],
  "/v2/admin/boletines/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Boletines", path: "/v2/admin/boletines" },
    { label: "Nuevo Boletín", path: null },
  ],
  "/v2/admin/inquilinos/servicios": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Servicios", path: "/v2/admin/inquilinos/servicios" },
  ],
  "/v2/admin/inquilinos/servicios/nuevo": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Servicios", path: "/v2/admin/inquilinos/servicios" },
    { label: "Asignar Servicio", path: null },
  ],
  // Lodger
  "/v2/lodger": [{ label: "Inicio", path: "/v2/lodger" }],
  "/v2/lodger/dashboard": [{ label: "Mi Panel", path: "/v2/lodger/dashboard" }],
  "/v2/lodger/consumo": [
    { label: "Mi Panel", path: "/v2/lodger/dashboard" },
    { label: "Mi Consumo", path: "/v2/lodger/consumo" },
  ],
  "/v2/lodger/boletines": [
    { label: "Mi Panel", path: "/v2/lodger/dashboard" },
    { label: "Boletines", path: "/v2/lodger/boletines" },
  ],
  "/v2/lodger/servicios": [
    { label: "Mi Panel", path: "/v2/lodger/dashboard" },
    { label: "Servicios", path: "/v2/lodger/servicios" },
  ],
  "/v2/lodger/encuestas": [
    { label: "Mi Panel", path: "/v2/lodger/dashboard" },
    { label: "Encuestas", path: "/v2/lodger/encuestas" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNavItems(role) {
  if (role === "superadmin") return SUPERADMIN_NAV;
  if (role === "lodger") return LODGER_NAV;
  return ADMIN_NAV;
}

function isNavActive(itemPath, currentPath) {
  if (itemPath === "/v2/admin" || itemPath === "/v2/superadmin" || itemPath === "/v2/lodger/dashboard") {
    return currentPath === itemPath;
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function V2Layout({
  children,
  role = "admin",
  companyBranding = {},
  userName = "Usuario",
  customBreadcrumbs = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasSidebar = role !== "lodger";
  const navItems = getNavItems(role);

  const branding = {
    name: companyBranding?.name || (role === "superadmin" ? "SmartRoom Platform" : "SmartRoom"),
    logoText: companyBranding?.logoText || (companyBranding?.name || "S").charAt(0),
    logoUrl: companyBranding?.logoUrl || null,
    primaryColor: companyBranding?.primaryColor || "#111827",
    secondaryColor: companyBranding?.secondaryColor || "#3B82F6",
    tagline: role === "superadmin" ? "Superadmin" : role === "lodger" ? "Portal Inquilino" : "Panel de Gestión",
  };

  // Breadcrumbs
  const getBreadcrumbs = () => {
    if (customBreadcrumbs) return customBreadcrumbs;
    if (BREADCRUMB_ROUTES[location.pathname]) return BREADCRUMB_ROUTES[location.pathname];
    const pathParts = location.pathname.split("/");
    for (const [route, crumbs] of Object.entries(BREADCRUMB_ROUTES)) {
      const routeParts = route.split("/");
      if (routeParts.length === pathParts.length) {
        const matches = routeParts.every((p, i) => p === pathParts[i] || p.startsWith(":"));
        if (matches) return crumbs;
      }
    }
    return [{ label: "Inicio", path: null }];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    const portal = role === "superadmin" ? "superadmin" : role === "lodger" ? "lodger" : "admin";
    navigate(`/v2/auth/logout?portal=${portal}`);
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .v2-sidebar { display: none !important; }
          .v2-sidebar-mobile-open { display: flex !important; }
          .v2-mobile-toggle { display: flex !important; }
          .v2-main-with-sidebar { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          .v2-mobile-toggle { display: none !important; }
          .v2-sidebar-overlay { display: none !important; }
        }
      `}</style>

      <div style={s.root}>
        {/* ── Header ── */}
        <header style={{ ...s.header, backgroundColor: branding.primaryColor }}>
          <div style={s.headerLeft}>
            {hasSidebar && (
              <button
                className="v2-mobile-toggle"
                style={s.mobileToggle}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Menú"
              >
                {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
              </button>
            )}
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" style={s.headerLogo} />
            ) : (
              <div style={{ ...s.headerLogoPlaceholder, backgroundColor: branding.secondaryColor }}>
                {branding.logoText}
              </div>
            )}
            <div style={s.headerText}>
              <span style={s.headerName}>{branding.name}</span>
              <span style={s.headerTagline}>{branding.tagline}</span>
            </div>
          </div>
          <div style={s.headerRight}>
            <span style={s.userName}>{userName}</span>
            <button style={s.logoutButton} onClick={handleLogout}>Salir</button>
          </div>
        </header>

        <div style={s.body}>
          {/* ── Sidebar (desktop) ── */}
          {hasSidebar && (
            <aside className="v2-sidebar" style={s.sidebar}>
              <SidebarNav
                items={navItems}
                currentPath={location.pathname}
                onNavigate={handleNavClick}
                primaryColor={branding.primaryColor}
              />
            </aside>
          )}

          {/* ── Sidebar (mobile overlay) ── */}
          {hasSidebar && mobileOpen && (
            <>
              <div
                className="v2-sidebar-overlay"
                style={s.overlay}
                onClick={() => setMobileOpen(false)}
              />
              <aside
                className="v2-sidebar v2-sidebar-mobile-open"
                style={{ ...s.sidebar, ...s.sidebarMobile }}
              >
                <SidebarNav
                  items={navItems}
                  currentPath={location.pathname}
                  onNavigate={handleNavClick}
                  primaryColor={branding.primaryColor}
                />
              </aside>
            </>
          )}

          {/* ── Content ── */}
          <div style={s.contentWrapper}>
            {/* Breadcrumbs */}
            <div style={s.breadcrumbBar}>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} style={s.crumbWrapper}>
                  {crumb.path ? (
                    <span style={s.crumbLink} onClick={() => navigate(crumb.path)}>
                      {crumb.label}
                    </span>
                  ) : (
                    <span style={s.crumbCurrent}>{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && (
                    <span style={s.crumbSep}>/</span>
                  )}
                </span>
              ))}
            </div>

            {/* Page content */}
            <main style={s.main}>{children}</main>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

function SidebarNav({ items, currentPath, onNavigate, primaryColor }) {
  return (
    <nav style={s.nav}>
      {items.map((item, i) => {
        if (item.type === "section") {
          return (
            <div key={i} style={s.navSection}>{item.label}</div>
          );
        }
        const active = isNavActive(item.path, currentPath);
        return (
          <button
            key={i}
            style={{
              ...s.navItem,
              ...(active ? { ...s.navItemActive, borderLeftColor: primaryColor } : {}),
            }}
            onClick={() => onNavigate(item.path)}
          >
            {item.icon && <span style={s.navIcon}>{item.icon}</span>}
            <span style={s.navLabel}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    height: 56,
    color: "#FFFFFF",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 6, objectFit: "cover" },
  headerLogoPlaceholder: {
    width: 32, height: 32, borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: "700", color: "#FFFFFF", flexShrink: 0,
  },
  headerText: { display: "flex", flexDirection: "column" },
  headerName: { fontSize: 15, fontWeight: "700", lineHeight: 1.2 },
  headerTagline: { fontSize: 11, opacity: 0.75, lineHeight: 1.2 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontSize: 13, fontWeight: "500" },
  logoutButton: {
    padding: "6px 14px",
    backgroundColor: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 6, color: "#FFFFFF", fontSize: 13,
    fontWeight: "500", cursor: "pointer",
  },
  mobileToggle: {
    background: "none", border: "none", color: "#fff",
    fontSize: 18, cursor: "pointer", padding: 4,
    display: "none", alignItems: "center",
  },
  // Body
  body: { display: "flex", flex: 1, overflow: "hidden" },
  // Sidebar
  sidebar: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRight: "1px solid #E5E7EB",
    flexShrink: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
  sidebarMobile: {
    position: "fixed",
    top: 56,
    left: 0,
    bottom: 0,
    zIndex: 200,
    boxShadow: "4px 0 16px rgba(0,0,0,0.12)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    top: 56,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 199,
  },
  // Nav
  nav: { padding: "12px 0", display: "flex", flexDirection: "column" },
  navSection: {
    padding: "12px 16px 4px",
    fontSize: 10, fontWeight: "700", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.5px",
  },
  navItem: {
    backgroundColor: "transparent", border: "none",
    borderLeft: "3px solid transparent",
    padding: "9px 16px",
    display: "flex", alignItems: "center", gap: 10,
    cursor: "pointer", textAlign: "left",
    fontSize: 13, fontWeight: "500", color: "#374151",
    transition: "all 0.15s ease",
    width: "100%",
  },
  navItemActive: {
    backgroundColor: "#F3F4F6",
    color: "#111827", fontWeight: "600",
  },
  navIcon: { fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 },
  navLabel: { flex: 1 },
  // Content
  contentWrapper: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 },
  breadcrumbBar: {
    padding: "10px 24px",
    fontSize: 13, color: "#6B7280",
    borderBottom: "1px solid #F3F4F6",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  crumbWrapper: { display: "inline-flex", alignItems: "center" },
  crumbLink: { color: "#3B82F6", cursor: "pointer" },
  crumbCurrent: { color: "#374151", fontWeight: "500" },
  crumbSep: { margin: "0 6px", color: "#9CA3AF" },
  main: { padding: "24px", flex: 1 },
};
