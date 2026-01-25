// src/pages/clientes/planes/PlansList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import {
  getPlans,
  archivePlan,
  duplicatePlan,
  calculateAnnualPrice,
  calculatePriceWithVAT,
  planStatuses,
} from "../../../mocks/plans.mock";
import { getServiceByKey } from "../../../mocks/services.mock";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

export default function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    validToday: false,
    search: "",
  });
  const [confirmModal, setConfirmModal] = useState({ open: false, plan: null, action: null });

  const loadPlans = () => {
    const filterParams = {};
    if (filters.status) filterParams.status = filters.status;
    if (filters.validToday) filterParams.validToday = true;
    if (filters.search) filterParams.search = filters.search;
    setPlans(getPlans(filterParams));
  };

  useEffect(() => {
    loadPlans();
  }, [filters]);

  const handleArchive = (plan) => {
    setConfirmModal({ open: true, plan, action: "archive" });
  };

  const handleDuplicate = (plan) => {
    setConfirmModal({ open: true, plan, action: "duplicate" });
  };

  const confirmAction = () => {
    if (confirmModal.action === "archive") {
      archivePlan(confirmModal.plan.id);
    } else if (confirmModal.action === "duplicate") {
      const newPlan = duplicatePlan(confirmModal.plan.id);
      setConfirmModal({ open: false, plan: null, action: null });
      loadPlans();
      navigate(`/clientes/planes/${newPlan.id}/edit`);
      return;
    }
    setConfirmModal({ open: false, plan: null, action: null });
    loadPlans();
  };

  const getStatusBadge = (status) => {
    const statusConfig = planStatuses.find((s) => s.key === status) || planStatuses[0];
    const bgColors = {
      draft: "#F3F4F6",
      active: "#DEF7EC",
      archived: "#FDE8E8",
    };
    const textColors = {
      draft: "#374151",
      active: "#03543F",
      archived: "#9B1C1C",
    };
    return (
      <span
        style={{
          backgroundColor: bgColors[status] || bgColors.draft,
          color: textColors[status] || textColors.draft,
          padding: "4px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {statusConfig.label}
      </span>
    );
  };

  const getServiceChips = (serviceKeys) => {
    return serviceKeys.slice(0, 3).map((key) => {
      const service = getServiceByKey(key);
      const isArchived = !service || service.status === "archived";
      return (
        <span
          key={key}
          style={{
            backgroundColor: isArchived ? "#F3F4F6" : "#E0E7FF",
            color: isArchived ? "#9CA3AF" : "#3730A3",
            padding: "3px 8px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 500,
          }}
          title={isArchived ? "Servicio archivado" : service?.label}
        >
          {service?.label || key}
        </span>
      );
    });
  };

  const formatPrice = (price, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getAnnualPrice = (plan) => {
    if (plan.pricing.annual_price != null) {
      return plan.pricing.annual_price;
    }
    return calculateAnnualPrice(plan.pricing.monthly_price);
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Planes de Suscripción</h1>
          <p style={styles.subtitle}>Gestiona los planes disponibles para clientes</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.secondaryButton}
            onClick={() => navigate("/clientes/servicios")}
          >
            Gestionar Servicios
          </button>
          <button
            style={styles.primaryButton}
            onClick={() => navigate("/clientes/planes/new")}
          >
            + Nuevo Plan
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filtersRow}>
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
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
          {planStatuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={filters.validToday}
            onChange={(e) => setFilters({ ...filters, validToday: e.target.checked })}
            style={styles.checkbox}
          />
          Vigente hoy
        </label>
      </div>

      {/* Tabla */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Vigencia</th>
              <th style={styles.th}>Límite</th>
              <th style={styles.th}>Servicios</th>
              <th style={styles.th}>Precio Mensual</th>
              <th style={styles.th}>Precio Anual</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.emptyCell}>
                  No se encontraron planes
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{plan.name}</div>
                      <code style={styles.code}>{plan.code}</code>
                    </div>
                  </td>
                  <td style={styles.td}>{getStatusBadge(plan.status)}</td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>
                      {plan.valid_from || "—"} → {plan.valid_to || "∞"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {plan.limits.unlimited_properties ? (
                      <span style={{ color: "#059669", fontWeight: 600 }}>∞</span>
                    ) : (
                      <span>{plan.limits.max_properties} residencias</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.chipContainer}>
                      {getServiceChips(plan.services_included)}
                      {plan.services_included.length > 3 && (
                        <span style={styles.moreChip}>
                          +{plan.services_included.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>
                      {formatPrice(plan.pricing.monthly_price)}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>sin IVA</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600 }}>
                      {formatPrice(getAnnualPrice(plan))}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>sin IVA</div>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <div style={styles.actions}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => navigate(`/clientes/planes/${plan.id}`)}
                      >
                        Ver
                      </button>
                      <button
                        style={styles.actionBtn}
                        onClick={() => navigate(`/clientes/planes/${plan.id}/edit`)}
                      >
                        Editar
                      </button>
                      <button
                        style={{ ...styles.actionBtn, color: "#6366F1" }}
                        onClick={() => handleDuplicate(plan)}
                      >
                        Duplicar
                      </button>
                      {plan.status !== "archived" && (
                        <button
                          style={{ ...styles.actionBtn, color: "#DC2626" }}
                          onClick={() => handleArchive(plan)}
                        >
                          Archivar
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
                ? "Archivar Plan"
                : "Duplicar Plan"}
            </h3>
            <p style={styles.modalText}>
              {confirmModal.action === "archive"
                ? `¿Estás seguro de que deseas archivar el plan "${confirmModal.plan?.name}"? No estará disponible para nuevos clientes.`
                : `¿Deseas crear una copia del plan "${confirmModal.plan?.name}"? Se creará como borrador.`}
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmModal({ open: false, plan: null, action: null })}
              >
                Cancelar
              </button>
              <button
                style={
                  confirmModal.action === "archive"
                    ? styles.dangerBtn
                    : styles.primaryButton
                }
                onClick={confirmAction}
              >
                {confirmModal.action === "archive" ? "Archivar" : "Duplicar"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 20,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  headerActions: {
    display: "flex",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  filtersRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
    alignItems: "center",
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
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
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #E5E7EB",
  },
  td: {
    padding: "14px 16px",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
  },
  emptyCell: {
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
  },
  code: {
    backgroundColor: "#F3F4F6",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "monospace",
    color: "#6B7280",
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  moreChip: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
    padding: "3px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 500,
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
    whiteSpace: "nowrap",
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
};
