// src/layouts/SuperadminLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../services/supabaseClient";

export default function SuperadminLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/v2/auth/login");
  };

  const menuItems = [
    {
      label: "Visión General",
      path: "/superadmin/dashboard",
      icon: "📊",
    },
    {
      label: "Gestión de Empresas",
      path: "/superadmin/companies",
      icon: "🏢",
    },
    {
      label: "Planes de Empresas",
      path: "/superadmin/plans",
      icon: "📋",
    },
    {
      label: "Gestión de Servicios",
      path: "/superadmin/services",
      icon: "⚙️",
    },
    {
      label: "Configuración",
      path: "/superadmin/settings",
      icon: "🔧",
    },
  ];

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>🏠</div>
          <div style={styles.logoText}>
            <strong style={{ fontSize: 14 }}>Housing Space Solutions</strong>
          </div>
        </div>

        {/* Menu Section */}
        <nav style={styles.nav}>
          <div style={styles.sectionTitle}>CLIENTES</div>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.menuItem,
                ...(isActive ? styles.menuItemActive : {}),
              })}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span style={styles.menuLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div style={styles.mainWrapper}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>SmartRoom Rental Platform</h1>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{profile?.role === "superadmin" ? "👤 Javier" : profile?.email}</span>
              <button onClick={handleLogout} style={styles.logoutButton}>
                🚪 Salir
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // SIDEBAR
  sidebar: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRight: "1px solid #E5E7EB",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    overflowY: "auto",
  },

  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 20px 24px 20px",
    borderBottom: "1px solid #E5E7EB",
  },

  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1F2937",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  logoText: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.3,
  },

  nav: {
    marginTop: 24,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    padding: "8px 20px",
    letterSpacing: "0.5px",
  },

  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 20px",
    textDecoration: "none",
    color: "#4B5563",
    fontSize: 14,
    transition: "all 0.2s ease",
    borderLeft: "3px solid transparent",
  },

  menuItemActive: {
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    borderLeftColor: "#2563EB",
    fontWeight: "500",
  },

  menuIcon: {
    fontSize: 16,
    width: 20,
    textAlign: "center",
  },

  menuLabel: {
    flex: 1,
  },

  // MAIN WRAPPER
  mainWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },

  // HEADER
  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  userName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: "500",
  },

  // CONTENT
  content: {
    flex: 1,
    overflow: "auto",
    padding: 32,
  },
};
