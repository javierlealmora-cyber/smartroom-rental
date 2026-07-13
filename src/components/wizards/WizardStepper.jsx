// =============================================================================
// src/components/wizards/WizardStepper.jsx
// =============================================================================
// Barra de progreso del wizard usando Ant Design Steps.
// Estados: inactive | current | complete | error
// El paso "current" muestra un halo verde si no tiene errores de validación,
// indicando al usuario que puede avanzar.
// =============================================================================

import { ConfigProvider, Steps } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";

// Mapa de estados wizard → estados AntD Steps
const STATUS_MAP = {
  complete:  "finish",
  error:     "error",
  current:   "process",
  inactive:  "wait",
};

export default function WizardStepper({ steps, currentStep, stepStatuses, onStepClick }) {
  const items = steps.map((step, index) => {
    const status    = stepStatuses[index] || "inactive";
    const antStatus = STATUS_MAP[status] ?? "wait";

    // El paso actual con datos válidos muestra ícono verde (sin errores)
    const isCurrentValid = status === "current";
    const isComplete     = status === "complete";
    const isClickable    = index < currentStep || isComplete || status === "error";

    return {
      key:    step.id,
      title:  step.label,
      status: antStatus,
      // Ícono personalizado: completo → check verde lleno
      icon: isComplete ? (
        <CheckCircleFilled style={{ color: "#10B981", fontSize: 28 }} />
      ) : undefined,
      // Paso clicable si ya fue visitado/completado
      onClick: isClickable ? () => onStepClick(index) : undefined,
      style:   { cursor: isClickable ? "pointer" : "default" },
    };
  });

  return (
    <ConfigProvider
      theme={{
        components: {
          Steps: {
            // Paso activo: círculo negro (brand superadmin)
            colorPrimary:        "#111827",
            // Paso completo: verde
            colorSuccess:        "#10B981",
            // Fondo del paso completo
            finishIconBgColor:   "#D1FAE5",
            finishIconBorderColor: "#10B981",
          },
        },
      }}
    >
      <div
        style={{
          background:   "#FFFFFF",
          borderRadius: 12,
          boxShadow:    "0 1px 3px rgba(0,0,0,0.08)",
          padding:      "20px 32px",
          marginBottom: 28,
        }}
      >
        <Steps
          current={currentStep}
          items={items}
          size="default"
          style={{ width: "100%" }}
        />
      </div>
    </ConfigProvider>
  );
}
