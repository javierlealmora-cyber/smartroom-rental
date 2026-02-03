// src/pages/v2/student/StudentDashboard.jsx
// Dashboard principal para Estudiante/Inquilino
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockTenants,
  mockConsumptionData,
  mockBulletins,
  mockSurveys,
  mockTickets,
  formatCurrency,
  formatDate,
} from "../../../mocks/clientAccountsData";

// Simular inquilino actual (tenant-001 para demo)
const CURRENT_TENANT_ID = "tenant-001";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [consumptionData, setConsumptionData] = useState(null);
  const [bulletins, setBulletins] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    // Cargar datos del inquilino actual
    const t = mockTenants.find((t) => t.id === CURRENT_TENANT_ID);
    setTenant(t);

    // Cargar datos de consumo
    setConsumptionData(mockConsumptionData);

    // Cargar boletines
    const b = mockBulletins.filter((b) => b.tenant_id === CURRENT_TENANT_ID);
    setBulletins(b);

    // Cargar encuestas activas
    const s = mockSurveys.filter((s) => s.status === "active");
    setSurveys(s);

    // Cargar tickets del usuario
    const tk = mockTickets.filter((t) => t.tenant_id === CURRENT_TENANT_ID);
    setTickets(tk);
  }, []);

  if (!tenant) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Cargando...</div>
      </div>
    );
  }

  const pendingSurveys = surveys.length;
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <div style={styles.container}>
      {/* Header de bienvenida */}
      <div style={styles.welcomeCard}>
        <div style={styles.welcomeContent}>
          <div style={styles.avatar}>
            {tenant.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={styles.welcomeTitle}>
              Hola, {tenant.full_name.split(" ")[0]}
            </h1>
            <p style={styles.welcomeSubtitle}>
              {tenant.current_accommodation} · Habitación {tenant.current_room}
            </p>
          </div>
        </div>
        <div style={styles.welcomeActions}>
          <button
            style={styles.profileButton}
            onClick={() => navigate("/v2/student/perfil")}
          >
            Mi Perfil
          </button>
        </div>
      </div>

      {/* Navegación rápida */}
      <div style={styles.quickNav}>
        <button
          style={{
            ...styles.quickNavItem,
            ...(true ? styles.quickNavItemActive : {}),
          }}
          onClick={() => {}}
        >
          <span style={styles.quickNavIcon}>🏠</span>
          Inicio
        </button>
        <button
          style={styles.quickNavItem}
          onClick={() => navigate("/v2/student/consumo")}
        >
          <span style={styles.quickNavIcon}>⚡</span>
          Mi Consumo
        </button>
        <button
          style={styles.quickNavItem}
          onClick={() => navigate("/v2/student/boletines")}
        >
          <span style={styles.quickNavIcon}>📄</span>
          Boletines
        </button>
        <button
          style={styles.quickNavItem}
          onClick={() => navigate("/v2/student/servicios")}
        >
          <span style={styles.quickNavIcon}>🛎️</span>
          Servicios
        </button>
        <button
          style={styles.quickNavItem}
          onClick={() => navigate("/v2/student/encuestas")}
        >
          <span style={styles.quickNavIcon}>📋</span>
          Encuestas
          {pendingSurveys > 0 && (
            <span style={styles.badge}>{pendingSurveys}</span>
          )}
        </button>
        <button
          style={styles.quickNavItem}
          onClick={() => navigate("/v2/student/incidencias")}
        >
          <span style={styles.quickNavIcon}>🎫</span>
          Incidencias
          {openTickets > 0 && (
            <span style={styles.badge}>{openTickets}</span>
          )}
        </button>
      </div>

      <div style={styles.mainGrid}>
        {/* Mi Habitación */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Mi Habitación</h2>
          <div style={styles.roomInfo}>
            <div style={styles.roomDetail}>
              <span style={styles.roomLabel}>Alojamiento</span>
              <span style={styles.roomValue}>{tenant.current_accommodation}</span>
            </div>
            <div style={styles.roomDetail}>
              <span style={styles.roomLabel}>Habitación</span>
              <span style={styles.roomValueLarge}>
                {tenant.current_room}
              </span>
            </div>
            <div style={styles.roomDetail}>
              <span style={styles.roomLabel}>Fecha de entrada</span>
              <span style={styles.roomValue}>{formatDate(tenant.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Mi Consumo (OBLIGATORIO) */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Mi Consumo</h2>
            <button
              style={styles.cardLink}
              onClick={() => navigate("/v2/student/consumo")}
            >
              Ver todo →
            </button>
          </div>

          {consumptionData && (
            <>
              {/* Resumen del mes */}
              <div style={styles.consumptionSummary}>
                <div style={styles.consumptionStat}>
                  <span style={styles.consumptionValue}>
                    {consumptionData.monthly_summary.total_kwh.toFixed(1)}
                  </span>
                  <span style={styles.consumptionUnit}>kWh</span>
                  <span style={styles.consumptionLabel}>Este mes</span>
                </div>
                <div style={styles.consumptionStat}>
                  <span style={styles.consumptionValue}>
                    {formatCurrency(consumptionData.monthly_summary.total_cost)}
                  </span>
                  <span style={styles.consumptionLabel}>Coste estimado</span>
                </div>
                <div style={styles.consumptionStat}>
                  <span style={styles.consumptionValue}>
                    {consumptionData.monthly_summary.avg_daily_kwh.toFixed(1)}
                  </span>
                  <span style={styles.consumptionUnit}>kWh/día</span>
                  <span style={styles.consumptionLabel}>Media diaria</span>
                </div>
              </div>

              {/* Gráfica simplificada de los últimos 7 días */}
              <div style={styles.miniChart}>
                <div style={styles.chartBars}>
                  {consumptionData.daily.slice(-7).map((day, idx) => {
                    const maxKwh = Math.max(...consumptionData.daily.slice(-7).map((d) => d.kwh));
                    const height = (day.kwh / maxKwh) * 100;
                    return (
                      <div key={idx} style={styles.chartBarContainer}>
                        <div
                          style={{
                            ...styles.chartBar,
                            height: `${height}%`,
                          }}
                          title={`${day.date}: ${day.kwh} kWh (${formatCurrency(day.cost)})`}
                        />
                        <span style={styles.chartLabel}>
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <span style={styles.chartCaption}>Últimos 7 días (kWh)</span>
              </div>

              {/* Consejos */}
              <div style={styles.tipsBox}>
                <span style={styles.tipsIcon}>💡</span>
                <span style={styles.tipsText}>
                  Tu consumo está dentro del promedio. Apaga las luces al salir para ahorrar
                  aún más.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={styles.secondaryGrid}>
        {/* Últimos boletines */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Mis Boletines</h2>
            <button
              style={styles.cardLink}
              onClick={() => navigate("/v2/student/boletines")}
            >
              Ver todos →
            </button>
          </div>
          {bulletins.length > 0 ? (
            <div style={styles.bulletinsList}>
              {bulletins.slice(0, 3).map((bulletin) => (
                <div key={bulletin.id} style={styles.bulletinItem}>
                  <div style={styles.bulletinInfo}>
                    <span style={styles.bulletinPeriod}>
                      {formatDate(bulletin.period_start)} -{" "}
                      {formatDate(bulletin.period_end)}
                    </span>
                    <span style={styles.bulletinCost}>
                      {formatCurrency(bulletin.total_cost)}
                    </span>
                  </div>
                  <button style={styles.downloadButton}>
                    📥 PDF
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyText}>No hay boletines disponibles</p>
          )}
        </div>

        {/* Encuestas pendientes */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Encuestas</h2>
            <button
              style={styles.cardLink}
              onClick={() => navigate("/v2/student/encuestas")}
            >
              Ver todas →
            </button>
          </div>
          {surveys.length > 0 ? (
            <div style={styles.surveysList}>
              {surveys.map((survey) => (
                <div key={survey.id} style={styles.surveyItem}>
                  <div style={styles.surveyInfo}>
                    <span style={styles.surveyTitle}>{survey.title}</span>
                    <span style={styles.surveyDue}>
                      Vence: {formatDate(survey.due_date)}
                    </span>
                  </div>
                  <button
                    style={styles.respondButton}
                    onClick={() => navigate(`/v2/student/encuestas/${survey.id}`)}
                  >
                    Responder
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.successBox}>
              <span style={styles.successIcon}>✓</span>
              <span style={styles.successText}>No tienes encuestas pendientes</span>
            </div>
          )}
        </div>

        {/* Incidencias recientes */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Mis Incidencias</h2>
            <button
              style={styles.cardLink}
              onClick={() => navigate("/v2/student/incidencias")}
            >
              Ver todas →
            </button>
          </div>
          {tickets.length > 0 ? (
            <div style={styles.ticketsList}>
              {tickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} style={styles.ticketItem}>
                  <div style={styles.ticketInfo}>
                    <span style={styles.ticketSubject}>{ticket.subject}</span>
                    <span style={styles.ticketDate}>
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.ticketStatus,
                      backgroundColor:
                        ticket.status === "resolved"
                          ? "#D1FAE5"
                          : ticket.status === "open"
                          ? "#FEE2E2"
                          : "#FEF3C7",
                      color:
                        ticket.status === "resolved"
                          ? "#065F46"
                          : ticket.status === "open"
                          ? "#991B1B"
                          : "#92400E",
                    }}
                  >
                    {ticket.status === "resolved"
                      ? "Resuelto"
                      : ticket.status === "open"
                      ? "Abierto"
                      : "En proceso"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.emptyText}>No tienes incidencias registradas</p>
          )}
          <button
            style={styles.createTicketButton}
            onClick={() => navigate("/v2/student/incidencias/nueva")}
          >
            + Crear Incidencia
          </button>
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
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#6B7280",
  },
  welcomeCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    color: "#FFFFFF",
  },
  welcomeContent: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: "700",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    margin: 0,
  },
  welcomeSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  welcomeActions: {},
  profileButton: {
    padding: "10px 20px",
    backgroundColor: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },
  quickNav: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    overflowX: "auto",
    paddingBottom: 4,
  },
  quickNavItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
    position: "relative",
  },
  quickNavItemActive: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    borderColor: "#111827",
  },
  quickNavIcon: {
    fontSize: 18,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: 10,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 24,
    marginBottom: 24,
  },
  secondaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  cardLink: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
  roomInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  roomDetail: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  roomLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
  },
  roomValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  roomValueLarge: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  consumptionSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  consumptionStat: {
    textAlign: "center",
  },
  consumptionValue: {
    display: "block",
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  consumptionUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 2,
  },
  consumptionLabel: {
    display: "block",
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  miniChart: {
    marginBottom: 20,
  },
  chartBars: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
    gap: 8,
  },
  chartBarContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: "4px 4px 0 0",
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  chartCaption: {
    display: "block",
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  tipsBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    fontSize: 13,
    color: "#92400E",
  },
  tipsIcon: {
    fontSize: 18,
  },
  tipsText: {},
  bulletinsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  bulletinItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  bulletinInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  bulletinPeriod: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  bulletinCost: {
    fontSize: 12,
    color: "#6B7280",
  },
  downloadButton: {
    padding: "6px 12px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    color: "#374151",
  },
  surveysList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  surveyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  surveyInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  surveyTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  surveyDue: {
    fontSize: 12,
    color: "#6B7280",
  },
  respondButton: {
    padding: "6px 12px",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
    cursor: "pointer",
    color: "#FFFFFF",
  },
  successBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    fontSize: 13,
    color: "#065F46",
  },
  successIcon: {
    fontSize: 18,
  },
  successText: {},
  ticketsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  ticketItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  ticketInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  ticketDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  ticketStatus: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: "500",
  },
  createTicketButton: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "500",
    cursor: "pointer",
    color: "#374151",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 24,
  },
};
