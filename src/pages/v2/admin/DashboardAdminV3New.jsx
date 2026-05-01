// src/pages/v2/admin/DashboardAdminV3New.jsx
// Dashboard Admin V3 con visualizaciones 3D profesionales

import { useState, useEffect, useCallback } from "react";
import V2Layout from "../../../layouts/V2Layout";
import { useAdminLayout } from "../../../hooks/useAdminLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../../services/supabaseClient";
import GraficoGenero3D from "../../../components/charts/GraficoGenero3D";
import GraficoHorizontal3D from "../../../components/charts/GraficoHorizontal3D";

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
  { name: "Lun", value: 2 },
  { name: "Mar", value: 1 },
  { name: "Mié", value: 3 },
  { name: "Jue", value: 1 },
  { name: "Vie", value: 2 },
  { name: "Sáb", value: 0 },
  { name: "Dom", value: 1 },
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
        borderRadius: 14,
        padding: "14px 10px",
        border: "1px solid #E5E7EB",
        boxShadow: hov ? "0 6px 16px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 38,
        fontWeight: 900,
        color: loading ? "#D1D5DB" : color,
        letterSpacing: "-1px",
        lineHeight: 1,
        marginBottom: 6,
        textShadow: "4px 4px 12px rgba(30,30,30,0.55)",
      }}>
        {loading ? "—" : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#9CA3AF" }}>
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
  const { role } = useAuth();
  const breakpoint = useBreakpoint();

  const [loading,      setLoading]      = useState(true);
  const [stats,        setStats]        = useState(null);
  const [generoData,   setGeneroData]   = useState([]);
  const [ingresosData, setIngresosData] = useState([]);
  const [actividadData, setActividadData] = useState([]);

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
        supabase.from("lodger_room_assignments").select("room_id,move_out_date,monthly_rent,billing_start_date").eq("client_account_id", clientAccountId),
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
        else if (!a.move_out_date || a.move_out_date > today) occupied++;
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

  const isMobile      = breakpoint === "mobile";
  const isTabletSmall = breakpoint === "tablet-small";
  const isDesktop     = breakpoint === "desktop";
  const isSmall       = isMobile || isTabletSmall;

  const s     = stats || DUMMY_STATS;
  const gData = generoData.length   > 0 ? generoData   : DUMMY_GENERO;
  const aData = actividadData.length > 0 ? actividadData : DUMMY_ACTIVIDAD;

  // KPI grid columns: 5 on desktop/tablet, 3 on tablet-small, 2 on mobile
  const kpiGridCols = isMobile ? "repeat(2, 1fr)" : isTabletSmall ? "repeat(3, 1fr)" : "repeat(5, 1fr)";

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isSmall ? "16px 12px" : "28px 24px", background: "#FFFFFF", minHeight: "100vh" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: isSmall ? 22 : 30, fontWeight: 900, color: "#1F2937", margin: 0, letterSpacing: "-0.5px" }}>
            Dashboard V3
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>
            Buenas tardes, {userName || "Admin"}
          </p>
        </div>

        {/* ── Sección superior: Imagen | KPIs | Actividad ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "260px 1fr 280px" : isTabletSmall ? "1fr" : "1fr 1fr",
          gap: 20,
          marginBottom: 24,
          alignItems: "start",
        }}>

          {/* Imagen 3D */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <img
              src="/images/Alojamiento Dashboard.png"
              alt="Plano 3D del alojamiento"
              style={{
                width: isSmall ? "100%" : "145%",
                maxWidth: isSmall ? "100%" : "none",
                height: "auto",
                maxHeight: isSmall ? 220 : 480,
                objectFit: "contain",
                filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15)) drop-shadow(0 20px 40px rgba(0,0,0,0.20))",
                transform: "perspective(1000px) rotateX(2deg)",
                display: "block",
              }}
            />
          </div>

          {/* KPI Grid 2 filas × 5 columnas */}
          <div>
            {/* Fila 1 — Individuales */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Individuales
              </div>
              <div style={{ display: "grid", gridTemplateColumns: kpiGridCols, gap: 8 }}>
                <KPICard label="Alojamientos" value={s.totalAccommodations} subtitle="activos" color="#374151" loading={loading} />
                <KPICard label="Hab. Totales"  value={s.totalRooms}          subtitle="total"    color="#374151" loading={loading} />
                <KPICard label="Hab. Ocupadas" value={s.occupied}            subtitle="ocupadas" color="#DC2626" loading={loading} />
                <KPICard label="Hab. Libres"   value={s.free}                subtitle="libres"   color="#16A34A" loading={loading} />
                <KPICard label="Ocupación"     value={`${s.occRate}%`}       subtitle="del total" color="#F59E0B" loading={loading} />
              </div>
            </div>

            {/* Fila 2 — Compartida */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Compartida
              </div>
              <div style={{ display: "grid", gridTemplateColumns: kpiGridCols, gap: 8 }}>
                <KPICard label="Alojamientos" value={s.totalAccommodations} subtitle="activos" color="#374151" loading={loading} />
                <KPICard label="Hab. Totales"  value={s.totalRooms}          subtitle="total"    color="#374151" loading={loading} />
                <KPICard label="Hab. Ocupadas" value={s.occupied}            subtitle="ocupadas" color="#DC2626" loading={loading} />
                <KPICard label="Hab. Libres"   value={s.free}                subtitle="libres"   color="#16A34A" loading={loading} />
                <KPICard label="Ocupación"     value={`${s.occRate}%`}       subtitle="del total" color="#F59E0B" loading={loading} />
              </div>
            </div>
          </div>

          {/* Actividad Reciente */}
          {!isTabletSmall && (
            <div style={{ gridColumn: isDesktop ? "auto" : "1 / -1" }}>
              <ActividadReciente items={aData} loading={loading} />
            </div>
          )}
        </div>

        {/* Actividad en tablet-small (debajo del grid) */}
        {isTabletSmall && (
          <div style={{ marginBottom: 24 }}>
            <ActividadReciente items={aData} loading={loading} />
          </div>
        )}

        {/* ── Sección inferior: 3 Gráficos ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr" : "repeat(3, 1fr)",
          gap: 20,
        }}>
          {/* Ocupación Acumulada */}
          <OcupacionDonut
            percent={s.occRate}
            title="Ocupación Acumulada"
            loading={loading}
          />

          {/* Ocupación por Género */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "20px 16px 0", fontSize: 14, fontWeight: 700, color: "#374151" }}>
              Ocupación por Género
            </div>
            <GraficoGenero3D data={gData} loading={loading} />
          </div>

          {/* Check In / Check-Out */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E5E7EB", padding: "20px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <GraficoHorizontal3D
              title="Check In / Check-Out"
              data={CHECKIN_DATA}
              color="#0096D6"
              unit=" mov."
              loading={loading}
            />
          </div>
        </div>

      </div>
    </V2Layout>
  );
}
