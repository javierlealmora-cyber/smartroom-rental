// =============================================================================
// src/pages/v2/superadmin/services/ServicesList.jsx
// =============================================================================
// Catálogo de Servicios - Versión v2
// Gestiona los servicios disponibles para los planes de suscripción
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import {
  getServices,
  archiveService,
  reactivateService,
  serviceCategories,
} from "../../../../mocks/services.mock";

export default function ServicesList() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    search: "",
  });
  const [confirmModal, setConfirmModal] = useState({ open: false, service: null, action: null });

  // Cargar servicios
  const loadServices = () => {
    const filterParams = {};
    if (filters.status) filterParams.status = filters.status;
    if (filters.category) filterParams.category = filters.category;
    if (filters.search) filterParams.search = filters.search;
    setServices(getServices(filterParams));
  };

  useEffect(() => {
    loadServices();
  }, [filters]);

  const handleArchive = (service) => {
    setConfirmModal({ open: true, service, action: "archive" });
  };

  const handleReactivate = (service) => {
    setConfirmModal({ open: true, service, action: "reactivate" });
  };

  const confirmAction = () => {
    if (confirmModal.action === "archive") {
      archiveService(confirmModal.service.id);
    } else if (confirmModal.action === "reactivate") {
      reactivateService(confirmModal.service.id);
    }
    setConfirmModal({ open: false, service: null, action: null });
    loadServices();
  };

  const getStatusBadge = (status) => {
    const badgeStyles = {
      active: { bg: "#DEF7EC", color: "#03543F" },
      archived: { bg: "#FDE8E8", color: "#9B1C1C" },
    };
    const s = badgeStyles[status] || badgeStyles.archived;
    return (
      <span
        style={{
          backgroundColor: s.bg,
          color: s.color,
          padding: "4px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {status === "active" ? "Activo" : "Archivado"}
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
          padding: "4px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {category}
      </span>
    );
  };

  // Estadísticas
  const activeCount = services.filter((s) => s.status === "active").length;
  const archivedCount = services.filter((s) => s.status === "archived").length;

  return (
    <V2Layout role="superadmin" userName="Administrador">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Catálogo de Servicios</h1>
          <p style={styles.subtitle}>
            {services.length} servicios ({activeCount} activos, {archivedCount} archivados)
          </p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiValue}>{services.length}</span>
          <span style={styles.kpiLabel}>Total Servicios</span>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: "#059669" }}>
          <span style={{ ...styles.kpiValue, color: "#059669" }}>{activeCount}</span>
          <span style={styles.kpiLabel}>Activos</span>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: "#DC2626" }}>
          <span style={{ ...styles.kpiValue, color: "#DC2626" }}>{archivedCount}</span>
          <span style={styles.kpiLabel}>Archivados</span>
        </div>
        <div style={{ ...styles.kpiCard, borderLeftColor: "#3B82F6" }}>
          <span style={{ ...styles.kpiValue, color: "#3B82F6" }}>{serviceCategories.length}</span>
          <span style={styles.kpiLabel}>Categorías</span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={styles.toolbarButton}
          onClick={() => navigate("/v2/superadmin/servicios/nuevo")}
        >
          <span style={styles.toolbarIcon}>+</span>
          <span>Nuevo</span>
          <span style={styles.toolbarBold}>Servicio</span>
        </button>
        <button
          style={styles.toolbarButton}
          onClick={() => setFilters({ status: "", category: "", search: "" })}
        >
          <span style={styles.toolbarIcon}>🔄</span>
          <span>Limpiar Filtros</span>
        </button>
      </div>

      {/* Filtros */}
      <div style={styles.filtersRow}>
        <input
          type="text"
          placeholder="Buscar por nombre o key..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={styles.searchInput}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="archived">Archivado</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          style={styles.select}
        >
          <option value="">Todas las categorías</option>
          {serviceCategories.map((cat) => (
            <option key={cat.key} value={cat.key}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Key</th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Descripción</th>
              <th style={styles.th}>Categoría</th>
              <th style={styles.th}>Estado</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyCell}>
                  No se encontraron servicios
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.code}>{service.key}</code>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{service.label}</td>
                  <td style={{ ...styles.td, color: "#6B7280", maxWidth: 300 }}>
                    {service.description || "-"}
                  </td>
                  <td style={styles.td}>{getCategoryBadge(service.category)}</td>
                  <td style={styles.td}>{getStatusBadge(service.status)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => navigate(`/v2/superadmin/servicios/${service.id}`)}
                      >
                        Ver
                      </button>
                      <button
                        style={styles.actionBtn}
                        onClick={() => navigate(`/v2/superadmin/servicios/${service.id}/editar`)}
                      >
                        Editar
                      </button>
                      {service.status === "active" ? (
                        <button
                          style={{ ...styles.actionBtn, color: "#DC2626" }}
                          onClick={() => handleArchive(service)}
                        >
                          Archivar
                        </button>
                      ) : (
                        <button
                          style={{ ...styles.actionBtn, color: "#059669" }}
                          onClick={() => handleReactivate(service)}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación */}
      {confirmModal.open && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {confirmModal.action === "archive"
                ? "Archivar Servicio"
                : "Reactivar Servicio"}
            </h3>
            <p style={styles.modalText}>
              {confirmModal.action === "archive"
                ? `¿Estás seguro de que deseas archivar el servicio "${confirmModal.service?.label}"? No estará disponible para nuevos planes.`
                : `¿Deseas reactivar el servicio "${confirmModal.service?.label}"? Volverá a estar disponible para planes.`}
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmModal({ open: false, service: null, action: null })}
              >
                Cancelar
              </button>
              <button
                style={
                  confirmModal.action === "archive"
                    ? styles.dangerBtn
                    : styles.successBtn
                }
                onClick={confirmAction}
              >
                {confirmModal.action === "archive" ? "Archivar" : "Reactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </V2Layout>
  );
}

const styles = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    borderLeft: "4px solid #111827",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  kpiLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  toolbar: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  toolbarButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  toolbarIcon: {
    fontSize: 16,
  },
  toolbarBold: {
    fontWeight: "700",
    color: "#111827",
  },
  filtersRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchInput: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    minWidth: 250,
  },
  select: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    minWidth: 160,
  },
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    backgroundColor: "#F9FAFB",
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #E5E7EB",
  },
  tr: {
    borderBottom: "1px solid #E5E7EB",
  },
  td: {
    padding: "14px 16px",
    fontSize: 14,
    color: "#111827",
  },
  emptyCell: {
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
  },
  code: {
    backgroundColor: "#F3F4F6",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    color: "#374151",
  },
  actions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#111827",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 4,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    maxWidth: 440,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  modalText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.5,
    margin: "0 0 20px 0",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  dangerBtn: {
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  successBtn: {
    backgroundColor: "#059669",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
