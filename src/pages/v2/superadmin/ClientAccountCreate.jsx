// src/pages/v2/superadmin/ClientAccountCreate.jsx
// Formulario de creación de Cuenta Cliente
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PLANS,
  LEGAL_FORMS,
  getPlanLabel,
  getPlanColor,
} from "../../../mocks/clientAccountsData";

export default function ClientAccountCreate() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("contract");
  const [errors, setErrors] = useState({});

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Sección A: Datos del contrato SaaS
    name: "",
    slug: "",
    plan: PLANS.BASIC,
    billing_start_date: new Date().toISOString().split("T")[0],
    end_date: "",

    // Sección B: Branding
    theme_primary_color: "#111827",
    theme_secondary_color: "",
    logo_url: "",

    // Sección C: Empresa pagadora
    legal_name: "",
    legal_form: "",
    tax_id: "",
    address_line1: "",
    address_line2: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    contact_email: "",
    contact_phone: "",

    // Sección D: Usuario admin inicial
    admin_email: "",
    admin_name: "",
    admin_phone: "",
  });

  // Generar slug automático
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-generar slug al cambiar nombre
      if (field === "name") {
        newData.slug = generateSlug(value);
      }

      return newData;
    });

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar sección contrato
    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!formData.slug.trim()) newErrors.slug = "El slug es obligatorio";
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "El slug solo puede contener letras minúsculas, números y guiones";
    }
    if (!formData.plan) newErrors.plan = "Seleccione un plan";

    // Validar empresa pagadora
    if (!formData.legal_name.trim()) newErrors.legal_name = "El nombre fiscal es obligatorio";
    if (!formData.tax_id.trim()) newErrors.tax_id = "El NIF/CIF es obligatorio";
    if (!formData.contact_email.trim()) {
      newErrors.contact_email = "El email de facturación es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Email inválido";
    }

    // Validar usuario admin
    if (!formData.admin_email.trim()) {
      newErrors.admin_email = "El email del admin es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      newErrors.admin_email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Ir a la sección con el primer error
      if (errors.name || errors.slug || errors.plan) {
        setActiveSection("contract");
      } else if (errors.legal_name || errors.tax_id || errors.contact_email) {
        setActiveSection("company");
      } else if (errors.admin_email) {
        setActiveSection("admin");
      }
      return;
    }

    // Mock: simular creación
    console.log("Crear cuenta cliente:", formData);
    alert("Cuenta cliente creada correctamente (mock)");
    navigate("/v2/superadmin/cuentas");
  };

  const sections = [
    { id: "contract", label: "Contrato SaaS", icon: "📋" },
    { id: "branding", label: "Branding", icon: "🎨" },
    { id: "company", label: "Empresa Pagadora", icon: "🏢" },
    { id: "admin", label: "Admin Inicial", icon: "👤" },
  ];

  const isCustomThemeAllowed = formData.plan !== PLANS.BASIC;

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <span style={styles.breadcrumbLink} onClick={() => navigate("/v2/superadmin")}>
          Dashboard
        </span>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbLink} onClick={() => navigate("/v2/superadmin/cuentas")}>
          Cuentas Cliente
        </span>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbCurrent}>Nueva Cuenta</span>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Nueva Cuenta Cliente</h1>
        <p style={styles.subtitle}>Complete los datos para crear una nueva cuenta en el sistema</p>
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
          {/* Sección A: Contrato SaaS */}
          {activeSection === "contract" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Datos del Contrato SaaS</h2>
              <p style={styles.sectionDescription}>
                Información básica de la cuenta cliente y el plan contratado
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nombre comercial <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.name ? styles.inputError : {}),
                    }}
                    placeholder="Ej: Residencias Universidad Madrid"
                  />
                  {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Slug (URL) <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.slug ? styles.inputError : {}),
                    }}
                    placeholder="residencias-madrid"
                  />
                  {errors.slug && <span style={styles.errorText}>{errors.slug}</span>}
                  <span style={styles.helpText}>
                    Se usará en URLs. Solo letras minúsculas, números y guiones.
                  </span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Plan <span style={styles.required}>*</span>
                  </label>
                  <div style={styles.planGrid}>
                    {Object.values(PLANS).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        style={{
                          ...styles.planCard,
                          ...(formData.plan === plan ? styles.planCardSelected : {}),
                          borderColor: formData.plan === plan ? getPlanColor(plan) : "#E5E7EB",
                        }}
                        onClick={() => handleChange("plan", plan)}
                      >
                        <div
                          style={{
                            ...styles.planBadge,
                            backgroundColor: getPlanColor(plan),
                          }}
                        >
                          {getPlanLabel(plan)}
                        </div>
                        <div style={styles.planFeatures}>
                          {plan === PLANS.BASIC && (
                            <>
                              <span>1-3 alojamientos</span>
                              <span>Theme estándar</span>
                            </>
                          )}
                          {plan === PLANS.INVESTOR && (
                            <>
                              <span>1-8 alojamientos</span>
                              <span>Theme custom</span>
                              <span>Empresas fiscales</span>
                            </>
                          )}
                          {plan === PLANS.BUSINESS && (
                            <>
                              <span>Alojamientos ilimitados</span>
                              <span>Theme custom</span>
                              <span>Servicios avanzados</span>
                            </>
                          )}
                          {plan === PLANS.AGENCY && (
                            <>
                              <span>Multi-empresa</span>
                              <span>Rol viewer</span>
                              <span>Todo incluido</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha de inicio</label>
                    <input
                      type="date"
                      value={formData.billing_start_date}
                      onChange={(e) => handleChange("billing_start_date", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fecha de vigencia (opcional)</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección B: Branding */}
          {activeSection === "branding" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Branding</h2>
              <p style={styles.sectionDescription}>
                Personalización visual de la plataforma para esta cuenta
              </p>

              {!isCustomThemeAllowed && (
                <div style={styles.warningBox}>
                  <span style={styles.warningIcon}>ℹ️</span>
                  <span>
                    El plan Basic utiliza el theme estándar. Actualice a Investor o superior para
                    personalizar el branding.
                  </span>
                </div>
              )}

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Color primario</label>
                  <div style={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={formData.theme_primary_color}
                      onChange={(e) => handleChange("theme_primary_color", e.target.value)}
                      style={styles.colorInput}
                      disabled={!isCustomThemeAllowed}
                    />
                    <input
                      type="text"
                      value={formData.theme_primary_color}
                      onChange={(e) => handleChange("theme_primary_color", e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="#111827"
                      disabled={!isCustomThemeAllowed}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Color secundario (opcional)</label>
                  <div style={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={formData.theme_secondary_color || "#3B82F6"}
                      onChange={(e) => handleChange("theme_secondary_color", e.target.value)}
                      style={styles.colorInput}
                      disabled={!isCustomThemeAllowed}
                    />
                    <input
                      type="text"
                      value={formData.theme_secondary_color}
                      onChange={(e) => handleChange("theme_secondary_color", e.target.value)}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="#3B82F6"
                      disabled={!isCustomThemeAllowed}
                    />
                  </div>
                </div>

                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>URL del Logo (opcional)</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => handleChange("logo_url", e.target.value)}
                    style={styles.input}
                    placeholder="https://ejemplo.com/logo.png"
                    disabled={!isCustomThemeAllowed}
                  />
                  <span style={styles.helpText}>
                    Se recomienda una imagen de al menos 200x200px en formato PNG o SVG
                  </span>
                </div>

                {/* Preview */}
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Vista previa</label>
                  <div
                    style={{
                      ...styles.brandingPreview,
                      borderColor: formData.theme_primary_color,
                    }}
                  >
                    <div
                      style={{
                        ...styles.previewHeader,
                        backgroundColor: formData.theme_primary_color,
                      }}
                    >
                      {formData.logo_url ? (
                        <img
                          src={formData.logo_url}
                          alt=""
                          style={styles.previewLogo}
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      ) : (
                        <div style={styles.previewLogoPlaceholder}>Logo</div>
                      )}
                      <span style={styles.previewName}>
                        {formData.name || "Nombre de la cuenta"}
                      </span>
                    </div>
                    <div style={styles.previewContent}>
                      <button
                        type="button"
                        style={{
                          ...styles.previewButton,
                          backgroundColor: formData.theme_primary_color,
                        }}
                      >
                        Botón primario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección C: Empresa Pagadora */}
          {activeSection === "company" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Empresa Pagadora</h2>
              <p style={styles.sectionDescription}>
                Datos fiscales de la empresa que pagará las facturas del SaaS
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de entidad</label>
                  <select
                    value={formData.legal_form}
                    onChange={(e) => handleChange("legal_form", e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Seleccionar...</option>
                    <option value={LEGAL_FORMS.PERSONA_FISICA}>Persona física</option>
                    <option value={LEGAL_FORMS.AUTONOMO}>Autónomo</option>
                    <option value={LEGAL_FORMS.PERSONA_JURIDICA}>Persona jurídica (S.L., S.A.)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    CIF/NIF <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => handleChange("tax_id", e.target.value.toUpperCase())}
                    style={{
                      ...styles.input,
                      ...(errors.tax_id ? styles.inputError : {}),
                    }}
                    placeholder="B12345678"
                  />
                  {errors.tax_id && <span style={styles.errorText}>{errors.tax_id}</span>}
                </div>

                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>
                    Nombre fiscal / Razón social <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => handleChange("legal_name", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.legal_name ? styles.inputError : {}),
                    }}
                    placeholder="Empresa Ejemplo S.L."
                  />
                  {errors.legal_name && <span style={styles.errorText}>{errors.legal_name}</span>}
                </div>

                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Dirección</label>
                  <input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => handleChange("address_line1", e.target.value)}
                    style={styles.input}
                    placeholder="Calle, número, piso..."
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Código postal</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => handleChange("postal_code", e.target.value)}
                      style={styles.input}
                      placeholder="28001"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ciudad</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      style={styles.input}
                      placeholder="Madrid"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Provincia</label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => handleChange("province", e.target.value)}
                      style={styles.input}
                      placeholder="Madrid"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Email de facturación <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.contact_email ? styles.inputError : {}),
                    }}
                    placeholder="facturacion@empresa.es"
                  />
                  {errors.contact_email && (
                    <span style={styles.errorText}>{errors.contact_email}</span>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    style={styles.input}
                    placeholder="+34 912 345 678"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sección D: Admin Inicial */}
          {activeSection === "admin" && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Usuario Admin Inicial</h2>
              <p style={styles.sectionDescription}>
                Este usuario será el administrador principal de la cuenta cliente
              </p>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Email <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => handleChange("admin_email", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.admin_email ? styles.inputError : {}),
                    }}
                    placeholder="admin@empresa.es"
                  />
                  {errors.admin_email && (
                    <span style={styles.errorText}>{errors.admin_email}</span>
                  )}
                  <span style={styles.helpText}>
                    Se enviará un email de invitación para crear la contraseña
                  </span>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre completo</label>
                  <input
                    type="text"
                    value={formData.admin_name}
                    onChange={(e) => handleChange("admin_name", e.target.value)}
                    style={styles.input}
                    placeholder="Juan García López"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.admin_phone}
                    onChange={(e) => handleChange("admin_phone", e.target.value)}
                    style={styles.input}
                    placeholder="+34 666 123 456"
                  />
                  <span style={styles.helpText}>Recomendado para soporte y notificaciones</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => navigate("/v2/superadmin/cuentas")}
            >
              Cancelar
            </button>
            <button type="submit" style={styles.submitButton}>
              Crear Cuenta Cliente
            </button>
          </div>
        </form>
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
  breadcrumb: {
    marginBottom: 16,
    fontSize: 14,
    color: "#6B7280",
  },
  breadcrumbLink: {
    color: "#3B82F6",
    cursor: "pointer",
  },
  breadcrumbSeparator: {
    margin: "0 8px",
    color: "#9CA3AF",
  },
  breadcrumbCurrent: {
    color: "#374151",
    fontWeight: "500",
  },
  header: {
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
  content: {
    display: "flex",
    gap: 24,
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
  },
  sectionButton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "12px 16px",
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
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
    fontSize: 18,
  },
  form: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  section: {
    marginBottom: 32,
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
  formRow: {
    display: "flex",
    gap: 16,
    gridColumn: "1 / -1",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
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
    transition: "border-color 0.2s ease",
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
  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    gridColumn: "1 / -1",
  },
  planCard: {
    padding: 16,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  planCardSelected: {
    backgroundColor: "#F9FAFB",
  },
  planBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  planFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  colorInputWrapper: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  colorInput: {
    width: 48,
    height: 40,
    padding: 4,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
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
  brandingPreview: {
    border: "2px solid",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    color: "#FFFFFF",
  },
  previewLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    objectFit: "cover",
    backgroundColor: "#FFFFFF",
  },
  previewLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
  },
  previewName: {
    fontWeight: "600",
    fontSize: 16,
  },
  previewContent: {
    padding: 24,
  },
  previewButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    cursor: "default",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
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
};
