// =============================================================================
// src/pages/v2/superadmin/DashboardSuperadmin.jsx
// =============================================================================
// DBSU - Dashboard Superadmin (SmartRoom Rental Platform)
// Pantalla principal del Dashboard para el rol Superadmin
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import { supabase } from "../../../services/supabaseClient";

const PLAN_COLORS_MAP = {
  basic: "#6B7280",
  agent: "#3B82F6",
  pro: "#8B5CF6",
  enterprise: "#F59E0B",
};
const PLAN_LABELS_MAP = {
  basic: "Basic",
  agent: "Agent",
  pro: "Pro",
  enterprise: "Enterprise",
};
const getPlanLabel = (p) => PLAN_LABELS_MAP[p] || p || "—";
const getPlanColor = (p) => PLAN_COLORS_MAP[p] || "#6B7280";
const getStatusLabel = (s) => ({ active: "Activa", suspended: "Suspendida", cancelled: "Cancelada", trial: "Prueba" }[s] || s);
const getStatusColor = (s) => ({ active: "#059669", suspended: "#F59E0B", cancelled: "#DC2626", trial: "#3B82F6" }[s] || "#6B7280");
const formatDate = (d) => d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const ACTION_LABELS = {
  create: { label: "Creado", color: "#34C759", icon: "+" },
  update: { label: "Actualizado", color: "#0071E3", icon: "✎" },
  delete: { label: "Eliminado", color: "#FF3B30", icon: "✕" },
  set_status: { label: "Estado cambiado", color: "#FF9500", icon: "◉" },
  set_room_status: { label: "Hab. actualizada", color: "#FF9500", icon: "🚪" },
};
const ENTITY_LABELS = {
  accommodation: "Alojamiento", room: "Habitación", lodger: "Inquilino",
  entity: "Entidad", service: "Servicio", energy_bill: "Factura", bulletin: "Boletín",
};
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Ayer" : `Hace ${days} días`;
}

