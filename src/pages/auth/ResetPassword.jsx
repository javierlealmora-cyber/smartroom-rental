// src/pages/auth/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

const CACHE_BUSTER = "v1-reset-" + Date.now();
const HERO_IMG = `https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent/login-welcome-2560.webp?t=${CACHE_BUSTER}`;

export default function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(null);

  useEffect(() => {
    // Verificar si hay una sesión de recuperación válida
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Si hay sesión, el usuario viene del enlace de recuperación
      if (session) {
        setValidSession(true);
      } else {
        // Verificar si hay error en el hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (error) {
          setError(errorDescription?.replace(/\+/g, " ") || "El enlace ha expirado o no es válido");
          setValidSession(false);
        } else {
          setValidSession(false);
          setError("No hay una sesión de recuperación activa");
        }
      }
    };

    checkSession();

    // Escuchar cambios de autenticación (cuando el usuario hace clic en el enlace)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setBusy(true);

    const { error: err } = await supabase.auth.updateUser({
      password: password,
    });

    setBusy(false);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      // Cerrar sesión para que inicie con la nueva contraseña
      await supabase.auth.signOut();
      setTimeout(() => {
        nav("/auth/login", { replace: true });
      }, 3000);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!busy) handleResetPassword();
  };

  const styles = {
    page: {
      position: "relative",
      width: "100vw",
      height: "100vh",
      minHeight: "100vh",
      overflow: "hidden",
      background: "#000",
      margin: 0,
      padding: 0,
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    },
    bg: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundImage: `url(${HERO_IMG})`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat",
      zIndex: 0,
    },
    overlay: {
      position: "relative",
      width: "100vw",
      height: "100vh",
      minHeight: "100vh",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "2px solid rgba(255, 255, 255, 0.25)",
      borderRadius: "24px",
      padding: "40px",
      maxWidth: "420px",
      width: "90%",
      boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4)",
    },
    title: {
      color: "white",
      margin: "0 0 8px",
      fontSize: "24px",
      fontWeight: "600",
      textAlign: "center",
    },
    subtitle: {
      color: "rgba(255,255,255,0.75)",
      margin: "0 0 32px",
      fontSize: "14px",
      textAlign: "center",
    },
    inputWrapper: {
      position: "relative",
      marginBottom: "16px",
    },
    input: {
      width: "100%",
      padding: "14px 50px 14px 16px",
      background: "rgba(255, 255, 255, 0.2)",
      border: "2px solid rgba(255, 255, 255, 0.25)",
      borderRadius: "12px",
      color: "white",
      fontSize: "15px",
      outline: "none",
      boxSizing: "border-box",
    },
    eyeButton: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    button: {
      width: "100%",
      padding: "14px",
      background: "rgba(255, 255, 255, 0.25)",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      color: "white",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      marginTop: "8px",
    },
    error: {
      color: "#ff6b6b",
      fontSize: "13px",
      marginBottom: "16px",
      textAlign: "center",
    },
    success: {
      color: "#69db7c",
      fontSize: "14px",
      marginBottom: "16px",
      textAlign: "center",
      lineHeight: "1.5",
    },
    link: {
      color: "rgba(255,255,255,0.8)",
      fontSize: "14px",
      textDecoration: "underline",
      cursor: "pointer",
      marginTop: "16px",
      display: "block",
      textAlign: "center",
    },
  };

  const EyeIcon = ({ open }) =>
    open ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );

  return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <div style={styles.overlay}>
        <div style={styles.card}>
          {success ? (
            <>
              <h2 style={styles.title}>Contraseña actualizada</h2>
              <p style={styles.success}>
                Tu contraseña se ha actualizado correctamente.
                <br />
                Redirigiendo al login...
              </p>
            </>
          ) : validSession === false ? (
            <>
              <h2 style={styles.title}>Enlace no válido</h2>
              <p style={{ ...styles.error, marginBottom: "24px" }}>
                {error || "El enlace de recuperación ha expirado o no es válido."}
              </p>
              <button
                type="button"
                onClick={() => nav("/auth/login")}
                style={styles.button}
              >
                Volver al login
              </button>
            </>
          ) : validSession === true ? (
            <form onSubmit={onSubmit}>
              <h2 style={styles.title}>Nueva contraseña</h2>
              <p style={styles.subtitle}>
                Introduce tu nueva contraseña
              </p>

              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nueva contraseña"
                  style={styles.input}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar contraseña"
                  style={styles.input}
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={busy || !password || !confirmPassword}
                style={{
                  ...styles.button,
                  opacity: busy || !password || !confirmPassword ? 0.5 : 1,
                  cursor: busy || !password || !confirmPassword ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          ) : (
            <p style={{ color: "white", textAlign: "center" }}>Verificando...</p>
          )}
        </div>
      </div>

      <style>{`
        body, html {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        input:focus {
          border-color: rgba(255, 255, 255, 0.5) !important;
          background: rgba(255, 255, 255, 0.25) !important;
        }
        button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
