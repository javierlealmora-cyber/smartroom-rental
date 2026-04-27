// =============================================================================
// src/pages/v2/superadmin/DashboardSuperadmin.jsx
// =============================================================================
// DBSU - Dashboard Superadmin — Rediseño v2
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}
import V2Layout from "../../../layouts/V2Layout";
import { supabase } from "../../../services/supabaseClient";

// ─── Data helpers ─────────────────────────────────────────────────────────────
const PLAN_COLORS = {
  basic: "#64748B",
  investor: "#2563EB",
  business: "#7C3AED",
  agency: "#D97706",
};
const PLAN_LABELS = { basic: "Basic", investor: "Investor", business: "Business", agency: "Agency" };
const getPlanLabel = (p) => PLAN_LABELS[p] || p || "—";
const getPlanColor = (p) => PLAN_COLORS[p] || "#64748B";

const STATUS_LABEL = { active: "Activa", suspended: "Suspendida", cancelled: "Cancelada", trial: "Prueba" };
const STATUS_COLOR = { active: "#059669", suspended: "#D97706", cancelled: "#DC2626", trial: "#2563EB" };
const getStatusLabel = (s) => STATUS_LABEL[s] || s;
const getStatusColor = (s) => STATUS_COLOR[s] || "#64748B";

const ACTION_META = {
  create:         { label: "Creado",           color: "#059669" },
  update:         { label: "Actualizado",       color: "#2563EB" },
  delete:         { label: "Eliminado",         color: "#DC2626" },
  set_status:     { label: "Estado cambiado",   color: "#D97706" },
  set_room_status:{ label: "Habitación",        color: "#D97706" },
};
const ENTITY_LABEL = {
  accommodation: "Alojamiento", room: "Habitación", lodger: "Inquilino",
  entity: "Entidad", service: "Servicio", energy_bill: "Factura", bulletin: "Boletín",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Ayer" : `${days}d`;
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function DonutChart({ value, size = 128, stroke = 11, color = "#0B2E6D" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value / 100, 0), 1);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(11,46,109,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`}
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

// ─── Multi-segment donut ──────────────────────────────────────────────────────
function MultiDonut({ segments, size = 128, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cum = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(11,46,109,0.08)" strokeWidth={stroke} />
      {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const off = cum;
        cum += dash;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke} strokeLinecap="butt"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off}
            style={{ transition: "stroke-dasharray 0.5s ease" }} />
        );
      })}
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "#0F172A", loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...S.kpiCard,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? "0 8px 20px rgba(11,46,109,0.1)" : "none",
        borderColor: hov ? "rgba(11,46,109,0.18)" : "rgba(11,46,109,0.08)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span style={S.kpiLabel}>{label}</span>
      <span style={{ ...S.kpiValue, color: loading ? "#CBD5E1" : color }}>
        {loading ? "—" : value}
      </span>
      <span style={S.kpiSub}>{sub}</span>
    </div>
  );
}

// ─── Nav button with hover ────────────────────────────────────────────────────
function NavBtn({ label, path, disabled, navigate }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        ...S.qnBtn,
        ...(disabled ? S.qnBtnOff : {}),
        ...(hov && !disabled ? {
          background: "#0B2E6D",
          color: "#fff",
          borderColor: "#0B2E6D",
          transform: "translateY(-1px)",
        } : {}),
        transition: "all 0.15s ease",
      }}
      onClick={() => !disabled && path && navigate(path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

// ─── Hoverable card wrapper ────────────────────────────────────────────────────
function HoverCard({ style, children }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        ...S.card,
        height: "100%",
        boxSizing: "border-box",
        ...style,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? "0 8px 20px rgba(11,46,109,0.1)" : "none",
        borderColor: hov ? "rgba(11,46,109,0.18)" : "rgba(11,46,109,0.08)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardSuperadmin() {
  const navigate = useNavigate();
  const vw = useBreakpoint();
  const isMobile = vw < 768;
  const isTablet = vw < 1024;

  const [stats, setStats] = useState({
    totalAccounts: 0, activeAccounts: 0, suspendedAccounts: 0, cancelledAccounts: 0,
    totalEntities: 0, totalAccommodations: 0, totalRooms: 0, occupiedRooms: 0, freeRooms: 0,
    totalLodgers: 0, activeLodgers: 0,
  });
  const [recentAccounts, setRecentAccounts] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [
        { data: accounts },
        { data: entities },
        { data: accommodations },
        { data: rooms },
        { data: activeAssignments },
        { data: lodgers },
        { data: auditLog },
      ] = await Promise.all([
        supabase.from("client_accounts").select("id,name,last_name1,last_name2,slug,plan_code,billing_cycle,status,start_date,created_at,contact_email").order("created_at", { ascending: false }),
        supabase.from("entities").select("id,client_account_id,type,status"),
        supabase.from("accommodations").select("id,status"),
        supabase.from("rooms").select("id,is_maintenance"),
        supabase.from("lodger_room_assignments").select("room_id,move_out_date")
          .or(`move_out_date.is.null,move_out_date.gt.${today}`),
        supabase.from("profiles").select("id,onboarding_status").eq("role", "lodger"),
        supabase.from("audit_log").select("id,entity_type,action,actor_role,new_values,created_at").order("created_at", { ascending: false }).limit(20),
      ]);

      const allAccounts      = (accounts || []).map((a) => ({
        ...a,
        ownerFullName: [a.name, a.last_name1, a.last_name2].filter(Boolean).join(" ") || a.name,
      }));
      const allEntities      = entities || [];
      const allRooms         = rooms    || [];
      const allLodgers       = lodgers  || [];

      const assignByRoom = {};
      (activeAssignments || []).forEach((a) => { assignByRoom[a.room_id] = a; });
      let freeRooms = 0, occupiedRooms = 0;
      allRooms.forEach((r) => {
        if (r.is_maintenance) return;
        const asgn = assignByRoom[r.id];
        if (!asgn) freeRooms++;
        else if (!asgn.move_out_date) occupiedRooms++;
      });

      const activeAccounts    = allAccounts.filter(a => a.status === "active").length;
      const suspendedAccounts = allAccounts.filter(a => a.status === "suspended").length;
      const cancelledAccounts = allAccounts.filter(a => a.status === "cancelled").length;

      setStats({
        totalAccounts: allAccounts.length, activeAccounts, suspendedAccounts, cancelledAccounts,
        totalEntities: allEntities.length,
        totalAccommodations: (accommodations || []).length,
        totalRooms: allRooms.length, occupiedRooms, freeRooms,
        totalLodgers: allLodgers.length,
        activeLodgers: allLodgers.filter(l => l.onboarding_status === "active").length,
      });

      const planCodes = ["basic", "investor", "business", "agency"];
      setPlanDistribution(planCodes.map(plan => {
        const count = allAccounts.filter(a => a.plan_code === plan).length;
        return { plan, count, percentage: allAccounts.length > 0 ? Math.round((count / allAccounts.length) * 100) : 0 };
      }));

      const byAccountId = allEntities.reduce((acc, e) => {
        if (e.client_account_id) acc[e.client_account_id] = (acc[e.client_account_id] || 0) + 1;
        return acc;
      }, {});
      setRecentAccounts(allAccounts.slice(0, 6).map(a => ({ ...a, __entities: byAccountId[a.id] || 0 })));
      setActivity(auditLog || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[DashboardSuperadmin] error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const occupancyRate = stats.totalRooms > 0
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;

  const occupancyColor = occupancyRate > 80 ? "#059669" : occupancyRate > 50 ? "#D97706" : "#DC2626";

  const activeRate = stats.totalAccounts > 0
    ? Math.round((stats.activeAccounts / stats.totalAccounts) * 100) : 0;

  return (
    <V2Layout role="superadmin" userName="Javier">
      <div style={S.root}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ ...S.header, ...(isMobile && { flexDirection: "column", alignItems: "flex-start" }) }}>
          <div>
            <h1 style={S.pageTitle}>Control Center</h1>
            <p style={S.pageSubtitle}>
              {lastUpdated ? `Actualizado hace ${timeAgo(lastUpdated.toISOString())}` : "Cargando datos..."}
            </p>
          </div>
          <div style={S.headerBtns}>
            <button style={S.refreshBtn} onClick={load} title="Actualizar">
              ↻
            </button>
            <button style={S.primaryBtn} onClick={() => navigate("/v2/superadmin/cuentas/nueva")}>
              + Nueva cuenta
            </button>
          </div>
        </div>

        {/* ── Quick nav ──────────────────────────────────────────────────── */}
        <div style={S.quickNavWrap}>
          <div style={S.quickNav}>
            {[
              { label: "Cuentas",    path: "/v2/superadmin/cuentas" },
              { label: "Planes",     path: "/v2/superadmin/planes" },
              { label: "Servicios",  path: "/v2/superadmin/servicios" },
              { label: "Cobros",     disabled: true },
              { label: "Incidencias",disabled: true },
              { label: "Config.",    disabled: true },
            ].map(({ label, path, disabled }) => (
              <NavBtn key={label} label={label} path={path} disabled={disabled} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div style={S.kpiScrollWrap}>
          <div style={{
            ...S.kpiStrip,
            gridTemplateColumns: isMobile
              ? "none"
              : isTablet ? "repeat(3, 1fr)" : "repeat(5, 1fr)",
            display: isMobile ? "flex" : "grid",
          }}>
            <KpiCard label="Cuentas cliente"    value={stats.totalAccounts}   sub={`${stats.activeAccounts} activas · ${stats.suspendedAccounts} susp.`} loading={loading} />
            <KpiCard label="Tasa activas"       value={`${activeRate}%`}      sub={`${stats.activeAccounts} de ${stats.totalAccounts}`} color="#059669" loading={loading} />
            <KpiCard label="Ocupación"          value={`${occupancyRate}%`}   sub={`${stats.occupiedRooms} de ${stats.totalRooms} hab.`} color={occupancyColor} loading={loading} />
            <KpiCard label="Habitaciones"       value={stats.totalRooms}      sub={`${stats.freeRooms} libres`} loading={loading} />
            <KpiCard label="Inquilinos activos" value={stats.activeLodgers}   sub={`de ${stats.totalLodgers} total`} color="#2563EB" loading={loading} />
          </div>
        </div>

        {/* ── Charts row: Ocupación + Distribución por plan ──────────────── */}
        <div style={{
          ...S.chartsRow,
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 1fr 1fr",
        }}>
          {/* Donut: planes contratados */}
          <HoverCard>
            <p style={S.cardLabel}>Planes contratados</p>
            <div style={S.donutWrap}>
              <div style={S.donutSvgWrap}>
                <MultiDonut
                  segments={planDistribution.map(d => ({ value: d.count, color: getPlanColor(d.plan) }))}
                />
                <div style={S.donutOverlay}>
                  <span style={{ ...S.donutPct, color: "#0B2E6D" }}>{stats.totalAccounts}</span>
                  <span style={S.donutSub}>cuentas</span>
                </div>
              </div>
              <div style={S.donutLegend}>
                {planDistribution.map(({ plan, count }) => (
                  <div key={plan} style={S.legendRow}>
                    <div style={{ ...S.legendDot, background: getPlanColor(plan) }} />
                    <span style={S.legendText}>{getPlanLabel(plan)}</span>
                    <span style={{ ...S.legendText, marginLeft: "auto", fontWeight: 600, color: "#334155" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </HoverCard>

          {/* Donut: ocupación */}
          <HoverCard>
            <p style={S.cardLabel}>Ocupación global</p>
            <div style={S.donutWrap}>
              <div style={S.donutSvgWrap}>
                <DonutChart value={occupancyRate} color={occupancyColor} />
                <div style={S.donutOverlay}>
                  <span style={{ ...S.donutPct, color: occupancyColor }}>{occupancyRate}%</span>
                  <span style={S.donutSub}>ocupado</span>
                </div>
              </div>
              <div style={S.donutLegend}>
                <div style={S.legendRow}>
                  <div style={{ ...S.legendDot, background: occupancyColor }} />
                  <span style={S.legendText}>{stats.occupiedRooms} ocupadas</span>
                </div>
                <div style={S.legendRow}>
                  <div style={{ ...S.legendDot, background: "rgba(11,46,109,0.12)" }} />
                  <span style={S.legendText}>{stats.freeRooms} libres</span>
                </div>
                <div style={S.legendRow}>
                  <div style={{ ...S.legendDot, background: "#CBD5E1" }} />
                  <span style={S.legendText}>{stats.totalRooms - stats.occupiedRooms - stats.freeRooms} otros</span>
                </div>
              </div>
            </div>
          </HoverCard>

          {/* Plan distribution */}
          <HoverCard>
            <p style={S.cardLabel}>Distribución por plan</p>
            <div style={S.stackedBar}>
              {planDistribution.filter(d => d.count > 0).map(({ plan, percentage }) => (
                <div key={plan} title={`${getPlanLabel(plan)}: ${percentage}%`}
                  style={{
                    width: `${percentage}%`, height: "100%",
                    background: getPlanColor(plan),
                    transition: "width 0.5s ease",
                    minWidth: percentage > 0 ? 4 : 0,
                  }}
                />
              ))}
              {planDistribution.every(d => d.count === 0) && (
                <div style={{ width: "100%", height: "100%", background: "#E2E8F0" }} />
              )}
            </div>
            <div style={S.planLegend}>
              {planDistribution.map(({ plan, count, percentage }) => (
                <div key={plan} style={S.planLegendRow}>
                  <div style={{ ...S.legendDot, background: getPlanColor(plan) }} />
                  <span style={S.planName}>{getPlanLabel(plan)}</span>
                  <span style={S.planCount}>{count} cuentas</span>
                  <span style={S.planPct}>{percentage}%</span>
                </div>
              ))}
            </div>
            <div style={S.recapRow}>
              <div style={S.recapItem}>
                <span style={S.recapNum}>{stats.totalEntities}</span>
                <span style={S.recapLabel}>Entidades</span>
              </div>
              <div style={S.recapDivider} />
              <div style={S.recapItem}>
                <span style={S.recapNum}>{stats.totalAccommodations}</span>
                <span style={S.recapLabel}>Alojamientos</span>
              </div>
            </div>
          </HoverCard>
        </div>

        {/* ── Últimas cuentas + Actividad reciente ───────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}>
          {/* Últimas cuentas */}
          <HoverCard>
            <div style={S.tableHead}>
              <p style={{ ...S.cardLabel, margin: 0 }}>Últimas cuentas cliente</p>
              <button style={S.linkBtn} onClick={() => navigate("/v2/superadmin/cuentas")}>
                Ver todas →
              </button>
            </div>
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Cuenta", "Plan", "Estado", "Entidades", "Alta", ""].map((h, i) => (
                      <th key={i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentAccounts.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} style={{ ...S.td, color: "#94A3B8", textAlign: "center", padding: "32px 0" }}>
                        Sin cuentas registradas
                      </td>
                    </tr>
                  ) : recentAccounts.map((a) => (
                    <tr key={a.id} style={S.tr}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={S.td}>
                        <div style={S.accountCell}>
                          <div style={{ ...S.avatar, background: "#0B2E6D" }}>
                            {a.ownerFullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={S.accountName}>{a.ownerFullName}</div>
                            <div style={S.accountSlug}>{a.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          ...S.badge,
                          color: getPlanColor(a.plan_code),
                          background: `${getPlanColor(a.plan_code)}14`,
                          borderColor: `${getPlanColor(a.plan_code)}30`,
                        }}>
                          {getPlanLabel(a.plan_code)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          ...S.badge,
                          color: getStatusColor(a.status),
                          background: `${getStatusColor(a.status)}14`,
                          borderColor: `${getStatusColor(a.status)}30`,
                        }}>
                          {getStatusLabel(a.status)}
                        </span>
                      </td>
                      <td style={{ ...S.td, ...S.tdNum }}>{a.__entities}</td>
                      <td style={{ ...S.td, color: "#64748B" }}>{formatDate(a.created_at)}</td>
                      <td style={S.td}>
                        <button style={S.rowBtn} onClick={() => navigate(`/v2/superadmin/cuentas/${a.id}`)}>
                          Ver →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HoverCard>

          {/* Actividad reciente */}
          <HoverCard style={S.activityCard}>
            <p style={S.cardLabel}>Actividad reciente</p>
            <div style={S.feed}>
              {loading ? (
                <p style={S.empty}>Cargando...</p>
              ) : activity.length === 0 ? (
                <p style={S.empty}>Sin actividad registrada</p>
              ) : activity.slice(0, 20).map((item) => {
                const act = ACTION_META[item.action] || { label: item.action, color: "#94A3B8" };
                const entity = ENTITY_LABEL[item.entity_type] || item.entity_type;
                const name = item.new_values?.name || item.new_values?.legal_name || item.new_values?.number || "";
                return (
                  <div key={item.id} style={S.feedItem}>
                    <div style={{ ...S.feedBar, background: act.color }} />
                    <div style={S.feedBody}>
                      <span style={S.feedAction}>
                        <span style={{ color: act.color }}>{act.label}</span>
                        {" · "}{entity}{name ? `: ${name}` : ""}
                      </span>
                      <span style={S.feedMeta}>{item.actor_role} · {timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </HoverCard>
        </div>

      </div>
    </V2Layout>
  );
}

// =============================================================================
// ESTILOS
// =============================================================================
const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0B2E6D",
    margin: 0,
    letterSpacing: "-0.3px",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    margin: "3px 0 0 0",
  },
  headerBtns: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    border: "1px solid rgba(11,46,109,0.15)",
    borderRadius: 8,
    background: "#fff",
    color: "#0B2E6D",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
  },
  primaryBtn: {
    height: 36,
    padding: "0 16px",
    background: "#0B2E6D",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
    whiteSpace: "nowrap",
  },

  // Quick nav
  quickNavWrap: {
    overflowX: "auto",
    marginLeft: -2,
    marginRight: -2,
    paddingBottom: 2,
    scrollbarWidth: "none",
  },
  quickNav: {
    display: "flex",
    gap: 6,
    flexWrap: "nowrap",
    paddingLeft: 2,
    paddingRight: 2,
  },
  qnBtn: {
    padding: "6px 14px",
    border: "1px solid rgba(11,46,109,0.2)",
    borderRadius: 20,
    background: "#fff",
    color: "#0B2E6D",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  },
  qnBtnOff: {
    color: "#CBD5E1",
    borderColor: "#E2E8F0",
    cursor: "default",
  },

  // KPI strip
  kpiScrollWrap: {
    overflowX: "auto",
    scrollbarWidth: "none",
    marginLeft: -2,
    marginRight: -2,
    paddingBottom: 2,
  },
  kpiStrip: {
    gap: 12,
    paddingLeft: 2,
    paddingRight: 2,
  },
  kpiCard: {
    background: "#fff",
    border: "1px solid rgba(11,46,109,0.08)",
    borderRadius: 12,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 160,
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0F172A",
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
    fontVariantNumeric: "tabular-nums",
  },
  kpiSub: {
    fontSize: 11,
    color: "#94A3B8",
  },

  // Charts row
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
    alignItems: "start",
  },

  // Card base
  card: {
    background: "#fff",
    border: "1px solid rgba(11,46,109,0.08)",
    borderRadius: 12,
    padding: "20px 24px",
    overflow: "hidden",
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 16px 0",
  },

  // Donut
  donutWrap: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  donutSvgWrap: {
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
  },
  donutOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  donutPct: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    fontVariantNumeric: "tabular-nums",
  },
  donutSub: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  donutLegend: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  legendText: {
    fontSize: 12,
    color: "#475569",
  },

  // Plan distribution
  stackedBar: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    display: "flex",
    marginBottom: 16,
    background: "#F1F5F9",
  },
  planLegend: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  planLegendRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontSize: 12,
    color: "#334155",
    flex: 1,
    fontWeight: 500,
  },
  planCount: {
    fontSize: 11,
    color: "#94A3B8",
  },
  planPct: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    minWidth: 34,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  recapRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    paddingTop: 16,
    borderTop: "1px solid rgba(11,46,109,0.06)",
  },
  recapItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  recapNum: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0B2E6D",
    fontVariantNumeric: "tabular-nums",
  },
  recapLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    fontWeight: 600,
  },
  recapDivider: {
    width: 1,
    height: 32,
    background: "rgba(11,46,109,0.08)",
  },

  // Activity
  activityCard: {
    display: "flex",
    flexDirection: "column",
    alignSelf: "stretch",
  },
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    maxHeight: 420,
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#E2E8F0 transparent",
  },
  feedItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "1px solid rgba(11,46,109,0.06)",
  },
  feedBar: {
    width: 3,
    minHeight: 36,
    borderRadius: 2,
    flexShrink: 0,
    marginTop: 3,
  },
  feedBody: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  feedAction: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  feedMeta: {
    fontSize: 11,
    color: "#94A3B8",
  },
  empty: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    padding: "32px 0",
    margin: 0,
  },

  // Table card
  tableHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2563EB",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
  },
  tableWrap: {
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: 336,
    marginLeft: -24,
    marginRight: -24,
    paddingLeft: 24,
    paddingRight: 24,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 520,
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 10,
    fontWeight: 600,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    borderBottom: "1px solid rgba(11,46,109,0.08)",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  },
  tr: {
    transition: "background 0.1s",
  },
  td: {
    padding: "12px 12px",
    fontSize: 13,
    color: "#334155",
    borderBottom: "1px solid rgba(11,46,109,0.04)",
    verticalAlign: "middle",
  },
  tdNum: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
    color: "#0F172A",
  },
  accountCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  accountName: {
    fontWeight: 600,
    color: "#0F172A",
    fontSize: 13,
  },
  accountSlug: {
    fontSize: 11,
    color: "#94A3B8",
  },
  badge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  rowBtn: {
    background: "none",
    border: "1px solid rgba(11,46,109,0.15)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    color: "#0B2E6D",
    cursor: "pointer",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
};

