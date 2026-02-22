// =============================================================================
// src/pages/v2/superadmin/ClientAccountCreate.jsx
// =============================================================================
// RCCP – SuperAdmin crea Cuenta Cliente
// Wrapper que usa el wizard compartido en modo "superadmin_create"
// Conectado a Edge Function provision_client_account_superadmin
// =============================================================================

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import ClientAccountWizard from "../../../components/wizards/ClientAccountWizard";
import { callProvisionSuperadmin } from "../../../services/clientAccounts.service";

export default function ClientAccountCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleFinalize = useCallback(async (payload) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await callProvisionSuperadmin(payload);
      console.log("[SuperAdmin] Cuenta creada:", result);
      navigate("/v2/superadmin/cuentas");
    } catch (err) {
      console.error("[SuperAdmin] provision error:", err);
      setSubmitError(err?.message || "Error al crear la cuenta. Intentalo de nuevo.");
      setSubmitting(false);
    }
  }, [navigate]);

  const handleCancel = useCallback(() => {
    if (confirm("¿Desea cancelar? Se perderan los datos no guardados.")) {
      navigate("/v2/superadmin/cuentas");
    }
  }, [navigate]);

  return (
    <V2Layout role="superadmin" userName="Administrador">
      <div style={styles.header}>
        <h1 style={styles.title}>Nueva Cuenta Cliente</h1>
        <p style={styles.subtitle}>
          Complete el wizard para crear una nueva cuenta en el sistema
        </p>
      </div>

      <ClientAccountWizard
        mode="superadmin_create"
        onFinalize={handleFinalize}
        onCancel={handleCancel}
        submitting={submitting}
        submitError={submitError}
      />
    </V2Layout>
  );
}

const styles = {
  header: {
    marginBottom: 24,
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
};
