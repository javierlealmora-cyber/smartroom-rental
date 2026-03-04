// src/pages/usuario/UsuarioOverview.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import Sidebar from "../../components/Sidebar";

export default function UsuarioOverview() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role;

  // Sidebar para inquilino
  const tenantSidebarItems = [
    { label: "Visión General", path: "/usuario", icon: "⊞" },
    { type: "section", label: "MI INFORMACIÓN" },
    { label: "Consumos", path: "/usuario/consumos", icon: "📊", isSubItem: true },
    { label: "Boletines", path: "/usuario/boletines", icon: "📄", isSubItem: true },
    { label: "Servicios", path: "/usuario/servicios", icon: "⚙️", isSubItem: true },
    { label: "Incidencias", path: "/usuario/incidencias", icon: "🔧", isSubItem: true },
    { label: "Encuestas", path: "/usuario/encuestas", icon: "📝", isSubItem: true },
    { type: "section", label: "MI CUENTA" },
    { label: "Configuración", path: "/usuario/configuracion", icon: "⚙️", isSubItem: true },
    { label: "Personalización", path: "/usuario/personalizacion", icon: "🎨", isSubItem: true },
  ];

  // Sidebar para admin/superadmin
  const adminSidebarItems = [
    { label: "Visión General", path: "/usuario", icon: "⊞" },
    { type: "section", label: "MI CUENTA" },
    { label: "Configuración", path: "/usuario/configuracion", icon: "⚙️", isSubItem: true },
    { label: "Personalización", path: "/usuario/personalizacion", icon: "🎨", isSubItem: true },
  ];

  const sidebarItems = role === "tenant" ? tenantSidebarItems : adminSidebarItems;

  // Cards solo para inquilino
  const tenantCards = [
    {
      title: "Consumos Energéticos",
      description: "Visualiza tu consumo energético mensual",
      icon: "📊",
      path: "/usuario/consumos",
    },
    {
      title: "Boletines Energéticos",
      description: "Consulta tus boletines de consumo",
      icon: "📄",
      path: "/usuario/boletines",
    },
    {
      title: "Servicios Contratados",
      description: "Información sobre los servicios disponibles",
      icon: "⚙️",
      path: "/usuario/servicios",
    },
    {
      title: "Registro de Incidencias",
      description: "Reporta y consulta tus incidencias",
      icon: "🔧",
      path: "/usuario/incidencias",
    },
    {
      title: "Encuestas",
      description: "Tu opinión importa",
      icon: "📝",
      path: "/usuario/encuestas",
    },
  ];

  return (
    <div style={styles.container}>
      <Sidebar items={sidebarItems} />

      <div style={styles.content}>
        {role === "tenant" ? (
          <>
            <div style={styles.header}>
              <h1 style={styles.title}>Visión General</h1>
            </div>

            <div style={styles.cardsGrid}>
              {tenantCards.map((card) => (
                <div
                  key={card.path}
                  style={styles.card}
                  onClick={() => navigate(card.path)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <div style={styles.cardIcon}>{card.icon}</div>
                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{card.title}</h3>
                    <p style={styles.cardDescription}>{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <h2>Configuración de Usuario</h2>
            <p>
              Accede a las opciones de configuración y personalización desde el menú lateral.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  content: {
    flex: 1,
    padding: 40,
    overflow: "auto",
  },

  header: {
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
    marginBottom: 8,
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
    display: "flex",
    gap: 16,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    flexShrink: 0,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
    marginBottom: 8,
  },

  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    margin: 0,
    lineHeight: 1.5,
  },

  emptyState: {
    textAlign: "center",
    padding: 60,
    color: "#6B7280",
  },
};
