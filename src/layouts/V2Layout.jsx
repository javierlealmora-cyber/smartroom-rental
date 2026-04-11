// =============================================================================
// src/layouts/V2Layout.jsx
// =============================================================================
// Layout v2 — Top navigation bar (Apple style) + breadcrumbs + content
// =============================================================================

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import {
  Icon3DDashboard, Icon3DEntidades, Icon3DAlojamientos, Icon3DInquilinos,
  Icon3DServicios, Icon3DCatalogo, Icon3DFacturas, Icon3DLiquidaciones,
  Icon3DBoletines, Icon3DCuentas, Icon3DPlanes, Icon3DMiPanel, Icon3DConsumo, Icon3DIncidencias,
  Icon3DHabitaciones,
} from "../components/icons3d/NavIcons3D";

// ─── Menus de navegacion por rol ─────────────────────────────────────────────

const ADMIN_NAV = [
  { label: "Dashboard",     path: "/v2/admin",                       Icon: Icon3DDashboard },
  { label: "Entidades",     path: "/v2/admin/entidades",             Icon: Icon3DEntidades },
  { label: "Alojamientos",  path: "/v2/admin/alojamientos",          Icon: Icon3DAlojamientos },
  { label: "Habitaciones",  path: "/v2/admin/habitaciones",          Icon: Icon3DHabitaciones },
  { label: "Inquilinos",    path: "/v2/admin/inquilinos",            Icon: Icon3DInquilinos },
  { label: "Servicios",     path: "/v2/admin/inquilinos/servicios",  Icon: Icon3DServicios },
  { label: "Catálogo",      path: "/v2/admin/servicios",             Icon: Icon3DCatalogo },
];

const SUPERADMIN_NAV = [
  { label: "Dashboard",       path: "/v2/superadmin",          Icon: Icon3DDashboard },
  { label: "Cuentas Cliente", path: "/v2/superadmin/cuentas",  Icon: Icon3DCuentas },
  { label: "Planes",          path: "/v2/superadmin/planes",   Icon: Icon3DPlanes },
  { label: "Servicios",       path: "/v2/superadmin/servicios",Icon: Icon3DServicios },
];

