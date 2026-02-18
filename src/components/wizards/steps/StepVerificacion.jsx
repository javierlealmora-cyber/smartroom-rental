// =============================================================================
// src/components/wizards/steps/StepVerificacion.jsx
// =============================================================================
// Paso E (4): Verificacion y Resumen — 6 secciones
// A-Contrato, B-Branding, C-Entidad Pagadora, D-Admins
// =============================================================================

import {
  getPlanLabel,
  getPlanColor,
  formatCurrency,
} from "../../../mocks/clientAccountsData";

const LEGAL_TYPE_LABELS = {
  persona_fisica: "Persona Fisica",
  autonomo: "Autonomo",
  persona_juridica: "Persona Juridica",
};

export default function StepVerificacion({
  formData,
  errors,
  mode,
  selectedPlan,
  onGoToStep,
  stepStatuses,
  onChange,
}) {
  const hasErrors = Object.keys(errors).length > 0;

  const getStepHasErrors = (stepIndex) => {
    return stepStatuses[stepIndex] === "error";
  };

  const getPayerName = () => {
    if (formData.payer_type === "persona_juridica") {
      return formData.payer_legal_name || "\u2014";
    }
    const parts = [formData.payer_first_name, formData.payer_last_name_1, formData.payer_last_name_2].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "\u2014";
  };

  const getAddress = () => {
    const parts = [
      formData.payer_street,
      formData.payer_street_number,
      formData.payer_zip,
      formData.payer_city,
      formData.payer_province,
      formData.payer_country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "\u2014";
  };

  const getPriceDisplay = () => {
    if (!selectedPlan || !formData.billing_cycle) return "\u2014";
    const isAnnual = formData.billing_cycle === "annual";
    const base = isAnnual ? selectedPlan.price_annual : selectedPlan.price_monthly;
    const vat = base * (selectedPlan.vat_percentage / 100);
    const total = base + vat;
    const label = isAnnual ? "/ano" : "/mes";
    return `${formatCurrency(total)} ${label} (IVA incl.)`;
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>Verificacion y Resumen</h2>
      <p style={styles.sectionDescription}>
        Revisa toda la informacion antes de {mode === "self_signup" ? "finalizar y pagar" : "crear la cuenta"}.
        Pulsa "Editar" para modificar cualquier seccion.
      </p>

      {hasErrors && (
        <div style={styles.errorBanner}>
          <span style={styles.errorBannerIcon}>&#9888;&#65039;</span>
          <div>
            <strong>Hay campos pendientes de completar</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Revisa los pasos marcados en rojo y completa los campos obligatorios.
            </p>
          </div>
        </div>
      )}

      {/* Seccion A: Datos del Contrato */}
      <SummarySection
        number="A"
        title="Datos del Contrato"
        hasError={getStepHasErrors(0)}
        onEdit={() => onGoToStep(0)}
      >
        <div style={styles.summaryGrid}>
          <SummaryField label="Cuenta" value={formData.account_name} />
          <SummaryField label="Slug" value={formData.slug} />
          <SummaryField label="Email contacto" value={formData.contact_email} />
          <SummaryField label="Telefono" value={formData.contact_phone} />
          <SummaryField label="Fecha inicio" value={formData.start_date} />
          <div style={styles.summaryField}>
            <span style={styles.summaryLabel}>Plan</span>
            {formData.plan_code ? (
              <span style={{
                ...styles.planBadge,
                backgroundColor: getPlanColor(formData.plan_code),
              }}>
                {getPlanLabel(formData.plan_code)}
              </span>
            ) : (
              <span style={styles.summaryValue}>{"\u2014"}</span>
            )}
          </div>
          <SummaryField
            label="Ciclo facturacion"
            value={formData.billing_cycle === "monthly" ? "Mensual" : formData.billing_cycle === "annual" ? "Anual" : "\u2014"}
          />
          <SummaryField label="Importe" value={getPriceDisplay()} />
        </div>
      </SummarySection>

      {/* Seccion B: Branding */}
      <SummarySection
        number="B"
        title="Branding"
        hasError={getStepHasErrors(1)}
        onEdit={() => onGoToStep(1)}
      >
        <div style={styles.summaryGrid}>
          <SummaryField label="Nombre marca" value={formData.brand_name || "(Usa nombre de cuenta)"} />
          <div style={styles.summaryField}>
            <span style={styles.summaryLabel}>Color primario</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: formData.primary_color || "#111827",
                border: "1px solid #E5E7EB",
              }} />
              <span style={styles.summaryValue}>{formData.primary_color || "#111827"}</span>
            </div>
          </div>
          {formData.secondary_color && (
            <div style={styles.summaryField}>
              <span style={styles.summaryLabel}>Color secundario</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: formData.secondary_color,
                  border: "1px solid #E5E7EB",
                }} />
                <span style={styles.summaryValue}>{formData.secondary_color}</span>
              </div>
            </div>
          )}
          <SummaryField label="Logo" value={formData.logo_url || "Sin logo"} />
        </div>
      </SummarySection>

      {/* Seccion C: Entidad Pagadora */}
      <SummarySection
        number="C"
        title="Entidad Pagadora"
        hasError={getStepHasErrors(2)}
        onEdit={() => onGoToStep(2)}
      >
        <div style={styles.summaryGrid}>
          <SummaryField label="Tipo entidad" value={LEGAL_TYPE_LABELS[formData.payer_type] || "\u2014"} />
          <SummaryField label="Nombre/Razon social" value={getPayerName()} />
          <SummaryField label="CIF/NIF" value={formData.payer_tax_id || "\u2014"} />
          <div style={{ ...styles.summaryField, gridColumn: "1 / -1" }}>
            <span style={styles.summaryLabel}>Direccion</span>
            <span style={styles.summaryValue}>{getAddress()}</span>
          </div>
          <SummaryField label="Email facturacion" value={formData.payer_billing_email || "\u2014"} />
          <SummaryField label="Telefono facturacion" value={formData.payer_billing_phone || "\u2014"} />
        </div>
      </SummarySection>

      {/* Seccion D: Usuarios Admin */}
      <SummarySection
        number="D"
        title="Usuarios Admin"
        hasError={getStepHasErrors(3)}
        onEdit={() => onGoToStep(3)}
      >
        <div style={styles.adminsList}>
          {formData.admins.map((admin, index) => {
            if (index > 0 && !admin.email?.trim()) return null;
            return (
              <div key={index} style={styles.adminItem}>
                <div style={styles.adminInfo}>
                  <span style={styles.adminName}>
                    {admin.full_name || "(Sin nombre)"}
                    {admin.is_titular && (
                      <span style={styles.titularBadge}>Titular</span>
                    )}
                  </span>
                  <span style={styles.adminEmail}>{admin.email || "(Sin email)"}</span>
                  {admin.phone && <span style={styles.adminPhone}>{admin.phone}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </SummarySection>

      {/* Opciones SuperAdmin: estado inicial */}
      {mode === "superadmin_create" && (
        <div style={styles.statusCard}>
          <h3 style={styles.statusTitle}>Estado inicial de la cuenta</h3>
          <p style={styles.statusDescription}>
            Seleccione el estado con el que se creara la cuenta
          </p>
          <div style={styles.statusGrid}>
            {[
              { value: "draft", label: "Borrador", desc: "Cuenta creada pero no operativa", color: "#6B7280" },
              { value: "active", label: "Activa", desc: "La cuenta estara operativa inmediatamente", color: "#059669" },
              { value: "pending_payment", label: "Pendiente pago", desc: "Requiere completar pago antes de activar", color: "#F59E0B" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                style={{
                  ...styles.statusOption,
                  ...(formData.superadmin_status === opt.value ? styles.statusOptionSelected : {}),
                  borderColor: formData.superadmin_status === opt.value ? opt.color : "#E5E7EB",
                }}
                onClick={() => onChange("superadmin_status", opt.value)}
              >
                <span style={{ ...styles.statusDot, backgroundColor: opt.color }} />
                <div>
                  <span style={styles.statusLabel}>{opt.label}</span>
                  <span style={styles.statusDesc}>{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummarySection({ number, title, hasError, onEdit, children }) {
  return (
    <div style={{
      ...styles.summaryCard,
      ...(hasError ? styles.summaryCardError : {}),
    }}>
      <div style={styles.summaryHeader}>
        <div style={styles.summaryHeaderLeft}>
          {hasError && <span style={styles.errorDot}>!</span>}
          <h3 style={styles.summaryTitle}>{number}. {title}</h3>
        </div>
        <button type="button" style={styles.editLink} onClick={onEdit}>
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

function SummaryField({ label, value }) {
  return (
    <div style={styles.summaryField}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value || "\u2014"}</span>
    </div>
  );
}

const styles = {
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
  errorBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    color: "#991B1B",
  },
  errorBannerIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  summaryCard: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  summaryCardError: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  summaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #F3F4F6",
  },
  summaryHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  errorDot: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },
  editLink: {
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: "500",
    color: "#3B82F6",
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  summaryField: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  summaryValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  planBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  adminsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  adminItem: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    border: "1px solid #F3F4F6",
  },
  adminInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  adminName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  adminEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  adminPhone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  titularBadge: {
    padding: "2px 8px",
    backgroundColor: "#DBEAFE",
    color: "#1E40AF",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "600",
  },
  statusCard: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    backgroundColor: "#FFFFFF",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 4px 0",
  },
  statusDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  statusOption: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },
  statusOptionSelected: {
    backgroundColor: "#F9FAFB",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 3,
  },
  statusLabel: {
    display: "block",
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  statusDesc: {
    display: "block",
    fontSize: 12,
    color: "#6B7280",
  },
};
