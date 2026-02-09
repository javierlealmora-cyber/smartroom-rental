// src/pages/clientes/servicios/ServicesList.jsx
// NOTA: Esta página ha sido migrada a v2
// La nueva versión está en /v2/superadmin/servicios

import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

export default function ServicesList() {
  const navigate = useNavigate();

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.iconWrapper}>
            <span style={styles.icon}>🚧</span>
          </div>
          <h1 style={styles.title}>Página en Construcción</h1>
          <p style={styles.message}>
            Esta sección está siendo migrada a la nueva versión v2 del sistema.
          </p>
          <p style={styles.submessage}>
            Mientras tanto, puedes acceder a la nueva versión haciendo clic en el botón de abajo.
          </p>
          <div style={styles.actions}>
            <button
              style={styles.primaryButton}
              onClick={() => navigate("/v2/superadmin/servicios")}
            >
              Ir a la versión v2
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/clientes")}
            >
              Volver al inicio
            </button>
          </div>
        </div>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    overflow: "auto",
    backgroundColor: "#F9FAFB",
  },
  content: {
    textAlign: "center",
    maxWidth: 500,
    padding: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  iconWrapper: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px 0",
  },
  message: {
    fontSize: 16,
    color: "#374151",
    margin: "0 0 8px 0",
    lineHeight: 1.5,
  },
  submessage: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 32px 0",
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};
