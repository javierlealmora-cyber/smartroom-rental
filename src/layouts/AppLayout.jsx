// src/layouts/AppLayout.jsx
import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import { supabase } from "../services/supabaseClient";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const role = profile?.role;

  // Definir tabs según rol
  const getTabs = () => {
    const tabs = [];

    // SUPERADMIN ve todo
    if (role === "superadmin") {
      tabs.push(
        { id: "clientes", label: "Clientes", path: "/clientes" },
        { id: "alojamientos", label: "Alojamientos", path: "/alojamientos" },
        { id: "consumos", label: "Consumos", path: "/consumos" }
      );
    }

    // ADMIN ve solo Alojamientos y Consumos
    if (role === "admin") {
      tabs.push(
        { id: "alojamientos", label: "Alojamientos", path: "/alojamientos" },
        { id: "consumos", label: "Consumos", path: "/consumos" }
      );
    }

    // INQUILINO no ve tabs (solo el menú de usuario)
    // Los tabs no se muestran para inquilino

    return tabs;
  };

  const tabs = getTabs();

  // Determinar tab activo basado en la ruta
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith("/clientes")) return "clientes";
    if (path.startsWith("/alojamientos")) return "alojamientos";
    if (path.startsWith("/consumos")) return "consumos";
    if (path.startsWith("/usuario")) return "usuario";
    return null;
  };

  const activeTab = getActiveTab();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const primaryColor = theme?.primaryColor || "#111827";

  return (
    <div style={styles.container}>
      {/* Header Superior */}
      <header style={{ ...styles.header, borderBottomColor: primaryColor }}>
        <div style={styles.headerLeft}>
          {theme?.logoUrl ? (
            <img src={theme.logoUrl} alt="logo" style={styles.logo} />
          ) : (
            <div style={styles.logoPlaceholder}>🏠</div>
          )}
          <span style={styles.companyName}>
            {theme?.companyName || "SmartRent Systems"}
          </span>
        </div>

        {/* Tabs de navegación (solo si hay tabs) */}
        {tabs.length > 0 && (
          <nav style={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? { ...styles.tabActive, borderBottomColor: primaryColor } : {}),
                }}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* Usuario (esquina derecha) */}
        <div style={styles.headerRight}>
          <button
            style={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span style={styles.userName}>
              {profile?.full_name || profile?.email || "Usuario"}
            </span>
            <span style={styles.userIcon}>👤</span>
          </button>

          {showUserMenu && (
            <div style={styles.userMenu}>
              <div style={styles.userMenuHeader}>
                <div style={styles.userAvatar}>
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.userMenuName}>
                    {profile?.full_name || "Usuario"}
                  </div>
                  <div style={styles.userMenuEmail}>{profile?.email}</div>
                </div>
              </div>

              <div style={styles.userMenuDivider}></div>

              <button
                style={styles.userMenuItem}
                onClick={() => {
                  navigate("/usuario");
                  setShowUserMenu(false);
                }}
              >
                <span>👁️</span>
                <span>Visión General</span>
              </button>

              {(role === "superadmin" || role === "admin") && (
                <button
                  style={styles.userMenuItem}
                  onClick={() => {
                    alert("Cambiar plan (pendiente)");
                    setShowUserMenu(false);
                  }}
                >
                  <span>⬆️</span>
                  <span>Cambiar a un plan superior</span>
                </button>
              )}

              <button
                style={styles.userMenuItem}
                onClick={() => {
                  alert("Ayuda (pendiente)");
                  setShowUserMenu(false);
                }}
              >
                <span>❓</span>
                <span>Ayuda</span>
              </button>

              <div style={styles.userMenuDivider}></div>

              <button
                style={styles.userMenuItem}
                onClick={() => {
                  handleLogout();
                  setShowUserMenu(false);
                }}
              >
                <span>🚪</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main style={styles.main}>
        <Outlet />
      </main>

      {/* Overlay para cerrar menú de usuario */}
      {showUserMenu && (
        <div style={styles.overlay} onClick={() => setShowUserMenu(false)}></div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#F9FAFB",
  },

  header: {
    backgroundColor: "#FFFFFF",
    borderBottom: "3px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 64,
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    height: 32,
  },

  logoPlaceholder: {
    fontSize: 28,
  },

  companyName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  tabs: {
    display: "flex",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },

  tab: {
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    padding: "20px 24px",
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    cursor: "pointer",
    transition: "all 0.2s ease",
    height: 64,
  },

  tabActive: {
    color: "#111827",
  },

  headerRight: {
    position: "relative",
  },

  userButton: {
    backgroundColor: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  userIcon: {
    fontSize: 20,
  },

  userMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    minWidth: 280,
    zIndex: 1000,
  },

  userMenuHeader: {
    padding: 16,
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: "700",
  },

  userMenuName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  userMenuEmail: {
    fontSize: 12,
    color: "#6B7280",
  },

  userMenuDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    margin: "8px 0",
  },

  userMenuItem: {
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    textAlign: "left",
  },

  main: {
    flex: 1,
    display: "flex",
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
};
