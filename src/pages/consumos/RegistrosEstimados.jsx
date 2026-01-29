import Sidebar from "../../components/Sidebar";

export default function RegistrosEstimados() {
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

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Consumos" />
      <div style={styles.container}>
        <h1 style={styles.title}>Registros Estimados</h1>
        <p style={styles.message}>Esta funcionalidad estará disponible próximamente.</p>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  container: {
    flex: 1,
    padding: 40,
    overflow: "auto",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  message: {
    fontSize: 16,
    color: "#6B7280",
  },
};
