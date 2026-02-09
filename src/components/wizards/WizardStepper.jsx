// =============================================================================
// src/components/wizards/WizardStepper.jsx
// =============================================================================
// Barra horizontal de progreso tipo wizard con estados por paso
// Estados: inactive | current | complete | error
// =============================================================================

export default function WizardStepper({ steps, currentStep, stepStatuses, onStepClick }) {
  return (
    <div style={styles.container}>
      {steps.map((step, index) => {
        const status = stepStatuses[index] || "inactive";
        const isClickable = index < currentStep || status === "complete" || status === "error";

        return (
          <div key={step.id} style={styles.stepWrapper}>
            {/* Línea conectora (antes del círculo, excepto el primero) */}
            {index > 0 && (
              <div
                style={{
                  ...styles.connector,
                  backgroundColor:
                    status === "complete" || status === "current"
                      ? "#111827"
                      : status === "error"
                        ? "#DC2626"
                        : "#E5E7EB",
                }}
              />
            )}

            {/* Círculo + Label */}
            <div
              style={{
                ...styles.stepItem,
                cursor: isClickable ? "pointer" : "default",
              }}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div
                style={{
                  ...styles.circle,
                  ...(status === "current" ? styles.circleCurrent : {}),
                  ...(status === "complete" ? styles.circleComplete : {}),
                  ...(status === "error" ? styles.circleError : {}),
                  ...(status === "inactive" ? styles.circleInactive : {}),
                }}
              >
                {status === "complete" ? (
                  <span style={styles.checkIcon}>✓</span>
                ) : status === "error" ? (
                  <span style={styles.errorIcon}>!</span>
                ) : (
                  <span style={styles.stepNumber}>{index + 1}</span>
                )}
              </div>
              <span
                style={{
                  ...styles.label,
                  ...(status === "current" ? styles.labelCurrent : {}),
                  ...(status === "complete" ? styles.labelComplete : {}),
                  ...(status === "error" ? styles.labelError : {}),
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px 0",
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  stepWrapper: {
    display: "flex",
    alignItems: "flex-start",
    flex: 1,
    position: "relative",
  },
  connector: {
    position: "absolute",
    top: 18,
    left: 0,
    right: "50%",
    height: 2,
    zIndex: 0,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    position: "relative",
    zIndex: 1,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: "600",
    transition: "all 0.3s ease",
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
  },
  circleCurrent: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    boxShadow: "0 0 0 4px rgba(17, 24, 39, 0.15)",
  },
  circleComplete: {
    backgroundColor: "#059669",
    color: "#FFFFFF",
  },
  circleError: {
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
  },
  circleInactive: {
    backgroundColor: "#E5E7EB",
    color: "#9CA3AF",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorIcon: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    textAlign: "center",
    maxWidth: 100,
    lineHeight: 1.3,
  },
  labelCurrent: {
    color: "#111827",
    fontWeight: "600",
  },
  labelComplete: {
    color: "#059669",
  },
  labelError: {
    color: "#DC2626",
  },
};
