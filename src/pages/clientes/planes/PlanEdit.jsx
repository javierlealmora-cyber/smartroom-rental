// src/pages/clientes/planes/PlanEdit.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import {
  getPlanById,
  updatePlan,
  archivePlan,
  duplicatePlan,
  calculateAnnualPrice,
  calculatePriceWithVAT,
  planStatuses,
} from "../../../mocks/plans.mock";
import { getActiveServices, getServiceByKey } from "../../../mocks/services.mock";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

// Formatea fecha como dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function PlanEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const services = getActiveServices();

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null });

  useEffect(() => {
    const plan = getPlanById(id);
    if (plan) {
      setForm({
        ...plan,
        pricing: {
          ...plan.pricing,
          auto_annual: plan.pricing.annual_price == null,
        },
      });
    } else {
      navigate("/clientes/planes");
    }
  }, [id, navigate]);

  if (!form) {
    return (
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="CLIENTES" />
        <div style={styles.loading}>
          <p>Cargando plan...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!form.code.trim()) {
      newErrors.code = "El código es requerido";
    } else if (!/^[a-z0-9_]+$/.test(form.code)) {
      newErrors.code = "Solo minúsculas, números y guiones bajos";
    }

    if (form.valid_from && form.valid_to && form.valid_to < form.valid_from) {
      newErrors.valid_to = "La fecha fin no puede ser anterior a la de inicio";
    }

    if (form.pricing.monthly_price < 0) {
      newErrors.monthly_price = "El precio no puede ser negativo";
    }

    if (form.pricing.vat_rate < 0 || form.pricing.vat_rate > 30) {
      newErrors.vat_rate = "El IVA debe estar entre 0% y 30%";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleLimitsChange = (field, value) => {
    setForm({
      ...form,
      limits: { ...form.limits, [field]: value },
    });
  };

  const handlePricingChange = (field, value) => {
    setForm({
      ...form,
      pricing: { ...form.pricing, [field]: value },
    });
  };

  const handleServiceToggle = (serviceKey) => {
    const current = form.services_included;
    if (current.includes(serviceKey)) {
      setForm({
        ...form,
        services_included: current.filter((k) => k !== serviceKey),
      });
    } else {
      setForm({
        ...form,
        services_included: [...current, serviceKey],
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const planData = {
        name: form.name,
        code: form.code,
        description: form.description,
        status: form.status,
        valid_from: form.valid_from,
        valid_to: form.valid_to,
        limits: form.limits,
        services_included: form.services_included,
        pricing: {
          monthly_price: form.pricing.monthly_price,
          annual_price: form.pricing.auto_annual ? null : form.pricing.annual_price,
          vat_rate: form.pricing.vat_rate,
          currency: form.pricing.currency,
        },
      };
      updatePlan(id, planData);
      navigate("/clientes/planes");
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    archivePlan(id);
    navigate("/clientes/planes");
  };

  const handleDuplicate = () => {
    const newPlan = duplicatePlan(id);
    navigate(`/clientes/planes/${newPlan.id}/edit`);
  };

  const getAnnualPrice = () => {
    if (!form.pricing.auto_annual && form.pricing.annual_price != null) {
      return form.pricing.annual_price;
    }
    return calculateAnnualPrice(form.pricing.monthly_price);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: form.pricing.currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  // Servicios que están en el plan pero ya no están activos
  const archivedServicesInPlan = form.services_included.filter((key) => {
    const service = getServiceByKey(key);
    return !service || service.status === "archived";
  });

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate("/clientes/planes")}>
            ← Volver
        </button>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Editar Plan: {form.name}</h1>
          <div style={styles.headerActions}>
            <button style={styles.duplicateBtn} onClick={() => setConfirmModal({ open: true, action: "duplicate" })}>
              Duplicar
            </button>
            {form.status !== "archived" && (
              <button
                style={styles.archiveBtn}
                onClick={() => setConfirmModal({ open: true, action: "archive" })}
              >
                Archivar
              </button>
            )}
          </div>
        </div>
      </div>

      {errors.submit && <div style={styles.errorBanner}>{errors.submit}</div>}

      {archivedServicesInPlan.length > 0 && (
        <div style={styles.warningBanner}>
          Este plan incluye servicios archivados: {archivedServicesInPlan.join(", ")}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Sección 1: Datos básicos */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>1. Datos Básicos</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nombre del Plan <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.name ? styles.inputError : {}),
                }}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Código <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value.toLowerCase())}
                style={{
                  ...styles.input,
                  fontFamily: "monospace",
                  ...(errors.code ? styles.inputError : {}),
                }}
              />
              {errors.code && <span style={styles.errorText}>{errors.code}</span>}
            </div>

            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                style={styles.textarea}
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Estado y Vigencia */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>2. Estado y Vigencia</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                style={styles.select}
              >
                {planStatuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup} />

            <div style={styles.formGroup}>
              <label style={styles.label}>Válido desde</label>
              <input
                type="date"
                value={form.valid_from || ""}
                onChange={(e) => handleChange("valid_from", e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Válido hasta</label>
              <input
                type="date"
                value={form.valid_to || ""}
                onChange={(e) => handleChange("valid_to", e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.valid_to ? styles.inputError : {}),
                }}
              />
              {errors.valid_to && (
                <span style={styles.errorText}>{errors.valid_to}</span>
              )}
            </div>
          </div>
        </div>

        {/* Sección 3: Restricciones */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>3. Restricciones / Límites</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Máximo de Residencias</label>
              <div style={styles.inlineGroup}>
                <input
                  type="number"
                  value={form.limits.max_properties || ""}
                  onChange={(e) =>
                    handleLimitsChange("max_properties", parseInt(e.target.value) || 0)
                  }
                  disabled={form.limits.unlimited_properties}
                  min={0}
                  style={{
                    ...styles.input,
                    flex: 1,
                    opacity: form.limits.unlimited_properties ? 0.5 : 1,
                  }}
                />
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.limits.unlimited_properties}
                    onChange={(e) =>
                      handleLimitsChange("unlimited_properties", e.target.checked)
                    }
                    style={styles.checkbox}
                  />
                  Ilimitado
                </label>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Máximo de Usuarios Admin</label>
              <input
                type="number"
                value={form.limits.max_admin_users}
                onChange={(e) =>
                  handleLimitsChange("max_admin_users", parseInt(e.target.value) || 0)
                }
                min={0}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Máximo de Usuarios API</label>
              <input
                type="number"
                value={form.limits.max_api_users}
                onChange={(e) =>
                  handleLimitsChange("max_api_users", parseInt(e.target.value) || 0)
                }
                min={0}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.limits.custom_theme_allowed}
                  onChange={(e) =>
                    handleLimitsChange("custom_theme_allowed", e.target.checked)
                  }
                  style={styles.checkbox}
                />
                Permitir tema personalizado
              </label>
            </div>
          </div>
        </div>

        {/* Sección 4: Servicios incluidos */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>4. Servicios Incluidos</h2>
          <div style={styles.servicesGrid}>
            {services.map((service) => (
              <label key={service.key} style={styles.serviceItem}>
                <input
                  type="checkbox"
                  checked={form.services_included.includes(service.key)}
                  onChange={() => handleServiceToggle(service.key)}
                  style={styles.checkbox}
                />
                <div>
                  <div style={styles.serviceName}>{service.label}</div>
                  {service.description && (
                    <div style={styles.serviceDesc}>{service.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Sección 5: Pricing */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>5. Precio + IVA</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Precio Mensual (sin IVA)</label>
              <div style={styles.priceInput}>
                <input
                  type="number"
                  value={form.pricing.monthly_price}
                  onChange={(e) =>
                    handlePricingChange("monthly_price", parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  step={0.01}
                  style={styles.input}
                />
                <span style={styles.currency}>{form.pricing.currency}</span>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Precio Anual (sin IVA)</label>
              <div style={styles.priceInput}>
                <input
                  type="number"
                  value={
                    form.pricing.auto_annual
                      ? getAnnualPrice()
                      : form.pricing.annual_price || ""
                  }
                  onChange={(e) =>
                    handlePricingChange("annual_price", parseFloat(e.target.value) || 0)
                  }
                  disabled={form.pricing.auto_annual}
                  min={0}
                  step={0.01}
                  style={{
                    ...styles.input,
                    opacity: form.pricing.auto_annual ? 0.7 : 1,
                  }}
                />
                <span style={styles.currency}>{form.pricing.currency}</span>
              </div>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.pricing.auto_annual}
                  onChange={(e) =>
                    handlePricingChange("auto_annual", e.target.checked)
                  }
                  style={styles.checkbox}
                />
                Calcular automáticamente (12 - 2 meses gratis)
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>IVA (%)</label>
              <input
                type="number"
                value={form.pricing.vat_rate}
                onChange={(e) =>
                  handlePricingChange("vat_rate", parseFloat(e.target.value) || 0)
                }
                min={0}
                max={30}
                step={0.1}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Moneda</label>
              <select
                value={form.pricing.currency}
                onChange={(e) => handlePricingChange("currency", e.target.value)}
                style={styles.select}
              >
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dólar</option>
                <option value="GBP">GBP - Libra</option>
              </select>
            </div>
          </div>

          {/* Resumen de precios */}
          <div style={styles.priceSummary}>
            <h3 style={styles.summaryTitle}>Resumen de Precios</h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCol}>
                <div style={styles.summaryLabel}>Mensual</div>
                <div style={styles.summaryRow}>
                  <span>Base (sin IVA)</span>
                  <span>{formatPrice(form.pricing.monthly_price)}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>IVA ({form.pricing.vat_rate}%)</span>
                  <span>
                    {formatPrice(
                      form.pricing.monthly_price * (form.pricing.vat_rate / 100)
                    )}
                  </span>
                </div>
                <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                  <span>Total con IVA</span>
                  <span>
                    {formatPrice(
                      calculatePriceWithVAT(
                        form.pricing.monthly_price,
                        form.pricing.vat_rate
                      )
                    )}
                  </span>
                </div>
              </div>
              <div style={styles.summaryCol}>
                <div style={styles.summaryLabel}>Anual</div>
                <div style={styles.summaryRow}>
                  <span>Base (sin IVA)</span>
                  <span>{formatPrice(getAnnualPrice())}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span>IVA ({form.pricing.vat_rate}%)</span>
                  <span>
                    {formatPrice(getAnnualPrice() * (form.pricing.vat_rate / 100))}
                  </span>
                </div>
                <div style={{ ...styles.summaryRow, ...styles.summaryTotal }}>
                  <span>Total con IVA</span>
                  <span>
                    {formatPrice(
                      calculatePriceWithVAT(getAnnualPrice(), form.pricing.vat_rate)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auditoría */}
        <div style={styles.auditInfo}>
          <span>Creado: {formatDate(form.created_at)}</span>
          <span>Actualizado: {formatDate(form.updated_at)}</span>
        </div>

        {/* Acciones */}
        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => navigate("/clientes/planes")}
          >
            Cancelar
          </button>
          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      {/* Modal de confirmación */}
      {confirmModal.open && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {confirmModal.action === "archive" ? "Archivar Plan" : "Duplicar Plan"}
            </h3>
            <p style={styles.modalText}>
              {confirmModal.action === "archive"
                ? `¿Estás seguro de archivar "${form.name}"? No estará disponible para nuevos clientes.`
                : `¿Deseas crear una copia de "${form.name}"? Se creará como borrador.`}
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmModal({ open: false, action: null })}
              >
                Cancelar
              </button>
              <button
                style={
                  confirmModal.action === "archive" ? styles.dangerBtn : styles.submitBtn
                }
                onClick={() => {
                  if (confirmModal.action === "archive") {
                    handleArchive();
                  } else {
                    handleDuplicate();
                  }
                }}
              >
                {confirmModal.action === "archive" ? "Archivar" : "Duplicar"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  container: {
    flex: 1,
    padding: 24,
    maxWidth: 900,
    overflow: "auto",
  },
  loading: {
    flex: 1,
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
    marginBottom: 8,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  headerActions: {
    display: "flex",
    gap: 12,
  },
  duplicateBtn: {
    backgroundColor: "#E0E7FF",
    color: "#3730A3",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  archiveBtn: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  warningBanner: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
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
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
  },
  required: {
    color: "#DC2626",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    outline: "none",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
  },
  inlineGroup: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  serviceItem: {
    display: "flex",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    border: "1px solid #E5E7EB",
    cursor: "pointer",
    alignItems: "flex-start",
  },
  serviceName: {
    fontWeight: 500,
    color: "#111827",
    fontSize: 14,
  },
  serviceDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  priceInput: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  currency: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: 500,
  },
  priceSummary: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    margin: "0 0 16px 0",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  },
  summaryCol: {},
  summaryLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
    padding: "6px 0",
  },
  summaryTotal: {
    borderTop: "1px solid #E5E7EB",
    marginTop: 8,
    paddingTop: 8,
    fontWeight: 600,
    color: "#111827",
  },
  auditInfo: {
    display: "flex",
    gap: 20,
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  formActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    maxWidth: 440,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  modalText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.5,
    margin: "0 0 20px 0",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  dangerBtn: {
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