const LODGER_NAV = [
  { label: "Mi Panel",    path: "/v2/lodger/dashboard",   Icon: Icon3DMiPanel },
  { label: "Mi Consumo", path: "/v2/lodger/consumo",     Icon: Icon3DConsumo },
  { label: "Servicios",  path: "/v2/lodger/servicios",   Icon: Icon3DServicios },
  { label: "Boletines",  path: "/v2/lodger/boletines",   Icon: Icon3DBoletines },
  { label: "Incidencias",path: "/v2/lodger/incidencias", Icon: Icon3DIncidencias },
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
  "/v2/admin/entidades/:id": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
    { label: "Detalle", path: null },
  ],
  "/v2/admin/entidades/:id/editar": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
    { label: "Editar", path: null },
  ],
  "/v2/admin/entidades/:entityId/alojamientos/:accId": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Entidades", path: "/v2/admin/entidades" },
    { label: "Entidad", path: null },
    { label: "Habitaciones", path: null },
  ],
  "/v2/admin/alojamientos/:accId/habitaciones": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Alojamientos", path: "/v2/admin/alojamientos" },
    { label: "Habitaciones", path: null },
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
  "/v2/admin/inquilinos/:id/detalle-inquilino": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Detalle", path: null },
  ],
  "/v2/admin/inquilinos/:id/detalle": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Detalle", path: null },
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
  "/v2/admin/inquilinos/:id": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Inquilinos", path: "/v2/admin/inquilinos" },
    { label: "Detalle", path: null },
  ],
  "/v2/admin/settings": [
    { label: "Dashboard", path: "/v2/admin" },
    { label: "Configuración", path: null },
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
  _onSettings = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const userEmail = user?.email || null;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(role);

  const primaryColor   = companyBranding?.primaryColor   || "#0071E3";
  const secondaryColor = companyBranding?.secondaryColor || "#3B82F6";
  const branding = {
    name: companyBranding?.name || (role === "superadmin" ? "SmartRoom Platform" : "SmartRoom"),
    logoText: companyBranding?.logoText || (companyBranding?.name || "S").charAt(0),
    logoUrl: companyBranding?.logoUrl || null,
    tagline: role === "superadmin" ? "Superadmin" : role === "lodger" ? "Portal Inquilino" : (companyBranding?.planLabel || "Panel de Gestión"),
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
        html { scrollbar-gutter: stable; }
        .v2-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; height: 48px;
          background: ${secondaryColor};
          border-bottom: 1px solid rgba(0,0,0,0.12);
          position: sticky; top: 0; z-index: 300;
          gap: 8px;
        }
        .v2-brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .v2-logo-img { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        .v2-logo-placeholder {
          width: 28px; height: 28px; border-radius: 8px;
          background: ${primaryColor};
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .v2-brand-text { display: flex; flex-direction: column; }
        .v2-brand-name { font-size: 11px; font-weight: 700; color: ${primaryColor}; line-height: 1.2; white-space: nowrap; }
        .v2-brand-tagline { font-size: 8px; color: ${primaryColor}; opacity: 0.7; line-height: 1.2; white-space: nowrap; }
        .v2-topnav {
          display: flex; align-items: center; gap: 0;
          flex: 1; justify-content: center;
          overflow-x: auto; scrollbar-width: none;
        }
        .v2-topnav::-webkit-scrollbar { display: none; }
        .v2-nav-btn {
          background: none; border: none; outline: none;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1px;
          padding: 4px 0; border-radius: 10px;
          cursor: pointer; white-space: nowrap;
          transition: background 0.18s;
          font-family: inherit;
          width: 76px;
          flex-shrink: 0;
          flex-grow: 0;
        }
        .v2-nav-btn:focus { outline: none; }
        .v2-nav-btn:focus-visible { outline: 2px solid rgba(255,255,255,0.35); outline-offset: -2px; }
        .v2-nav-icon-wrap {
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .v2-nav-icon-wrap img, .v2-nav-icon-wrap svg {
          width: 34px; height: 34px;
          object-fit: contain;
          display: block;
          transition: filter 0.18s ease, transform 0.18s ease;
        }
        .v2-nav-btn:hover { background: none; }
        .v2-nav-btn:hover .v2-nav-icon-wrap img,
        .v2-nav-btn:hover .v2-nav-icon-wrap svg {
          filter: drop-shadow(0 0 4px rgba(255,255,255,0.9)) drop-shadow(0 0 8px rgba(200,230,255,0.7));
          transform: scale(1.12);
        }
        .v2-nav-btn.active { background: rgba(0,0,0,0.12); }
        .v2-nav-btn.active .v2-nav-label { opacity: 1; }
        .v2-nav-label {
          font-size: 8px; font-weight: 700; color: ${primaryColor};
          letter-spacing: -0.01em; line-height: 1;
          opacity: 0.6;
          display: block; text-align: center;
          width: 100%; overflow: hidden; text-overflow: ellipsis;
        }
        .v2-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .v2-username { display: flex; flex-direction: column; align-items: flex-end; white-space: nowrap; }
        .v2-username-name { font-size: 11px; font-weight: 600; color: ${primaryColor}; line-height: 1.3; }
        .v2-username-email { font-size: 9px; font-weight: 400; color: ${primaryColor}; opacity: 0.65; line-height: 1.2; }
        .v2-logout-btn {
          padding: 4px 12px;
          border: 1px solid transparent;
          border-radius: 16px;
          font-size: 10px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.18s; white-space: nowrap;
        }
        .v2-logout-btn:hover { opacity: 0.82; }
        .v2-hamburger {
          display: none; background: none; border: none;
          color: #374151; font-size: 20px; cursor: pointer;
          padding: 4px 6px; border-radius: 8px; align-items: center;
          transition: background 0.15s;
        }
        .v2-hamburger:hover { background: rgba(0,0,0,0.06); }
        .v2-mobile-drawer {
          display: none;
          position: fixed; top: 48px; left: 0; right: 0;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(20px);
          padding: 12px 16px 20px;
          z-index: 299;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          flex-direction: column; gap: 4px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }
        .v2-mobile-drawer.open { display: flex; }
        .v2-mobile-drawer .v2-nav-btn {
          flex-direction: row; justify-content: flex-start;
          gap: 12px; border-radius: 12px;
          padding: 10px 14px; width: 100%;
        }
        .v2-mobile-drawer .v2-nav-label { font-size: 14px; }
        .v2-overlay {
          display: none; position: fixed; inset: 0; top: 48px;
          background: rgba(0,0,0,0.2); z-index: 298;
        }
        .v2-overlay.open { display: block; }
        .v2-breadcrumb {
          padding: 3px 20px; font-size: 10px; color: #6B7280;
          border-bottom: 1px solid #F3F4F6; background: #FAFAFA; flex-shrink: 0;
        }
        .v2-crumb-link { color: ${primaryColor}; cursor: pointer; }
        .v2-crumb-link:hover { text-decoration: underline; }
        .v2-crumb-sep { margin: 0 6px; color: #D1D5DB; }
        .v2-crumb-current { color: #1D1D1F; font-weight: 500; }
        .v2-main { padding: 14px 20px; flex: 1; }
        @media (max-width: 1000px) {
          .v2-topnav { display: none !important; }
          .v2-username { display: none !important; }
          .v2-hamburger { display: flex !important; }
        }
        @media (max-width: 480px) {
          .v2-topbar { padding: 0 10px; height: 48px; }
          .v2-main { padding: 10px 12px; }
          .v2-breadcrumb { padding: 3px 12px; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif", WebkitFontSmoothing: "antialiased" }}>

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

          {/* Nav centrada — desktop con iconos 3D */}
          <nav className="v2-topnav">
            {navItems.map((item, i) => {
              const active = isNavActive(item.path, location.pathname);
              const { Icon } = item;
              const iconSize = 34;
              return (
                <button key={i} className={`v2-nav-btn${active ? " active" : ""}`} onClick={() => handleNavClick(item.path)}>
                  <div className="v2-nav-icon-wrap"><Icon size={iconSize} /></div>
                  <span className="v2-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Derecha */}
          <div className="v2-topbar-right">
            <div className="v2-username">
              <span className="v2-username-name">{userName}</span>
              {userEmail && <span className="v2-username-email">{userEmail}</span>}
            </div>
            {role === "admin" && (
              <button
                className="v2-logout-btn"
                onClick={() => navigate("/v2/admin/settings")}
                title="Configuración"
                style={{ padding: "5px 12px", background: "rgba(0,0,0,0.10)", borderColor: "transparent", color: "#4B5563" }}
              >
                ⚙️
              </button>
            )}
            <button
              className="v2-logout-btn"
              onClick={handleLogout}
              style={{ background: "rgba(0,0,0,0.10)", borderColor: "transparent", color: "#4B5563" }}
            >
              Salir
            </button>
            <button className="v2-hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menú">
              {mobileOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </header>

        {/* ── Mobile drawer ── */}
        <div className={`v2-mobile-drawer${mobileOpen ? " open" : ""}`}>
          {navItems.map((item, i) => {
            const active = isNavActive(item.path, location.pathname);
            const { Icon } = item;
            return (
              <button key={i} className={`v2-nav-btn${active ? " active" : ""}`} onClick={() => handleNavClick(item.path)}>
                <Icon size={22} />
                <span className="v2-nav-label">{item.label}</span>
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
