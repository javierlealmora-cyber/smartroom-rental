// =============================================================================
// src/pages/v2/superadmin/plans/PlanCreate.jsx
// =============================================================================
// DBSU-PC-CR: Crear Plan de Cliente
// Formulario completo para crear un nuevo plan con plantilla única
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import {
  PLAN_STATUS,
  AVAILABLE_SERVICES,
  formatCurrency,
} from "../../../../mocks/clientAccountsData";

export default function PlanCreate() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("identity");
  const [errors, setErrors] = useState({});

  // Estado del formulario - plantilla única para todos los planes
  const [formData, setFormData] = useState({
    // 1. Identidad del plan
    name: "",
    code: "",
    description: "",

    // 2. Estado y vigencia
    status: PLAN_STATUS.DRAFT,
    visible_for_new_accounts: false,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",

    // 3. Pricing
    price_monthly: "",
    annual_discount_months: 2,
    price_annual: "",
    vat_applicable: true,
    vat_percentage: 21,

    // 4. Límites del plan
    max_owners: 1,
    max_accommodations: 3,
    max_rooms: 20,
    max_admin_users: 1,
    max_associated_users: 0,
    max_api_users: 0,
    max_viewer_users: 0,

    // 5. Branding habilitado
    branding_enabled: false,
    logo_allowed: false,
    theme_editable: false,

    // 6. Servicios incluidos
    services_included: [],

    // 7. Reglas funcionales
    allows_multi_owner: false,
    allows_owner_change: false,
    allows_receipt_upload: true,
  });

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

      // Generar código automático
      if (field === "name" && !prev.code) {
        newData.code = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .trim();
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

    // Validar identidad
    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!formData.code.trim()) newErrors.code = "El código es obligatorio";
    if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = "El código solo puede contener letras minúsculas, números y guiones bajos";
    }

    // Validar pricing
    if (!formData.price_monthly || parseFloat(formData.price_monthly) < 0) {
      newErrors.price_monthly = "El precio mensual es obligatorio y no puede ser negativo";
    }

    // Validar límites (no negativos)
    if (formData.max_owners < -1 || formData.max_owners === 0) {
      newErrors.max_owners = "El valor debe ser -1 (ilimitado) o mayor que 0";
    }
    if (formData.max_accommodations < -1) {
      newErrors.max_accommodations = "El valor debe ser -1 (ilimitado) o mayor o igual a 0";
    }
    if (formData.max_rooms < -1) {
      newErrors.max_rooms = "El valor debe ser -1 (ilimitado) o mayor o igual a 0";
    }

    // Si estado = active, start_date obligatorio
    if (formData.status === PLAN_STATUS.ACTIVE && !formData.start_date) {
      newErrors.start_date = "La fecha de inicio es obligatoria para planes activos";
    }

    // Si no permite multi-owner, max_owners debe ser 1
    if (!formData.allows_multi_owner && formData.max_owners !== 1) {
      newErrors.max_owners = "Si no permite multi-owner, el máximo debe ser 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Ir a la sección con el primer error
      const errorFields = Object.keys(errors);
      if (errorFields.some((f) => ["name", "code", "description"].includes(f))) {
        setActiveSection("identity");
      } else if (errorFields.some((f) => ["status", "start_date", "end_date"].includes(f))) {
        setActiveSection("status");
      } else if (errorFields.some((f) => ["price_monthly", "price_annual", "vat_percentage"].includes(f))) {
        setActiveSection("pricing");
      } else if (errorFields.some((f) => f.startsWith("max_"))) {
        setActiveSection("limits");
      }
      return;
    }

    console.log("Crear plan:", formData);
    alert("Plan creado correctamente (mock)");
    navigate("/v2/superadmin/planes");
  };

  const sections = [
    { id: "identity", label: "Identidad", icon: "🏷️" },
    { id: "status", label: "Estado y Vigencia", icon: "📅" },
    { id: "pricing", label: "Pricing", icon: "💰" },
    { id: "limits", label: "Límites", icon: "📊" },
    { id: "branding", label: "Branding", icon: "🎨" },
    { id: "services", label: "Servicios", icon: "⚡" },
    { id: "rules", label: "Reglas", icon: "⚙️" },
  ];

  return (
    <V2Layout role="superadmin" userName="Administrador">
      {/* Header con acciones */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Nuevo Plan de Cliente</h1>
          <p style={styles.subtitle}>Configure todos los parámetros del nuevo plan</p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.cancelButton}
            onClick={() => navigate("/v2/superadmin/planes")}
          >
            Cancelar
          </button>
          <button style={styles.submitButton} onClick={handleSubmit}>
            Crear Plan
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

        {/* Formulario */}
        <form style={styles.form} onSubmit={handleSubmit}>
          {/* DBSU-PC-CR: Sección 1 - Identidad del Plan */}
          {activeSection === "identity" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Identidad del Plan</h2>
              <p style={styles.sectionDescription}>
                Información básica que identifica este plan
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nombre <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                    placeholder="Ej: Business Pro"
                  />
                  {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Código <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value.toLowerCase())}
                    style={{ ...styles.input, ...(errors.code ? styles.inputError : {}) }}
                    placeholder="business_pro"
                  />
                  {errors.code && <span style={styles.errorText}>{errors.code}</span>}
                  <span style={styles.helpText}>
                    Identificador único. Solo minúsculas, números y guiones bajos.
                  </span>
                </div>

                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    style={styles.textarea}
                    placeholder="Descripción del plan y sus características principales..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DBSU-PC-CR: Sección 2 - Estado y Vigencia */}
          {activeSection === "status" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Estado y Vigencia</h2>
              <p style={styles.sectionDescription}>
                Configure el estado inicial y las fechas de vigencia del plan
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estado inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    style={styles.select}
                  >
                    <option value={PLAN_STATUS.DRAFT}>Borrador</option>
                    <option value={PLAN_STATUS.ACTIVE}>Activo</option>
                  </select>
                  <span style={styles.helpText}>
                    Los planes en borrador no son visibles para nuevas altas
                  </span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Visible para nuevas altas</label>
                  <div style={styles.toggleWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.visible_for_new_accounts}
                      onChange={(e) => handleChange("visible_for_new_accounts", e.target.checked)}
                      style={styles.checkbox}
                      disabled={formData.status === PLAN_STATUS.DRAFT}
                    />
                    <span>{formData.visible_for_new_accounts ? "Sí" : "No"}</span>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Fecha inicio vigencia {formData.status === PLAN_STATUS.ACTIVE && <span style={styles.required}>*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                    style={{ ...styles.input, ...(errors.start_date ? styles.inputError : {}) }}
                  />
                  {errors.start_date && <span style={styles.errorText}>{errors.start_date}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha fin vigencia (opcional)</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>
                    Dejar vacío si el plan no tiene fecha de caducidad
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DBSU-PC-CR: Sección 3 - Pricing */}
          {activeSection === "pricing" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Pricing</h2>
              <p style={styles.sectionDescription}>
                Configure los precios y descuentos del plan
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Precio mensual (EUR) <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_monthly}
                    onChange={(e) => handleChange("price_monthly", e.target.value)}
                    style={{ ...styles.input, ...(errors.price_monthly ? styles.inputError : {}) }}
                    placeholder="29.99"
                  />
                  {errors.price_monthly && <span style={styles.errorText}>{errors.price_monthly}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Meses gratis (descuento anual)</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={formData.annual_discount_months}
                    onChange={(e) => handleChange("annual_discount_months", e.target.value)}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>
                    Número de meses gratis al pagar anualmente (por defecto 2)
                  </span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Precio anual (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_annual}
                    onChange={(e) => handleChange("price_annual", e.target.value)}
                    style={styles.input}
                    placeholder="Auto-calculado"
                  />
                  <span style={styles.helpText}>
                    Auto-calculado: {formData.price_monthly ? formatCurrency((parseFloat(formData.price_monthly) || 0) * (12 - formData.annual_discount_months)) : "-"}
                  </span>
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

                {/* Resumen de precios */}
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <div style={styles.pricingSummary}>
                    <h4 style={styles.summaryTitle}>Resumen de precios</h4>
                    <div style={styles.summaryGrid}>
                      <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Mensual (sin IVA)</span>
                        <span style={styles.summaryValue}>{formatCurrency(parseFloat(formData.price_monthly) || 0)}</span>
                      </div>
                      <div style={styles.summaryItem}>
                        <span style={styles.summaryLabel}>Anual (sin IVA)</span>
                        <span style={styles.summaryValue}>{formatCurrency(parseFloat(formData.price_annual) || 0)}</span>
                      </div>
                      {formData.vat_applicable && (
                        <>
                          <div style={styles.summaryItem}>
                            <span style={styles.summaryLabel}>Mensual (con {formData.vat_percentage}% IVA)</span>
                            <span style={styles.summaryValue}>
                              {formatCurrency((parseFloat(formData.price_monthly) || 0) * (1 + formData.vat_percentage / 100))}
                            </span>
                          </div>
                          <div style={styles.summaryItem}>
                            <span style={styles.summaryLabel}>Anual (con {formData.vat_percentage}% IVA)</span>
                            <span style={styles.summaryValue}>
                              {formatCurrency((parseFloat(formData.price_annual) || 0) * (1 + formData.vat_percentage / 100))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DBSU-PC-CR: Sección 4 - Límites del Plan */}
          {activeSection === "limits" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Límites del Plan</h2>
              <p style={styles.sectionDescription}>
                Configure los límites de recursos para este plan. Use -1 para ilimitado.
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Entidades Propietarias (owners)</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_owners}
                    onChange={(e) => handleChange("max_owners", parseInt(e.target.value))}
                    style={{ ...styles.input, ...(errors.max_owners ? styles.inputError : {}) }}
                    disabled={!formData.allows_multi_owner}
                  />
                  {errors.max_owners && <span style={styles.errorText}>{errors.max_owners}</span>}
                  <span style={styles.helpText}>-1 = ilimitado</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Alojamientos</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_accommodations}
                    onChange={(e) => handleChange("max_accommodations", parseInt(e.target.value))}
                    style={{ ...styles.input, ...(errors.max_accommodations ? styles.inputError : {}) }}
                  />
                  {errors.max_accommodations && <span style={styles.errorText}>{errors.max_accommodations}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Habitaciones</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_rooms}
                    onChange={(e) => handleChange("max_rooms", parseInt(e.target.value))}
                    style={{ ...styles.input, ...(errors.max_rooms ? styles.inputError : {}) }}
                  />
                  {errors.max_rooms && <span style={styles.errorText}>{errors.max_rooms}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Usuarios Admin</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={formData.max_admin_users}
                    onChange={(e) => handleChange("max_admin_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>Máximo 3 por cuenta</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Usuarios Asociados</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    value={formData.max_associated_users}
                    onChange={(e) => handleChange("max_associated_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>0-2 típicamente</span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Usuarios API</label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.max_api_users}
                    onChange={(e) => handleChange("max_api_users", parseInt(e.target.value))}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Usuarios Viewer</label>
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

          {/* DBSU-PC-CR: Sección 5 - Branding Habilitado */}
          {activeSection === "branding" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Branding Habilitado</h2>
              <p style={styles.sectionDescription}>
                Configure qué opciones de personalización visual tendrá este plan
              </p>

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
                  <span style={styles.helpText}>
                    Permite al cliente personalizar colores y estilos
                  </span>
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

          {/* DBSU-PC-CR: Sección 6 - Servicios Incluidos */}
          {activeSection === "services" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Servicios Incluidos</h2>
              <p style={styles.sectionDescription}>
                Seleccione los servicios que estarán disponibles en este plan
              </p>

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

              <div style={styles.selectedServices}>
                <strong>Servicios seleccionados:</strong>{" "}
                {formData.services_included.length === 0
                  ? "Ninguno"
                  : formData.services_included
                      .map((id) => AVAILABLE_SERVICES.find((s) => s.id === id)?.name)
                      .join(", ")}
              </div>
            </div>
          )}

          {/* DBSU-PC-CR: Sección 7 - Reglas Funcionales */}
          {activeSection === "rules" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Reglas Funcionales</h2>
              <p style={styles.sectionDescription}>
                Configure las reglas de negocio específicas de este plan
              </p>

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
                    Permite tener múltiples entidades propietarias (owners) en la cuenta.
                    Si está desactivado, max_owners será forzado a 1.
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
                    Permite reasignar alojamientos a diferentes propietarios.
                    Requiere fecha efectiva y registro de traspaso. Solo para planes tipo Agencia.
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
                    Útil para pagos manuales o transferencias bancarias.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de navegación entre secciones */}
          <div style={styles.sectionNavigation}>
            {sections.findIndex((s) => s.id === activeSection) > 0 && (
              <button
                type="button"
                style={styles.navButton}
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection);
                  setActiveSection(sections[currentIndex - 1].id);
                }}
              >
                ← Anterior
              </button>
            )}
            {sections.findIndex((s) => s.id === activeSection) < sections.length - 1 && (
              <button
                type="button"
                style={styles.navButtonPrimary}
                onClick={() => {
                  const currentIndex = sections.findIndex((s) => s.id === activeSection);
                  setActiveSection(sections[currentIndex + 1].id);
                }}
              >
                Siguiente →
              </button>
            )}
          </div>
        </form>
      </div>
    </V2Layout>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  cancelButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  submitButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
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
    transition: "all 0.2s ease",
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
    margin: "0 0 8px 0",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
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
  inputError: {
    borderColor: "#DC2626",
  },
  select: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  textarea: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
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
  pricingSummary: {
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 12px 0",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  summaryItem: {
    display: "flex",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
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
    transition: "all 0.2s ease",
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
  selectedServices: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    fontSize: 13,
    color: "#374151",
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
    backgroundColor: "#FFFFFF",
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
  sectionNavigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
  },
  navButton: {
    padding: "10px 20px",
    fontSize: 14,
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  navButtonPrimary: {
    padding: "10px 20px",
    fontSize: 14,
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
    marginLeft: "auto",
  },
};
