// src/pages/superadmin/Dashboard.jsx
import { useNavigate } from "react-router-dom";

export default function SuperadminDashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Gestión de Empresas",
      description: "Creas, editar y gestionar todas las empresas",
      icon: "🏢",
      path: "/superadmin/companies",
    },
    {
      title: "Planes de Empresas",
      description: "Gestionar los planes y suscripciones",
      icon: "📋",
      path: "/superadmin/plans",
    },
    {
      title: "Gestión de Servicios",
      description: "Configurar servicios disponibles",
      icon: "⚙️",
      path: "/superadmin/services",
    },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Visión General</h1>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>GESTIÓN DE CLIENTES</h2>

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
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1200,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 32,
    margin: 0,
    marginBottom: 40,
  },

  section: {
    marginBottom: 48,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 24,
    letterSpacing: "0.5px",
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
