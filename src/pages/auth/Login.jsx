// src/pages/auth/Login.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";

export default function Login() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // ✅ NUEVA IMAGEN (la del monitor con cajas blancas)
  const HERO_IMG =
    "https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/Assets-SmartRent/login-welcome-2560.webp";

  const redirectByRole = (role) => {
    if (role === "superadmin") return "/superadmin/companies";
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
      // 1) Rectángulo (en %) donde está LA PANTALLA del monitor dentro de la foto
      //    (ajusta hasta que coincida perfecto)
      anchor: {
        leftPct: 52, // mueve el “marco” de referencia en X
        topPct: 18, // mueve el “marco” de referencia en Y
        widthPct: 42, // ancho del área de pantalla
        heightPct: 56, // alto del área de pantalla
      },

      // 2) Email input (posición dentro del anchor)
      email: {
        leftPct: 14,
        topPct: 37,
        widthPct: 55,
        heightPx: 44,
      },

      // 3) Password input
      password: {
        leftPct: 14,
        topPct: 47.5,
        widthPct: 55,
        heightPx: 44,
      },

      // 4) Botón Log In (SIN TEXTO, click encima del botón de la foto)
      loginBtn: {
        leftPct: 10,
        topPct: 62,
        widthPct: 78,
        heightPx: 52,
      },

      // 5) Botón Forgot password? (SIN TEXTO)
      forgotBtn: {
        leftPct: 34,
        topPct: 76,
        widthPct: 40,
        heightPx: 26,
      },

      // 6) Estilo “plomo” para texto/caret (para que se vea sobre el fondo claro)
      textColor: "#374151", // gris plomo
    }),
    []
  );

  const styles = {
    page: {
      position: "relative",
      minHeight: "100vh",
      overflow: "hidden",
      background: "#000",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    },

    bg: {
      position: "absolute",
      inset: 0,
      backgroundImage: `url(${HERO_IMG})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      filter: "none",
      opacity: 1,
    },

    // Capa para colocar overlays encima
    overlay: {
      position: "relative",
      minHeight: "100vh",
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

    // Input transparente (sin borde/sombra)
    input: {
      position: "absolute",
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
      padding: "0 12px",
      fontSize: 18,
      color: UI.textColor,
      width: "100%",
      height: "100%",
      caretColor: UI.textColor,
    },

    // Wrapper para definir caja clicable/tamaño
    slot: {
      position: "absolute",
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
    },

    // Botones invisibles (sin texto) para clicar encima de la imagen
    ghostButton: {
      width: "100%",
      height: "100%",
      background: "transparent",
      border: "none",
      outline: "none",
      boxShadow: "none",
      padding: 0,
      margin: 0,
      cursor: "pointer",
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

            {/* LOG IN (botón invisible encima del botón de la foto) */}
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
                style={{
                  ...styles.ghostButton,
                  cursor: busy || !email || !password ? "not-allowed" : "pointer",
                }}
                aria-label="Log in"
              />
            </div>

            {/* FORGOT PASSWORD? (botón invisible) */}
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
                style={styles.ghostButton}
                aria-label="Forgot password"
              />
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
  /* Placeholder gris plomo */
  .login-page input::placeholder { color: rgba(55,65,81,0.60); }

  /* En móviles, centramos el anchor un poco para que no se vaya fuera */
  @media (max-width: 900px) {
    .login-anchor { 
      left: 50% !important; 
      transform: translateX(-50%);
      width: 92% !important;
      top: 14% !important;
      height: 62% !important;
    }
  }

  @media (max-width: 520px) {
    .login-anchor { 
      top: 12% !important;
      height: 66% !important;
    }
    .login-page input { font-size: 16px; }
  }
`;
