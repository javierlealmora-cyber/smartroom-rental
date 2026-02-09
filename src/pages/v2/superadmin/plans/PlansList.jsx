// =============================================================================
// src/pages/v2/superadmin/plans/PlansList.jsx
// =============================================================================
// DBSU-PC-LI: Lista de Planes de Cliente
// Pantalla para ver y gestionar todos los planes disponibles
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente
// =============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import {
  mockPlans,
  PLAN_STATUS,
  getPlanStatusLabel,
  getPlanStatusColor,
  formatDate,
  formatCurrency,
  formatLimit,
} from "../../../../mocks/clientAccountsData";

export default function PlansList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVisible, setFilterVisible] = useState("");
  const [filterVigente, setFilterVigente] = useState("");

  // Filtrar planes
  const filteredPlans = useMemo(() => {
    let result = [...mockPlans];

    // Filtrar por búsqueda (nombre o código)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(search) ||
          plan.code.toLowerCase().includes(search)
      );
    }

    // Filtrar por estado
    if (filterStatus) {
      result = result.filter((plan) => plan.status === filterStatus);
    }

    // Filtrar por visible para nuevas altas
    if (filterVisible !== "") {
      const isVisible = filterVisible === "true";
      result = result.filter((plan) => plan.visible_for_new_accounts === isVisible);
    }

    // Filtrar por vigente hoy
    if (filterVigente !== "") {
      const today = new Date().toISOString().split("T")[0];
      const isVigente = filterVigente === "true";
      result = result.filter((plan) => {
        const startOk = plan.start_date <= today;
        const endOk = !plan.end_date || plan.end_date >= today;
        return isVigente ? (startOk && endOk) : !(startOk && endOk);
      });
    }

    return result;
  }, [searchTerm, filterStatus, filterVisible, filterVigente]);

  const handleToggleVisible = (plan) => {
    const action = plan.visible_for_new_accounts ? "ocultar" : "mostrar";
    if (window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el plan "${plan.name}" para nuevas altas?`)) {
      alert(`Plan "${plan.name}" ${plan.visible_for_new_accounts ? "ocultado" : "visible"} para nuevas altas (mock)`);
    }
  };

  const handleDeactivate = (plan) => {
    if (window.confirm(`¿Desactivar el plan "${plan.name}"? Esta acción marcará el plan como desactivado.`)) {
      alert(`Plan "${plan.name}" desactivado (mock)`);
    }
  };

  const handleSetEndDate = (plan) => {
    const date = prompt("Fecha de fin de vigencia (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (date) {
      alert(`Fecha de fin establecida para "${plan.name}": ${date} (mock)`);
    }
  };

  return (
    <V2Layout role="superadmin" userName="Administrador">
      {/* DBSU-PC-LI: Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestión de Planes de Cliente</h1>
          <p style={styles.subtitle}>
            {filteredPlans.length} de {mockPlans.length} planes
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={styles.toolbarButton}
          onClick={() => navigate("/v2/superadmin/planes/nuevo")}
        >
          <span style={styles.toolbarIcon}>+</span>
          <span>Nuevo</span>
          <span style={styles.toolbarBold}>Plan</span>
        </button>
        <button
          style={styles.toolbarButton}
          onClick={() => {
            setSearchTerm("");
            setFilterStatus("");
            setFilterVisible("");
            setFilterVigente("");
          }}
        >
          <span style={styles.toolbarIcon}>🔄</span>
          <span>Limpiar Filtros</span>
        </button>
      </div>

      {/* DBSU-PC-LI: Filtros */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value={PLAN_STATUS.DRAFT}>Borrador</option>
          <option value={PLAN_STATUS.ACTIVE}>Activo</option>
          <option value={PLAN_STATUS.INACTIVE}>Inactivo</option>
          <option value={PLAN_STATUS.DEPRECATED}>Obsoleto</option>
          <option value={PLAN_STATUS.DEACTIVATED}>Desactivado</option>
        </select>
        <select
          value={filterVisible}
          onChange={(e) => setFilterVisible(e.target.value)}
          style={styles.select}
        >
          <option value="">Visible (todos)</option>
          <option value="true">Visible para nuevas altas</option>
          <option value="false">Oculto para nuevas altas</option>
        </select>
        <select
          value={filterVigente}
          onChange={(e) => setFilterVigente(e.target.value)}
          style={styles.select}
        >
          <option value="">Vigencia (todos)</option>
          <option value="true">Vigente hoy</option>
          <option value="false">No vigente</option>
        </select>
      </div>

      {/* DBSU-PC-LI: Tabla de Planes */}
      <div style={styles.tableCard}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {/* Columnas 1: Nombre, Código */}
                <th style={styles.th}>Plan</th>
                {/* Columnas 2: Estado, Visible */}
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Visible</th>
                {/* Columnas 3: Fechas */}
                <th style={styles.th}>Vigencia</th>
                {/* Columnas 5: Precios */}
                <th style={styles.th}>Pricing</th>
                {/* Columnas 6: Límites */}
                <th style={styles.th}>Límites</th>
                {/* Acciones */}
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyState}>
                    No se encontraron planes con los filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} style={styles.tr}>
                    {/* Plan Info */}
                    <td style={styles.td}>
                      <div style={styles.planCell}>
                        <div style={styles.planName}>{plan.name}</div>
                        <div style={styles.planCode}>{plan.code}</div>
                      </div>
                    </td>
                    {/* Estado */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: `${getPlanStatusColor(plan.status)}15`,
                          color: getPlanStatusColor(plan.status),
                          border: `1px solid ${getPlanStatusColor(plan.status)}40`,
                        }}
                      >
                        {getPlanStatusLabel(plan.status)}
                      </span>
                    </td>
                    {/* Visible */}
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.visibleBadge,
                          backgroundColor: plan.visible_for_new_accounts ? "#DCFCE7" : "#FEE2E2",
                          color: plan.visible_for_new_accounts ? "#166534" : "#991B1B",
                        }}
                      >
                        {plan.visible_for_new_accounts ? "Sí" : "No"}
                      </span>
                    </td>
                    {/* Vigencia */}
                    <td style={styles.td}>
                      <div style={styles.datesCell}>
                        <div style={styles.dateRow}>
                          <span style={styles.dateLabel}>Inicio:</span>
                          <span>{formatDate(plan.start_date)}</span>
                        </div>
                        <div style={styles.dateRow}>
                          <span style={styles.dateLabel}>Fin:</span>
                          <span>{plan.end_date ? formatDate(plan.end_date) : "-"}</span>
                        </div>
                        {plan.deactivated_at && (
                          <div style={styles.dateRow}>
                            <span style={styles.dateLabelWarning}>Baja:</span>
                            <span style={styles.dateWarning}>{formatDate(plan.deactivated_at)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Pricing */}
                    <td style={styles.td}>
                      <div style={styles.pricingCell}>
                        <div style={styles.priceRow}>
                          <span style={styles.priceLabel}>Mensual:</span>
                          <span style={styles.priceValue}>{formatCurrency(plan.price_monthly)}</span>
                        </div>
                        <div style={styles.priceRow}>
                          <span style={styles.priceLabel}>Anual:</span>
                          <span style={styles.priceValue}>{formatCurrency(plan.price_annual)}</span>
                        </div>
                        <div style={styles.ivaText}>
                          {plan.vat_applicable ? `+${plan.vat_percentage}% IVA` : "IVA incluido"}
                        </div>
                      </div>
                    </td>
                    {/* Límites */}
                    <td style={styles.td}>
                      <div style={styles.limitsCell}>
                        <span style={styles.limitItem} title="Max Owners">
                          {formatLimit(plan.max_owners)} owners
                        </span>
                        <span style={styles.limitItem} title="Max Alojamientos">
                          {formatLimit(plan.max_accommodations)} aloj.
                        </span>
                        <span style={styles.limitItem} title="Max Habitaciones">
                          {formatLimit(plan.max_rooms)} hab.
                        </span>
                        <span style={styles.limitItem} title="Max Usuarios">
                          {plan.max_admin_users + plan.max_associated_users} usuarios
                        </span>
                      </div>
                    </td>
                    {/* Acciones */}
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => navigate(`/v2/superadmin/planes/${plan.id}`)}
                          title="Ver detalle"
                        >
                          👁
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => navigate(`/v2/superadmin/planes/${plan.id}/editar`)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          style={{
                            ...styles.actionButton,
                            color: plan.visible_for_new_accounts ? "#F59E0B" : "#059669",
                          }}
                          onClick={() => handleToggleVisible(plan)}
                          title={plan.visible_for_new_accounts ? "Ocultar para nuevas altas" : "Mostrar para nuevas altas"}
                        >
                          {plan.visible_for_new_accounts ? "🔒" : "🔓"}
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => handleSetEndDate(plan)}
                          title="Programar caducidad"
                        >
                          📅
                        </button>
                        {plan.status !== PLAN_STATUS.DEACTIVATED && (
                          <button
                            style={{ ...styles.actionButton, color: "#DC2626" }}
                            onClick={() => handleDeactivate(plan)}
                            title="Desactivar"
                          >
                            🗑
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
      </div>
    </V2Layout>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  filters: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    maxWidth: 300,
    padding: "10px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
  },
  select: {
    padding: "10px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    minWidth: 160,
  },
  clearButton: {
    padding: "10px 16px",
    fontSize: 14,
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "16px",
    fontSize: 14,
    color: "#374151",
    verticalAlign: "top",
  },
  planCell: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  planName: {
    fontWeight: "600",
    color: "#111827",
  },
  planCode: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  visibleBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  datesCell: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 13,
  },
  dateRow: {
    display: "flex",
    gap: 6,
  },
  dateLabel: {
    color: "#9CA3AF",
    minWidth: 40,
  },
  dateLabelWarning: {
    color: "#DC2626",
    minWidth: 40,
  },
  dateWarning: {
    color: "#DC2626",
  },
  pricingCell: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  priceRow: {
    display: "flex",
    gap: 6,
    fontSize: 13,
  },
  priceLabel: {
    color: "#9CA3AF",
    minWidth: 60,
  },
  priceValue: {
    fontWeight: "500",
    color: "#111827",
  },
  ivaText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  limitsCell: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  limitItem: {
    fontSize: 12,
    color: "#6B7280",
    padding: "2px 0",
  },
  actions: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  actionButton: {
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s ease",
  },
  emptyState: {
    padding: 48,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
  },
};
