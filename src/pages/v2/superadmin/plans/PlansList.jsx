// =============================================================================
// src/pages/v2/superadmin/plans/PlansList.jsx
// Gestión de Planes — estilo Control Center estándar
// =============================================================================

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, message } from "antd";
import { PlusOutlined, ReloadOutlined, FileTextOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { getPlans, PLAN_STATUS } from "../../../../services/plans.service";

// ─── Paleta estándar ──────────────────────────────────────────────────────────
const C = {
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
  blue:    "#3B82F6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (v) => new Intl.NumberFormat("es-ES", { style:"currency", currency:"EUR" }).format(v ?? 0);
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("es-ES") : "—";
const fmtLimit    = (v) => v === -1 ? "∞" : String(v ?? 0);

const STATUS_COLOR = { draft:"#64748B", active:"#059669", deprecated:"#D97706", expired:"#DC2626", disabled:"#DC2626" };
const STATUS_LABEL = { draft:"Borrador", active:"Activo", deprecated:"Obsoleto", expired:"Expirado", disabled:"Desactivado" };
const getStatusColor = (s) => STATUS_COLOR[s] || "#64748B";
const getStatusLabel = (s) => STATUS_LABEL[s] || s;

// ─── KPI Pill ─────────────────────────────────────────────────────────────────
function KpiPill({ label, value, bg = "#F3F4F6", color = "#374151" }) {
  return (
    <div style={{
      background: bg, borderRadius: 8, padding: "7px 14px",
      border: "1px solid rgba(11,46,109,0.08)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 80,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", width: "100%" }}>
        {label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: "-0.5px", lineHeight: 1.1, textAlign: "center", width: "100%" }}>
        {value}
      </span>
    </div>
  );
}

export default function PlansList() {
  const navigate = useNavigate();

  const [plans,         setPlans]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterVisible, setFilterVisible] = useState("");
  const [filterVigente, setFilterVigente] = useState("");

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (err) {
      message.error("Error al cargar los planes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const filteredPlans = useMemo(() => {
    let result = [...plans];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q));
    }
    if (filterStatus)  result = result.filter(p => p.status === filterStatus);
    if (filterVisible !== "") {
      const b = filterVisible === "true";
      result = result.filter(p => p.visible_for_new_accounts === b);
    }
    if (filterVigente !== "") {
      const today = new Date().toISOString().split("T")[0];
      const b = filterVigente === "true";
      result = result.filter(p => {
        const ok = p.start_date <= today && (!p.end_date || p.end_date >= today);
        return b ? ok : !ok;
      });
    }
    return result;
  }, [plans, searchTerm, filterStatus, filterVisible, filterVigente]);

  const handleToggleVisible = async (plan) => {
    const action = plan.visible_for_new_accounts ? "ocultar" : "mostrar";
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el plan "${plan.name}" para nuevas altas?`)) return;
    try {
      const { toggleVisibility } = await import("../../../../services/plans.service");
      await toggleVisibility(plan.id);
      message.success(`Plan "${plan.name}" ${plan.visible_for_new_accounts ? "ocultado" : "visible"} para nuevas altas`);
      await loadPlans();
    } catch (err) { message.error("Error al cambiar visibilidad"); }
  };

  const handleDeactivate = async (plan) => {
    if (!window.confirm(`¿Desactivar el plan "${plan.name}"?`)) return;
    try {
      const { deactivatePlan } = await import("../../../../services/plans.service");
      await deactivatePlan(plan.id);
      message.success(`Plan "${plan.name}" desactivado`);
      await loadPlans();
    } catch (err) { message.error("Error al desactivar el plan"); }
  };

  const handleSetEndDate = async (plan) => {
    const date = window.prompt("Fecha de fin de vigencia (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!date) return;
    try {
      const { setEndDate } = await import("../../../../services/plans.service");
      await setEndDate(plan.id, date);
      message.success(`Fecha de fin establecida: ${date}`);
      await loadPlans();
    } catch (err) { message.error(err.message || "Error al establecer fecha de fin"); }
  };

  // KPIs
  const kpis = {
    total:      plans.length,
    active:     plans.filter(p => p.status === "active").length,
    draft:      plans.filter(p => p.status === "draft").length,
    deprecated: plans.filter(p => p.status === "deprecated" || p.status === "disabled").length,
    visible:    plans.filter(p => p.visible_for_new_accounts).length,
  };

  return (
    <V2Layout role="superadmin" userName="Administrador">
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 10 }}>
              <FileTextOutlined style={{ fontSize: 22, color: "#7C3AED" }} />
              Planes de Cliente
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              {loading ? "Cargando..." : `${filteredPlans.length} de ${plans.length} planes`}
            </p>
          </div>

          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <KpiPill value={kpis.total}      label="TOTAL"      bg="#F3F4F6" color="#374151" />
            <KpiPill value={kpis.active}     label="ACTIVOS"    bg="#F0FDF4" color="#16A34A" />
            <KpiPill value={kpis.draft}      label="BORRADOR"   bg="#EFF6FF" color="#0071E3" />
            <KpiPill value={kpis.deprecated} label="OBSOLETOS"  bg="#FFFBEB" color="#D97706" />
            <KpiPill value={kpis.visible}    label="VISIBLES"   bg="#F0FDF4" color="#059669" />
          </div>

          {/* ── Filtros + Acciones ───────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Input.Search
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 300 }}
              allowClear
            />
            <Select
              placeholder="Estado"
              value={filterStatus || undefined}
              onChange={setFilterStatus}
              allowClear style={{ width: 160 }}
              options={[
                { value: PLAN_STATUS.DRAFT,        label: "Borrador" },
                { value: PLAN_STATUS.ACTIVE,       label: "Activo" },
                { value: PLAN_STATUS.DEPRECATED,   label: "Obsoleto" },
                { value: PLAN_STATUS.DEACTIVATED,  label: "Desactivado" },
              ]}
            />
            <Select
              placeholder="Visibilidad"
              value={filterVisible || undefined}
              onChange={setFilterVisible}
              allowClear style={{ width: 200 }}
              options={[
                { value: "true",  label: "Visible para nuevas altas" },
                { value: "false", label: "Oculto para nuevas altas" },
              ]}
            />
            <Select
              placeholder="Vigencia"
              value={filterVigente || undefined}
              onChange={setFilterVigente}
              allowClear style={{ width: 160 }}
              options={[
                { value: "true",  label: "Vigente hoy" },
                { value: "false", label: "No vigente" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={loadPlans} loading={loading}>
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/v2/superadmin/planes/nuevo")}
              style={{ background: C.navy, borderColor: C.navy }}
            >
              Nuevo Plan
            </Button>
          </div>

          {/* ── Tabla ────────────────────────────────────────────────────── */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(11,46,109,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
          }}>
            {/* Cabecera */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 90px 70px 160px 200px 180px 120px",
              padding: "10px 18px",
              borderBottom: `1px solid ${C.divider}`,
              background: "#F8FAFC",
            }}>
              {["Plan", "Estado", "Visible", "Vigencia", "Pricing", "Límites", "Acciones"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Cuerpo */}
            {loading ? (
              <div style={{ padding: "32px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando planes...</div>
            ) : filteredPlans.length === 0 ? (
              <div style={{ padding: "32px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>Sin resultados</div>
            ) : filteredPlans.map((plan, i) => (
              <div
                key={plan.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 90px 70px 160px 200px 180px 120px",
                  padding: "12px 18px",
                  borderBottom: i < filteredPlans.length - 1 ? `1px solid ${C.divider}` : "none",
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Plan */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{plan.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{plan.code}</div>
                </div>
                {/* Estado */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: `${getStatusColor(plan.status)}15`,
                    color: getStatusColor(plan.status),
                    border: `1px solid ${getStatusColor(plan.status)}40`,
                  }}>
                    {getStatusLabel(plan.status)}
                  </span>
                </div>
                {/* Visible */}
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: plan.visible_for_new_accounts ? "#DCFCE7" : "#FEE2E2",
                    color:      plan.visible_for_new_accounts ? "#166534" : "#991B1B",
                  }}>
                    {plan.visible_for_new_accounts ? "Sí" : "No"}
                  </span>
                </div>
                {/* Vigencia */}
                <div style={{ fontSize: 11, color: C.text }}>
                  <div><span style={{ color: C.muted }}>Inicio: </span>{fmtDate(plan.start_date)}</div>
                  <div><span style={{ color: C.muted }}>Fin: </span>{plan.end_date ? fmtDate(plan.end_date) : "—"}</div>
                  {plan.deactivated_at && (
                    <div style={{ color: "#DC2626" }}><span>Baja: </span>{fmtDate(plan.deactivated_at)}</div>
                  )}
                </div>
                {/* Pricing */}
                <div style={{ fontSize: 11, color: C.text }}>
                  <div><span style={{ color: C.muted }}>Mensual: </span>{fmtCurrency(plan.monthly_price)}</div>
                  <div><span style={{ color: C.muted }}>Anual: </span>{fmtCurrency(plan.annual_price)}</div>
                  <div style={{ color: C.muted }}>{plan.vat_applicable ? `+${plan.vat_percentage}% IVA` : "IVA incluido"}</div>
                </div>
                {/* Límites */}
                <div style={{ fontSize: 11, color: C.text, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span><span style={{ color: C.muted }}>Owners: </span>{fmtLimit(plan.max_owners)}</span>
                  <span><span style={{ color: C.muted }}>Aloj.: </span>{fmtLimit(plan.max_accommodations)}</span>
                  <span><span style={{ color: C.muted }}>Hab.: </span>{fmtLimit(plan.max_rooms)}</span>
                  <span><span style={{ color: C.muted }}>Users: </span>{fmtLimit((plan.max_admin_users ?? 0) + (plan.max_associated_admins ?? 0))}</span>
                </div>
                {/* Acciones */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Button size="small" onClick={() => navigate(`/v2/superadmin/planes/${plan.id}`)}>Ver</Button>
                  <Button size="small" onClick={() => navigate(`/v2/superadmin/planes/${plan.id}/editar`)}>Editar</Button>
                  <Button size="small" onClick={() => handleToggleVisible(plan)} title={plan.visible_for_new_accounts ? "Ocultar" : "Mostrar"}>
                    {plan.visible_for_new_accounts ? "🔒" : "🔓"}
                  </Button>
                  <Button size="small" onClick={() => handleSetEndDate(plan)} title="Programar caducidad">📅</Button>
                  {plan.status !== PLAN_STATUS.DEACTIVATED && (
                    <Button size="small" danger onClick={() => handleDeactivate(plan)} title="Desactivar">🗑</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </V2Layout>
  );
}
