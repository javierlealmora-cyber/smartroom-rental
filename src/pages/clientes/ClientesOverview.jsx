// src/pages/clientes/ClientesOverview.jsx
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function ClientesOverview() {
  const navigate = useNavigate();

  const sidebarItems = [
    { label: "Visión General", path: "/clientes", icon: "⊞" },
    { type: "section", label: "CLIENTES" },
    { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
    { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
    { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
    { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
  ];

  const cards = [
    {
      title: "Gestión de Empresas",
      description: "Crea, edita y gestiona todas las empresas cliente",
      icon: "🏢",
      path: "/clientes/empresas",
    },
    {
      title: "Planes de Suscripción",
      description: "Define planes con límites, servicios y precios",
      icon: "📋",
      path: "/clientes/planes",
    },
    {
      title: "Catálogo de Servicios",
      description: "Gestiona los servicios disponibles para los planes",
      icon: "🛠️",
      path: "/clientes/servicios",
    },
  ];

  return (
    <div style={styles.container}>
      <Sidebar items={sidebarItems} title="CLIENTES" />

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Visión General</h1>
          <p style={styles.subtitle}>GESTIÓN DE CLIENTES</p>
        </div>

        <div style={styles.cardsGrid}>
          {cards.map((card) => (
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

  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
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
    marginBottom: 8,
    margin: 0,
    marginBottom: 8,
  },

  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    margin: 0,
    lineHeight: 1.5,
  },
};
