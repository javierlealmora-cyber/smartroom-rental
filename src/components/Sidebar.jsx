// src/components/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ items, title }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside style={styles.sidebar}>
      {title && <div style={styles.sidebarTitle}>{title}</div>}

      <nav style={styles.nav}>
        {items.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isSection = item.type === "section";
          const isSubItem = item.isSubItem;

          if (isSection) {
            return (
              <div key={index} style={styles.section}>
                {item.label}
              </div>
            );
          }

          return (
            <button
              key={index}
              style={{
                ...styles.navItem,
                ...(isSubItem ? styles.navItemSub : {}),
                ...(isActive ? styles.navItemActive : {}),
              }}
              onClick={() => navigate(item.path)}
            >
              {item.icon && <span style={styles.navIcon}>{item.icon}</span>}
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRight: "1px solid #E5E7EB",
    padding: "24px 0",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },

  sidebarTitle: {
    padding: "0 20px 16px",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
  },

  section: {
    padding: "16px 20px 8px",
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  navItem: {
    backgroundColor: "transparent",
    border: "none",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "left",
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    borderLeft: "3px solid transparent",
  },

  navItemSub: {
    paddingLeft: 40,
    fontSize: 13,
  },

  navItemActive: {
    backgroundColor: "#F3F4F6",
    borderLeftColor: "#111827",
    color: "#111827",
    fontWeight: "600",
  },

  navIcon: {
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
  },

  navLabel: {
    flex: 1,
  },
};
