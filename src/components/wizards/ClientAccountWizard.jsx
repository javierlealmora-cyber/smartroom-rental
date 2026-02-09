// =============================================================================
// src/components/wizards/ClientAccountWizard.jsx
// =============================================================================
// Wizard multi-paso para crear Cuenta Cliente
// Modos: "self_signup" (autoregistro) | "superadmin_create" (superadmin)
// Pasos: 1-Datos Cuenta, 2-Usuarios Admin, 3-Datos Plan, 4-Metodo Pago, 5-Verificacion
// =============================================================================

import { useState, useCallback } from "react";
import WizardStepper from "./WizardStepper";
import StepDatosCuenta from "./steps/StepDatosCuenta";
import StepUsuariosAdmin from "./steps/StepUsuariosAdmin";
import StepDatosPlan from "./steps/StepDatosPlan";
import StepMetodoPago from "./steps/StepMetodoPago";
import StepVerificacion from "./steps/StepVerificacion";
import { getPlanByCode } from "../../mocks/clientAccountsData";

// Definicion de pasos (nuevo orden)
const WIZARD_STEPS = [
  { id: "datos_cuenta", label: "Datos Cuenta" },
  { id: "usuarios_admin", label: "Usuarios Admin" },
  { id: "datos_plan", label: "Datos del Plan" },
  { id: "metodo_pago", label: "Metodo de Pago" },
  { id: "verificacion", label: "Verificacion" },
];

// Estado inicial del formulario
const getInitialFormData = () => ({
  // Paso 1: Datos Cuenta + Slug
  full_name: "",
  email: "",
  phone: "",
  start_date: new Date().toISOString().split("T")[0],
  slug: "",

  // Paso 2: Usuarios Admin
  admins: [
    { email: "", full_name: "", phone: "", is_titular: true },
    { email: "", full_name: "", phone: "", is_titular: false },
    { email: "", full_name: "", phone: "", is_titular: false },
  ],

  // Paso 3: Datos del Plan
  plan_code: "basic",
  payment_period: "",

  // Paso 4: Facturacion y Pago (Entidad Pagadora + Branding + Tarjeta)
  payer_type: "",
  payer_legal_name: "",
  payer_first_name: "",
  payer_last_name_1: "",
  payer_last_name_2: "",
  payer_tax_id: "",
  payer_address_line1: "",
  payer_address_number: "",
  payer_postal_code: "",
  payer_city: "",
  payer_province: "",
  payer_country: "Espana",
  payer_billing_email: "",
  payer_billing_phone: "",
  brand_name: "",
  primary_color: "#111827",
  secondary_color: "",
  logo_url: "",
  card_number: "",
  card_holder: "",
  card_expiry: "",
  card_cvv: "",

  // Extra superadmin
  superadmin_status: "ACTIVA",
});

// Generar slug automatico
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

