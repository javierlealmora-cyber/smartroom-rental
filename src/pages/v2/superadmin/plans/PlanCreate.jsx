// =============================================================================
// src/pages/v2/superadmin/plans/PlanCreate.jsx
// Crear Plan de Cliente — estilo Control Center estándar
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, InputNumber, Select, Switch, message } from "antd";
import {
  ArrowLeftOutlined, SaveOutlined, FileAddOutlined,
  TagOutlined, CalendarOutlined, DollarOutlined,
  ControlOutlined, BgColorsOutlined, AppstoreOutlined, SettingOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import {
  PLAN_STATUS,
  AVAILABLE_SERVICES,
  formatCurrency,
} from "../../../../mocks/clientAccountsData";

// ─── Paleta estándar ──────────────────────────────────────────────────────────
const C = {
  text:    "#1A2438",
  muted:   "#8A9BB8",
  light:   "#C0CCD8",
  divider: "rgba(0,0,0,0.07)",
  navy:    "#0B2E6D",
  blue:    "#3B82F6",
  red:     "#DC2626",
};

// ─── Componentes de formulario ────────────────────────────────────────────────
function FieldGroup({ label, required, help, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      {help && !error && <span style={{ fontSize: 11, color: C.muted }}>{help}</span>}
    </div>
  );
}

function SectionCard({ title, description, icon, children }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid rgba(11,46,109,0.08)",
      borderRadius: 12,
      padding: "24px 28px",
      boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 18, display: "flex" }}>{icon}</span>}
          {title}
        </h2>
        {description && <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", paddingLeft: icon ? 26 : 0 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

const SECTIONS = [
  { id: "identity", label: "Identidad" },
  { id: "status",   label: "Estado y Vigencia" },
  { id: "pricing",  label: "Pricing" },
  { id: "limits",   label: "Límites" },
  { id: "branding", label: "Branding" },
  { id: "services", label: "Servicios" },
  { id: "rules",    label: "Reglas" },
];

// ─── Grid de 2 columnas ───────────────────────────────────────────────────────
function Grid2({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
      {children}
    </div>
  );
}

function FullRow({ children }) {
  return <div style={{ gridColumn: "1 / -1" }}>{children}</div>;
}

export default function PlanCreate() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("identity");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: PLAN_STATUS.DRAFT,
    visible_for_new_accounts: false,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    price_monthly: "",
    annual_discount_months: 2,
    price_annual: "",
    vat_applicable: true,
    vat_percentage: 21,
    max_owners: 1,
    max_accommodations: 3,
    max_rooms: 20,
    max_admin_users: 1,
    max_associated_admins: 0,
    max_api_users: 0,
    max_viewer_users: 0,
    branding_enabled: false,
    logo_allowed: false,
    theme_editable: false,
    services_included: [],
    allows_multi_owner: false,
    allows_owner_change: false,
    allows_receipt_upload: true,
  });

  const set = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "price_monthly" || field === "annual_discount_months") {
        const monthly  = field === "price_monthly" ? parseFloat(value) || 0 : parseFloat(prev.price_monthly) || 0;
        const discount = field === "annual_discount_months" ? parseInt(value) || 0 : prev.annual_discount_months;
        next.price_annual = (monthly * (12 - discount)).toFixed(2);
      }
      if (field === "allows_multi_owner" && !value) next.max_owners = 1;
      if (field === "name" && !prev.code) {
        next.code = value.toLowerCase().normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "_").trim();
      }
      return next;
    });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const toggleService = (id) => {
    setFormData((prev) => ({
      ...prev,
      services_included: prev.services_included.includes(id)
        ? prev.services_included.filter((s) => s !== id)
        : [...prev.services_included, id],
    }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "El nombre es obligatorio";
    if (!formData.code.trim()) e.code = "El código es obligatorio";
    else if (!/^[a-z0-9_]+$/.test(formData.code)) e.code = "Solo minúsculas, números y guiones bajos";
    if (!formData.price_monthly || parseFloat(formData.price_monthly) < 0)
      e.price_monthly = "Precio mensual obligatorio y ≥ 0";
    if (formData.max_owners < -1 || formData.max_owners === 0)
      e.max_owners = "Debe ser -1 (ilimitado) o > 0";
    if (formData.status === PLAN_STATUS.ACTIVE && !formData.start_date)
      e.start_date = "Obligatoria para planes activos";
    if (!formData.allows_multi_owner && formData.max_owners !== 1)
      e.max_owners = "Sin multi-owner, el máximo debe ser 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      const ef = Object.keys(errors);
      if (ef.some(f => ["name","code","description"].includes(f))) setActiveSection("identity");
      else if (ef.some(f => ["status","start_date","end_date"].includes(f))) setActiveSection("status");
      else if (ef.some(f => f.startsWith("price") || f === "vat_percentage")) setActiveSection("pricing");
      else if (ef.some(f => f.startsWith("max_"))) setActiveSection("limits");
      return;
    }
    setSaving(true);
    try {
      // TODO: conectar a plans.service.createPlan(formData)
      console.log("Crear plan:", formData);
      message.success("Plan creado correctamente");
      navigate("/v2/superadmin/planes");
    } catch (err) {
      message.error(err.message || "Error al crear el plan");
    } finally {
      setSaving(false);
    }
  };

  const currentIdx = SECTIONS.findIndex(s => s.id === activeSection);

  return (
    <V2Layout role="superadmin" userName="Administrador">
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 10 }}>
              <FileAddOutlined style={{ fontSize: 22, color: "#7C3AED" }} />
              Nuevo Plan de Cliente
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              Configura todos los parámetros del nuevo plan
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/superadmin/planes")}>
              Cancelar
            </Button>
            <Button
              type="primary" icon={<SaveOutlined />}
              loading={saving} onClick={handleSubmit}
              style={{ background: C.navy, borderColor: C.navy }}
            >
              Crear Plan
            </Button>
          </div>
        </div>

        {/* ── Layout: sidebar + contenido ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

          {/* Sidebar de secciones */}
          <div style={{
            width: 180, flexShrink: 0,
            background: "#fff",
            border: "1px solid rgba(11,46,109,0.08)",
            borderRadius: 12,
            padding: "8px 0",
            boxShadow: "0 1px 4px rgba(11,46,109,0.04)",
          }}>
            {SECTIONS.map((s, idx) => {
              const isActive = s.id === activeSection;
              const hasError = Object.keys(errors).some(f =>
                (s.id === "identity" && ["name","code","description"].includes(f)) ||
                (s.id === "status"   && ["status","start_date","end_date"].includes(f)) ||
                (s.id === "pricing"  && f.startsWith("price")) ||
                (s.id === "limits"   && f.startsWith("max_"))
              );
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", textAlign: "left",
                    padding: "10px 16px",
                    background: isActive ? "rgba(11,46,109,0.06)" : "transparent",
                    border: "none",
                    borderLeft: isActive ? `3px solid ${C.navy}` : "3px solid transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 400,
                    color: hasError ? C.red : isActive ? C.navy : C.text,
                    transition: "all 0.12s",
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: isActive ? C.navy : "#F1F5F9",
                    color: isActive ? "#fff" : C.muted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {idx + 1}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Contenido del paso activo */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Identidad ─────────────────────────────────────────── */}
            {activeSection === "identity" && (
              <SectionCard title="Identidad del Plan" description="Información básica que identifica este plan" icon={<TagOutlined style={{ color: "#2563EB" }} />}>
                <Grid2>
                  <FieldGroup label="Nombre" required error={errors.name}>
                    <Input
                      value={formData.name}
                      onChange={e => set("name", e.target.value)}
                      placeholder="Ej: Business Pro"
                      status={errors.name ? "error" : ""}
                    />
                  </FieldGroup>
                  <FieldGroup label="Código" required error={errors.code} help="Solo minúsculas, números y guiones bajos">
                    <Input
                      value={formData.code}
                      onChange={e => set("code", e.target.value.toLowerCase())}
                      placeholder="business_pro"
                      status={errors.code ? "error" : ""}
                      style={{ fontFamily: "monospace" }}
                    />
                  </FieldGroup>
                  <FullRow>
                    <FieldGroup label="Descripción">
                      <Input.TextArea
                        value={formData.description}
                        onChange={e => set("description", e.target.value)}
                        placeholder="Descripción del plan y sus características principales..."
                        rows={3}
                      />
                    </FieldGroup>
                  </FullRow>
                </Grid2>
              </SectionCard>
            )}

            {/* ── Estado y Vigencia ─────────────────────────────────── */}
            {activeSection === "status" && (
              <SectionCard title="Estado y Vigencia" description="Estado inicial y fechas de vigencia del plan" icon={<CalendarOutlined style={{ color: "#059669" }} />}>
                <Grid2>
                  <FieldGroup label="Estado inicial" help="Los planes en borrador no son visibles para nuevas altas">
                    <Select
                      value={formData.status}
                      onChange={v => set("status", v)}
                      options={[
                        { value: PLAN_STATUS.DRAFT,  label: "Borrador" },
                        { value: PLAN_STATUS.ACTIVE, label: "Activo" },
                      ]}
                    />
                  </FieldGroup>
                  <FieldGroup label="Visible para nuevas altas">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                      <Switch
                        checked={formData.visible_for_new_accounts}
                        onChange={v => set("visible_for_new_accounts", v)}
                        disabled={formData.status === PLAN_STATUS.DRAFT}
                      />
                      <span style={{ fontSize: 13, color: C.text }}>
                        {formData.visible_for_new_accounts ? "Sí" : "No"}
                      </span>
                    </div>
                  </FieldGroup>
                  <FieldGroup
                    label="Fecha inicio vigencia"
                    required={formData.status === PLAN_STATUS.ACTIVE}
                    error={errors.start_date}
                  >
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={e => set("start_date", e.target.value)}
                      status={errors.start_date ? "error" : ""}
                    />
                  </FieldGroup>
                  <FieldGroup label="Fecha fin vigencia" help="Dejar vacío si no caduca">
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={e => set("end_date", e.target.value)}
                    />
                  </FieldGroup>
                </Grid2>
              </SectionCard>
            )}

            {/* ── Pricing ───────────────────────────────────────────── */}
            {activeSection === "pricing" && (
              <SectionCard title="Pricing" description="Precios y descuentos del plan" icon={<DollarOutlined style={{ color: "#D97706" }} />}>
                <Grid2>
                  <FieldGroup label="Precio mensual (EUR)" required error={errors.price_monthly}>
                    <InputNumber
                      value={formData.price_monthly}
                      onChange={v => set("price_monthly", v)}
                      min={0} step={0.01} precision={2}
                      placeholder="29.99"
                      status={errors.price_monthly ? "error" : ""}
                      style={{ width: "100%" }}
                      addonAfter="€"
                    />
                  </FieldGroup>
                  <FieldGroup label="Meses gratis (descuento anual)" help="Meses gratis al pagar anualmente (por defecto 2)">
                    <InputNumber
                      value={formData.annual_discount_months}
                      onChange={v => set("annual_discount_months", v)}
                      min={0} max={6}
                      style={{ width: "100%" }}
                    />
                  </FieldGroup>
                  <FieldGroup
                    label="Precio anual (EUR)"
                    help={`Auto-calculado: ${formData.price_monthly ? formatCurrency((parseFloat(formData.price_monthly) || 0) * (12 - formData.annual_discount_months)) : "—"}`}
                  >
                    <InputNumber
                      value={formData.price_annual}
                      onChange={v => set("price_annual", v)}
                      min={0} step={0.01} precision={2}
                      placeholder="Auto-calculado"
                      style={{ width: "100%" }}
                      addonAfter="€"
                    />
                  </FieldGroup>
                  <FieldGroup label="IVA aplicable">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                      <Switch checked={formData.vat_applicable} onChange={v => set("vat_applicable", v)} />
                      <span style={{ fontSize: 13, color: C.text }}>{formData.vat_applicable ? "Sí" : "No"}</span>
                    </div>
                  </FieldGroup>
                  {formData.vat_applicable && (
                    <FieldGroup label="% IVA">
                      <InputNumber
                        value={formData.vat_percentage}
                        onChange={v => set("vat_percentage", v)}
                        min={0} max={100}
                        style={{ width: "100%" }}
                        addonAfter="%"
                      />
                    </FieldGroup>
                  )}
                </Grid2>

                {/* Resumen */}
                <div style={{
                  marginTop: 20, padding: "16px 20px",
                  background: "#F8FAFC", borderRadius: 10,
                  border: `1px solid ${C.divider}`,
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px",
                }}>
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: C.light, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                    Resumen de precios
                  </div>
                  {[
                    { l: "Mensual (sin IVA)", v: formatCurrency(parseFloat(formData.price_monthly) || 0) },
                    { l: "Anual (sin IVA)",   v: formatCurrency(parseFloat(formData.price_annual)  || 0) },
                    ...(formData.vat_applicable ? [
                      { l: `Mensual (+${formData.vat_percentage}% IVA)`, v: formatCurrency((parseFloat(formData.price_monthly)||0) * (1 + formData.vat_percentage/100)) },
                      { l: `Anual (+${formData.vat_percentage}% IVA)`,   v: formatCurrency((parseFloat(formData.price_annual) ||0) * (1 + formData.vat_percentage/100)) },
                    ] : []),
                  ].map(({ l, v }) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Límites ───────────────────────────────────────────── */}
            {activeSection === "limits" && (
              <SectionCard title="Límites del Plan" description="Límites de recursos. Usa -1 para ilimitado." icon={<ControlOutlined style={{ color: "#DC2626" }} />}>
                <Grid2>
                  {[
                    { field: "max_owners",           label: "Max Entidades Propietarias", min: -1, disabled: !formData.allows_multi_owner, help: "-1 = ilimitado", error: errors.max_owners },
                    { field: "max_accommodations",   label: "Max Alojamientos",           min: -1, error: errors.max_accommodations },
                    { field: "max_rooms",            label: "Max Habitaciones",           min: -1, error: errors.max_rooms },
                    { field: "max_admin_users",      label: "Max Usuarios Admin",         min: 1, max: 3, help: "Máximo 3 por cuenta" },
                    { field: "max_associated_admins",label: "Max Usuarios Asociados",     min: 0, max: 2, help: "0-2 típicamente" },
                    { field: "max_api_users",        label: "Max Usuarios API",           min: -1 },
                    { field: "max_viewer_users",     label: "Max Usuarios Viewer",        min: -1 },
                  ].map(({ field, label, min, max, disabled, help, error }) => (
                    <FieldGroup key={field} label={label} help={help} error={error}>
                      <InputNumber
                        value={formData[field]}
                        onChange={v => set(field, v)}
                        min={min} max={max}
                        disabled={disabled}
                        status={error ? "error" : ""}
                        style={{ width: "100%" }}
                      />
                    </FieldGroup>
                  ))}
                </Grid2>
              </SectionCard>
            )}

            {/* ── Branding ──────────────────────────────────────────── */}
            {activeSection === "branding" && (
              <SectionCard title="Branding" description="Opciones de personalización visual para este plan" icon={<BgColorsOutlined style={{ color: "#EC4899" }} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {[
                    { field: "branding_enabled", label: "Branding editable",  help: "Permite al cliente personalizar colores y estilos", disabled: false },
                    { field: "logo_allowed",     label: "Logo permitido",      help: "Permite subir un logotipo personalizado",           disabled: !formData.branding_enabled },
                    { field: "theme_editable",   label: "Tema editable",       help: "Permite editar la paleta de colores del portal",     disabled: !formData.branding_enabled },
                  ].map(({ field, label, help, disabled }) => (
                    <div key={field} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "#F8FAFC", borderRadius: 8,
                      border: `1px solid ${C.divider}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: disabled ? C.light : C.text }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{help}</div>
                      </div>
                      <Switch
                        checked={formData[field]}
                        onChange={v => set(field, v)}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Servicios ─────────────────────────────────────────── */}
            {activeSection === "services" && (
              <SectionCard title="Servicios Incluidos" description="Selecciona los servicios disponibles en este plan" icon={<AppstoreOutlined style={{ color: "#0891B2" }} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {(AVAILABLE_SERVICES || []).map((svc) => {
                    const selected = formData.services_included.includes(svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        style={{
                          padding: "14px 16px",
                          border: `1px solid ${selected ? C.navy : C.divider}`,
                          borderRadius: 10,
                          background: selected ? "rgba(11,46,109,0.04)" : "#fff",
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: `2px solid ${selected ? C.navy : C.light}`,
                            background: selected ? C.navy : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {selected && <svg width="8" height="8" viewBox="0 0 8 8"><polyline points="1,4 3,6 7,2" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: selected ? C.navy : C.text }}>{svc.name}</span>
                        </div>
                        {svc.description && (
                          <p style={{ fontSize: 11, color: C.muted, margin: "6px 0 0 26px" }}>{svc.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formData.services_included.length > 0 && (
                  <div style={{ marginTop: 14, fontSize: 12, color: C.muted }}>
                    <strong style={{ color: C.text }}>{formData.services_included.length} seleccionados: </strong>
                    {formData.services_included.map(id => (AVAILABLE_SERVICES || []).find(s => s.id === id)?.name).filter(Boolean).join(", ")}
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── Reglas ────────────────────────────────────────────── */}
            {activeSection === "rules" && (
              <SectionCard title="Reglas Funcionales" description="Reglas de negocio específicas de este plan" icon={<SettingOutlined style={{ color: "#64748B" }} />}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    {
                      field: "allows_multi_owner",
                      label: "Permite multi-owner",
                      desc: "Múltiples entidades propietarias. Si desactivado, max_owners = 1.",
                      disabled: false,
                    },
                    {
                      field: "allows_owner_change",
                      label: "Permite cambio de owner",
                      desc: "Reasignar alojamientos entre propietarios. Solo planes tipo Agencia.",
                      disabled: !formData.allows_multi_owner,
                    },
                    {
                      field: "allows_receipt_upload",
                      label: "Permite subir resguardo",
                      desc: "Subir resguardos de pago para cobros externos o transferencias.",
                      disabled: false,
                    },
                  ].map(({ field, label, desc, disabled }) => (
                    <div key={field} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "#F8FAFC", borderRadius: 8,
                      border: `1px solid ${C.divider}`,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: disabled ? C.light : C.text }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>
                      </div>
                      <Switch
                        checked={formData[field]}
                        onChange={v => set(field, v)}
                        disabled={disabled}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Navegación entre pasos ────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
              <Button
                disabled={currentIdx === 0}
                onClick={() => setActiveSection(SECTIONS[currentIdx - 1].id)}
              >
                ← Anterior
              </Button>
              {currentIdx < SECTIONS.length - 1 ? (
                <Button
                  type="primary"
                  style={{ background: C.navy, borderColor: C.navy }}
                  onClick={() => setActiveSection(SECTIONS[currentIdx + 1].id)}
                >
                  Siguiente →
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSubmit}
                  style={{ background: C.navy, borderColor: C.navy }}
                >
                  Crear Plan
                </Button>
              )}
            </div>

          </div>
        </div>

      </div>
      </div>
    </V2Layout>
  );
}
