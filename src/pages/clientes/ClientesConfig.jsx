import Sidebar from "../../components/Sidebar";

export default function ClientesConfig() {
  const sidebarItems = [
    { label: "Visión General", path: "/clientes", icon: "⊞" },
    { type: "section", label: "CLIENTES" },
    { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
    { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
    { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
    { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
  ];

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Clientes" />
      <div style={styles.container}>
        <h1 style={styles.title}>Configuración</h1>
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
