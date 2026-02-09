// =============================================================================
// src/pages/v2/autoregistro/SelfSignup.jsx
// =============================================================================
// RCCP – Autoregistro (página pública)
// Wrapper con header público + wizard en modo "self_signup"
// =============================================================================

import { useNavigate } from "react-router-dom";
import ClientAccountWizard from "../../../components/wizards/ClientAccountWizard";

export default function SelfSignup() {
  const navigate = useNavigate();

  const handleFinalize = (formData) => {
    console.log("Autoregistro completado:", formData);
    alert(
      `¡Registro completado!\n\n` +
      `Cuenta: ${formData.full_name}\n` +
      `Plan: ${formData.plan_code}\n` +
      `Email: ${formData.email}\n\n` +
      `Se enviará un email de confirmación a ${formData.email} (mock).`
    );
    navigate("/auth/login");
  };

  const handleCancel = () => {
    if (confirm("¿Desea cancelar el registro? Se perderán los datos introducidos.")) {
      navigate("/");
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header público */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logoPlaceholder}>SR</div>
            <div style={styles.logoTextWrapper}>
              <span style={styles.brandName}>SmartRent Systems</span>
              <span style={styles.brandTagline}>Registro de Cuenta</span>
            </div>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.loginText}>¿Ya tienes cuenta?</span>
            <button
              style={styles.loginButton}
              onClick={() => navigate("/auth/login")}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={styles.mainContent}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.pageTitle}>Crea tu cuenta en SmartRent</h1>
          <p style={styles.pageSubtitle}>
            Completa los siguientes pasos para configurar tu cuenta y empezar a gestionar
            tus alojamientos de forma inteligente.
          </p>
        </div>

        <ClientAccountWizard
          mode="self_signup"
          onFinalize={handleFinalize}
          onCancel={handleCancel}
        />
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>
          © {new Date().getFullYear()} SmartRent Systems. Todos los derechos reservados.
        </span>
      </footer>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  // Header público
  header: {
    backgroundColor: "#111827",
    padding: "16px 32px",
    color: "#FFFFFF",
  },
  headerContent: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoTextWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
  },
  brandTagline: {
    fontSize: 12,
    opacity: 0.8,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  loginText: {
    fontSize: 14,
    opacity: 0.8,
  },
  loginButton: {
    padding: "8px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  // Contenido principal
  mainContent: {
    flex: 1,
    maxWidth: 1000,
    margin: "0 auto",
    padding: "32px 32px",
    width: "100%",
    boxSizing: "border-box",
  },
  welcomeSection: {
    textAlign: "center",
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    margin: 0,
    maxWidth: 600,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    padding: "24px 32px",
    textAlign: "center",
    borderTop: "1px solid #E5E7EB",
  },
  footerText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
};
