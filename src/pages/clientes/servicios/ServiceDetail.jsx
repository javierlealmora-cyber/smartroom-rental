// src/pages/clientes/servicios/ServiceDetail.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { getServiceById } from "../../../mocks/services.mock";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

// Formatea fecha como dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function ServiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [service, setService] = useState(null);

  useEffect(() => {
    const found = getServiceById(id);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setService(found);
    } else {
      navigate("/clientes/servicios");
    }
  }, [id, navigate]);

  if (!service) {
    return (
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="CLIENTES" />
        <div style={styles.loading}>
          <p>Cargando servicio...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { bg: "#DEF7EC", color: "#03543F", label: "Activo" },
      archived: { bg: "#FDE8E8", color: "#9B1C1C", label: "Archivado" },
    };
    const s = config[status] || config.archived;
    return (
      <span
        style={{
          backgroundColor: s.bg,
          color: s.color,
          padding: "6px 14px",
          borderRadius: 16,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {s.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      operación: { bg: "#E0E7FF", color: "#3730A3" },
      comunicación: { bg: "#FEF3C7", color: "#92400E" },
      analítica: { bg: "#D1FAE5", color: "#065F46" },
    };
    const c = colors[category] || colors.operación;
    return (
      <span
        style={{
          backgroundColor: c.bg,
          color: c.color,
          padding: "6px 14px",
          borderRadius: 16,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {category}
      </span>
    );
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate("/clientes/servicios")}>
            ← Volver al listado
          </button>
          <div style={styles.headerRow}>
            <div style={styles.headerInfo}>
            <h1 style={styles.title}>{service.label}</h1>
            <div style={styles.badges}>
              {getStatusBadge(service.status)}
              {getCategoryBadge(service.category)}
            </div>
          </div>
          <button
            style={styles.editBtn}
            onClick={() => navigate(`/clientes/servicios/${id}/edit`)}
          >
            Editar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={styles.content}>
        {/* Info principal */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Información del Servicio</h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Key (identificador)</span>
              <code style={styles.codeValue}>{service.key}</code>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Nombre</span>
              <span style={styles.infoValue}>{service.label}</span>
            </div>

            <div style={{ ...styles.infoItem, gridColumn: "1 / -1" }}>
              <span style={styles.infoLabel}>Descripción</span>
              <span style={styles.infoValue}>
                {service.description || (
                  <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>
                    Sin descripción
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Metadatos */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Información de Auditoría</h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ID interno</span>
              <code style={styles.codeValueSmall}>{service.id}</code>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Fecha de creación</span>
              <span style={styles.infoValue}>
                {formatDate(service.created_at)}
              </span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Última actualización</span>
              <span style={styles.infoValue}>
                {formatDate(service.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Uso futuro: planes que usan este servicio */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Uso en Planes</h2>
          <p style={styles.placeholderText}>
            Aquí se mostrará la lista de planes que incluyen este servicio.
          </p>
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
    padding: 24,
    maxWidth: 900,
    overflow: "auto",
  },
  loading: {
    flex: 1,
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
    marginBottom: 12,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerInfo: {},
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  badges: {
    display: "flex",
    gap: 10,
  },
  editBtn: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 20px 0",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 1.5,
  },
  codeValue: {
    backgroundColor: "#F3F4F6",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "monospace",
    color: "#374151",
    display: "inline-block",
  },
  codeValueSmall: {
    backgroundColor: "#F3F4F6",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    color: "#6B7280",
  },
  placeholderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
    margin: 0,
  },
};
