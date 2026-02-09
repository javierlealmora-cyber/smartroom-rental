// =============================================================================
// src/pages/v2/superadmin/plans/PlanDetail.jsx
// =============================================================================
// DBSU-PC-ED: Editar Plan de Cliente
// Pantalla para ver y editar un plan existente
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import {
  mockPlans,
  PLAN_STATUS,
  AVAILABLE_SERVICES,
  getPlanById,
  getPlanStatusLabel,
  getPlanStatusColor,
  formatCurrency,
  formatDate,
  formatLimit,
} from "../../../../mocks/clientAccountsData";

export default function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = location.pathname.includes("/editar");

  const [plan, setPlan] = useState(null);
  const [activeSection, setActiveSection] = useState("identity");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    const foundPlan = getPlanById(id);
    if (foundPlan) {
      setPlan(foundPlan);
      setFormData({ ...foundPlan });
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-calcular precio anual
      if (field === "price_monthly" || field === "annual_discount_months") {
        const monthly = field === "price_monthly" ? parseFloat(value) || 0 : parseFloat(prev.price_monthly) || 0;
        const discount = field === "annual_discount_months" ? parseInt(value) || 0 : prev.annual_discount_months;
        newData.price_annual = (monthly * (12 - discount)).toFixed(2);
      }

      // Si no permite multi-owner, max_owners debe ser 1
      if (field === "allows_multi_owner" && !value) {
        newData.max_owners = 1;
      }

      return newData;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => {
      const services = prev.services_included.includes(serviceId)
        ? prev.services_included.filter((s) => s !== serviceId)
        : [...prev.services_included, serviceId];
      return { ...prev, services_included: services };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!formData.price_monthly || parseFloat(formData.price_monthly) < 0) {
      newErrors.price_monthly = "El precio mensual es obligatorio y no puede ser negativo";
    }

    // No permitir bajar límites por debajo del uso real (warning)
    // En una implementación real, esto consultaría el uso actual
    // Por ahora, solo validamos valores negativos incorrectos
    if (formData.max_owners !== -1 && formData.max_owners < 1) {
      newErrors.max_owners = "El valor debe ser -1 (ilimitado) o mayor que 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    console.log("Guardar plan:", formData);
    alert("Plan actualizado correctamente (mock)");
    navigate("/v2/superadmin/planes");
  };

  const handleDeactivate = () => {
    if (window.confirm(`¿Desactivar el plan "${plan.name}"? Esta acción marcará el plan como desactivado.`)) {
      alert(`Plan "${plan.name}" desactivado (mock)`);
      navigate("/v2/superadmin/planes");
    }
  };

  if (!plan || !formData) {
    return (
      <V2Layout role="superadmin" userName="Administrador">
        <div style={styles.loading}>Cargando plan...</div>
      </V2Layout>
    );
  }

  const sections = [
    { id: "identity", label: "Identidad", icon: "🏷️" },
    { id: "status", label: "Estado y Vigencia", icon: "📅" },
    { id: "pricing", label: "Pricing", icon: "💰" },
    { id: "limits", label: "Límites", icon: "📊" },
    { id: "branding", label: "Branding", icon: "🎨" },
    { id: "services", label: "Servicios", icon: "⚡" },
    { id: "rules", label: "Reglas", icon: "⚙️" },
  ];

  // Vista de solo lectura
  if (!isEditMode) {
    return (
      <V2Layout
        role="superadmin"
        userName="Administrador"
        customBreadcrumbs={[
          { label: "Dashboard", path: "/v2/superadmin" },
          { label: "Gestión de Planes", path: "/v2/superadmin/planes" },
          { label: plan.name, path: null },
        ]}
      >
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{plan.name}</h1>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: `${getPlanStatusColor(plan.status)}15`,
                  color: getPlanStatusColor(plan.status),
                  border: `1px solid ${getPlanStatusColor(plan.status)}40`,
                }}
              >
                {getPlanStatusLabel(plan.status)}
              </span>
            </div>
            <p style={styles.subtitle}>Código: {plan.code}</p>
          </div>
          <div style={styles.headerActions}>
            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/v2/superadmin/planes")}
            >
              Volver
            </button>
            <button
              style={styles.primaryButton}
              onClick={() => navigate(`/v2/superadmin/planes/${id}/editar`)}
            >
              Editar Plan
            </button>
          </div>
        </div>

        {/* Contenido de solo lectura */}
        <div style={styles.detailGrid}>
          {/* Card: Información General */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Información General</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Nombre</span>
              <span style={styles.detailValue}>{plan.name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Código</span>
              <span style={styles.detailValueCode}>{plan.code}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Descripción</span>
              <span style={styles.detailValue}>{plan.description || "-"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Visible para nuevas altas</span>
              <span style={styles.detailValue}>
                {plan.visible_for_new_accounts ? "Sí" : "No"}
              </span>
            </div>
          </div>

          {/* Card: Vigencia */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Vigencia</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Fecha creación</span>
              <span style={styles.detailValue}>{formatDate(plan.created_at)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Fecha inicio</span>
              <span style={styles.detailValue}>{formatDate(plan.start_date)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Fecha fin</span>
              <span style={styles.detailValue}>{plan.end_date ? formatDate(plan.end_date) : "Sin fecha"}</span>
            </div>
            {plan.deactivated_at && (
              <>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Fecha baja</span>
                  <span style={styles.detailValueWarning}>{formatDate(plan.deactivated_at)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Motivo baja</span>
                  <span style={styles.detailValue}>{plan.deactivation_reason || "-"}</span>
                </div>
              </>
            )}
          </div>

          {/* Card: Pricing */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Pricing</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Precio mensual</span>
              <span style={styles.detailValueBold}>{formatCurrency(plan.price_monthly)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Precio anual</span>
              <span style={styles.detailValueBold}>{formatCurrency(plan.price_annual)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Meses gratis</span>
              <span style={styles.detailValue}>{plan.annual_discount_months}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>IVA</span>
              <span style={styles.detailValue}>
                {plan.vat_applicable ? `${plan.vat_percentage}%` : "No aplica"}
              </span>
            </div>
          </div>

          {/* Card: Límites */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Límites</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Owners</span>
              <span style={styles.detailValue}>{formatLimit(plan.max_owners)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Alojamientos</span>
              <span style={styles.detailValue}>{formatLimit(plan.max_accommodations)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Habitaciones</span>
              <span style={styles.detailValue}>{formatLimit(plan.max_rooms)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Usuarios Admin</span>
              <span style={styles.detailValue}>{plan.max_admin_users}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Asociados</span>
              <span style={styles.detailValue}>{plan.max_associated_users}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max API</span>
              <span style={styles.detailValue}>{formatLimit(plan.max_api_users)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Max Viewers</span>
              <span style={styles.detailValue}>{formatLimit(plan.max_viewer_users)}</span>
            </div>
          </div>

          {/* Card: Branding */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Branding</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Branding editable</span>
              <span style={styles.detailValue}>{plan.branding_enabled ? "Sí" : "No"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Logo permitido</span>
              <span style={styles.detailValue}>{plan.logo_allowed ? "Sí" : "No"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Tema editable</span>
              <span style={styles.detailValue}>{plan.theme_editable ? "Sí" : "No"}</span>
            </div>
          </div>

          {/* Card: Servicios */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Servicios Incluidos</h3>
            {plan.services_included.length === 0 ? (
              <p style={styles.noServices}>Ningún servicio incluido</p>
            ) : (
              <div style={styles.servicesList}>
                {plan.services_included.map((serviceId) => {
                  const service = AVAILABLE_SERVICES.find((s) => s.id === serviceId);
                  return service ? (
                    <span key={serviceId} style={styles.serviceTag}>
                      {service.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Card: Reglas */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Reglas Funcionales</h3>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Multi-owner</span>
              <span style={styles.detailValue}>{plan.allows_multi_owner ? "Sí" : "No"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Cambio de owner</span>
              <span style={styles.detailValue}>{plan.allows_owner_change ? "Sí" : "No"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Subir resguardo</span>
              <span style={styles.detailValue}>{plan.allows_receipt_upload ? "Sí" : "No"}</span>
            </div>
          </div>
        </div>
      </V2Layout>
    );
  }

  // Vista de edición
  return (
    <V2Layout
      role="superadmin"
      userName="Administrador"
      customBreadcrumbs={[
        { label: "Dashboard", path: "/v2/superadmin" },
        { label: "Gestión de Planes", path: "/v2/superadmin/planes" },
        { label: plan.name, path: `/v2/superadmin/planes/${id}` },
        { label: "Editar", path: null },
      ]}
    >
      {/* Header con acciones */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Editar Plan: {plan.name}</h1>
          <p style={styles.subtitle}>Modifique los parámetros del plan</p>
        </div>
        <div style={styles.headerActions}>
          {formData.status !== PLAN_STATUS.DEACTIVATED && (
            <button style={styles.dangerButton} onClick={handleDeactivate}>
              Desactivar Plan
            </button>
          )}
          <button
            style={styles.secondaryButton}
            onClick={() => navigate(`/v2/superadmin/planes/${id}`)}
          >
            Cancelar
          </button>
          <button style={styles.primaryButton} onClick={handleSubmit}>
            Guardar Cambios
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Sidebar de secciones */}
        <div style={styles.sidebar}>
          {sections.map((section) => (
            <button
              key={section.id}
              style={{
                ...styles.sectionButton,
                ...(activeSection === section.id ? styles.sectionButtonActive : {}),
              }}
              onClick={() => setActiveSection(section.id)}
            >
              <span style={styles.sectionIcon}>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Formulario de edición */}
        <form style={styles.form} onSubmit={handleSubmit}>
          {/* Sección 1: Identidad */}
          {activeSection === "identity" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Identidad del Plan</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre <span style={styles.required}>*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                  />
                  {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Código</label>
                  <input
                    type="text"
                    value={formData.code}
                    style={styles.inputDisabled}
                    disabled
                  />
                  <span style={styles.helpText}>El código no se puede modificar</span>
                </div>
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sección 2: Estado y Vigencia */}
          {activeSection === "status" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Estado y Vigencia</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    style={styles.select}
                  >
                    <option value={PLAN_STATUS.DRAFT}>Borrador</option>
                    <option value={PLAN_STATUS.ACTIVE}>Activo</option>
                    <option value={PLAN_STATUS.INACTIVE}>Inactivo</option>
                    <option value={PLAN_STATUS.DEPRECATED}>Obsoleto</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Visible para nuevas altas</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.visible_for_new_accounts}
                      onChange={(e) => handleChange("visible_for_new_accounts", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>{formData.visible_for_new_accounts ? "Sí" : "No"}</span>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha inicio</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha fin</label>
                  <input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    style={styles.input}
                  />
                </div>
                {plan.deactivated_at && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Fecha baja</label>
                      <input
                        type="text"
                        value={formatDate(plan.deactivated_at)}
                        style={styles.inputDisabled}
                        disabled
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Motivo baja</label>
                      <input
                        type="text"
                        value={formData.deactivation_reason || ""}
                        onChange={(e) => handleChange("deactivation_reason", e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sección 3: Pricing */}
          {activeSection === "pricing" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Pricing</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Precio mensual (EUR) <span style={styles.required}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_monthly}
                    onChange={(e) => handleChange("price_monthly", e.target.value)}
                    style={{ ...styles.input, ...(errors.price_monthly ? styles.inputError : {}) }}
                  />
                  {errors.price_monthly && <span style={styles.errorText}>{errors.price_monthly}</span>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Meses gratis (anual)</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={formData.annual_discount_months}
                    onChange={(e) => handleChange("annual_discount_months", e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Precio anual (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_annual}
                    onChange={(e) => handleChange("price_annual", e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>IVA aplicable</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.vat_applicable}
                      onChange={(e) => handleChange("vat_applicable", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>{formData.vat_applicable ? "Sí" : "No"}</span>
                  </div>
                </div>
                {formData.vat_applicable && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>% IVA</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.vat_percentage}
                      onChange={(e) => handleChange("vat_percentage", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección 4: Límites */}
          {activeSection === "limits" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Límites del Plan</h2>
              <div style={styles.warningBox}>
                <span style={styles.warningIcon}>⚠️</span>
                <span>
                  No se permite bajar límites por debajo del uso actual de las cuentas asignadas a este plan.
                </span>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Owners</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_owners}
                    onChange={(e) => handleChange("max_owners", parseInt(e.target.value))}
                    style={{ ...styles.input, ...(errors.max_owners ? styles.inputError : {}) }}
                    disabled={!formData.allows_multi_owner}
                  />
                  {errors.max_owners && <span style={styles.errorText}>{errors.max_owners}</span>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Alojamientos</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_accommodations}
                    onChange={(e) => handleChange("max_accommodations", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Habitaciones</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_rooms}
                    onChange={(e) => handleChange("max_rooms", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Admin</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={formData.max_admin_users}
                    onChange={(e) => handleChange("max_admin_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Asociados</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    value={formData.max_associated_users}
                    onChange={(e) => handleChange("max_associated_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max API</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_api_users}
                    onChange={(e) => handleChange("max_api_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Viewers</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_viewer_users}
                    onChange={(e) => handleChange("max_viewer_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sección 5: Branding */}
          {activeSection === "branding" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Branding</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Branding editable</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.branding_enabled}
                      onChange={(e) => handleChange("branding_enabled", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>{formData.branding_enabled ? "Sí" : "No"}</span>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Logo permitido</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.logo_allowed}
                      onChange={(e) => handleChange("logo_allowed", e.target.checked)}
                      style={styles.checkbox}
                      disabled={!formData.branding_enabled}
                    />
                    <span>{formData.logo_allowed ? "Sí" : "No"}</span>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tema editable</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.theme_editable}
                      onChange={(e) => handleChange("theme_editable", e.target.checked)}
                      style={styles.checkbox}
                      disabled={!formData.branding_enabled}
                    />
                    <span>{formData.theme_editable ? "Sí" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección 6: Servicios */}
          {activeSection === "services" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Servicios Incluidos</h2>
              <div style={styles.servicesGrid}>
                {AVAILABLE_SERVICES.map((service) => (
                  <div
                    key={service.id}
                    style={{
                      ...styles.serviceCard,
                      ...(formData.services_included.includes(service.id) ? styles.serviceCardSelected : {}),
                    }}
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    <div style={styles.serviceHeader}>
                      <input
                        type="checkbox"
                        checked={formData.services_included.includes(service.id)}
                        onChange={() => {}}
                        style={styles.serviceCheckbox}
                      />
                      <span style={styles.serviceName}>{service.name}</span>
                    </div>
                    <p style={styles.serviceDescription}>{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección 7: Reglas */}
          {activeSection === "rules" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Reglas Funcionales</h2>
              <div style={styles.rulesGrid}>
                <div style={styles.ruleCard}>
                  <div style={styles.ruleHeader}>
                    <input
                      type="checkbox"
                      checked={formData.allows_multi_owner}
                      onChange={(e) => handleChange("allows_multi_owner", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span style={styles.ruleName}>Permite multi-owner</span>
                  </div>
                  <p style={styles.ruleDescription}>
                    Permite múltiples entidades propietarias. Si se desactiva, max_owners será 1.
                  </p>
                </div>
                <div style={styles.ruleCard}>
                  <div style={styles.ruleHeader}>
                    <input
                      type="checkbox"
                      checked={formData.allows_owner_change}
                      onChange={(e) => handleChange("allows_owner_change", e.target.checked)}
                      style={styles.checkbox}
                      disabled={!formData.allows_multi_owner}
                    />
                    <span style={styles.ruleName}>Permite cambio de owner</span>
                  </div>
                  <p style={styles.ruleDescription}>
                    Permite reasignar alojamientos entre propietarios.
                  </p>
                </div>
                <div style={styles.ruleCard}>
                  <div style={styles.ruleHeader}>
                    <input
                      type="checkbox"
                      checked={formData.allows_receipt_upload}
                      onChange={(e) => handleChange("allows_receipt_upload", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span style={styles.ruleName}>Permite subir resguardo</span>
                  </div>
                  <p style={styles.ruleDescription}>
                    Permite subir resguardos de pago para cobros externos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </V2Layout>
  );
}

const styles = {
  loading: {
    padding: 48,
    textAlign: "center",
    color: "#6B7280",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
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
  statusBadge: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "500",
  },
  headerActions: {
    display: "flex",
    gap: 12,
  },
  primaryButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
  },
  secondaryButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  dangerButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FEE2E2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    cursor: "pointer",
    color: "#991B1B",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 24,
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
    margin: "0 0 16px 0",
    paddingBottom: 12,
    borderBottom: "1px solid #E5E7EB",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "8px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    textAlign: "right",
    maxWidth: "60%",
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  detailValueCode: {
    fontSize: 13,
    color: "#111827",
    fontFamily: "monospace",
    backgroundColor: "#F3F4F6",
    padding: "2px 8px",
    borderRadius: 4,
  },
  detailValueWarning: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "500",
  },
  noServices: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  servicesList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceTag: {
    display: "inline-block",
    padding: "6px 12px",
    backgroundColor: "#E0E7FF",
    color: "#3730A3",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    display: "flex",
    gap: 24,
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
  },
  sectionButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px 14px",
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    color: "#374151",
    textAlign: "left",
  },
  sectionButtonActive: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    borderColor: "#111827",
  },
  sectionIcon: {
    fontSize: 16,
  },
  form: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 20px 0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
  },
  inputDisabled: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  select: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  textarea: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    resize: "vertical",
    fontFamily: "inherit",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  toggleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  warningBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF3C7",
    border: "1px solid #F59E0B",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    color: "#92400E",
  },
  warningIcon: {
    fontSize: 20,
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  },
  serviceCard: {
    padding: 16,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    cursor: "pointer",
  },
  serviceCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  serviceHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  serviceCheckbox: {
    width: 18,
    height: 18,
    pointerEvents: "none",
  },
  serviceName: {
    fontWeight: "600",
    color: "#111827",
  },
  serviceDescription: {
    fontSize: 13,
    color: "#6B7280",
    margin: 0,
    paddingLeft: 28,
  },
  rulesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  ruleCard: {
    padding: 16,
    border: "1px solid #E5E7EB",
    borderRadius: 12,
  },
  ruleHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  ruleName: {
    fontWeight: "600",
    color: "#111827",
    fontSize: 15,
  },
  ruleDescription: {
    fontSize: 13,
    color: "#6B7280",
    margin: 0,
    paddingLeft: 28,
  },
};
