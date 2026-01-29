// src/pages/consumos/ConsumosOverview.jsx
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function ConsumosOverview() {
  const navigate = useNavigate();

  const sidebarItems = [
    { label: "Visión General", path: "/consumos", icon: "⊞" },
    { type: "section", label: "CONSUMO DE USUARIOS" },
    { label: "Registros Estimados", path: "/consumos/registros", icon: "📊", isSubItem: true },
    { label: "Visor Consumo", path: "/consumos/visor", icon: "📈", isSubItem: true },
    { type: "section", label: "FACTURAS SUMINISTROS" },
    { label: "Facturas Eléctricas", path: "/consumos/facturas", icon: "⚡", isSubItem: true },
    { label: "Liquidación de Facturas", path: "/consumos/liquidacion", icon: "💰", isSubItem: true },
    { label: "Boletines de Facturas", path: "/consumos/boletines", icon: "📄", isSubItem: true },
    { type: "section", label: "HUCHA SUMINISTROS" },
    { label: "Hucha Energética", path: "/consumos/hucha-energetica", icon: "🔋", isSubItem: true },
    { label: "Hucha de Energía", path: "/consumos/hucha-energia", icon: "⚡", isSubItem: true },
    { label: "Hucha de Gas", path: "/consumos/hucha-gas", icon: "🔥", isSubItem: true },
    { label: "Hucha de Agua", path: "/consumos/hucha-agua", icon: "💧", isSubItem: true },
    { label: "Fianzas", path: "/consumos/fianzas", icon: "💵", isSubItem: true },
  ];

  const cards = [
    {
      title: "Registros Estimados",
      description: "Registra los registros de consumo estimados por inquilino",
      icon: "📊",
      path: "/consumos/registros",
      section: "GESTIÓN DE CONSUMOS",
    },
    {
      title: "Visor Consumo",
      description: "Visualiza y gestiona los consumos energéticos",
      icon: "📈",
      path: "/consumos/visor",
      section: "GESTIÓN DE CONSUMOS",
    },
    {
      title: "Facturas Eléctricas",
      description: "Sube y gestiona las facturas de la compañía eléctrica",
      icon: "⚡",
      path: "/consumos/facturas",
      section: "GESTIÓN DE FACTURACIÓN",
    },
    {
      title: "Liquidación de Facturas",
      description: "Reparte el reparto de costes entre los inquilinos",
      icon: "💰",
      path: "/consumos/liquidacion",
      section: "GESTIÓN DE FACTURACIÓN",
    },
    {
      title: "Boletines de Facturas",
      description: "Genera y consulta los boletines energéticos de los inquilinos",
      icon: "📄",
      path: "/consumos/boletines",
      section: "GESTIÓN DE FACTURACIÓN",
    },
    {
      title: "Hucha Energética",
      description: "Controla el saldo de la hucha energética de cada inquilino",
      icon: "🔋",
      path: "/consumos/hucha-energetica",
      section: "GESTIÓN DE HUCHAS",
    },
  ];

  // Agrupar cards por sección
  const consumosCards = cards.filter(c => c.section === "GESTIÓN DE CONSUMOS");
  const facturacionCards = cards.filter(c => c.section === "GESTIÓN DE FACTURACIÓN");
  const huchasCards = cards.filter(c => c.section === "GESTIÓN DE HUCHAS");

  return (
    <div style={styles.container}>
      <Sidebar items={sidebarItems} title="Consumos" />

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Visión General</h1>
          <p style={styles.subtitle}>GESTIÓN DE CONSUMOS</p>
        </div>

        {/* Sección Consumos */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>GESTIÓN DE CONSUMOS</h2>
          <div style={styles.cardsGrid}>
            {consumosCards.map((card) => (
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

        {/* Sección Facturación */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>GESTIÓN DE FACTURACIÓN</h2>
          <div style={styles.cardsGrid}>
            {facturacionCards.map((card) => (
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

        {/* Sección Huchas */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>GESTIÓN DE HUCHAS</h2>
          <div style={styles.cardsGrid}>
            {huchasCards.map((card) => (
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

  section: {
    marginBottom: 40,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 16,
    margin: 0,
    marginBottom: 16,
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
