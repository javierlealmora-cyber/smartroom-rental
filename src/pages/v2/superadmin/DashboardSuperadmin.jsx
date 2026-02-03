// src/pages/v2/superadmin/DashboardSuperadmin.jsx
// Dashboard principal para Superadmin (SmartRent Systems)
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockClientAccounts,
  mockAccommodations,
  mockTenants,
  PLANS,
  STATUS,
  getPlanLabel,
  getPlanColor,
  getStatusLabel,
  getStatusColor,
  formatDate,
} from "../../../mocks/clientAccountsData";

export default function DashboardSuperadmin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    suspendedAccounts: 0,
    totalAccommodations: 0,
    totalRooms: 0,
    occupiedRooms: 0,
  });
  const [recentAccounts, setRecentAccounts] = useState([]);

  useEffect(() => {
    // Calcular estadísticas desde datos mock
    const active = mockClientAccounts.filter((ca) => ca.status === STATUS.ACTIVE).length;
    const suspended = mockClientAccounts.filter((ca) => ca.status === STATUS.SUSPENDED).length;

    const totalAccommodations = mockAccommodations.length;
    const totalRooms = mockClientAccounts.reduce((sum, ca) => sum + (ca.stats?.total_rooms || 0), 0);
    const occupiedRooms = mockClientAccounts.reduce((sum, ca) => sum + (ca.stats?.occupied_rooms || 0), 0);

    setStats({
      totalAccounts: mockClientAccounts.length,
      activeAccounts: active,
      suspendedAccounts: suspended,
      totalAccommodations,
      totalRooms,
      occupiedRooms,
    });

    // Últimas 5 cuentas por fecha de creación
    const sorted = [...mockClientAccounts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    setRecentAccounts(sorted);
  }, []);

  const occupancyRate = stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Superadmin</h1>
          <p style={styles.subtitle}>Panel de control de SmartRent Systems</p>
        </div>
        <button
          style={styles.primaryButton}
          onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Nueva Cuenta Cliente
        </button>
      </div>

      {/* KPIs principales */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiIcon}>🏢</div>
          <div style={styles.kpiContent}>
            <div style={styles.kpiValue}>{stats.totalAccounts}</div>
            <div style={styles.kpiLabel}>Cuentas Cliente</div>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeftColor: "#059669" }}>
          <div style={styles.kpiIcon}>✓</div>
          <div style={styles.kpiContent}>
            <div style={{ ...styles.kpiValue, color: "#059669" }}>{stats.activeAccounts}</div>
            <div style={styles.kpiLabel}>Activas</div>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeftColor: "#F59E0B" }}>
          <div style={styles.kpiIcon}>⚠</div>
          <div style={styles.kpiContent}>
            <div style={{ ...styles.kpiValue, color: "#F59E0B" }}>{stats.suspendedAccounts}</div>
            <div style={styles.kpiLabel}>Suspendidas</div>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeftColor: "#3B82F6" }}>
          <div style={styles.kpiIcon}>🏠</div>
          <div style={styles.kpiContent}>
            <div style={{ ...styles.kpiValue, color: "#3B82F6" }}>{stats.totalAccommodations}</div>
            <div style={styles.kpiLabel}>Alojamientos</div>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeftColor: "#8B5CF6" }}>
          <div style={styles.kpiIcon}>🚪</div>
          <div style={styles.kpiContent}>
            <div style={{ ...styles.kpiValue, color: "#8B5CF6" }}>{stats.totalRooms}</div>
            <div style={styles.kpiLabel}>Habitaciones</div>
          </div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeftColor: "#EC4899" }}>
          <div style={styles.kpiIcon}>📊</div>
          <div style={styles.kpiContent}>
            <div style={{ ...styles.kpiValue, color: "#EC4899" }}>{occupancyRate}%</div>
            <div style={styles.kpiLabel}>Ocupación Global</div>
          </div>
        </div>
      </div>

      {/* Distribución por plan */}
      <div style={styles.sectionGrid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Distribución por Plan</h2>
          <div style={styles.plansList}>
            {Object.values(PLANS).map((plan) => {
              const count = mockClientAccounts.filter((ca) => ca.plan === plan).length;
              const percentage = stats.totalAccounts > 0
                ? Math.round((count / stats.totalAccounts) * 100)
                : 0;
              return (
                <div key={plan} style={styles.planRow}>
                  <div style={styles.planInfo}>
                    <span
                      style={{
                        ...styles.planBadge,
                        backgroundColor: getPlanColor(plan),
                      }}
                    >
                      {getPlanLabel(plan)}
                    </span>
                    <span style={styles.planCount}>{count} cuentas</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${percentage}%`,
                        backgroundColor: getPlanColor(plan),
                      }}
                    />
                  </div>
                  <span style={styles.planPercentage}>{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Accesos Rápidos</h2>
          <div style={styles.quickActions}>
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/cuentas")}
            >
              <span style={styles.actionIcon}>📋</span>
              <span>Ver Todas las Cuentas</span>
            </button>
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
            >
              <span style={styles.actionIcon}>➕</span>
              <span>Crear Cuenta Cliente</span>
            </button>
            <button
              style={styles.actionButton}
              onClick={() => alert("Gestión de planes (próximamente)")}
            >
              <span style={styles.actionIcon}>💳</span>
              <span>Gestión de Planes</span>
            </button>
            <button
              style={styles.actionButton}
              onClick={() => alert("Configuración global (próximamente)")}
            >
              <span style={styles.actionIcon}>⚙️</span>
              <span>Configuración Global</span>
            </button>
          </div>
        </div>
      </div>

      {/* Últimas cuentas cliente */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Últimas Cuentas Cliente</h2>
          <button
            style={styles.linkButton}
            onClick={() => navigate("/v2/superadmin/cuentas")}
          >
            Ver todas →
          </button>
        </div>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Alojamientos</th>
                <th style={styles.th}>Habitaciones</th>
                <th style={styles.th}>Ocupación</th>
                <th style={styles.th}>Fecha Alta</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentAccounts.map((account) => {
                const occRate = account.stats?.total_rooms > 0
                  ? Math.round((account.stats.occupied_rooms / account.stats.total_rooms) * 100)
                  : 0;
                return (
                  <tr key={account.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.accountName}>
                        {account.logo_url ? (
                          <img src={account.logo_url} alt="" style={styles.accountLogo} />
                        ) : (
                          <div
                            style={{
                              ...styles.accountLogoPlaceholder,
                              backgroundColor: account.theme_primary_color || "#6B7280",
                            }}
                          >
                            {account.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={styles.accountNameText}>{account.name}</div>
                          <div style={styles.accountSlug}>{account.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: `${getPlanColor(account.plan)}20`,
                          color: getPlanColor(account.plan),
                        }}
                      >
                        {getPlanLabel(account.plan)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: `${getStatusColor(account.status)}20`,
                          color: getStatusColor(account.status),
                        }}
                      >
                        {getStatusLabel(account.status)}
                      </span>
                    </td>
                    <td style={styles.td}>{account.stats?.total_accommodations || 0}</td>
                    <td style={styles.td}>{account.stats?.total_rooms || 0}</td>
                    <td style={styles.td}>
                      <div style={styles.miniProgressContainer}>
                        <div style={styles.miniProgressBar}>
                          <div
                            style={{
                              ...styles.miniProgressFill,
                              width: `${occRate}%`,
                              backgroundColor: occRate > 80 ? "#059669" : occRate > 50 ? "#F59E0B" : "#DC2626",
                            }}
                          />
                        </div>
                        <span style={styles.miniProgressText}>{occRate}%</span>
                      </div>
                    </td>
                    <td style={styles.td}>{formatDate(account.created_at)}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.actionLink}
                        onClick={() => navigate(`/v2/superadmin/cuentas/${account.id}`)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
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
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    borderLeft: "4px solid #111827",
  },
  kpiIcon: {
    fontSize: 28,
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  kpiContent: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  kpiLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  linkButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  plansList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  planRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  planInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 140,
  },
  planBadge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  planCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  progressBar: {
    flex: 1,
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
  planPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 40,
    textAlign: "right",
  },
  quickActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  actionIcon: {
    fontSize: 20,
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
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    borderBottom: "1px solid #E5E7EB",
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "16px",
    fontSize: 14,
    color: "#374151",
  },
  accountName: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  accountLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    objectFit: "cover",
  },
  accountLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  accountNameText: {
    fontWeight: "600",
    color: "#111827",
  },
  accountSlug: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  miniProgressContainer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  miniProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  miniProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  actionLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
};
