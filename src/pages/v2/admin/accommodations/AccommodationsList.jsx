// src/pages/v2/admin/accommodations/AccommodationsList.jsx
// Lista de Alojamientos para Admin
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import {
  mockAccommodations,
  mockRooms,
  mockClientAccounts,
  ROOM_STATUS,
  STATUS,
  getStatusLabel,
  getStatusColor,
  getRoomStatusColor,
} from "../../../../mocks/clientAccountsData";

// Simular cliente activo
const CURRENT_CLIENT_ACCOUNT_ID = "ca-001";

// Obtener branding de la empresa actual
const getCurrentCompanyBranding = () => {
  const account = mockClientAccounts.find((a) => a.id === CURRENT_CLIENT_ACCOUNT_ID);
  if (account) {
    return {
      name: account.name,
      logoText: account.name.charAt(0),
      logoUrl: account.logo_url,
      primaryColor: account.theme_primary_color || "#111827",
      secondaryColor: account.theme_secondary_color || "#3B82F6",
    };
  }
  return null;
};

export default function AccommodationsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const companyBranding = getCurrentCompanyBranding();

  // Filtrar alojamientos
  const accommodations = useMemo(() => {
    let result = mockAccommodations.filter(
      (a) => a.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
    );

    if (!showInactive) {
      result = result.filter((a) => a.status === STATUS.ACTIVE);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.address_line1?.toLowerCase().includes(search) ||
          a.city?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [searchTerm, showInactive]);

  // Calcular estadísticas de habitaciones por alojamiento
  const getAccommodationStats = (accommodationId) => {
    const rooms = mockRooms.filter((r) => r.accommodation_id === accommodationId);
    const total = rooms.length;
    const free = rooms.filter((r) => r.status === ROOM_STATUS.FREE).length;
    const occupied = rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
    const pending = rooms.filter((r) => r.status === ROOM_STATUS.PENDING_CHECKOUT).length;
    return { total, free, occupied, pending };
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName="Admin Usuario">
      {/* Header */}
      <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Gestión de Alojamientos</h1>
            <p style={styles.subtitle}>
              {accommodations.length} alojamiento{accommodations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button
            style={styles.toolbarButton}
            onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
          >
            <span style={styles.toolbarIcon}>+</span>
            <span>Nuevo</span>
            <span style={styles.toolbarBold}>Alojamiento</span>
          </button>
          <button
            style={styles.toolbarButton}
            onClick={() => {
              setSearchTerm("");
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
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={styles.checkbox}
            />
            Mostrar desactivados
          </label>
        </div>

        {/* Lista de alojamientos como cards */}
        {accommodations.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏠</span>
            <h3 style={styles.emptyTitle}>No hay alojamientos</h3>
            <p style={styles.emptyText}>
              {searchTerm
                ? "No se encontraron alojamientos con los filtros aplicados"
                : "Crea tu primer alojamiento para empezar"}
            </p>
            {!searchTerm && (
              <button
                style={styles.primaryButton}
                onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
              >
                + Añadir Alojamiento
              </button>
            )}
          </div>
        ) : (
          <div style={styles.accommodationsGrid}>
            {accommodations.map((acc) => {
              const stats = getAccommodationStats(acc.id);
              const occupancyRate = stats.total > 0
                ? Math.round((stats.occupied / stats.total) * 100)
                : 0;

              return (
                <div key={acc.id} style={styles.accommodationCard}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.accName}>{acc.name}</h3>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: `${getStatusColor(acc.status)}15`,
                        color: getStatusColor(acc.status),
                      }}
                    >
                      {getStatusLabel(acc.status)}
                    </span>
                  </div>

                  <p style={styles.accAddress}>
                    {acc.address_line1}, {acc.postal_code} {acc.city}
                  </p>

                  {/* Estadísticas de habitaciones */}
                  <div style={styles.roomStats}>
                    <div style={styles.roomStatItem}>
                      <span style={styles.roomStatValue}>{stats.total}</span>
                      <span style={styles.roomStatLabel}>Total</span>
                    </div>
                    <div style={styles.roomStatItem}>
                      <span style={{ ...styles.roomStatValue, color: getRoomStatusColor(ROOM_STATUS.OCCUPIED) }}>
                        {stats.occupied}
                      </span>
                      <span style={styles.roomStatLabel}>Ocupadas</span>
                    </div>
                    <div style={styles.roomStatItem}>
                      <span style={{ ...styles.roomStatValue, color: getRoomStatusColor(ROOM_STATUS.FREE) }}>
                        {stats.free}
                      </span>
                      <span style={styles.roomStatLabel}>Libres</span>
                    </div>
                    <div style={styles.roomStatItem}>
                      <span style={{ ...styles.roomStatValue, color: getRoomStatusColor(ROOM_STATUS.PENDING_CHECKOUT) }}>
                        {stats.pending}
                      </span>
                      <span style={styles.roomStatLabel}>Pendientes</span>
                    </div>
                  </div>

                  {/* Barra de ocupación */}
                  <div style={styles.occupancyBar}>
                    <div style={styles.occupancyLabel}>
                      <span>Ocupación</span>
                      <span style={styles.occupancyPercentage}>{occupancyRate}%</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${occupancyRate}%`,
                          backgroundColor: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626",
                        }}
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={styles.cardActions}>
                    <button
                      style={styles.actionButton}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}`)}
                    >
                      Ver Detalle
                    </button>
                    <button
                      style={styles.actionButtonSecondary}
                      onClick={() => navigate(`/v2/admin/alojamientos/${acc.id}/editar`)}
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    gap: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    maxWidth: 400,
    padding: "10px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
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
  accommodationsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 20,
  },
  accommodationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    transition: "box-shadow 0.2s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  accName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  accAddress: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 20px 0",
  },
  roomStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 16,
  },
  roomStatItem: {
    textAlign: "center",
  },
  roomStatValue: {
    display: "block",
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  roomStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  occupancyBar: {
    marginBottom: 20,
  },
  occupancyLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  occupancyPercentage: {
    fontWeight: "600",
    color: "#111827",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },
  cardActions: {
    display: "flex",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  actionButtonSecondary: {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    padding: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
