// src/pages/v2/admin/DashboardAdminV3New.jsx
// Dashboard Admin V3 con visualizaciones 3D profesionales

import { useState, useEffect, useCallback } from "react";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { supabase } from "../../../services/supabaseClient";

// ── Fallback dummy data ───────────────────────────────────────────────────────
const DUMMY_STATS = {
  totalAccommodations: 1,
  totalRooms: 3,
  occupied: 1,
  free: 2,
  pending: 0,
  occRate: 33,
  activeTenants: 1,
  avgElectricity: 0,
};

const DUMMY_GENERO = [
  { gender: "male",   value: 1 },
  { gender: "female", value: 0 },
];

const DUMMY_ACTIVIDAD = [
  { id: 1, entity_type: "lodger",        action: "create",   actor_role: "admin", created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 2, entity_type: "room",          action: "assign",   actor_role: "admin", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, entity_type: "accommodation", action: "update",   actor_role: "admin", created_at: new Date(Date.now() - 86400000).toISOString() },
];

const CHECKIN_DATA = [
  { name: "Check-In",  value: 47, color: "#0096D6" },
  { name: "Check-Out", value: 43, color: "#F59E0B" },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
const timeAgo = iso => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};

// ── useBreakpoint ─────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 480 ? "mobile" : w < 768 ? "tablet-small" : w < 1200 ? "tablet" : "desktop");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

// ── KPICard ───────────────────────────────────────────────────────────────────
function KPICard({ label, value, subtitle, color = "#374151", loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: "10px 6px",
        border: "1px solid #E5E7EB",
        boxShadow: hov ? "0 6px 16px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 900,
        color: loading ? "#D1D5DB" : color,
        letterSpacing: "-1px",
        lineHeight: 1,
        marginBottom: 4,
        textShadow: "3px 3px 8px rgba(30,30,30,0.45)",
      }}>
        {loading ? "—" : value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9CA3AF" }}>
        {subtitle}
      </div>
    </div>
  );
}

// ── OcupacionDonut ────────────────────────────────────────────────────────────
function OcupacionDonut({ percent, title, loading }) {
  const pct  = loading ? 0 : Math.min(100, Math.max(0, Number(percent) || 0));
  const r    = 52;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  const col  = pct > 80 ? "#DC2626" : pct > 50 ? "#F59E0B" : "#16A34A";

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 16,
      padding: "20px 16px",
      border: "1px solid #E5E7EB",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 16, alignSelf: "flex-start" }}>
        {title}
      </div>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="#E5E7EB" strokeWidth={13} />
        <circle
          cx={65} cy={65} r={r} fill="none"
          stroke={col} strokeWidth={13}
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={65} y={60} textAnchor="middle" style={{ fontSize: "22px", fontWeight: "900", fill: col }}>{pct}%</text>
        <text x={65} y={78} textAnchor="middle" style={{ fontSize: "11px", fill: "#9CA3AF" }}>ocupación</text>
      </svg>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>del total de habitaciones</div>
    </div>
  );
}

// ── GeneroDonut ───────────────────────────────────────────────────────────────
function GeneroDonut({ data, loading }) {
  const total   = loading ? 0 : (data || []).reduce((s, d) => s + (d.value || 0), 0);
  const male    = (data || []).find(d => d.gender === "male")?.value   || 0;
  const female  = (data || []).find(d => d.gender === "female")?.value || 0;
  const other   = total - male - female;
  const dominant = male >= female && male >= other ? "male" : female >= other ? "female" : "other";
  const domVal  = dominant === "male" ? male : dominant === "female" ? female : other;
  const pct     = total > 0 ? Math.round((domVal / total) * 100) : 0;
  const col     = dominant === "male" ? "#4F46E5" : dominant === "female" ? "#EC4899" : "#10B981";
  const label   = dominant === "male" ? "Hombres" : dominant === "female" ? "Mujeres" : "Otro";
  const r       = 52;
  const circ    = 2 * Math.PI * r;
  const off     = circ - (pct / 100) * circ;

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 16,
      padding: "20px 16px",
      border: "1px solid #E5E7EB",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 16, alignSelf: "flex-start" }}>
        Género
      </div>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="#E5E7EB" strokeWidth={13} />
        <circle
          cx={65} cy={65} r={r} fill="none"
          stroke={col} strokeWidth={13}
          strokeDasharray={circ}
          strokeDashoffset={loading ? circ : off}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={65} y={60} textAnchor="middle" style={{ fontSize: "22px", fontWeight: "900", fill: loading ? "#D1D5DB" : col }}>{loading ? "—" : `${pct}%`}</text>
        <text x={65} y={78} textAnchor="middle" style={{ fontSize: "11px", fill: "#9CA3AF" }}>{loading ? "" : label}</text>
      </svg>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>{total} inquilino{total !== 1 ? "s" : ""} total</div>
    </div>
  );
}

