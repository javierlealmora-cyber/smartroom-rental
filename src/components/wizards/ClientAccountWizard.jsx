// =============================================================================
// src/components/wizards/ClientAccountWizard.jsx
// =============================================================================
// Wizard 6 pasos para crear Cuenta Cliente
// Modos: "self_signup" (autoregistro) | "superadmin_create" (superadmin)
// Pasos: A-Contrato, B-Branding, C-EntidadPagadora, D-Admins, E-Verificacion, F-Pago
// Conecta con Edge Functions: wizard_submit / provision_client_account_superadmin
// =============================================================================

import { useState, useCallback } from "react";
import WizardStepper from "./WizardStepper";
import StepContrato from "./steps/StepContrato";
import StepBranding from "./steps/StepBranding";
import StepEntidadPagadora from "./steps/StepEntidadPagadora";
import StepUsuariosAdmin from "./steps/StepUsuariosAdmin";
import StepVerificacion from "./steps/StepVerificacion";
import StepPago from "./steps/StepPago";
import { getPlanByCode } from "../../mocks/clientAccountsData";

const WIZARD_STEPS = [
  { id: "contrato", label: "Contrato" },
  { id: "branding", label: "Branding" },
  { id: "entidad_pagadora", label: "Entidad Pagadora" },
  { id: "usuarios_admin", label: "Admins" },
  { id: "verificacion", label: "Verificacion" },
  { id: "pago", label: "Pago" },
];

const TOTAL_STEPS = WIZARD_STEPS.length;

// Estado inicial del formulario (nuevo esquema)
const getInitialFormData = () => ({
  // Paso A: Contrato
  account_name: "",
  slug: "",
  contact_email: "",
  contact_phone: "",
  start_date: new Date().toISOString().split("T")[0],
  plan_code: "basic",
  billing_cycle: "monthly",

  // Paso B: Branding
  brand_name: "",
  primary_color: "#111827",
  secondary_color: "",
  logo_url: "",

  // Paso C: Entidad Pagadora
  payer_type: "",
  payer_legal_name: "",
  payer_first_name: "",
  payer_last_name_1: "",
  payer_last_name_2: "",
  payer_tax_id: "",
  payer_street: "",
  payer_street_number: "",
  payer_address_extra: "",
  payer_zip: "",
  payer_city: "",
  payer_province: "",
  payer_country: "Espana",
  payer_billing_email: "",
  payer_billing_phone: "",

  // Paso D: Usuarios Admin
  admins: [
    { email: "", full_name: "", phone: "", is_titular: true },
    { email: "", full_name: "", phone: "", is_titular: false },
    { email: "", full_name: "", phone: "", is_titular: false },
  ],

  // Paso E: Verificacion (superadmin)
  superadmin_status: "draft",
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validacion por paso
const validateStep = (stepIndex, formData, mode) => {
  const errs = {};

  // Paso A: Contrato
  if (stepIndex === 0) {
    if (!formData.account_name?.trim() || formData.account_name.trim().length < 3)
      errs.account_name = "Nombre requerido (min. 3 caracteres)";
    if (!formData.contact_email?.trim())
      errs.contact_email = "Email requerido";
    else if (!EMAIL_REGEX.test(formData.contact_email))
      errs.contact_email = "Email invalido";
    if (!formData.contact_phone?.trim())
      errs.contact_phone = "Telefono requerido";
    if (!formData.start_date)
      errs.start_date = "Fecha de inicio requerida";
    if (!formData.slug?.trim())
      errs.slug = "Slug requerido";
    else if (!/^[a-z0-9-]+$/.test(formData.slug))
      errs.slug = "Solo letras minusculas, numeros y guiones";
    if (!formData.plan_code)
      errs.plan_code = "Seleccione un plan";
    if (!formData.billing_cycle)
      errs.billing_cycle = "Seleccione ciclo de facturacion";
  }

  // Paso B: Branding (solo validar formatos si hay valor)
  if (stepIndex === 1) {
    if (formData.primary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.primary_color))
      errs.primary_color = "Formato hex invalido (ej: #1E40AF)";
    if (formData.secondary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.secondary_color))
      errs.secondary_color = "Formato hex invalido";
  }

  // Paso C: Entidad Pagadora
  if (stepIndex === 2) {
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
    if (!formData.payer_street?.trim())
      errs.payer_street = "Direccion requerida";
    if (!formData.payer_zip?.trim())
      errs.payer_zip = "Codigo postal requerido";
    if (!formData.payer_city?.trim())
      errs.payer_city = "Ciudad requerida";
    if (!formData.payer_country?.trim())
      errs.payer_country = "Pais requerido";
    if (!formData.payer_billing_email?.trim())
      errs.payer_billing_email = "Email de facturacion requerido";
    else if (!EMAIL_REGEX.test(formData.payer_billing_email))
      errs.payer_billing_email = "Email invalido";
  }

  // Paso D: Usuarios Admin
  if (stepIndex === 3) {
    if (!formData.admins[0].email?.trim())
      errs.admins_0_email = "Email del admin titular requerido";
    else if (!EMAIL_REGEX.test(formData.admins[0].email))
      errs.admins_0_email = "Email invalido";
    if (!formData.admins[0].full_name?.trim())
      errs.admins_0_full_name = "Nombre del admin titular requerido";
    if (!formData.admins[0].phone?.trim())
      errs.admins_0_phone = "Telefono del admin titular requerido";

    [1, 2].forEach((i) => {
      if (formData.admins[i].email?.trim()) {
        if (!EMAIL_REGEX.test(formData.admins[i].email))
          errs[`admins_${i}_email`] = "Email invalido";
      }
    });

    const filledEmails = formData.admins
      .map((a) => a.email?.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(filledEmails).size !== filledEmails.length)
      errs.admins_duplicate = "Los emails de admin no pueden repetirse";
  }

  // Paso E: Verificacion — no tiene validacion propia
  // Paso F: Pago — no tiene validacion de campos (Stripe maneja)

  return errs;
};

