// =============================================================================
// src/pages/v2/autoregistro/AutoRegistroCuenta.jsx
// =============================================================================
// Pagina auth-first para autoregistro de cuenta de cliente.
// Flujo: Si no autenticado → landing CTA. Si autenticado → wizard o estado.
// Maneja query params ?stripe=success y ?stripe=cancel
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../providers/AuthProvider";
import { callWhoami, callWizardInit, callWizardSubmit } from "../../../services/clientAccounts.service";
import ClientAccountWizard from "../../../components/wizards/ClientAccountWizard";

// Estados internos de la pagina
const VIEW = {
  LOADING: "loading",
  LANDING: "landing",         // no autenticado
  WIZARD: "wizard",           // onboarding none o in_progress
  PAYMENT_PENDING: "payment_pending",
  STRIPE_SUCCESS: "stripe_success",
  STRIPE_CANCEL: "stripe_cancel",
  ALREADY_ACTIVE: "already_active",
  ERROR: "error",
};

export default function AutoRegistroCuenta() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, onboardingStatus, clientAccountId, refreshProfile, user, profile } = useAuth();

  const [view, setView] = useState(VIEW.LOADING);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Determinar vista segun estado de auth y onboarding
  useEffect(() => {
    if (authLoading) {
      setView(VIEW.LOADING);
      return;
    }

    // No autenticado → redirigir a registro con plan params
    if (!isAuthenticated) {
      const plan = searchParams.get("plan");
      const billing = searchParams.get("billing") || "monthly";
      if (plan) {
        navigate(`/v2/registro?plan=${plan}&billing=${billing}`, { replace: true });
      } else {
        navigate("/v2/registro", { replace: true });
      }
      return;
    }

    // Stripe callbacks
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "success") {
      setView(VIEW.STRIPE_SUCCESS);
      return;
    }
    if (stripeParam === "cancel") {
      setView(VIEW.STRIPE_CANCEL);
      return;
    }

    // Ya tiene cuenta activa → redirect
    if (clientAccountId && onboardingStatus === "active") {
      setView(VIEW.ALREADY_ACTIVE);
      return;
    }

    // Pago pendiente
    if (onboardingStatus === "payment_pending") {
      setView(VIEW.PAYMENT_PENDING);
      return;
    }

    // None o in_progress → wizard
    if (onboardingStatus === "none" || onboardingStatus === "in_progress") {
      setView(VIEW.WIZARD);
      // Si es 'none', inicializar wizard
      if (onboardingStatus === "none") {
        callWizardInit().catch((err) => {
          console.warn("[AutoRegistroCuenta] wizard_init error:", err);
        });
      }
      return;
    }

    // Fallback
    setView(VIEW.WIZARD);
  }, [authLoading, isAuthenticated, onboardingStatus, clientAccountId, searchParams]);

  // Handler del wizard al finalizar
  const handleFinalize = useCallback(async (payload) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await callWizardSubmit(payload);

      // Refrescar perfil para que AuthProvider tenga role/onboarding actualizados
      await refreshProfile();

      if (result?.checkout_url) {
        // Redirigir a Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        // Sin checkout → mock mode → cuenta activada directamente
        // Redirigir al dashboard automaticamente
        navigate("/v2/manager/dashboard");
      }
    } catch (err) {
      console.error("[AutoRegistroCuenta] wizard_submit error:", err);
      setSubmitError(err?.message || "Error al procesar el registro. Intentalo de nuevo.");
      setSubmitting(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (confirm("¿Desea cancelar el registro? Se perderan los datos introducidos.")) {
      navigate("/v2");
    }
  }, [navigate]);

  // Reintentar pago (payment_pending o stripe cancel)
  const handleRetryPayment = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const whoami = await callWhoami();
      if (whoami?.checkout_url) {
        window.location.href = whoami.checkout_url;
      } else {
        setError("No se pudo obtener la URL de pago. Contacta con soporte.");
        setSubmitting(false);
      }
    } catch (err) {
      setError(err?.message || "Error al reintentar el pago.");
      setSubmitting(false);
    }
  }, []);

  // Redirect a dashboard tras stripe success
  const handleGoToDashboard = useCallback(async () => {
    await refreshProfile();
    navigate("/v2/manager/dashboard");
  }, [navigate, refreshProfile]);

  return (
    <div style={styles.pageContainer}>
      {/* Header publico */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logoPlaceholder}>SR</div>
            <div style={styles.logoTextWrapper}>
              <span style={styles.brandName}>SmartRoom Rental Platform</span>
              <span style={styles.brandTagline}>Registro de Cuenta</span>
            </div>
          </div>
          <div style={styles.headerRight}>
            {!isAuthenticated ? (
              <>
                <span style={styles.loginText}>¿Ya tienes cuenta?</span>
                <button
                  style={styles.loginButton}
                  onClick={() => navigate("/v2/auth/login")}
                >
                  Iniciar sesion
                </button>
              </>
            ) : (
              <button
                style={styles.loginButton}
                onClick={() => navigate("/v2/auth/logout")}
              >
                Cerrar sesion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={styles.mainContent}>
        {/* LOADING */}
        {view === VIEW.LOADING && (
          <div style={styles.centerCard}>
            <div style={styles.spinner} />
            <p style={styles.centerText}>Cargando...</p>
          </div>
        )}

        {/* LANDING - No autenticado */}
        {view === VIEW.LANDING && <LandingView onNavigate={navigate} />}

        {/* WIZARD */}
        {view === VIEW.WIZARD && (
          <div>
            <div style={styles.welcomeSection}>
              <h1 style={styles.pageTitle}>Crea tu cuenta en SmartRoom</h1>
              <p style={styles.pageSubtitle}>
                Completa los siguientes pasos para configurar tu cuenta y empezar a gestionar
                tus alojamientos de forma inteligente.
              </p>
            </div>
            <ClientAccountWizard
              mode="self_signup"
              onFinalize={handleFinalize}
              onCancel={handleCancel}
              submitting={submitting}
              submitError={submitError}
              initialPlanCode={searchParams.get("plan") || ""}
              initialBillingCycle={searchParams.get("billing") || "monthly"}
              userEmail={user?.email || ""}
              userFullName={user?.user_metadata?.full_name || profile?.full_name || ""}
              userPhone={user?.user_metadata?.phone || profile?.phone || ""}
            />
          </div>
        )}

        {/* PAYMENT PENDING */}
        {view === VIEW.PAYMENT_PENDING && (
          <div style={styles.centerCard}>
            <div style={styles.iconCircle}>
              <span style={{ fontSize: 32 }}>&#9203;</span>
            </div>
            <h2 style={styles.cardTitle}>Pago pendiente</h2>
            <p style={styles.cardDescription}>
              Tu cuenta esta creada pero el pago no se ha completado.
              Pulsa el boton para reintentar el pago a traves de Stripe.
            </p>
            {error && <p style={styles.errorText}>{error}</p>}
            <button
              style={styles.primaryButton}
              onClick={handleRetryPayment}
              disabled={submitting}
            >
              {submitting ? "Procesando..." : "Reintentar pago"}
            </button>
          </div>
        )}

        {/* STRIPE SUCCESS */}
        {view === VIEW.STRIPE_SUCCESS && (
          <div style={styles.centerCard}>
            <div style={{ ...styles.iconCircle, backgroundColor: "#D1FAE5" }}>
              <span style={{ fontSize: 32, color: "#059669" }}>&#10003;</span>
            </div>
            <h2 style={styles.cardTitle}>¡Registro completado!</h2>
            <p style={styles.cardDescription}>
              Tu cuenta ha sido creada y el pago se ha procesado correctamente.
              Ya puedes acceder a tu panel de administracion.
            </p>
            <button
              style={styles.primaryButton}
              onClick={handleGoToDashboard}
            >
              Ir a SmartRoom
            </button>
          </div>
        )}

        {/* STRIPE CANCEL */}
        {view === VIEW.STRIPE_CANCEL && (
          <div style={styles.centerCard}>
            <div style={{ ...styles.iconCircle, backgroundColor: "#FEF3C7" }}>
              <span style={{ fontSize: 32, color: "#D97706" }}>&#9888;</span>
            </div>
            <h2 style={styles.cardTitle}>Pago cancelado</h2>
            <p style={styles.cardDescription}>
              Has cancelado el proceso de pago. Tu cuenta queda pendiente de activacion.
              Puedes reintentar el pago cuando lo desees.
            </p>
            {error && <p style={styles.errorText}>{error}</p>}
            <button
              style={styles.primaryButton}
              onClick={handleRetryPayment}
              disabled={submitting}
            >
              {submitting ? "Procesando..." : "Reintentar pago"}
            </button>
            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/v2")}
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* ALREADY ACTIVE */}
        {view === VIEW.ALREADY_ACTIVE && (
          <div style={styles.centerCard}>
            <div style={{ ...styles.iconCircle, backgroundColor: "#DBEAFE" }}>
              <span style={{ fontSize: 32, color: "#2563EB" }}>&#9432;</span>
            </div>
            <h2 style={styles.cardTitle}>Ya tienes una cuenta activa</h2>
            <p style={styles.cardDescription}>
              Tu cuenta ya esta configurada y activa. Accede a tu panel de administracion.
            </p>
            <button
              style={styles.primaryButton}
              onClick={handleGoToDashboard}
            >
              Ir a SmartRoom
            </button>
          </div>
        )}

        {/* ERROR */}
        {view === VIEW.ERROR && (
          <div style={styles.centerCard}>
            <div style={{ ...styles.iconCircle, backgroundColor: "#FEE2E2" }}>
              <span style={{ fontSize: 32, color: "#DC2626" }}>&#9888;</span>
            </div>
            <h2 style={styles.cardTitle}>Error</h2>
            <p style={styles.cardDescription}>
              {error || "Ha ocurrido un error inesperado."}
            </p>
            <button
              style={styles.primaryButton}
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>
          © {new Date().getFullYear()} SmartRoom Rental Platform. Todos los derechos reservados.
        </span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing View (usuario no autenticado)
// ---------------------------------------------------------------------------
function LandingView({ onNavigate }) {
  return (
    <div style={styles.landingContainer}>
      <div style={styles.landingCard}>
        <div style={styles.landingIcon}>
          <span style={{ fontSize: 48 }}>&#127968;</span>
        </div>
        <h1 style={styles.landingTitle}>
          Gestiona tus alojamientos con SmartRoom
        </h1>
        <p style={styles.landingDescription}>
          Plataforma inteligente para la gestion de alquiler de habitaciones.
          Controla inquilinos, consumos, facturacion y mucho mas desde un solo lugar.
        </p>

        <div style={styles.landingFeatures}>
          {[
            { icon: "&#128100;", text: "Gestion de inquilinos y ocupacion" },
            { icon: "&#9889;", text: "Control de consumos y facturacion energetica" },
            { icon: "&#128202;", text: "Liquidaciones y boletines automaticos" },
            { icon: "&#128274;", text: "Seguridad multi-tenant con roles y permisos" },
          ].map((feat, i) => (
            <div key={i} style={styles.featureItem}>
              <span
                style={styles.featureIcon}
                dangerouslySetInnerHTML={{ __html: feat.icon }}
              />
              <span style={styles.featureText}>{feat.text}</span>
            </div>
          ))}
        </div>

        <div style={styles.landingActions}>
          <button
            style={styles.primaryButton}
            onClick={() => onNavigate("/v2/auth/login")}
          >
            Registrate o inicia sesion
          </button>
          <p style={styles.landingNote}>
            Despues de registrarte, vuelve a esta pagina para crear tu cuenta de empresa.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  // Header
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
  // Main content
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
  // Center card (status views)
  centerCard: {
    maxWidth: 480,
    margin: "60px auto",
    padding: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E5E7EB",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  cardDescription: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 1.6,
    margin: 0,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    margin: 0,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #E5E7EB",
    borderTopColor: "#3B82F6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  centerText: {
    fontSize: 15,
    color: "#6B7280",
    margin: 0,
  },
  // Buttons
  primaryButton: {
    padding: "12px 28px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  secondaryButton: {
    padding: "10px 24px",
    backgroundColor: "transparent",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  // Landing
  landingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
  },
  landingCard: {
    maxWidth: 560,
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E5E7EB",
    textAlign: "center",
  },
  landingIcon: {
    marginBottom: 16,
  },
  landingTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 12px 0",
  },
  landingDescription: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 1.6,
    marginBottom: 24,
  },
  landingFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    textAlign: "left",
    marginBottom: 32,
    padding: "0 16px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
  },
  landingActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  landingNote: {
    fontSize: 13,
    color: "#9CA3AF",
    margin: 0,
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