// Reglas de validacion por paso
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateStep = (stepIndex, formData, mode) => {
  const errs = {};

  // Paso 0: Datos Cuenta + Slug
  if (stepIndex === 0) {
    if (!formData.full_name?.trim() || formData.full_name.trim().length < 3)
      errs.full_name = "Nombre requerido (min. 3 caracteres)";
    if (!formData.email?.trim())
      errs.email = "Email requerido";
    else if (!EMAIL_REGEX.test(formData.email))
      errs.email = "Email invalido";
    if (!formData.phone?.trim())
      errs.phone = "Telefono requerido";
    if (!formData.start_date)
      errs.start_date = "Fecha de inicio requerida";
    if (!formData.slug?.trim())
      errs.slug = "Slug requerido";
    else if (!/^[a-z0-9-]+$/.test(formData.slug))
      errs.slug = "Solo letras minusculas, numeros y guiones";
  }

  // Paso 1: Usuarios Admin
  if (stepIndex === 1) {
    if (!formData.admins[0].email?.trim())
      errs.admins_0_email = "Email del admin titular requerido";
    else if (!EMAIL_REGEX.test(formData.admins[0].email))
      errs.admins_0_email = "Email invalido";
    if (!formData.admins[0].full_name?.trim())
      errs.admins_0_full_name = "Nombre del admin titular requerido";
    if (!formData.admins[0].phone?.trim())
      errs.admins_0_phone = "Telefono del admin titular requerido";

    // Validar opcionales si tienen email parcial
    [1, 2].forEach((i) => {
      if (formData.admins[i].email?.trim()) {
        if (!EMAIL_REGEX.test(formData.admins[i].email))
          errs[`admins_${i}_email`] = "Email invalido";
      }
    });

    // Emails duplicados entre admins
    const filledEmails = formData.admins
      .map((a) => a.email?.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(filledEmails).size !== filledEmails.length)
      errs.admins_duplicate = "Los emails de admin no pueden repetirse";
  }

  // Paso 2: Datos del Plan
  if (stepIndex === 2) {
    if (!formData.plan_code)
      errs.plan_code = "Seleccione un plan";
    if (mode === "self_signup" && !formData.payment_period)
      errs.payment_period = "Periodo de pago requerido";
  }

  // Paso 3: Facturacion y Pago (Entidad Pagadora + Branding + Tarjeta)
  if (stepIndex === 3) {
    // Entidad Pagadora
    if (!formData.payer_type)
      errs.payer_type = "Seleccione tipo de entidad";
    if (formData.payer_type === "persona_juridica" && !formData.payer_legal_name?.trim())
      errs.payer_legal_name = "Razon social requerida";
    if ((formData.payer_type === "persona_fisica" || formData.payer_type === "autonomo") && !formData.payer_first_name?.trim())
      errs.payer_first_name = "Nombre requerido";
    if ((formData.payer_type === "persona_fisica" || formData.payer_type === "autonomo") && !formData.payer_last_name_1?.trim())
      errs.payer_last_name_1 = "Primer apellido requerido";
    if (!formData.payer_tax_id?.trim())
      errs.payer_tax_id = "CIF/NIF requerido";
    if (!formData.payer_address_line1?.trim())
      errs.payer_address_line1 = "Direccion requerida";
    if (!formData.payer_postal_code?.trim())
      errs.payer_postal_code = "Codigo postal requerido";
    if (!formData.payer_city?.trim())
      errs.payer_city = "Ciudad requerida";
    if (!formData.payer_country?.trim())
      errs.payer_country = "Pais requerido";
    if (!formData.payer_billing_email?.trim())
      errs.payer_billing_email = "Email de facturacion requerido";
    else if (!EMAIL_REGEX.test(formData.payer_billing_email))
      errs.payer_billing_email = "Email invalido";

    // Branding
    if (formData.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.primary_color))
      errs.primary_color = "Formato hex invalido (ej: #1E40AF)";
    if (formData.secondary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.secondary_color))
      errs.secondary_color = "Formato hex invalido";

    // Tarjeta (obligatorio en self_signup)
    if (mode === "self_signup") {
      const cardDigits = formData.card_number?.replace(/\s/g, "") || "";
      if (!cardDigits)
        errs.card_number = "Numero de tarjeta requerido";
      else if (cardDigits.length < 13 || cardDigits.length > 16)
        errs.card_number = "Numero de tarjeta invalido (13-16 digitos)";
      if (!formData.card_holder?.trim())
        errs.card_holder = "Titular de la tarjeta requerido";
      if (!formData.card_expiry?.trim())
        errs.card_expiry = "Fecha de caducidad requerida";
      else if (!/^\d{2}\/\d{2}$/.test(formData.card_expiry))
        errs.card_expiry = "Formato invalido (MM/AA)";
      else {
        const [mm] = formData.card_expiry.split("/").map(Number);
        if (mm < 1 || mm > 12) errs.card_expiry = "Mes invalido";
      }
      if (!formData.card_cvv?.trim())
        errs.card_cvv = "CVV requerido";
      else if (formData.card_cvv.length < 3)
        errs.card_cvv = "CVV invalido (3-4 digitos)";
    }
  }

  return errs;
};

