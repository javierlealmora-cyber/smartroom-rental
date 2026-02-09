// =============================================================================
// src/pages/v2/superadmin/ClientAccountCreate.jsx
// =============================================================================
// RCCP – SuperAdmin crea Cuenta Cliente
// Wrapper que usa el wizard compartido en modo "superadmin_create"
// =============================================================================

import { useNavigate } from "react-router-dom";
import V2Layout from "../../../layouts/V2Layout";
import ClientAccountWizard from "../../../components/wizards/ClientAccountWizard";

export default function ClientAccountCreate() {
  const navigate = useNavigate();

  const handleFinalize = (formData, status) => {
    console.log("Crear cuenta cliente (superadmin):", formData);
    console.log("Estado:", status);
    alert(
      `Cuenta cliente "${formData.full_name}" creada como ${status} (mock).\n\n` +
      `Plan: ${formData.plan_code}\n` +
      `Admin: ${formData.admins[0].email}`
    );
    navigate("/v2/superadmin/cuentas");
  };

  const handleCancel = () => {
    if (confirm("¿Desea cancelar? Se perderán los datos no guardados.")) {
      navigate("/v2/superadmin/cuentas");
    }
  };

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
