// =============================================================================
// src/components/wizards/steps/StepPago.jsx
// =============================================================================
// Paso F (5): Pago via Stripe Checkout
// En self_signup: obligatorio (redirect a Stripe)
// En superadmin_create: no se muestra / opcional
// =============================================================================

import { formatCurrency } from "../../../mocks/clientAccountsData";

export default function StepPago({ formData, mode, selectedPlan, submitting, submitError }) {
  const isAnnual = formData.billing_cycle === "annual";
  const basePrice = selectedPlan
    ? isAnnual
      ? selectedPlan.price_annual
      : selectedPlan.price_monthly
    : 0;
  const vatRate = selectedPlan?.vat_percentage || 21;
  const vatAmount = basePrice * (vatRate / 100);
  const totalPrice = basePrice + vatAmount;
  const periodLabel = isAnnual ? "/ano" : "/mes";

  if (mode === "superadmin_create") {
    return (
      <div>
        <h2 style={styles.sectionTitle}>Pago</h2>
        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>&#9432;</span>
          <div>
            <strong>Modo Superadmin</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              La cuenta se creara sin requerir pago inmediato. El estado se puede configurar
              en el paso de verificacion. El pago se gestionara posteriormente si es necesario.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Pago y Suscripcion</h2>
      <p style={styles.sectionDescription}>
        Al finalizar, seras redirigido a Stripe para completar el pago de tu suscripcion de forma segura.
      </p>

      {/* Resumen de precio */}
      <div style={styles.priceCard}>
        <div style={styles.priceHeader}>
          <span style={styles.planName}>
            Plan {selectedPlan?.name || formData.plan_code}
          </span>
          <span style={styles.cycleBadge}>
            {isAnnual ? "Anual" : "Mensual"}
          </span>
        </div>
        <div style={styles.priceBreakdown}>
          <div style={styles.priceRow}>
            <span>Precio base</span>
            <span>{formatCurrency(basePrice)}{periodLabel}</span>
          </div>
          <div style={styles.priceRow}>
            <span>IVA ({vatRate}%)</span>
            <span>{formatCurrency(vatAmount)}{periodLabel}</span>
          </div>
          <div style={styles.priceDivider} />
          <div style={{ ...styles.priceRow, ...styles.priceTotal }}>
            <span>Total</span>
            <span>{formatCurrency(totalPrice)}{periodLabel}</span>
          </div>
        </div>
        {isAnnual && (
          <div style={styles.savingsNote}>
            Ahorro de 2 meses respecto al pago mensual
          </div>
        )}
      </div>

      {/* Info Stripe — modo mock en desarrollo */}
      <div style={styles.stripeInfo}>
        <div style={styles.stripeHeader}>
          <span style={styles.stripeLogo}>Stripe</span>
          <span style={{ ...styles.secureBadge, backgroundColor: "#FEF3C7", color: "#D97706" }}>
            Modo desarrollo
          </span>
        </div>
        <p style={styles.stripeDescription}>
          La pasarela de pago esta en modo desarrollo. Al pulsar "Finalizar y Pagar", tu cuenta
          se activara directamente sin cargo real. Cuando Stripe este configurado en produccion,
          seras redirigido a la pasarela de pago segura.
        </p>
        <ul style={styles.stripeFeatures}>
          <li>Sin cobro real en modo desarrollo</li>
          <li>La cuenta se activara automaticamente</li>
          <li>En produccion: Visa, Mastercard, SEPA via Stripe</li>
        </ul>
      </div>

      {/* Error de submit */}
      {submitError && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>&#9888;&#65039;</span>
          <div>
            <strong>Error al procesar</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{submitError}</p>
          </div>
        </div>
      )}

      {/* Estado de envio */}
      {submitting && (
        <div style={styles.submittingBanner}>
          <span style={styles.spinner}>&#8987;</span>
          Procesando tu registro... Por favor espera.
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
  priceCard: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    backgroundColor: "#FAFAFA",
  },
  priceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cycleBadge: {
    padding: "4px 12px",
    backgroundColor: "#EFF6FF",
    color: "#1E40AF",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "500",
  },
  priceBreakdown: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
  },
  priceDivider: {
    borderTop: "1px solid #E5E7EB",
    margin: "4px 0",
  },
  priceTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  savingsNote: {
    marginTop: 12,
    padding: "8px 12px",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  stripeInfo: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  stripeHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stripeLogo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#635BFF",
    padding: "4px 12px",
    backgroundColor: "#F0EFFF",
    borderRadius: 6,
  },
  secureBadge: {
    padding: "3px 10px",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "500",
  },
  stripeDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 1.5,
  },
  stripeFeatures: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    color: "#374151",
  },
  errorBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: "#991B1B",
  },
  errorIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  submittingBanner: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 8,
    fontSize: 14,
    color: "#1E40AF",
  },
  spinner: {
    fontSize: 18,
  },
  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 8,
    fontSize: 14,
    color: "#1E40AF",
  },
  infoIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
};