export default function DashboardSuperadmin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAccounts: 0, activeAccounts: 0, suspendedAccounts: 0, cancelledAccounts: 0,
    totalEntities: 0, totalAccommodations: 0, totalRooms: 0, occupiedRooms: 0, freeRooms: 0,
    totalLodgers: 0, activeLodgers: 0,
  });
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: accounts },
        { data: entities },
        { data: accommodations },
        { data: rooms },
        { data: lodgers },
        { data: auditLog },
      ] = await Promise.all([
        supabase.from("client_accounts").select("id, name, slug, plan_code, billing_cycle, status, start_date, created_at, contact_email").order("created_at", { ascending: false }),
        supabase.from("entities").select("id, client_account_id, type, status"),
        supabase.from("accommodations").select("id, status"),
        supabase.from("rooms").select("id, status"),
        supabase.from("lodgers").select("id, status"),
        supabase.from("audit_log").select("id, entity_type, action, actor_role, new_values, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const allAccounts = accounts || [];
      const allEntities = entities || [];
      const allRooms = rooms || [];
      const allLodgers = lodgers || [];

      const activeAccounts = allAccounts.filter((a) => a.status === "active").length;
      const suspendedAccounts = allAccounts.filter((a) => a.status === "suspended").length;
      const cancelledAccounts = allAccounts.filter((a) => a.status === "cancelled").length;
      const occupiedRooms = allRooms.filter((r) => r.status === "occupied").length;
      const freeRooms = allRooms.filter((r) => r.status === "free").length;

      setStats({
        totalAccounts: allAccounts.length,
        activeAccounts,
        suspendedAccounts,
        cancelledAccounts,
        totalEntities: allEntities.length,
        totalAccommodations: (accommodations || []).length,
        totalRooms: allRooms.length,
        occupiedRooms,
        freeRooms,
        totalLodgers: allLodgers.length,
        activeLodgers: allLodgers.filter((l) => l.status === "active").length,
      });

      // Distribución por plan
      const planCodes = ["basic", "agent", "pro", "enterprise"];
      const distribution = planCodes.map((plan) => {
        const count = allAccounts.filter((a) => a.plan_code === plan).length;
        const percentage = allAccounts.length > 0 ? Math.round((count / allAccounts.length) * 100) : 0;
        return { plan, count, percentage };
      }).filter((d) => d.count > 0 || true);
      setPlanDistribution(distribution);

      // Últimas 5 cuentas
      const entitiesByAccountId = allEntities.reduce((acc, e) => {
        if (e.client_account_id) acc[e.client_account_id] = (acc[e.client_account_id] || 0) + 1;
        return acc;
      }, {});
      setRecentAccounts(allAccounts.slice(0, 5).map((a) => ({ ...a, __entitiesCount: entitiesByAccountId[a.id] || 0 })));

      setActivity(auditLog || []);
    } catch (err) {
      console.error("[DashboardSuperadmin] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const occupancyRate = stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
    : 0;

  return (
    <V2Layout role="superadmin" userName="Javier">
      {/* Header con título */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Superadmin</h1>
          <p style={styles.subtitle}>Visión general del sistema SaaS</p>
        </div>
      </div>

      {/* =========================================
          DBSU-K1: KPIs Grupo 1
          Nº Cuentas Cliente activas/inactivas, Nº Entidades totales, Nº Alojamientos totales
          ========================================= */}
      <div style={styles.kpiSection}>
        <h3 style={styles.sectionLabel}>KPIs Principales</h3>
        <div style={styles.kpiGrid}>
          {/* Total Cuentas Cliente */}
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>🏢</span>
              <span style={styles.kpiTitle}>Cuentas Cliente</span>
            </div>
            <div style={styles.kpiValue}>{stats.totalAccounts}</div>
            <div style={styles.kpiBreakdown}>
              <span style={{ ...styles.kpiBreakdownItem, color: "#059669" }}>
                {stats.activeAccounts} activas
              </span>
              <span style={styles.kpiBreakdownSeparator}>·</span>
              <span style={{ ...styles.kpiBreakdownItem, color: "#F59E0B" }}>
                {stats.suspendedAccounts} suspendidas
              </span>
            </div>
          </div>

          {/* Cuentas Activas */}
          <div style={{ ...styles.kpiCard, borderLeftColor: "#059669" }}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>✓</span>
              <span style={styles.kpiTitle}>Activas</span>
            </div>
            <div style={{ ...styles.kpiValue, color: "#059669" }}>{stats.activeAccounts}</div>
            <div style={styles.kpiSubtext}>
              {stats.totalAccounts > 0
                ? Math.round((stats.activeAccounts / stats.totalAccounts) * 100)
                : 0}% del total
            </div>
          </div>

          {/* Cuentas Inactivas (Suspendidas + Canceladas) */}
          <div style={{ ...styles.kpiCard, borderLeftColor: "#F59E0B" }}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>⚠</span>
              <span style={styles.kpiTitle}>Inactivas</span>
            </div>
            <div style={{ ...styles.kpiValue, color: "#F59E0B" }}>
              {stats.suspendedAccounts + stats.cancelledAccounts}
            </div>
            <div style={styles.kpiBreakdown}>
              <span style={styles.kpiBreakdownItem}>{stats.suspendedAccounts} suspendidas</span>
              <span style={styles.kpiBreakdownSeparator}>·</span>
              <span style={styles.kpiBreakdownItem}>{stats.cancelledAccounts} canceladas</span>
            </div>
          </div>

          {/* Total Entidades */}
          <div style={{ ...styles.kpiCard, borderLeftColor: "#8B5CF6" }}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>🏛️</span>
              <span style={styles.kpiTitle}>Entidades Totales</span>
            </div>
            <div style={{ ...styles.kpiValue, color: "#8B5CF6" }}>{stats.totalEntities}</div>
            <div style={styles.kpiSubtext}>Legal + Internas</div>
          </div>

          {/* Total Alojamientos */}
          <div style={{ ...styles.kpiCard, borderLeftColor: "#3B82F6" }}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiIcon}>🏠</span>
              <span style={styles.kpiTitle}>Alojamientos</span>
            </div>
            <div style={{ ...styles.kpiValue, color: "#3B82F6" }}>{stats.totalAccommodations}</div>
            <div style={styles.kpiSubtext}>En todas las cuentas</div>
          </div>
        </div>
      </div>

      {/* =========================================
          KPIs Grupo 2: Ocupación + Incidencias + Encuestas (2x2) + Actividad Reciente
          ========================================= */}
      <div style={styles.kpiSection}>
        <div style={styles.kpiGroupTwoLayout}>
          {/* Columna izquierda: 2x2 KPIs */}
          <div style={styles.kpiGridTwoByTwo}>
            {/* Habitaciones Totales */}
            <div>
              <h3 style={styles.sectionLabel}>Métricas de Ocupación</h3>
              <div style={{ ...styles.kpiCard, borderLeftColor: "#EC4899" }}>
                <div style={styles.kpiHeader}>
                  <span style={styles.kpiIcon}>🚪</span>
                  <span style={styles.kpiTitle}>Habitaciones Totales</span>
                </div>
                <div style={{ ...styles.kpiValue, color: "#EC4899" }}>{stats.totalRooms}</div>
                <div style={styles.kpiBreakdown}>
                  <span style={{ ...styles.kpiBreakdownItem, color: "#059669" }}>
                    {stats.occupiedRooms} ocupadas
                  </span>
                  <span style={styles.kpiBreakdownSeparator}>·</span>
                  <span style={{ ...styles.kpiBreakdownItem, color: "#3B82F6" }}>
                    {stats.totalRooms - stats.occupiedRooms} libres
                  </span>
                </div>
              </div>
            </div>

            {/* Ocupación Global */}
            <div>
              <h3 style={styles.sectionLabel}>Ocupación Global</h3>
              <div style={{ ...styles.kpiCard, borderLeftColor: "#10B981" }}>
                <div style={styles.kpiHeader}>
                  <span style={styles.kpiIcon}>📊</span>
                  <span style={styles.kpiTitle}>Ocupación actual</span>
                </div>
                <div style={{
                  ...styles.kpiValue,
                  color: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626"
                }}>
                  {occupancyRate}%
                </div>
                <div style={styles.occupancyBarLarge}>
                  <div
                    style={{
                      ...styles.occupancyFill,
                      width: `${occupancyRate}%`,
                      backgroundColor: occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#F59E0B" : "#DC2626"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Inquilinos */}
            <div>
              <h3 style={styles.sectionLabel}>Inquilinos</h3>
              <div style={{ ...styles.kpiCard, borderLeftColor: "#DC2626" }}>
                <div style={styles.kpiHeader}>
                  <span style={styles.kpiIcon}>👥</span>
                  <span style={styles.kpiTitle}>Inquilinos</span>
                </div>
                <div style={{ ...styles.kpiValue, color: "#DC2626" }}>
                  {stats.activeLodgers}
                </div>
                <div style={styles.kpiBreakdown}>
                  <span style={{ ...styles.kpiBreakdownItem, color: "#059669" }}>
                    {stats.activeLodgers} activos
                  </span>
                  <span style={styles.kpiBreakdownSeparator}>·</span>
                  <span style={styles.kpiBreakdownItem}>
                    {stats.totalLodgers} total
                  </span>
                </div>
              </div>
            </div>

            {/* Habitaciones libres */}
            <div>
              <h3 style={styles.sectionLabel}>Disponibilidad</h3>
              <div style={{ ...styles.kpiCard, borderLeftColor: "#6366F1" }}>
                <div style={styles.kpiHeader}>
                  <span style={styles.kpiIcon}>�</span>
                  <span style={styles.kpiTitle}>Habitaciones libres</span>
                </div>
                <div style={{ ...styles.kpiValue, color: "#6366F1" }}>
                  {stats.freeRooms}
                </div>
                <div style={styles.kpiBreakdown}>
                  <span style={styles.kpiBreakdownItem}>
                    de {stats.totalRooms} totales
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Actividad Reciente — datos reales de audit_log */}
          <div style={styles.activityCard}>
            <h2 style={styles.activityTitle}>Actividad Reciente</h2>
            <div style={styles.activityList}>
              {loading ? (
                <div style={{ color: "#9CA3AF", fontSize: 13, padding: "12px 0" }}>Cargando...</div>
              ) : activity.length === 0 ? (
                <div style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  Sin actividad registrada aún
                </div>
              ) : (
                activity.map((item) => {
                  const act = ACTION_LABELS[item.action] || { label: item.action, color: "#6B7280", icon: "·" };
                  const entityLabel = ENTITY_LABELS[item.entity_type] || item.entity_type;
                  const name = item.new_values?.name || item.new_values?.legal_name || item.new_values?.number || "";
                  return (
                    <div key={item.id} style={styles.activityItem}>
                      <div style={{ ...styles.activityDot, backgroundColor: act.color }}>
                        <span style={styles.activityDotIcon}>{act.icon}</span>
                      </div>
                      <div style={styles.activityContent}>
                        <span style={styles.activityText}>
                          <strong>{act.label}</strong> · {entityLabel}{name ? `: ${name}` : ""}
                        </span>
                        <span style={styles.activityTime}>
                          {item.actor_role} · {timeAgo(item.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección de dos columnas: Distribución + Accesos Rápidos */}
      <div style={styles.sectionGrid}>
        {/* =========================================
            DBSU-DP: Distribución por Plan (%)
            ========================================= */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Distribución por Plan</h2>
          <div style={styles.plansList}>
            {planDistribution.map(({ plan, count, percentage }) => (
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
            ))}
          </div>
        </div>

        {/* =========================================
            Accesos Rápidos (DBSU-VC, DBSU-CC, DBSU-AR, DBSU-PC, DBSU-CG, DBSU-GS, DBSU-GC, DBSU-GP)
            ========================================= */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Accesos Rápidos</h2>
          <div style={styles.quickActionsGrid}>
            {/* DBSU-VC: Ver todas las Cuentas Clientes */}
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/cuentas")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>👤</span>
              <span style={styles.actionLabel}>Ver Cuentas</span>
              <span style={styles.actionCode}>DBSU-VC</span>
            </button>

            {/* DBSU-CC: Crear Cuenta Cliente */}
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/cuentas/nueva")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>➕</span>
              <span style={styles.actionLabel}>Crear Cuenta</span>
              <span style={styles.actionCode}>DBSU-CC</span>
            </button>

            {/* DBSU-GE: Gestión de Encuestas */}
            <button
              style={styles.actionButton}
              onClick={() => alert("Gestión de Encuestas - En construcción")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>📋</span>
              <span style={styles.actionLabel}>Encuestas</span>
              <span style={styles.actionCode}>DBSU-GE</span>
            </button>

            {/* DBSU-PC: Gestión de Planes de Clientes */}
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/planes")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>💳</span>
              <span style={styles.actionLabel}>Gestión Planes</span>
              <span style={styles.actionCode}>DBSU-PC</span>
            </button>

            {/* DBSU-CG: Configuración Global */}
            <button
              style={styles.actionButton}
              onClick={() => alert("Configuración Global (próximamente)")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>⚙️</span>
              <span style={styles.actionLabel}>Config. Global</span>
              <span style={styles.actionCode}>DBSU-CG</span>
            </button>

            {/* DBSU-GS: Gestión de Servicios */}
            <button
              style={styles.actionButton}
              onClick={() => navigate("/v2/superadmin/servicios")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>🛎️</span>
              <span style={styles.actionLabel}>Servicios</span>
              <span style={styles.actionCode}>DBSU-GS</span>
            </button>

            {/* DBSU-GC: Gestión de Cobros */}
            <button
              style={styles.actionButton}
              onClick={() => alert("Gestión de Cobros (próximamente)")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>💰</span>
              <span style={styles.actionLabel}>Cobros</span>
              <span style={styles.actionCode}>DBSU-GC</span>
            </button>

            {/* DBSU-GP: Gestión de Incidencias */}
            <button
              style={styles.actionButton}
              onClick={() => alert("Gestión de Incidencias (próximamente)")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={styles.actionIcon}>🎫</span>
              <span style={styles.actionLabel}>Incidencias</span>
              <span style={styles.actionCode}>DBSU-GP</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          DBSU-UC: Últimas Cuentas Cliente
          Listado con las últimas cuentas de clientes
          ========================================= */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Últimas Cuentas Cliente</h2>
            <span style={styles.cardCode}>DBSU-UC</span>
          </div>
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
                <th style={styles.th}>Cuenta Cliente</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Entidades</th>
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
                const accountEntities = account.__entitiesCount || 0;

                return (
                  <tr key={account.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.accountCell}>
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
                      <span style={styles.statNumber}>{accountEntities}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statNumber}>{account.stats?.total_accommodations || 0}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statNumber}>{account.stats?.total_rooms || 0}</span>
                    </td>
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
                      <div style={styles.tableActions}>
                        <button
                          style={styles.tableActionButton}
                          onClick={() => navigate(`/v2/superadmin/cuentas/${account.id}`)}
                          title="Ver detalle"
                        >
                          👁
                        </button>
                        <button
                          style={styles.tableActionButton}
                          onClick={() => navigate(`/v2/superadmin/cuentas/${account.id}/editar`)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </V2Layout>
  );
}

// =============================================================================
// ESTILOS
// =============================================================================
const styles = {
  // Header principal
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
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

  // KPIs
  kpiSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 10,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 14,
  },
  kpiGroupTwoLayout: {
    display: "grid",
    gridTemplateColumns: "3fr 2fr",
    gap: 18,
    alignItems: "start",
  },
  kpiGridTwoByTwo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    borderLeft: "4px solid #111827",
  },
  kpiHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  kpiIcon: {
    fontSize: 16,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  kpiSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  kpiBreakdown: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
  },
  kpiBreakdownItem: {
    color: "#6B7280",
  },
  kpiBreakdownSeparator: {
    color: "#D1D5DB",
  },
  occupancyBarLarge: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  occupancyFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },

  // Actividad Reciente
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 20px 0",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    flex: 1,
  },
  activityItem: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  activityDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityDotIcon: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  activityContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  activityText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: "1.4",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  ticketBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  ticketBarFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },

  // Grid de secciones
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 32,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  cardCode: {
    fontSize: 10,
    color: "#9CA3AF",
    fontFamily: "monospace",
    marginTop: 4,
  },
  linkButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },

  // Distribución por Plan (DBSU-DP)
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

  // Accesos rápidos
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  },
  actionButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative",
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  actionCode: {
    position: "absolute",
    top: 6,
    right: 6,
    fontSize: 8,
    color: "#D1D5DB",
    fontFamily: "monospace",
  },

  // Tabla
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
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    borderBottom: "1px solid #E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  tr: {
    borderBottom: "1px solid #F3F4F6",
  },
  td: {
    padding: "14px 16px",
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
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  statNumber: {
    fontWeight: "600",
    color: "#111827",
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
  tableActions: {
    display: "flex",
    gap: 4,
  },
  tableActionButton: {
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.2s ease",
  },
};
