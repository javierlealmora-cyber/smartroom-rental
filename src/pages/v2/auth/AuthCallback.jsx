// =============================================================================
// src/pages/v2/auth/AuthCallback.jsx
// =============================================================================
// Pagina intermedia que maneja redirecciones de Supabase Auth:
//   - Confirmacion de email (signup)
//   - Recovery / reset password
//   - Magic links
//   - Errores (OTP expirado, link invalido, etc.)
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../services/supabaseClient";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState("Verificando tu cuenta...");
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      // 1) Comprobar si hay error en el hash (#error=...)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      if (hashParams.get("error")) {
        const errorCode = hashParams.get("error_code") || "";
        const errorDesc =
          hashParams.get("error_description")?.replace(/\+/g, " ") || "";

        let userMessage = "El enlace no es valido o ha expirado.";
        if (errorCode === "otp_expired") {
          userMessage =
            "El enlace de confirmacion ha expirado. Por favor, solicita uno nuevo desde el login.";
        } else if (errorDesc) {
          userMessage = errorDesc;
        }

        setStatus(STATUS.ERROR);
        setMessage(userMessage);
        setErrorDetail(errorCode);
        return;
      }

      // 2) Comprobar si hay code PKCE en query params (?code=...)
      const code = searchParams.get("code");
      const type = hashParams.get("type") || searchParams.get("type") || "";

      if (code) {
        // PKCE flow: intercambiar code por sesion
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus(STATUS.ERROR);
          setMessage(
            error.message || "Error al verificar tu cuenta. Intentalo de nuevo."
          );
          return;
        }
      }

      // 3) Comprobar si hay tokens en el hash (implicit flow: #access_token=...)
      const accessToken = hashParams.get("access_token");
      if (accessToken) {
        // El supabase-js client deberia haber recogido el token automaticamente
        // via onAuthStateChange. Esperamos un momento.
        await new Promise((r) => setTimeout(r, 500));
      }

      // 4) Verificar sesion
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session && !code && !accessToken) {
        // No hay sesion y no habia tokens — link roto o expirado
        setStatus(STATUS.ERROR);
        setMessage("No se pudo verificar tu cuenta. El enlace puede haber expirado.");
        return;
      }

      // 5) Decidir destino segun el tipo de callback
      if (type === "recovery" || type === "password_recovery") {
        navigate("/v2/auth/reset-password", { replace: true });
        return;
      }

      // signup / email confirmation — exito
      setStatus(STATUS.SUCCESS);
      setMessage("Email confirmado correctamente!");

      setTimeout(() => {
        navigate("/v2/planes", {
          replace: true,
          state: {
            message: "Tu cuenta ha sido verificada. Selecciona un plan para continuar.",
          },
        });
      }, 2000);
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === STATUS.LOADING && (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.title}>{message}</h2>
          </>
        )}

        {status === STATUS.SUCCESS && (
          <>
            <div style={styles.checkmark}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 style={styles.title}>{message}</h2>
            <p style={styles.subtitle}>Redirigiendo...</p>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <div style={styles.errorIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={styles.title}>Error de verificacion</h2>
            <p style={styles.errorMessage}>{message}</p>
            <button
              style={styles.button}
              onClick={() => navigate("/v2/auth/login")}
            >
              Ir al login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes auth-cb-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 48,
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
    maxWidth: 440,
    width: "90%",
  },
  spinner: {
    width: 48,
    height: 48,
    border: "4px solid #E5E7EB",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "auth-cb-spin 1s linear infinite",
    margin: "0 auto 24px",
  },
  checkmark: {
    marginBottom: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    margin: 0,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  button: {
    display: "inline-block",
    padding: "12px 32px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
