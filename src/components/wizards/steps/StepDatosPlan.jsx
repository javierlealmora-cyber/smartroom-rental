// =============================================================================
// src/components/wizards/steps/StepDatosPlan.jsx
// =============================================================================
// Paso 3: Datos del Plan + Periodo de pago + Desglose IVA
// =============================================================================

import {
  getActivePlans,
  getPlanByCode,
  formatCurrency,
} from "../../../mocks/clientAccountsData";

export default function StepDatosPlan({ formData, errors, onChange, mode }) {
  const activePlans = getActivePlans();
  const selectedPlan = getPlanByCode(formData.plan_code);

  // Calcular desglose de precios
  const getPriceBreakdown = () => {
    if (!selectedPlan) return null;
    const isAnnual = formData.payment_period === "annual";
    const basePrice = isAnnual ? selectedPlan.price_annual : selectedPlan.price_monthly;
    const vatRate = selectedPlan.vat_percentage / 100;
    const vatAmount = basePrice * vatRate;
    const totalWithVat = basePrice + vatAmount;

    return {
      basePrice,
      vatRate: selectedPlan.vat_percentage,
      vatAmount,
      totalWithVat,
      period: isAnnual ? "ano" : "mes",
      savings: isAnnual
        ? selectedPlan.price_monthly * 12 - selectedPlan.price_annual
        : 0,
    };
  };

  const breakdown = getPriceBreakdown();

  return (
    <div>
      <h2 style={styles.sectionTitle}>Datos del Plan</h2>
      <p style={styles.sectionDescription}>
        Selecciona tu plan y periodo de pago
      </p>

      {/* Seleccion de plan */}
      <div style={styles.planGrid}>
        {activePlans.map((plan) => {
          const isSelected = formData.plan_code === plan.code;
          return (
            <button
              key={plan.code}
              type="button"
              style={{
                ...styles.planCard,
                ...(isSelected ? styles.planCardSelected : {}),
              }}
              onClick={() => onChange("plan_code", plan.code)}
            >
              <div style={styles.planHeader}>
                <span style={styles.planName}>{plan.name}</span>
                {isSelected && <span style={styles.planCheck}>&#10003;</span>}
              </div>
              <span style={styles.planPrice}>
                {formatCurrency(plan.price_monthly)}
                <span style={styles.planPriceUnit}>/mes</span>
              </span>
              <span style={styles.planDesc}>{plan.description}</span>
              <div style={styles.planLimits}>
                <span>{plan.max_accommodations === -1 ? "Ilimitados" : plan.max_accommodations} alojamientos</span>
                <span>{plan.max_rooms === -1 ? "Ilimitadas" : plan.max_rooms} habitaciones</span>
              </div>
            </button>
          );
        })}
      </div>
      {errors.plan_code && <span style={styles.errorText}>{errors.plan_code}</span>}

      {/* Periodo de pago */}
      <div style={styles.periodSection}>
        <h3 style={styles.subsectionTitle}>
          Periodo de pago{" "}
          {mode === "self_signup" && <span style={styles.required}>*</span>}
        </h3>
        <div style={styles.periodGrid}>
          <button
            type="button"
            style={{
              ...styles.periodCard,
              ...(formData.payment_period === "monthly" ? styles.periodCardSelected : {}),
            }}
            onClick={() => onChange("payment_period", "monthly")}
          >
            <span style={styles.periodLabel}>Mensual</span>
            {selectedPlan && (
              <span style={styles.periodPrice}>
                {formatCurrency(selectedPlan.price_monthly)}/mes
              </span>
            )}
          </button>
          <button
            type="button"
            style={{
              ...styles.periodCard,
              ...(formData.payment_period === "annual" ? styles.periodCardSelected : {}),
            }}
            onClick={() => onChange("payment_period", "annual")}
          >
            <span style={styles.periodLabel}>Anual</span>
            {selectedPlan && (
              <>
                <span style={styles.periodPrice}>
                  {formatCurrency(selectedPlan.price_annual)}/ano
                </span>
                <span style={styles.savingsBadge}>
                  Ahorra {formatCurrency(selectedPlan.price_monthly * 12 - selectedPlan.price_annual)}
                </span>
              </>
            )}
          </button>
        </div>
        {errors.payment_period && <span style={styles.errorText}>{errors.payment_period}</span>}
      </div>

      {/* Desglose IVA */}
      {breakdown && formData.payment_period && (
        <div style={styles.breakdownCard}>
          <h3 style={styles.subsectionTitle}>Desglose del importe</h3>
          <div style={styles.breakdownRow}>
            <span>Base imponible</span>
            <span style={styles.breakdownValue}>{formatCurrency(breakdown.basePrice)}</span>
          </div>
          <div style={styles.breakdownRow}>
            <span>IVA ({breakdown.vatRate}%)</span>
            <span style={styles.breakdownValue}>{formatCurrency(breakdown.vatAmount)}</span>
          </div>
          <div style={styles.breakdownDivider} />
          <div style={{ ...styles.breakdownRow, ...styles.breakdownTotal }}>
            <span>Total /{breakdown.period}</span>
            <span style={styles.breakdownTotalValue}>{formatCurrency(breakdown.totalWithVat)}</span>
          </div>
          {breakdown.savings > 0 && (
            <div style={styles.breakdownSavings}>
              Ahorro anual de {formatCurrency(breakdown.savings)} respecto al pago mensual
            </div>
          )}
        </div>
      )}
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 16px 0",
  },
  required: {
    color: "#DC2626",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  // Plan cards
  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 8,
  },
  planCard: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 16,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },
  planCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  planHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  planCheck: {
    fontSize: 16,
    color: "#059669",
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  planPriceUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7280",
  },
  planDesc: {
    fontSize: 11,
    color: "#6B7280",
    lineHeight: "1.4",
  },
  planLimits: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  // Period
  periodSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTop: "1px solid #E5E7EB",
  },
  periodGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  periodCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: 20,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  periodCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  periodPrice: {
    fontSize: 14,
    color: "#374151",
  },
  savingsBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    padding: "2px 10px",
    borderRadius: 20,
  },
  // Breakdown
  breakdownCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
  },
  breakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontSize: 14,
    color: "#374151",
  },
  breakdownValue: {
    fontWeight: "500",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    margin: "8px 0",
  },
  breakdownTotal: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111827",
  },
  breakdownTotalValue: {
    fontWeight: "700",
    fontSize: 18,
    color: "#111827",
  },
  breakdownSavings: {
    marginTop: 8,
    fontSize: 12,
    color: "#059669",
    textAlign: "center",
  },
};