export default function ClientAccountWizard({ mode = "self_signup", onFinalize, onCancel, initialData = null }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData || getInitialFormData());
  const [errors, setErrors] = useState({});
  const [stepStatuses, setStepStatuses] = useState(["current", "inactive", "inactive", "inactive", "inactive"]);

  const selectedPlan = getPlanByCode(formData.plan_code);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-generar slug al cambiar nombre
      if (field === "full_name") {
        newData.slug = generateSlug(value);
      }

      // Auto-copiar email titular a billing_email si esta vacio
      if (field === "email" && !prev.payer_billing_email) {
        newData.payer_billing_email = value;
      }

      return newData;
    });

    // Limpiar error del campo
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleAdminsChange = useCallback((admins) => {
    setFormData((prev) => ({ ...prev, admins }));
    // Limpiar errores de admins
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith("admins")) delete next[k];
      });
      return next;
    });
  }, []);

  const updateStepStatuses = useCallback((step, status) => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[step] = status;
      return next;
    });
  }, []);

  const handleNext = () => {
    // Validar paso actual (excepto el ultimo)
    if (currentStep < 4) {
      const stepErrors = validateStep(currentStep, formData, mode);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        updateStepStatuses(currentStep, "error");
        return;
      }

      // Marcar actual como complete
      updateStepStatuses(currentStep, "complete");

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateStepStatuses(nextStep, "current");
      setErrors({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      if (stepStatuses[currentStep] === "current") {
        updateStepStatuses(currentStep, "inactive");
      }
      setCurrentStep(prevStep);
      updateStepStatuses(prevStep, "current");
      setErrors({});
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep < currentStep || stepStatuses[targetStep] === "complete" || stepStatuses[targetStep] === "error") {
      if (targetStep > currentStep) {
        const stepErrors = validateStep(currentStep, formData, mode);
        if (Object.keys(stepErrors).length > 0) {
          setErrors(stepErrors);
          updateStepStatuses(currentStep, "error");
          return;
        }
        updateStepStatuses(currentStep, "complete");
      }

      if (stepStatuses[currentStep] === "current" && targetStep < currentStep) {
        const currentErrors = validateStep(currentStep, formData, mode);
        updateStepStatuses(currentStep, Object.keys(currentErrors).length > 0 ? "error" : "complete");
      }

      setCurrentStep(targetStep);
      updateStepStatuses(targetStep, "current");
      setErrors({});
    }
  };

  const handleGoToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
    updateStepStatuses(stepIndex, "current");
    setErrors({});
  };

  const handleSaveDraft = () => {
    console.log("Borrador guardado:", formData);
    alert("Borrador guardado correctamente (mock)");
  };

  const handleFinalize = () => {
    // Validar TODOS los pasos (0-3)
    let allValid = true;
    const allErrors = {};
    const newStatuses = [...stepStatuses];

    for (let i = 0; i < 4; i++) {
      const stepErrors = validateStep(i, formData, mode);
      if (Object.keys(stepErrors).length > 0) {
        allValid = false;
        newStatuses[i] = "error";
        Object.assign(allErrors, stepErrors);
      } else {
        newStatuses[i] = "complete";
      }
    }

    newStatuses[4] = "current";
    setStepStatuses(newStatuses);
    setErrors(allErrors);

    if (!allValid) {
      return;
    }

    // Llamar callback
    onFinalize(formData, formData.superadmin_status);
  };

  const isLastStep = currentStep === 4;

  return (
    <div style={styles.wizardContainer}>
      {/* Stepper */}
      <WizardStepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        stepStatuses={stepStatuses}
        onStepClick={handleStepClick}
      />

      {/* Contenido del paso actual */}
      <div style={styles.stepContent}>
        {currentStep === 0 && (
          <StepDatosCuenta
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        )}
        {currentStep === 1 && (
          <StepUsuariosAdmin
            formData={formData}
            errors={errors}
            onAdminsChange={handleAdminsChange}
            mode={mode}
          />
        )}
        {currentStep === 2 && (
          <StepDatosPlan
            formData={formData}
            errors={errors}
            onChange={handleChange}
            mode={mode}
          />
        )}
        {currentStep === 3 && (
          <StepMetodoPago
            formData={formData}
            errors={errors}
            onChange={handleChange}
            mode={mode}
            selectedPlan={selectedPlan}
          />
        )}
        {currentStep === 4 && (
          <StepVerificacion
            formData={formData}
            errors={errors}
            mode={mode}
            selectedPlan={selectedPlan}
            onGoToStep={handleGoToStep}
            stepStatuses={stepStatuses}
            onChange={handleChange}
          />
        )}
      </div>

      {/* Footer de acciones */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <button type="button" style={styles.cancelButton} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" style={styles.draftButton} onClick={handleSaveDraft}>
            Guardar borrador
          </button>
        </div>
        <div style={styles.footerRight}>
          {currentStep > 0 && (
            <button type="button" style={styles.prevButton} onClick={handlePrevious}>
              &larr; Anterior
            </button>
          )}
          {!isLastStep ? (
            <button type="button" style={styles.nextButton} onClick={handleNext}>
              Siguiente &rarr;
            </button>
          ) : (
            <button type="button" style={styles.finalizeButton} onClick={handleFinalize}>
              {mode === "self_signup" ? "Finalizar Registro" : "Crear Cuenta"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wizardContainer: {
    maxWidth: 900,
    margin: "0 auto",
  },
  stepContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    marginBottom: 24,
    minHeight: 400,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
  },
  footerLeft: {
    display: "flex",
    gap: 12,
  },
  footerRight: {
    display: "flex",
    gap: 12,
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#6B7280",
    transition: "all 0.2s ease",
  },
  draftButton: {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.2s ease",
  },
  prevButton: {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.2s ease",
  },
  nextButton: {
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
    transition: "all 0.2s ease",
  },
  finalizeButton: {
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "#059669",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
    transition: "all 0.2s ease",
  },
};
