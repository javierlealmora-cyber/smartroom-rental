// src/pages/v2/admin/tenants/TenantsList.jsx
// Lista de Inquilinos para Admin
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import {
  mockTenants,
  mockAccommodations,
  TENANT_STATUS,
  formatDate,
} from "../../../../mocks/clientAccountsData";

export default function TenantsList() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const CURRENT_CLIENT_ACCOUNT_ID = clientAccountId || "ca-001";
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Obtener alojamientos del cliente
  const accommodations = mockAccommodations.filter(
    (a) => a.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
  );

  // Filtrar inquilinos
  const tenants = useMemo(() => {
    let result = mockTenants.filter(
      (t) => t.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
    );

    if (!showInactive) {
      result = result.filter((t) => t.status !== TENANT_STATUS.INACTIVE);
    }

    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (filterAccommodation) {
      result = result.filter((t) => t.current_accommodation === filterAccommodation);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.full_name.toLowerCase().includes(search) ||
          t.email.toLowerCase().includes(search) ||
          t.phone?.includes(search)
      );
    }

    return result;
  }, [searchTerm, filterStatus, filterAccommodation, showInactive]);

  const getStatusLabel = (status) => {
    const labels = {
      [TENANT_STATUS.ACTIVE]: "Activo",
      [TENANT_STATUS.INVITED]: "Invitado",
      [TENANT_STATUS.PENDING_CHECKOUT]: "Pendiente de baja",
      [TENANT_STATUS.INACTIVE]: "Inactivo",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      [TENANT_STATUS.ACTIVE]: "#059669",
      [TENANT_STATUS.INVITED]: "#3B82F6",
      [TENANT_STATUS.PENDING_CHECKOUT]: "#F59E0B",
      [TENANT_STATUS.INACTIVE]: "#6B7280",
    };
    return colors[status] || "#6B7280";
  };

  const handleSendOnboarding = (tenant) => {
    alert(`Email de onboarding enviado a ${tenant.email} (mock)`);
  };

  const handleScheduleCheckout = (tenant) => {
    const date = prompt("Fecha de baja (YYYY-MM-DD):", "2025-02-28");
    if (date) {
      alert(`Baja programada para ${tenant.full_name} el ${date} (mock)`);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Gestión de Inquilinos</h1>
            <p style={styles.subtitle}>
              {tenants.length} inquilino{tenants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button
            style={styles.toolbarButton}
            onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
          >
            <span style={styles.toolbarIcon}>+</span>
            <span>Nuevo</span>
            <span style={styles.toolbarBold}>Inquilino</span>
          </button>
          <button
            style={styles.toolbarButton}
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("");
              setFilterAccommodation("");
              setShowInactive(false);
            }}
          >
            <span style={styles.toolbarIcon}>🔄</span>
            <span>Limpiar Filtros</span>
          </button>
        </div>

        {/* Filtros */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
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
            <option value={TENANT_STATUS.ACTIVE}>Activo</option>
            <option value={TENANT_STATUS.INVITED}>Invitado</option>
            <option value={TENANT_STATUS.PENDING_CHECKOUT}>Pendiente de baja</option>
          </select>
          <select
            value={filterAccommodation}
            onChange={(e) => setFilterAccommodation(e.target.value)}
            style={styles.select}
          >
            <option value="">Todos los alojamientos</option>
            {accommodations.map((acc) => (
              <option key={acc.id} value={acc.name}>
                {acc.name}
              </option>
            ))}
          </select>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={styles.checkbox}
            />
            Mostrar inactivos
          </label>
        </div>

        {/* Tabla de inquilinos */}
        <div style={styles.tableCard}>
          {tenants.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>👥</span>
              <h3 style={styles.emptyTitle}>No hay inquilinos</h3>
              <p style={styles.emptyText}>
                {searchTerm || filterStatus || filterAccommodation
                  ? "No se encontraron inquilinos con los filtros aplicados"
                  : "Registra tu primer inquilino para empezar"}
              </p>
              {!searchTerm && !filterStatus && !filterAccommodation && (
                <button
                  style={styles.primaryButton}
                  onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
                >
                  + Registrar Inquilino
                </button>
              )}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Inquilino</th>
                  <th style={styles.th}>Contacto</th>
                  <th style={styles.th}>Alojamiento</th>
                  <th style={styles.th}>Habitación</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Fecha Alta</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.tenantCell}>
                        <div style={styles.avatar}>
                          {tenant.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={styles.tenantName}>{tenant.full_name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contactInfo}>
                        <span style={styles.email}>{tenant.email}</span>
                        <span style={styles.phone}>{tenant.phone}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {tenant.current_accommodation || "-"}
                    </td>
                    <td style={styles.td}>
                      {tenant.current_room ? (
                        <span style={styles.roomBadge}>
                          Hab. {tenant.current_room}
                        </span>
                      ) : (
                        <span style={styles.noRoom}>Sin asignar</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: `${getStatusColor(tenant.status)}15`,
                          color: getStatusColor(tenant.status),
                        }}
                      >
                        {getStatusLabel(tenant.status)}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(tenant.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => navigate(`/v2/admin/inquilinos/${tenant.id}`)}
                          title="Ver detalle"
                        >
                          👁
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => navigate(`/v2/admin/inquilinos/${tenant.id}/editar`)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {tenant.status === TENANT_STATUS.INVITED && (
                          <button
                            style={{ ...styles.actionButton, color: "#3B82F6" }}
                            onClick={() => handleSendOnboarding(tenant)}
                            title="Reenviar email onboarding"
                          >
                            ✉️
                          </button>
                        )}
                        {tenant.status === TENANT_STATUS.ACTIVE && (
                          <button
                            style={{ ...styles.actionButton, color: "#F59E0B" }}
                            onClick={() => handleScheduleCheckout(tenant)}
                            title="Programar baja"
                          >
                            🚪
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
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
    maxWidth: 350,
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
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
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
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "16px",
    fontSize: 14,
    color: "#374151",
    verticalAlign: "middle",
  },
  tenantCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  tenantName: {
    fontWeight: "600",
    color: "#111827",
  },
  contactInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  email: {
    fontSize: 14,
    color: "#374151",
  },
  phone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  roomBadge: {
    display: "inline-block",
    padding: "4px 10px",
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  noRoom: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
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
    textAlign: "center",
    padding: 60,
  },
  emptyIcon: {
    fontSize: 48,
    display: "block",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
};
