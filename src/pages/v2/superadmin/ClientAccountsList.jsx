// src/pages/v2/superadmin/ClientAccountsList.jsx
// Listado de Cuentas Cliente para Superadmin
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockClientAccounts,
  PLANS,
  STATUS,
  getPlanLabel,
  getPlanColor,
  getStatusLabel,
  getStatusColor,
  formatDate,
} from "../../../mocks/clientAccountsData";

export default function ClientAccountsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filtrar y ordenar cuentas
  const filteredAccounts = useMemo(() => {
    let result = [...mockClientAccounts];

    // Filtrar por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (acc) =>
          acc.name.toLowerCase().includes(search) ||
          acc.slug.toLowerCase().includes(search)
      );
    }

    // Filtrar por plan
    if (filterPlan) {
      result = result.filter((acc) => acc.plan === filterPlan);
    }

    // Filtrar por estado
    if (filterStatus) {
      result = result.filter((acc) => acc.status === filterStatus);
    }

    // Ordenar
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "plan":
          aVal = a.plan;
          bVal = b.plan;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "accommodations":
          aVal = a.stats?.total_accommodations || 0;
          bVal = b.stats?.total_accommodations || 0;
          break;
        case "rooms":
          aVal = a.stats?.total_rooms || 0;
          bVal = b.stats?.total_rooms || 0;
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [searchTerm, filterPlan, filterStatus, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleSuspend = (account) => {
    if (window.confirm(`¿Suspender la cuenta "${account.name}"?`)) {
      alert(`Cuenta "${account.name}" suspendida (mock)`);
    }
  };

  const handleReactivate = (account) => {
    if (window.confirm(`¿Reactivar la cuenta "${account.name}"?`)) {
      alert(`Cuenta "${account.name}" reactivada (mock)`);
    }
  };

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <span
          style={styles.breadcrumbLink}
          onClick={() => navigate("/v2/superadmin")}
        >
          Dashboard
        </span>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbCurrent}>Cuentas Cliente</span>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cuentas Cliente</h1>
          <p style={styles.subtitle}>
            {filteredAccounts.length} de {mockClientAccounts.length} cuentas
          </p>
        </div>
        <button
          style={styles.primaryButton}
          onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
        >
          + Nueva Cuenta Cliente
        </button>
      </div>

      {/* Filtros */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los planes</option>
          {Object.values(PLANS).map((plan) => (
            <option key={plan} value={plan}>
              {getPlanLabel(plan)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value={STATUS.ACTIVE}>Activo</option>
          <option value={STATUS.SUSPENDED}>Suspendido</option>
          <option value={STATUS.CANCELLED}>Cancelado</option>
        </select>
        {(searchTerm || filterPlan || filterStatus) && (
          <button
            style={styles.clearButton}
            onClick={() => {
              setSearchTerm("");
              setFilterPlan("");
              setFilterStatus("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={styles.tableCard}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("name")}
                >
                  Cuenta Cliente {getSortIcon("name")}
                </th>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("plan")}
                >
                  Plan {getSortIcon("plan")}
                </th>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("status")}
                >
                  Estado {getSortIcon("status")}
                </th>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("accommodations")}
                >
                  Alojamientos {getSortIcon("accommodations")}
                </th>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("rooms")}
                >
                  Habitaciones {getSortIcon("rooms")}
                </th>
                <th style={styles.th}>Ocupación</th>
                <th
                  style={{ ...styles.th, cursor: "pointer" }}
                  onClick={() => handleSort("created_at")}
                >
                  Fecha Alta {getSortIcon("created_at")}
                </th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={styles.emptyState}>
                    No se encontraron cuentas cliente con los filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const occRate =
                    account.stats?.total_rooms > 0
                      ? Math.round(
                          (account.stats.occupied_rooms /
                            account.stats.total_rooms) *
                            100
                        )
                      : 0;

                  return (
                    <tr key={account.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.accountCell}>
                          {account.logo_url ? (
                            <img
                              src={account.logo_url}
                              alt=""
                              style={styles.accountLogo}
                            />
                          ) : (
                            <div
                              style={{
                                ...styles.accountLogoPlaceholder,
                                backgroundColor:
                                  account.theme_primary_color || "#6B7280",
                              }}
                            >
                              {account.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div style={styles.accountName}>{account.name}</div>
                            <div style={styles.accountSlug}>{account.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: `${getPlanColor(account.plan)}15`,
                            color: getPlanColor(account.plan),
                            border: `1px solid ${getPlanColor(account.plan)}40`,
                          }}
                        >
                          {getPlanLabel(account.plan)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: `${getStatusColor(account.status)}15`,
                            color: getStatusColor(account.status),
                            border: `1px solid ${getStatusColor(account.status)}40`,
                          }}
                        >
                          {getStatusLabel(account.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {account.stats?.total_accommodations || 0}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.roomsText}>
                          {account.stats?.occupied_rooms || 0} /{" "}
                          {account.stats?.total_rooms || 0}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.progressContainer}>
                          <div style={styles.progressBar}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${occRate}%`,
                                backgroundColor:
                                  occRate > 80
                                    ? "#059669"
                                    : occRate > 50
                                    ? "#F59E0B"
                                    : "#DC2626",
                              }}
                            />
                          </div>
                          <span style={styles.progressText}>{occRate}%</span>
                        </div>
                      </td>
                      <td style={styles.td}>{formatDate(account.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            style={styles.actionButton}
                            onClick={() =>
                              navigate(`/v2/superadmin/cuentas/${account.id}`)
                            }
                            title="Ver detalle"
                          >
                            👁
                          </button>
                          <button
                            style={styles.actionButton}
                            onClick={() =>
                              navigate(`/v2/superadmin/cuentas/${account.id}/editar`)
                            }
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {account.status === STATUS.ACTIVE ? (
                            <button
                              style={{ ...styles.actionButton, color: "#F59E0B" }}
                              onClick={() => handleSuspend(account)}
                              title="Suspender"
                            >
                              ⏸
                            </button>
                          ) : account.status === STATUS.SUSPENDED ? (
                            <button
                              style={{ ...styles.actionButton, color: "#059669" }}
                              onClick={() => handleReactivate(account)}
                              title="Reactivar"
                            >
                              ▶
                            </button>
                          ) : null}
                          <button
                            style={styles.actionButton}
                            onClick={() =>
                              navigate(`/v2/superadmin/cuentas/${account.id}/usuarios`)
                            }
                            title="Gestionar usuarios"
                          >
                            👥
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 32,
    backgroundColor: "#F9FAFB",
    minHeight: "100vh",
  },
  breadcrumb: {
    marginBottom: 16,
    fontSize: 14,
    color: "#6B7280",
  },
  breadcrumbLink: {
    color: "#3B82F6",
    cursor: "pointer",
  },
  breadcrumbSeparator: {
    margin: "0 8px",
    color: "#9CA3AF",
  },
  breadcrumbCurrent: {
    color: "#374151",
    fontWeight: "500",
  },
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
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
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
    minWidth: 250,
    maxWidth: 400,
    padding: "10px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
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
    transition: "background-color 0.2s ease",
  },
  td: {
    padding: "16px",
    fontSize: 14,
    color: "#374151",
    verticalAlign: "middle",
  },
  accountCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  accountLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    objectFit: "cover",
  },
  accountLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  accountName: {
    fontWeight: "600",
    color: "#111827",
  },
  accountSlug: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  roomsText: {
    fontWeight: "500",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    minWidth: 35,
  },
  actions: {
    display: "flex",
    gap: 4,
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
