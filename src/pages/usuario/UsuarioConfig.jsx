import { useAuth } from "../../providers/AuthProvider";
import Sidebar from "../../components/Sidebar";

export default function UsuarioConfig() {
  const { profile } = useAuth();
  const role = profile?.role;

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

  const adminSidebarItems = [
    { label: "Visión General", path: "/usuario", icon: "⊞" },
    { type: "section", label: "MI CUENTA" },
    { label: "Configuración", path: "/usuario/configuracion", icon: "⚙️", isSubItem: true },
    { label: "Personalización", path: "/usuario/personalizacion", icon: "🎨", isSubItem: true },
  ];

  const sidebarItems = role === "tenant" ? tenantSidebarItems : adminSidebarItems;

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Usuario" />
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
