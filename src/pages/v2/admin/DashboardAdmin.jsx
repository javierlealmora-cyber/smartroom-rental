// src/pages/v2/admin/DashboardAdmin.jsx
// Dashboard principal para Admin de empresa
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import {
  mockAccommodations,
  mockRooms,
  mockTenants,
  ROOM_STATUS,
  TENANT_STATUS,
  getRoomStatusLabel,
  getRoomStatusColor,
  formatCurrency,
} from "../../../mocks/clientAccountsData";

// Simular cliente activo (ca-001 para demo)
const CURRENT_CLIENT_ACCOUNT_ID = "ca-001";

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAccommodations: 0,
    totalRooms: 0,
    freeRooms: 0,
    occupiedRooms: 0,
    pendingCheckout: 0,
    activeTenants: 0,
    pendingTenants: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Filtrar datos por el cliente actual
    const accommodations = mockAccommodations.filter(
      (a) => a.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
    );
    const rooms = mockRooms.filter(
      (r) => r.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
    );
    const tenants = mockTenants.filter(
      (t) => t.client_account_id === CURRENT_CLIENT_ACCOUNT_ID
    );

    const free = rooms.filter((r) => r.status === ROOM_STATUS.FREE).length;
    const occupied = rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length;
    const pending = rooms.filter((r) => r.status === ROOM_STATUS.PENDING_CHECKOUT).length;
    const activeTenants = tenants.filter((t) => t.status === TENANT_STATUS.ACTIVE).length;
    const pendingTenants = tenants.filter(
      (t) => t.status === TENANT_STATUS.PENDING_CHECKOUT
    ).length;

    setStats({
      totalAccommodations: accommodations.length,
      totalRooms: rooms.length,
      freeRooms: free,
      occupiedRooms: occupied,
      pendingCheckout: pending,
      activeTenants,
      pendingTenants,
    });

    // Simular actividad reciente
    setRecentActivity([
      {
        id: 1,
        type: "check_in",
        message: "Ana García se ha registrado en la habitación 101",
        time: "Hace 2 horas",
      },
      {
        id: 2,
        type: "check_out",
        message: "Pedro Sánchez ha programado su salida para el 31/01",
        time: "Hace 5 horas",
      },
      {
        id: 3,
        type: "payment",
        message: "Pago de renta recibido de Carlos Martín",
        time: "Ayer",
      },
      {
        id: 4,
        type: "maintenance",
        message: "Ticket de mantenimiento creado: Calefacción hab. 101",
        time: "Ayer",
      },
    ]);
  }, []);

  const sidebarItems = [
    { label: "Visión General", path: "/v2/admin", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTOS" },
    { label: "Gestión de Alojamientos", path: "/v2/admin/alojamientos", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/v2/admin/inquilinos", icon: "👥", isSubItem: true },
    { label: "Historial de Ocupación", path: "/v2/admin/ocupacion", icon: "⏱", isSubItem: true },
    { type: "section", label: "CONFIGURACIÓN" },
    { label: "Empresas Fiscales", path: "/v2/admin/fiscales", icon: "📋", isSubItem: true },
    { label: "Ajustes", path: "/v2/admin/ajustes", icon: "⚙️", isSubItem: true },
  ];

  const occupancyRate = stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  const getActivityIcon = (type) => {
    switch (type) {
      case "check_in": return "✅";
      case "check_out": return "🚪";
      case "payment": return "💰";
      case "maintenance": return "🔧";
      default: return "📌";
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Dashboard" />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Resumen de tu operación</p>
          </div>
          <div style={styles.headerActions}>
            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
            >
              + Nuevo Inquilino
            </button>
            <button
              style={styles.primaryButton}
              onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
            >
              + Nuevo Alojamiento
            </button>
          </div>
        </div>

        {/* KPIs principales */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>🏠</span>
              <span style={styles.kpiLabel}>Alojamientos</span>
            </div>
            <div style={styles.kpiValue}>{stats.totalAccommodations}</div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>🚪</span>
              <span style={styles.kpiLabel}>Habitaciones</span>
            </div>
            <div style={styles.kpiValue}>{stats.totalRooms}</div>
            <div style={styles.kpiDetail}>
              <span style={{ color: "#059669" }}>{stats.occupiedRooms} ocupadas</span>
              <span style={{ color: "#6B7280" }}> · </span>
              <span style={{ color: "#3B82F6" }}>{stats.freeRooms} libres</span>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>📊</span>
              <span style={styles.kpiLabel}>Ocupación</span>
            </div>
            <div style={styles.kpiValue}>
              <span
                style={{
                  color: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626",
                }}
              >
                {occupancyRate}%
              </span>
            </div>
            <div style={styles.progressBarLarge}>
              <div
                style={{
                  ...styles.progressFillLarge,
                  width: `${occupancyRate}%`,
                  backgroundColor: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626",
                }}
              />
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>👥</span>
              <span style={styles.kpiLabel}>Inquilinos</span>
            </div>
            <div style={styles.kpiValue}>{stats.activeTenants}</div>
            {stats.pendingTenants > 0 && (
              <div style={styles.kpiWarning}>
                ⚠️ {stats.pendingTenants} pendiente(s) de baja
              </div>
            )}
          </div>
        </div>

        {/* Contenido en dos columnas */}
        <div style={styles.twoColumnGrid}>
          {/* Estado de habitaciones */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Estado de Habitaciones</h2>
            <div style={styles.roomStatusGrid}>
              <div style={styles.statusItem}>
                <div
                  style={{
                    ...styles.statusDot,
                    backgroundColor: getRoomStatusColor(ROOM_STATUS.FREE),
                  }}
                />
                <div style={styles.statusInfo}>
                  <span style={styles.statusLabel}>Libres</span>
                  <span style={styles.statusValue}>{stats.freeRooms}</span>
                </div>
              </div>
              <div style={styles.statusItem}>
                <div
                  style={{
                    ...styles.statusDot,
                    backgroundColor: getRoomStatusColor(ROOM_STATUS.OCCUPIED),
                  }}
                />
                <div style={styles.statusInfo}>
                  <span style={styles.statusLabel}>Ocupadas</span>
                  <span style={styles.statusValue}>{stats.occupiedRooms}</span>
                </div>
              </div>
              <div style={styles.statusItem}>
                <div
                  style={{
                    ...styles.statusDot,
                    backgroundColor: getRoomStatusColor(ROOM_STATUS.PENDING_CHECKOUT),
                  }}
                />
                <div style={styles.statusInfo}>
                  <span style={styles.statusLabel}>Pendiente de baja</span>
                  <span style={styles.statusValue}>{stats.pendingCheckout}</span>
                </div>
              </div>
            </div>
            <button
              style={styles.cardLink}
              onClick={() => navigate("/v2/admin/alojamientos")}
            >
              Ver todos los alojamientos →
            </button>
          </div>

          {/* Actividad reciente */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Actividad Reciente</h2>
            <div style={styles.activityList}>
              {recentActivity.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                  <div style={styles.activityContent}>
                    <span style={styles.activityMessage}>{activity.message}</span>
                    <span style={styles.activityTime}>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Acciones Rápidas</h2>
          <div style={styles.quickActionsGrid}>
            <button
              style={styles.quickAction}
              onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
            >
              <span style={styles.quickActionIcon}>👤</span>
              <span style={styles.quickActionLabel}>Registrar Inquilino</span>
            </button>
            <button
              style={styles.quickAction}
              onClick={() => navigate("/v2/admin/alojamientos/nuevo")}
            >
              <span style={styles.quickActionIcon}>🏠</span>
              <span style={styles.quickActionLabel}>Añadir Alojamiento</span>
            </button>
            <button
              style={styles.quickAction}
              onClick={() => alert("Generar boletín (próximamente)")}
            >
              <span style={styles.quickActionIcon}>📄</span>
              <span style={styles.quickActionLabel}>Generar Boletín</span>
            </button>
            <button
              style={styles.quickAction}
              onClick={() => alert("Ver consumos (próximamente)")}
            >
              <span style={styles.quickActionIcon}>⚡</span>
              <span style={styles.quickActionLabel}>Ver Consumos</span>
            </button>
            <button
              style={styles.quickAction}
              onClick={() => navigate("/v2/admin/ocupacion")}
            >
              <span style={styles.quickActionIcon}>📅</span>
              <span style={styles.quickActionLabel}>Ver Ocupación</span>
            </button>
            <button
              style={styles.quickAction}
              onClick={() => alert("Gestión de tickets (próximamente)")}
            >
              <span style={styles.quickActionIcon}>🎫</span>
              <span style={styles.quickActionLabel}>Tickets</span>
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
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    padding: 32,
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
  headerActions: {
    display: "flex",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20,
    marginBottom: 32,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  kpiHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  kpiIcon: {
    fontSize: 20,
  },
  kpiLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  kpiDetail: {
    fontSize: 13,
    marginTop: 8,
  },
  kpiWarning: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  progressBarLarge: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 12,
  },
  progressFillLarge: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 20px 0",
  },
  roomStatusGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginBottom: 20,
  },
  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  statusInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: "#374151",
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cardLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  activityItem: {
    display: "flex",
    gap: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  activityIcon: {
    fontSize: 18,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  activityContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  activityMessage: {
    fontSize: 14,
    color: "#374151",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 12,
  },
  quickAction: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 20,
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
};
