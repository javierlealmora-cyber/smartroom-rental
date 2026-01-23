// src/pages/auth/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";

// ✅ IMAGEN DE LOGIN (fuera del componente para evitar recalcular)
const CACHE_BUSTER = "v4-inputs-glass-" + Date.now();
const HERO_IMG = `https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent/login-welcome-2560.webp?t=${CACHE_BUSTER}`;

export default function Login() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

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
        topPct: 8, // parte superior
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

      // 3) Password input
      password: {
        leftPct: 0,
        topPct: 20,
        widthPct: 100,
        heightPx: 48,
      },

      // 4) Botón Log In - más pequeño y proporcionado
      loginBtn: {
        leftPct: 0,
        topPct: 45,
        widthPct: 100,
        heightPx: 48,
      },

      // 5) Botón Forgot password? - más pequeño
      forgotBtn: {
        leftPct: 20,
        topPct: 70,
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
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(12px) saturate(180%)",
      WebkitBackdropFilter: "blur(12px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.4)",
      outline: "none",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
      borderRadius: "12px",
      padding: "0 16px",
      fontSize: 16,
      color: UI.textColor,
      width: "100%",
      height: "100%",
      caretColor: UI.textColor,
      opacity: 1,
      zIndex: 10,
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
      background: "rgba(255, 255, 255, 0.2)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.4)",
      outline: "none",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      borderRadius: "12px",
      padding: 0,
      margin: 0,
      cursor: "pointer",
      transition: "all 0.3s ease",
      fontWeight: "600",
      fontSize: "16px",
      color: "white",
      textTransform: "uppercase",
      letterSpacing: "1px",
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
                className="login-email"
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
                className="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                style={styles.input}
                aria-label="Password"
              />
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
                  // Aquí enganchas tu flujo real de "forgot password"
                  // nav("/auth/forgot-password");
                  alert("TODO: forgot password");
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

        {error ? <div style={styles.error}>{error}</div> : null}
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

  /* Placeholder blanco semi-transparente */
  .login-page input::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  /* Inputs con focus mejorado - efecto glassmorphism más brillante */
  .login-page input:focus {
    background-color: rgba(255, 255, 255, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.6) !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
    backdrop-filter: blur(14px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(14px) saturate(200%) !important;
  }

  /* Botón de login con hover - más brillante */
  .login-button:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.3) !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .login-button:not(:disabled):active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .login-button:disabled {
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.1) !important;
    opacity: 0.5;
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
