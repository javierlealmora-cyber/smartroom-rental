// src/pages/auth/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";

// ✅ IMAGEN DE LOGIN (fuera del componente para evitar recalcular)
const CACHE_BUSTER = "v7-spacing-autofill-" + Date.now();
const HERO_IMG = `https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent/login-welcome-2560.webp?t=${CACHE_BUSTER}`;

export default function Login() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const redirectByRole = (role) => {
    if (role === "superadmin") return "/superadmin/dashboard";
    if (role === "admin") return "/admin";
    if (role === "api") return "/api";
    return "/student";
  };

  useEffect(() => {
    if (!loading && user && profile?.role) {
      nav(redirectByRole(profile.role), { replace: true });
    }
  }, [loading, user, profile, nav]);

  useEffect(() => {
    if (!loading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/auth/login") {
        nav("/auth/login", { replace: true });
      }
    }
  }, [loading, user, nav]);

  const handleLogin = async () => {
    setError(null);
    setBusy(true);

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);
    if (err) setError(err.message);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!busy) handleLogin();
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError("Por favor, introduce tu email");
      return;
    }
    setError(null);
    setForgotBusy(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setForgotBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setForgotSent(true);
    }
  };

  const closeForgotModal = () => {
    setForgotMode(false);
    setForgotEmail("");
    setForgotSent(false);
    setError(null);
  };

  /**
   * =========================================================
   * ✅ VARIABLES QUE MUEVEN/ESCALAN TODO (AJUSTA AQUÍ)
   * =========================================================
   * - Las posiciones están en % para que sea responsive.
   * - “anchor” es el rectángulo donde está la pantalla del monitor.
   * - Dentro del anchor colocamos inputs/botones en %.
   */
  const UI = useMemo(
    () => ({
      // 1) Rectángulo (en %) donde están los elementos de login (superior derecha)
      anchor: {
        leftPct: 65, // muy a la derecha
        topPct: 5, // parte superior (movido más arriba)
        widthPct: 30, // ancho del área de login
        heightPct: 40, // alto del área de login
      },

      // 2) Email input (posición dentro del anchor)
      email: {
        leftPct: 0,
        topPct: 0,
        widthPct: 100,
        heightPx: 48,
      },

      // 3) Password input (espaciado proporcional)
      password: {
        leftPct: 0,
        topPct: 20, // reducido para estar más junto
        widthPct: 100,
        heightPx: 48,
      },

      // 4) Botón Log In (espaciado proporcional)
      loginBtn: {
        leftPct: 0,
        topPct: 40, // reducido para estar más junto
        widthPct: 100,
        heightPx: 48,
      },

      // 5) Botón Forgot password? (espaciado proporcional)
      forgotBtn: {
        leftPct: 20,
        topPct: 60, // reducido para estar más junto
        widthPct: 60,
        heightPx: 32,
      },

      // 6) Texto blanco para contrastar con el fondo glassmorphism
      textColor: "#FFFFFF", // blanco
    }),
    []
  );

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
      filter: "none",
      opacity: 1,
      zIndex: 0,
    },

    // Capa para colocar overlays encima
    overlay: {
      position: "relative",
      width: "100vw",
      height: "100vh",
      minHeight: "100vh",
      zIndex: 1,
    },

    // “Anchor” = el rectángulo donde está la pantalla del monitor
    anchor: {
      position: "absolute",
      left: `${UI.anchor.leftPct}%`,
      top: `${UI.anchor.topPct}%`,
      width: `${UI.anchor.widthPct}%`,
      height: `${UI.anchor.heightPct}%`,
      // debug: "1px dashed rgba(255,0,0,0.4)", // <- activa si quieres ver el marco
    },

    // Input con efecto glassmorphism (fondo transparente tipo agua)
    input: {
      position: "absolute",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      outline: "none",
      boxShadow: "0 8px 32px rgba(31, 38, 135, 0.37), inset 0 2px 4px rgba(255, 255, 255, 0.4)",
      borderRadius: "16px",
      padding: "0 20px",
      fontSize: 16,
      color: UI.textColor,
      width: "100%",
      height: "100%",
      caretColor: UI.textColor,
      opacity: 1,
      zIndex: 10,
      fontWeight: "500",
    },

    // Wrapper para definir caja clicable/tamaño
    slot: {
      position: "absolute",
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
    },

    // Botón Log In con efecto glassmorphism
    ghostButton: {
      width: "100%",
      height: "100%",
      background: "rgba(255, 255, 255, 0.25)",
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      outline: "none",
      boxShadow: "0 8px 32px rgba(31, 38, 135, 0.37), inset 0 2px 4px rgba(255, 255, 255, 0.4)",
      borderRadius: "16px",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      transition: "all 0.3s ease",
      fontWeight: "700",
      fontSize: "16px",
      color: "white",
      textTransform: "uppercase",
      letterSpacing: "1.5px",
    },

    // Error (si aparece, lo ponemos fuera del monitor para no romper la estética)
    error: {
      position: "absolute",
      left: 24,
      bottom: 24,
      maxWidth: 520,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255, 59, 48, 0.35)",
      background: "rgba(255, 59, 48, 0.12)",
      color: "white",
      fontSize: 13,
    },
  };

  return (
    <div className="login-page" style={styles.page}>
      <div className="login-bg" style={styles.bg} />

      <div className="login-overlay" style={styles.overlay}>
        <form onSubmit={onSubmit} style={{ position: "absolute", inset: 0 }}>
          {/* ANCHOR: todo lo del login se posiciona dentro de este rectángulo */}
          <div className="login-anchor" style={styles.anchor}>
            {/* EMAIL */}
            <div
              className="slot-email"
              style={{
                ...styles.slot,
                left: `${UI.email.leftPct}%`,
                top: `${UI.email.topPct}%`,
                width: `${UI.email.widthPct}%`,
                height: UI.email.heightPx,
              }}
            >
              <input
                className="login-email glass-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                style={styles.input}
                aria-label="Email"
              />
            </div>

            {/* PASSWORD */}
            <div
              className="slot-password"
              style={{
                ...styles.slot,
                left: `${UI.password.leftPct}%`,
                top: `${UI.password.topPct}%`,
                width: `${UI.password.widthPct}%`,
                height: UI.password.heightPx,
              }}
            >
              <input
                className="login-password glass-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                style={{ ...styles.input, paddingRight: "50px" }}
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
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
                  zIndex: 11,
                }}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* LOG IN (botón con texto visible) */}
            <div
              className="slot-login-btn"
              style={{
                ...styles.slot,
                left: `${UI.loginBtn.leftPct}%`,
                top: `${UI.loginBtn.topPct}%`,
                width: `${UI.loginBtn.widthPct}%`,
                height: UI.loginBtn.heightPx,
              }}
            >
              <button
                type="submit"
                disabled={busy || !email || !password}
                className="login-button"
                style={{
                  ...styles.ghostButton,
                  cursor: busy || !email || !password ? "not-allowed" : "pointer",
                  opacity: busy || !email || !password ? 0.5 : 1,
                }}
                aria-label="Log in"
              >
                {busy ? "LOADING..." : "LOG IN"}
              </button>
            </div>

            {/* FORGOT PASSWORD? (botón pequeño y sutil) */}
            <div
              className="slot-forgot-btn"
              style={{
                ...styles.slot,
                left: `${UI.forgotBtn.leftPct}%`,
                top: `${UI.forgotBtn.topPct}%`,
                width: `${UI.forgotBtn.widthPct}%`,
                height: UI.forgotBtn.heightPx,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(email);
                }}
                className="forgot-button"
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.9)",
                  textDecoration: "underline",
                  fontWeight: "400",
                  textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                }}
                aria-label="Forgot password"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </form>

        {error && !forgotMode ? <div style={styles.error}>{error}</div> : null}

        {/* MODAL FORGOT PASSWORD */}
        {forgotMode && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
            onClick={closeForgotModal}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(20px) saturate(180%)",
                border: "2px solid rgba(255, 255, 255, 0.25)",
                borderRadius: "24px",
                padding: "32px",
                maxWidth: "420px",
                width: "90%",
                boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {forgotSent ? (
                <>
                  <h2 style={{ color: "white", margin: "0 0 16px", fontSize: "22px", fontWeight: "600" }}>
                    Email enviado
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.85)", margin: "0 0 24px", fontSize: "15px", lineHeight: "1.5" }}>
                    Hemos enviado un enlace de recuperación a <strong>{forgotEmail}</strong>.
                    Revisa tu bandeja de entrada y sigue las instrucciones.
                  </p>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "rgba(255, 255, 255, 0.25)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "15px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Volver al login
                  </button>
                </>
              ) : (
                <>
                  <h2 style={{ color: "white", margin: "0 0 8px", fontSize: "22px", fontWeight: "600" }}>
                    Recuperar contraseña
                  </h2>
                  <p style={{ color: "rgba(255,255,255,0.75)", margin: "0 0 24px", fontSize: "14px" }}>
                    Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Email"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "2px solid rgba(255, 255, 255, 0.25)",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "15px",
                      marginBottom: "16px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {error && (
                    <p style={{ color: "#ff6b6b", margin: "0 0 16px", fontSize: "13px" }}>
                      {error}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      style={{
                        flex: 1,
                        padding: "14px",
                        background: "transparent",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "12px",
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotBusy || !forgotEmail}
                      style={{
                        flex: 1,
                        padding: "14px",
                        background: "rgba(255, 255, 255, 0.25)",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: "12px",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: forgotBusy || !forgotEmail ? "not-allowed" : "pointer",
                        opacity: forgotBusy || !forgotEmail ? 0.5 : 1,
                      }}
                    >
                      {forgotBusy ? "Enviando..." : "Enviar enlace"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  );
}

/**
 * =========================================================
 * ✅ CLASES/ETIQUETAS PARA QUE AJUSTES POSICIÓN Y TAMAÑO
 * =========================================================
 * - .login-anchor (mueve el rectángulo del monitor)
 * - .slot-email
 * - .slot-password
 * - .slot-login-btn
 * - .slot-forgot-btn
 *
 * Si prefieres ajustar por CSS, puedo pasarte las variables como :root (--x, --y, etc.)
 */
const css = `
  /* Eliminar márgenes del body para pantalla completa */
  body, html {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
  }

  /* MÁXIMA ESPECIFICIDAD - FORZAR glassmorphism en inputs */
  .login-page .login-anchor .glass-input,
  .login-page .glass-input,
  .glass-input,
  input.glass-input,
  input.glass-input:-webkit-autofill,
  input.glass-input:-webkit-autofill:hover,
  input.glass-input:-webkit-autofill:focus,
  input.glass-input:-webkit-autofill:active {
    background: rgba(255, 255, 255, 0.25) !important;
    background-color: rgba(255, 255, 255, 0.25) !important;
    background-image: none !important;
    backdrop-filter: blur(16px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.25) inset, 0 8px 32px rgba(31, 38, 135, 0.37), inset 0 2px 4px rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.25) inset, 0 8px 32px rgba(31, 38, 135, 0.37), inset 0 2px 4px rgba(255, 255, 255, 0.4) !important;
    border: 2px solid rgba(255, 255, 255, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    border-radius: 16px !important;
    color: white !important;
    -webkit-text-fill-color: white !important;
    font-weight: 500 !important;
    transition: background-color 5000s ease-in-out 0s !important;
  }

  /* Placeholder blanco semi-transparente */
  .glass-input::placeholder,
  input.glass-input::placeholder {
    color: rgba(255, 255, 255, 0.65) !important;
    font-weight: 400 !important;
    opacity: 1 !important;
  }

  /* Inputs con focus mejorado - efecto glassmorphism más brillante */
  .glass-input:focus,
  input.glass-input:focus,
  input.glass-input:-webkit-autofill:focus {
    background: rgba(255, 255, 255, 0.35) !important;
    background-color: rgba(255, 255, 255, 0.35) !important;
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.35) inset, 0 8px 32px rgba(31, 38, 135, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.5) !important;
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.35) inset, 0 8px 32px rgba(31, 38, 135, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.5) !important;
    border-color: rgba(255, 255, 255, 0.5) !important;
    backdrop-filter: blur(20px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(200%) !important;
    outline: none !important;
    ring: 0 !important;
    -webkit-text-fill-color: white !important;
  }

  /* Botón de login con hover - más brillante */
  .login-button:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.35) !important;
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(31, 38, 135, 0.5), inset 0 2px 6px rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.5) !important;
  }

  .login-button:not(:disabled):active {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(31, 38, 135, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
  }

  .login-button:disabled {
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.12) !important;
    opacity: 0.6;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  /* Forgot password - texto blanco */
  .forgot-button {
    color: rgba(255, 255, 255, 0.9) !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .forgot-button:hover {
    color: rgba(255, 255, 255, 1) !important;
  }

  /* En tablets, ajustamos la posición */
  @media (max-width: 1200px) {
    .login-anchor {
      left: 60% !important;
      width: 35% !important;
      top: 10% !important;
    }
  }

  /* En móviles, centramos el anchor */
  @media (max-width: 900px) {
    .login-anchor {
      left: 50% !important;
      transform: translateX(-50%);
      width: 85% !important;
      top: 25% !important;
      height: 45% !important;
    }
  }

  @media (max-width: 520px) {
    .login-anchor {
      width: 90% !important;
      top: 20% !important;
      height: 50% !important;
    }
    .login-page input { font-size: 15px; }
    .login-button { font-size: 14px; }
  }
`;