export default function ClientAccountWizard({
  mode = "self_signup",
  onFinalize,
  onCancel,
  initialData = null,
  submitting = false,
  submitError = null,
  initialPlanCode = "",
  initialBillingCycle = "",
  userEmail = "",
  userFullName = "",
  userPhone = "",
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    const base = initialData || getInitialFormData();
    if (initialPlanCode) base.plan_code = initialPlanCode;
    if (initialBillingCycle) base.billing_cycle = initialBillingCycle;
    // Pre-fill from authenticated user data
    if (userEmail) {
      base.contact_email = base.contact_email || userEmail;
      base.payer_billing_email = base.payer_billing_email || userEmail;
      base.admins[0].email = base.admins[0].email || userEmail;
    }
    if (userFullName) {
      base.admins[0].full_name = base.admins[0].full_name || userFullName;
    }
    if (userPhone) {
      base.contact_phone = base.contact_phone || userPhone;
      base.admins[0].phone = base.admins[0].phone || userPhone;
    }
    return base;
  });
  const [errors, setErrors] = useState({});
  const [stepStatuses, setStepStatuses] = useState(
    Array(TOTAL_STEPS).fill("inactive").map((s, i) => (i === 0 ? "current" : s))
  );

  const selectedPlan = getPlanByCode(formData.plan_code);

  // Determinar si paso F (Pago) se muestra
  const showPaymentStep = mode === "self_signup";
  const lastStepIndex = showPaymentStep ? TOTAL_STEPS - 1 : TOTAL_STEPS - 2;
  const verificationStepIndex = TOTAL_STEPS - 2; // paso E

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      if (field === "account_name") {
        newData.slug = generateSlug(value);
      }

      if (field === "contact_email" && !prev.payer_billing_email) {
        newData.payer_billing_email = value;
      }

      // Auto-fill admin titular from contact data
      if (field === "contact_email" && !prev.admins[0].email) {
        newData.admins = [...prev.admins];
        newData.admins[0] = { ...newData.admins[0], email: value };
      }
      if (field === "contact_phone" && !prev.admins[0].phone) {
        newData.admins = [...prev.admins];
        newData.admins[0] = { ...newData.admins[0], phone: value };
      }

      return newData;
    });

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleAdminsChange = useCallback((admins) => {
    setFormData((prev) => ({ ...prev, admins }));
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
    if (currentStep < lastStepIndex) {
      const stepErrors = validateStep(currentStep, formData, mode);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        updateStepStatuses(currentStep, "error");
        return;
      }

      updateStepStatuses(currentStep, "complete");
      const nextStep = currentStep + 1;

      // Saltar paso F si es superadmin
      const effectiveNext = !showPaymentStep && nextStep === TOTAL_STEPS - 1
        ? TOTAL_STEPS - 2
        : nextStep;

      setCurrentStep(effectiveNext);
      updateStepStatuses(effectiveNext, "current");
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
    // No permitir ir al paso de pago en superadmin
    if (!showPaymentStep && targetStep === TOTAL_STEPS - 1) return;

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
    // Validar pasos 0-3 (A-D)
    let allValid = true;
    const allErrors = {};
    const newStatuses = [...stepStatuses];

    for (let i = 0; i <= 3; i++) {
      const stepErrors = validateStep(i, formData, mode);
      if (Object.keys(stepErrors).length > 0) {
        allValid = false;
        newStatuses[i] = "error";
        Object.assign(allErrors, stepErrors);
      } else {
        newStatuses[i] = "complete";
      }
    }

    newStatuses[verificationStepIndex] = "current";
    setStepStatuses(newStatuses);
    setErrors(allErrors);

    if (!allValid) return;

    // Construir payload para Edge Function
    const payload = {
      account_name: formData.account_name,
      slug: formData.slug,
      plan_code: formData.plan_code,
      billing_cycle: formData.billing_cycle,
      start_date: formData.start_date,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      branding_name: formData.brand_name || null,
      branding_primary_color: formData.primary_color || null,
      branding_secondary_color: formData.secondary_color || null,
      branding_logo_url: formData.logo_url || null,
      payer: {
        legal_type: formData.payer_type,
        legal_name: formData.payer_legal_name || null,
        first_name: formData.payer_first_name || null,
        last_name1: formData.payer_last_name_1 || null,
        last_name2: formData.payer_last_name_2 || null,
        tax_id: formData.payer_tax_id,
        billing_email: formData.payer_billing_email,
        phone: formData.payer_billing_phone || null,
        country: formData.payer_country || "Espana",
        province: formData.payer_province || null,
        city: formData.payer_city,
        zip: formData.payer_zip,
        street: formData.payer_street,
        street_number: formData.payer_street_number || null,
        address_extra: formData.payer_address_extra || null,
      },
      admins: formData.admins
        .filter((a) => a.email?.trim() && (mode === "superadmin_create" || !a.is_titular))
        .map((a) => ({
          email: a.email.trim(),
          full_name: a.full_name?.trim() || null,
          is_primary: !!a.is_titular,
        })),
      mode,
    };

    // Superadmin: incluir status elegido
    if (mode === "superadmin_create") {
      payload.status = formData.superadmin_status || "draft";
    }

    onFinalize(payload);
  };

  const isLastStep = currentStep === lastStepIndex;

  // Pasos visibles (sin paso F para superadmin)
  const visibleSteps = showPaymentStep
    ? WIZARD_STEPS
    : WIZARD_STEPS.slice(0, TOTAL_STEPS - 1);

  return (
    <div style={styles.wizardContainer}>
      <WizardStepper
        steps={visibleSteps}
        currentStep={currentStep}
        stepStatuses={stepStatuses}
        onStepClick={handleStepClick}
      />

      <div style={styles.stepContent}>
        {currentStep === 0 && (
          <StepContrato
            formData={formData}
            errors={errors}
            onChange={handleChange}
            mode={mode}
          />
        )}
        {currentStep === 1 && (
          <StepBranding
            formData={formData}
            errors={errors}
            onChange={handleChange}
            selectedPlan={selectedPlan}
          />
        )}
        {currentStep === 2 && (
          <StepEntidadPagadora
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
        )}
        {currentStep === 3 && (
          <StepUsuariosAdmin
            formData={formData}
            errors={errors}
            onAdminsChange={handleAdminsChange}
            mode={mode}
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
        {currentStep === 5 && showPaymentStep && (
          <StepPago
            formData={formData}
            mode={mode}
            selectedPlan={selectedPlan}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </div>

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
            <button
              type="button"
              style={{
                ...styles.finalizeButton,
                ...(submitting ? styles.finalizeButtonDisabled : {}),
              }}
              onClick={handleFinalize}
              disabled={submitting}
            >
              {submitting
                ? "Procesando..."
                : mode === "self_signup"
                  ? "Finalizar y Pagar"
                  : "Crear Cuenta"}
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
  finalizeButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
