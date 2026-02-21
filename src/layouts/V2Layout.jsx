// =============================================================================
// src/layouts/V2Layout.jsx
// =============================================================================
// Layout v2 — Top navigation bar (Apple style) + breadcrumbs + content
// =============================================================================

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";

// ─── Menus de navegacion por rol ─────────────────────────────────────────────

const ADMIN_NAV = [
  { label: "Dashboard", path: "/v2/admin" },
  { label: "Entidades", path: "/v2/admin/entidades" },
  { label: "Alojamientos", path: "/v2/admin/alojamientos" },
  { label: "Inquilinos", path: "/v2/admin/inquilinos" },
  { label: "Servicios", path: "/v2/admin/inquilinos/servicios" },
  { label: "Catálogo", path: "/v2/admin/servicios" },
  { label: "Facturas", path: "/v2/admin/energia/facturas" },
  { label: "Liquidaciones", path: "/v2/admin/energia/liquidaciones" },
  { label: "Boletines", path: "/v2/admin/boletines" },
];

const SUPERADMIN_NAV = [
  { label: "Dashboard", path: "/v2/superadmin" },
  { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas" },
  { label: "Planes", path: "/v2/superadmin/planes" },
  { label: "Servicios", path: "/v2/superadmin/servicios" },
];

const LODGER_NAV = [
  { label: "Mi Panel", path: "/v2/lodger/dashboard" },
  { label: "Mi Consumo", path: "/v2/lodger/consumo" },
  { label: "Servicios", path: "/v2/lodger/servicios" },
  { label: "Boletines", path: "/v2/lodger/boletines" },
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
  "/v2/admin/alojamientos/:id/servicios": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
    { label: "Servicios", path: null },
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

  const navItems = getNavItems(role);

  const branding = {
    name: companyBranding?.name || (role === "superadmin" ? "SmartRoom Platform" : "SmartRoom"),
    logoText: companyBranding?.logoText || (companyBranding?.name || "S").charAt(0),
    logoUrl: companyBranding?.logoUrl || null,
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
        *, *::before, *::after { box-sizing: border-box; }
        .v2-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 52px;
          background: #0071E3;
          position: sticky; top: 0; z-index: 300;
          gap: 12px;
        }
        .v2-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .v2-logo-img { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; }
        .v2-logo-placeholder {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .v2-brand-text { display: flex; flex-direction: column; }
        .v2-brand-name { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.2; white-space: nowrap; }
        .v2-brand-tagline { font-size: 10px; color: rgba(255,255,255,0.7); line-height: 1.2; white-space: nowrap; }
        .v2-topnav {
          display: flex; align-items: center; gap: 2px;
          flex: 1; justify-content: center;
          overflow-x: auto; scrollbar-width: none;
        }
        .v2-topnav::-webkit-scrollbar { display: none; }
        .v2-nav-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.82);
          font-size: 13.5px; font-weight: 500;
          padding: 5px 12px; border-radius: 20px;
          cursor: pointer; white-space: nowrap;
          transition: background 0.18s, color 0.18s;
          font-family: inherit; letter-spacing: -0.01em;
        }
        .v2-nav-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .v2-nav-btn.active { background: rgba(255,255,255,0.22); color: #fff; font-weight: 600; }
        .v2-topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .v2-username { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.88); white-space: nowrap; }
        .v2-logout-btn {
          padding: 5px 15px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 20px; color: #fff;
          font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: background 0.18s; white-space: nowrap;
        }
        .v2-logout-btn:hover { background: rgba(255,255,255,0.22); }
        .v2-hamburger {
          display: none; background: none; border: none;
          color: #fff; font-size: 20px; cursor: pointer;
          padding: 4px 6px; border-radius: 8px; align-items: center;
          transition: background 0.15s;
        }
        .v2-hamburger:hover { background: rgba(255,255,255,0.15); }
        .v2-mobile-drawer {
          display: none;
          position: fixed; top: 52px; left: 0; right: 0;
          background: #0062c8;
          padding: 10px 16px 16px;
          z-index: 299;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22);
          flex-direction: column; gap: 2px;
        }
        .v2-mobile-drawer.open { display: flex; }
        .v2-mobile-drawer .v2-nav-btn {
          text-align: left; border-radius: 10px;
          padding: 10px 14px; width: 100%;
        }
        .v2-overlay {
          display: none; position: fixed; inset: 0; top: 52px;
          background: rgba(0,0,0,0.28); z-index: 298;
        }
        .v2-overlay.open { display: block; }
        .v2-breadcrumb {
          padding: 9px 28px; font-size: 12.5px; color: #6B7280;
          border-bottom: 1px solid #E5E7EB; background: #fff; flex-shrink: 0;
        }
        .v2-crumb-link { color: #0071E3; cursor: pointer; }
        .v2-crumb-link:hover { text-decoration: underline; }
        .v2-crumb-sep { margin: 0 6px; color: #9CA3AF; }
        .v2-crumb-current { color: #1D1D1F; font-weight: 500; }
        .v2-main { padding: 28px; flex: 1; }
        @media (max-width: 900px) {
          .v2-topnav { display: none !important; }
          .v2-username { display: none !important; }
          .v2-hamburger { display: flex !important; }
        }
        @media (max-width: 480px) {
          .v2-topbar { padding: 0 14px; }
          .v2-main { padding: 16px; }
          .v2-breadcrumb { padding: 8px 16px; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>

        {/* ── Top Bar ── */}
        <header className="v2-topbar">
          {/* Brand */}
          <div className="v2-brand">
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="" className="v2-logo-img" />
              : <div className="v2-logo-placeholder">{branding.logoText}</div>
            }
            <div className="v2-brand-text">
              <span className="v2-brand-name">{branding.name}</span>
              <span className="v2-brand-tagline">{branding.tagline}</span>
            </div>
          </div>

          {/* Nav centrada — desktop */}
          <nav className="v2-topnav">
            {navItems.map((item, i) => {
              const active = isNavActive(item.path, location.pathname);
              return (
                <button key={i} className={`v2-nav-btn${active ? " active" : ""}`} onClick={() => handleNavClick(item.path)}>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Derecha */}
          <div className="v2-topbar-right">
            <span className="v2-username">{userName}</span>
            <button className="v2-logout-btn" onClick={handleLogout}>Salir</button>
            <button className="v2-hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menú">
              {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </header>

        {/* ── Mobile drawer ── */}
        <div className={`v2-mobile-drawer${mobileOpen ? " open" : ""}`}>
          {navItems.map((item, i) => {
            const active = isNavActive(item.path, location.pathname);
            return (
              <button key={i} className={`v2-nav-btn${active ? " active" : ""}`} onClick={() => handleNavClick(item.path)}>
                {item.label}
              </button>
            );
          })}
        </div>
        <div className={`v2-overlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

        {/* ── Breadcrumbs ── */}
        <div className="v2-breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {crumb.path
                ? <span className="v2-crumb-link" onClick={() => navigate(crumb.path)}>{crumb.label}</span>
                : <span className="v2-crumb-current">{crumb.label}</span>
              }
              {i < breadcrumbs.length - 1 && <span className="v2-crumb-sep">/</span>}
            </span>
          ))}
        </div>

        {/* ── Content ── */}
        <main className="v2-main">{children}</main>
      </div>
    </>
  );
}
