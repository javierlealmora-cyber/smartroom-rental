// =============================================================================
// src/components/wizards/steps/StepContrato.jsx
// =============================================================================
// Paso A (0): Datos del Contrato
// Fusiona: datos de cuenta (nombre, email, slug) + seleccion de plan + ciclo
// =============================================================================

import { mockPlans, getPlanByCode, formatCurrency, getPlanColor, getPlanLabel } from "../../../mocks/clientAccountsData";

export default function StepContrato({ formData, errors, onChange, mode }) {
  const activePlans = mockPlans.filter(
    (p) => p.status === "active" && p.visible_for_new_accounts
  );

  const selectedPlan = getPlanByCode(formData.plan_code);

  return (
    <div>
      <h2 style={styles.sectionTitle}>Datos del Contrato</h2>
      <p style={styles.sectionDescription}>
        Informacion basica de la cuenta y seleccion del plan de suscripcion
      </p>

      {/* Datos basicos */}
      <div style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>Informacion de la Cuenta</h3>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nombre de la cuenta <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => onChange("account_name", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.account_name ? styles.inputError : {}),
              }}
              placeholder="Mi Empresa de Alquileres"
            />
            {errors.account_name && (
              <span style={styles.errorText}>{errors.account_name}</span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Slug (URL) <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => onChange("slug", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.slug ? styles.inputError : {}),
              }}
              placeholder="mi-empresa"
            />
            {errors.slug && (
              <span style={styles.errorText}>{errors.slug}</span>
            )}
            {formData.slug && !errors.slug && (
              <span style={styles.helpText}>
                smartrent.app/{formData.slug}
              </span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Email de contacto <span style={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => onChange("contact_email", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.contact_email ? styles.inputError : {}),
              }}
              placeholder="contacto@empresa.es"
            />
            {errors.contact_email && (
              <span style={styles.errorText}>{errors.contact_email}</span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Telefono <span style={styles.required}>*</span>
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => onChange("contact_phone", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.contact_phone ? styles.inputError : {}),
              }}
              placeholder="+34 666 123 456"
            />
            {errors.contact_phone && (
              <span style={styles.errorText}>{errors.contact_phone}</span>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Fecha de inicio <span style={styles.required}>*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => onChange("start_date", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.start_date ? styles.inputError : {}),
              }}
            />
            {errors.start_date && (
              <span style={styles.errorText}>{errors.start_date}</span>
            )}
          </div>
        </div>
      </div>

      {/* Seleccion de plan */}
      <div style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>Plan de Suscripcion</h3>
        {errors.plan_code && (
          <div style={styles.globalError}>{errors.plan_code}</div>
        )}
        <div style={styles.plansGrid}>
          {activePlans.map((plan) => {
            const isSelected = formData.plan_code === plan.code;
            return (
              <div
                key={plan.code}
                style={{
                  ...styles.planCard,
                  ...(isSelected ? styles.planCardSelected : {}),
                  borderColor: isSelected
                    ? getPlanColor(plan.code)
                    : "#E5E7EB",
                }}
                onClick={() => onChange("plan_code", plan.code)}
              >
                <div style={styles.planHeader}>
                  <span
                    style={{
                      ...styles.planBadge,
                      backgroundColor: getPlanColor(plan.code),
                    }}
                  >
                    {getPlanLabel(plan.code)}
                  </span>
                  {isSelected && <span style={styles.selectedCheck}>&#10003;</span>}
                </div>
                <div style={styles.planPrice}>
                  {formatCurrency(plan.price_monthly)}
                  <span style={styles.planPriceLabel}>/mes</span>
                </div>
                <p style={styles.planDescription}>{plan.description}</p>
                <div style={styles.planLimits}>
                  <span>
                    {plan.max_accommodations === -1
                      ? "Ilimitados"
                      : plan.max_accommodations}{" "}
                    alojamientos
                  </span>
                  <span>
                    {plan.max_rooms === -1 ? "Ilimitadas" : plan.max_rooms}{" "}
                    habitaciones
                  </span>
                  <span>
                    {plan.max_owners === -1
                      ? "Ilimitados"
                      : plan.max_owners}{" "}
                    propietarios
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ciclo de facturacion */}
      <div style={styles.subsection}>
        <h3 style={styles.subsectionTitle}>Ciclo de Facturacion</h3>
        {errors.billing_cycle && (
          <div style={styles.globalError}>{errors.billing_cycle}</div>
        )}
        <div style={styles.cycleGrid}>
          <div
            style={{
              ...styles.cycleOption,
              ...(formData.billing_cycle === "monthly"
                ? styles.cycleOptionSelected
                : {}),
            }}
            onClick={() => onChange("billing_cycle", "monthly")}
          >
            <div style={styles.cycleHeader}>
              <span style={styles.cycleName}>Mensual</span>
              {formData.billing_cycle === "monthly" && (
                <span style={styles.selectedCheck}>&#10003;</span>
              )}
            </div>
            {selectedPlan && (
              <span style={styles.cyclePrice}>
                {formatCurrency(selectedPlan.price_monthly)}/mes
              </span>
            )}
          </div>
          <div
            style={{
              ...styles.cycleOption,
              ...(formData.billing_cycle === "annual"
                ? styles.cycleOptionSelected
                : {}),
            }}
            onClick={() => onChange("billing_cycle", "annual")}
          >
            <div style={styles.cycleHeader}>
              <span style={styles.cycleName}>Anual</span>
              <span style={styles.discountBadge}>2 meses gratis</span>
              {formData.billing_cycle === "annual" && (
                <span style={styles.selectedCheck}>&#10003;</span>
              )}
            </div>
            {selectedPlan && (
              <span style={styles.cyclePrice}>
                {formatCurrency(selectedPlan.price_annual)}/ano
              </span>
            )}
          </div>
        </div>
      </div>
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
  subsection: {
    marginBottom: 28,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
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
    transition: "border-color 0.2s ease",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  globalError: {
    padding: "10px 14px",
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 16,
  },
  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  planCard: {
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    padding: 16,
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "#FFFFFF",
  },
  planCardSelected: {
    backgroundColor: "#F9FAFB",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.05)",
  },
  planHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planBadge: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  selectedCheck: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 16,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  planPriceLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  planDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 1.4,
  },
  planLimits: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12,
    color: "#374151",
  },
  cycleGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  cycleOption: {
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    padding: 20,
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "#FFFFFF",
  },
  cycleOptionSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  cycleHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cycleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  cyclePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  discountBadge: {
    padding: "2px 8px",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: "600",
  },
};