// ── CheckInBarChart ───────────────────────────────────────────────────────────
function CheckInBarChart({ data, loading }) {
  const items  = data || [];
  const maxVal = Math.max(...items.map(d => d.value), 1);

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 16,
      padding: "20px 16px",
      border: "1px solid #E5E7EB",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 16 }}>
        Check-In / Check-Out
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 20, minHeight: 80 }}>
        {items.map((d, i) => {
          const heightPct = loading ? 0 : (d.value / maxVal) * 100;
          return (
            <div key={i} style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: d.color }}>
                {loading ? "" : d.value}
              </div>
              <div style={{
                width: "100%",
                height: loading ? 8 : `${Math.max(heightPct * 0.8, 8)}px`,
                maxHeight: 80,
                background: d.color,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.4s ease",
              }} />
              <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                {d.name}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
        Total anual
      </div>
    </div>
  );
}

// ── ActividadReciente ─────────────────────────────────────────────────────────
function ActividadReciente({ items, loading }) {
  const getActionLabel = a => ({ create: "Creado", update: "Actualizado", delete: "Eliminado", assign: "Asignado", checkout: "Check-out" }[a] || a);
  const getEntityLabel = t => ({ lodger: "Inquilino", room: "Habitación", accommodation: "Alojamiento", energy_bill: "Factura", bulletin: "Boletín" }[t] || t);

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "#1F2937" }}>
        Actividad Reciente
      </h3>
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 13 }}>
          Cargando actividad...
        </div>
      ) : !items || items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9CA3AF", gap: 8 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div style={{ fontSize: 13 }}>No hay actividad reciente</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "#FFFFFF",
              borderRadius: 8,
              border: "1px solid #E5E7EB",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: "#10B981" }}>{getActionLabel(item.action)}</span>
                  {" "}{getEntityLabel(item.entity_type)}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  {item.actor_role || "Sistema"} · {timeAgo(item.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardAdminV3New() {
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const _breakpoint = useBreakpoint();

  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState(null);
  const [generoData,   setGeneroData]   = useState([]);
  const [, setIngresosData] = useState([]);
  const [actividadData, setActividadData] = useState([]);
  const [checkinData,  setCheckinData]  = useState(CHECKIN_DATA);

  const loadDashboardData = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const [
        { data: accommodations },
        { data: rooms },
        { data: assignments },
        { data: lodgers },
        { data: energyBills },
        { data: auditLog },
      ] = await Promise.all([
        supabase.from("accommodations").select("id,name").eq("client_account_id", clientAccountId).eq("status", "active"),
        supabase.from("rooms").select("id,is_maintenance").eq("client_account_id", clientAccountId),
        // Solo asignaciones activas: move_in_date <= hoy y no terminadas
        supabase.from("lodger_room_assignments")
          .select("room_id,move_in_date,move_out_date,monthly_rent,billing_start_date,created_at")
          .eq("client_account_id", clientAccountId)
          .lte("move_in_date", today)
          .or(`move_out_date.is.null,move_out_date.gt.${today}`),
        supabase.from("profiles").select("id,gender").eq("role", "lodger").eq("client_account_id", clientAccountId),
        supabase.from("energy_bills").select("issue_date,amount_total,utility_type").eq("client_account_id", clientAccountId).eq("utility_type", "electricity").gte("issue_date", twelveMonthsAgo.toISOString().split("T")[0]),
        supabase.from("audit_log").select("id,entity_type,action,actor_role,actor_user_id,created_at").eq("client_account_id", clientAccountId).order("created_at", { ascending: false }).limit(8),
      ]);

      const allRooms = rooms || [];
      const byRoom  = {};
      (assignments || []).forEach(a => { byRoom[a.room_id] = a; });

      let free = 0, occupied = 0, pending = 0;
      allRooms.forEach(r => {
        if (r.is_maintenance) return;
        const a = byRoom[r.id];
        if (!a) free++;
        else if (!a.move_out_date) occupied++;
        else if (a.move_out_date > today) occupied++;
        else pending++;
      });

      const totalRooms = allRooms.filter(r => !r.is_maintenance).length;
      const occRate    = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

      const genderCounts = {};
      (lodgers || []).forEach(l => { const g = l.gender || "other"; genderCounts[g] = (genderCounts[g] || 0) + 1; });
      const generoChartData = Object.entries(genderCounts).map(([gender, value]) => ({ gender, value }));

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const ingresosChartData = [];
      [currentYear - 1, currentYear].forEach(year => {
        for (let month = 1; month <= 12; month++) {
          if (year > currentYear || (year === currentYear && month > currentMonth)) continue;
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd   = new Date(year, month, 0);
          let monthlyIncome = 0;
          (assignments || []).forEach(a => {
            if (!a.monthly_rent) return;
            const startDate = a.billing_start_date ? new Date(a.billing_start_date) : null;
            const endDate   = a.move_out_date ? new Date(a.move_out_date) : null;
            if ((!startDate || startDate <= monthEnd) && (!endDate || endDate >= monthStart)) {
              monthlyIncome += Number(a.monthly_rent);
            }
          });
          ingresosChartData.push({ month, year, value: monthlyIncome, name: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][month - 1] });
        }
      });

      const gastosPorMes = {};
      (energyBills || []).forEach(b => {
        if (!b.issue_date || !b.amount_total) return;
        const d = new Date(b.issue_date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        gastosPorMes[k] = (gastosPorMes[k] || 0) + Number(b.amount_total);
      });
      const avgElectricity = Object.values(gastosPorMes).length > 0
        ? Object.values(gastosPorMes).reduce((a, b) => a + b, 0) / Object.values(gastosPorMes).length : 0;

      const currentYearStr = String(new Date().getFullYear());
      const yearStart = `${currentYearStr}-01-01`;
      const yearEnd   = `${currentYearStr}-12-31`;
      const checkInsYear  = (assignments || []).filter(a => {
        const fecha = a.billing_start_date || a.created_at?.slice(0, 10);
        return fecha >= yearStart && fecha <= yearEnd;
      }).length;
      const checkOutsYear = (assignments || []).filter(a =>
        a.move_out_date && a.move_out_date >= yearStart && a.move_out_date <= yearEnd
      ).length;
      setCheckinData([
        { name: "Check-In",  value: checkInsYear,  color: "#0096D6" },
        { name: "Check-Out", value: checkOutsYear, color: "#F59E0B" },
      ]);

      setStats({ totalAccommodations: (accommodations || []).length, totalRooms, occupied, free, pending, occRate, activeTenants: (lodgers || []).length, avgElectricity });
      setGeneroData(generoChartData);
      setIngresosData(ingresosChartData);
      setActividadData(auditLog || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const s     = stats || DUMMY_STATS;
  const gData = generoData.length    > 0 ? generoData    : DUMMY_GENERO;
  const aData = actividadData.length > 0 ? actividadData : DUMMY_ACTIVIDAD;

  // KPI grid: 5 cols desktop, 3 cols tablet/tablet-small, 2 cols mobile
  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* ── Media queries reales (más fiables que window.innerWidth) ── */}
      <style>{`
        .v3-outer       { padding: 5px 10%; }
        .v3-title       { font-size: 30px; }
        .v3-main-grid   { display: grid; grid-template-columns: minmax(300px,400px) 1fr; gap: 20px; align-items: start; }
        .v3-left-col    { display: flex; flex-direction: column; gap: 16px; min-width: 0; order: 0; }
        .v3-right-col   { display: flex; flex-direction: column; gap: 16px; padding-left: 80px; padding-right: 16px; order: 0; }
        .v3-hero        { display: flex; align-items: center; justify-content: flex-start; overflow: visible; min-height: 190px; margin-top: -76px; }
        .v3-hero img    { width: 507px; max-width: none; }
        .v3-charts      { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .v3-kpi-cols    { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; }

        @media (max-width: 1199px) {
          .v3-outer      { padding: 5px 4%; }
          .v3-right-col  { padding-left: 20px; padding-right: 0; }
          .v3-kpi-cols   { grid-template-columns: repeat(3,1fr); }
        }
        @media (max-width: 767px) {
          .v3-outer      { padding: 5px 4%; }
          .v3-main-grid  { display: flex; flex-direction: column; gap: 14px; }
          .v3-left-col   { order: 2; }
          .v3-right-col  { order: 1; padding-left: 0; padding-right: 0; }
          .v3-hero       { display: none; }
          .v3-charts     { gap: 8px; }
          .v3-kpi-cols   { grid-template-columns: repeat(2,1fr); gap: 6px; }
          .v3-title      { font-size: 22px; }
        }
      `}</style>

      <div className="v3-outer" style={{ maxWidth: 1400, margin: "0 auto", background: "#FFFFFF", minHeight: "100vh", overflowX: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="v3-title" style={{ fontWeight: 900, color: "#1F2937", margin: 0, letterSpacing: "-0.5px" }}>
            Panel de Control
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>
            Buenas tardes, {userName || "Admin"}
          </p>
        </div>

        {/* ── Layout: 2 columnas desktop | columna única mobile ── */}
        <div className="v3-main-grid">

          {/* ── COLUMNA IZQUIERDA: Imagen + 3 gráficos ── */}
          <div className="v3-left-col">

            {/* Imagen 3D (oculta en mobile vía CSS) */}
            <div className="v3-hero">
              <img
                src="/images/Alojamiento Dashboard.png"
                alt="Plano 3D del alojamiento"
                style={{
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15)) drop-shadow(0 20px 40px rgba(0,0,0,0.20))",
                  transform: "perspective(1000px) rotateX(2deg)",
                  display: "block",
                  marginLeft: "-5%",
                }}
              />
            </div>

            {/* 3 gráficos en fila horizontal */}
            <div className="v3-charts">
              <OcupacionDonut percent={s.occRate} title="Ocupación Acumulada" loading={loading} />
              <GeneroDonut data={gData} loading={loading} />
              <CheckInBarChart data={checkinData} loading={loading} />
            </div>

          </div>

          {/* ── COLUMNA DERECHA: KPIs + Actividad Reciente ── */}
          <div className="v3-right-col">

            {/* KPI Grid 2 filas */}
            <div>
              {/* Fila 1 — Individuales */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Individuales
                </div>
                <div className="v3-kpi-cols">
                  <KPICard label="Alojamientos" value={s.totalAccommodations} subtitle="activos"   color="#374151" loading={loading} />
                  <KPICard label="Hab. Totales"  value={s.totalRooms}          subtitle="total"     color="#374151" loading={loading} />
                  <KPICard label="Hab. Ocupadas" value={s.occupied}            subtitle="ocupadas"  color="#DC2626" loading={loading} />
                  <KPICard label="Hab. Libres"   value={s.free}                subtitle="libres"    color="#16A34A" loading={loading} />
                  <KPICard label="Ocupación"     value={`${s.occRate}%`}       subtitle="del total" color="#F59E0B" loading={loading} />
                </div>
              </div>

              {/* Fila 2 — Compartida */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Compartida
                </div>
                <div className="v3-kpi-cols">
                  <KPICard label="Alojamientos" value={s.totalAccommodations} subtitle="activos"   color="#374151" loading={loading} />
                  <KPICard label="Hab. Totales"  value={s.totalRooms}          subtitle="total"     color="#374151" loading={loading} />
                  <KPICard label="Hab. Ocupadas" value={s.occupied}            subtitle="ocupadas"  color="#DC2626" loading={loading} />
                  <KPICard label="Hab. Libres"   value={s.free}                subtitle="libres"    color="#16A34A" loading={loading} />
                  <KPICard label="Ocupación"     value={`${s.occRate}%`}       subtitle="del total" color="#F59E0B" loading={loading} />
                </div>
              </div>
            </div>

            {/* Actividad Reciente */}
            <ActividadReciente items={aData} loading={loading} />

          </div>

        </div>

      </div>
    </V2Layout>
  );
}
