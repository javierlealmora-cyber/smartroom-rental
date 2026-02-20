// src/pages/v2/manager/auth/ManagerLogin.jsx
// Login Gestores — split-screen: foto izquierda + formulario derecho
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../../providers/AuthProvider";
import useLoginForm from "../../../../hooks/useLoginForm";
import { supabase } from "../../../../services/supabaseClient";
import { isLodgerRole } from "../../../../constants/roles";

const STORAGE_KEY = "login-welcome-manager.jpg";
const BUCKET = "Assets-SmartRent";
const FALLBACK_GRADIENT = "linear-gradient(135deg, #1e3a5f, #111827)";

function useStorageImageUrl(key) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!key) { setFailed(true); return; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    if (data?.publicUrl) {
      const img = new Image();
      img.onload = () => setUrl(data.publicUrl);
      img.onerror = () => setFailed(true);
      img.src = data.publicUrl;
    } else {
      setFailed(true);
    }
  }, [key]);

  return { url, failed };
}

export default function ManagerLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const form = useLoginForm();
  const { url: imageUrl, failed: imageFailed } = useStorageImageUrl(STORAGE_KEY);

  const [postLogin, setPostLogin] = useState(null);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const timerRef = useRef(null);

  // Resolve destination based on auth state
  const resolvePostLogin = (authState) => {
    const { role, hasTenant } = authState;
    console.log("[ManagerLogin] resolvePostLogin:", { role, hasTenant, tenantState: authState.tenantState });
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) { navigate(decodeURIComponent(returnUrl), { replace: true }); return; }
    if (role === "superadmin") { navigate("/v2/superadmin", { replace: true }); return; }
    if (isLodgerRole(role)) { setPostLogin("wrong_portal"); return; }
    if (!hasTenant) { navigate("/v2/planes", { replace: true }); return; }
    // Any non-lodger role with tenant → manager dashboard
    navigate("/v2/admin/dashboard", { replace: true });
  };

  // If already authenticated on mount, resolve immediately
  useEffect(() => {
    if (!auth.loading && auth.user && auth.profile) {
      console.log("[ManagerLogin] Already authenticated, resolving...");
      resolvePostLogin(auth);
    }
  }, [auth.loading, auth.user, auth.profile, auth.tenantState]);

  // Timeout: if profile never arrives after login, stop waiting
  useEffect(() => {
    if (postLogin !== "resolving") return;
    if (!auth.loading && auth.user && auth.profile) return; // already have profile

    timerRef.current = setTimeout(() => {
      console.warn("[ManagerLogin] profile load timed out after 8s, auth state:", {
        loading: auth.loading, user: !!auth.user, profile: auth.profile, role: auth.role,
      });
      setProfileTimedOut(true);
    }, 8000);

    return () => clearTimeout(timerRef.current);
  }, [postLogin, auth.loading, auth.user, auth.profile]);

  // Resolve when we have enough data (profile loaded OR timed out)
  useEffect(() => {
    if (postLogin !== "resolving") return;
    if (auth.loading) return;
    if (!auth.user) return;
    if (!auth.profile && !profileTimedOut) return;

    clearTimeout(timerRef.current);
    console.log("[ManagerLogin] Resolving post-login, profile:", auth.profile, "timedOut:", profileTimedOut);

    if (!auth.profile) {
      // Profile timed out — redirect to planes as fallback
      console.warn("[ManagerLogin] No profile loaded, redirecting to /v2/planes");
      navigate("/v2/planes", { replace: true });
      return;
    }

    resolvePostLogin(auth);
  }, [postLogin, auth.loading, auth.user, auth.profile, auth.tenantState, profileTimedOut]);

  const onSubmit = (e) => {
    e.preventDefault();
    setPostLogin("resolving");
    setProfileTimedOut(false);
    form.handleLogin(
      () => {
        console.log("[ManagerLogin] signIn succeeded, waiting for profile...");
      },
      () => {
        // Login failed — go back to form so error is visible
        setPostLogin(null);
      }
    );
  };

  // Render del panel derecho según estado
  const renderFormPanel = () => {
    if (postLogin === "wrong_portal") {
      return (
        <div style={s.formInner}>
          <h1 style={s.title}>Acceso no permitido</h1>
          <div style={s.msgBox}>
            <p style={s.msgText}>
              Esta cuenta es de <strong>inquilino</strong> y no tiene acceso al portal de gestion.
            </p>
            <p style={s.msgText}>
              Utiliza el enlace de <strong>Acceso Inquilinos</strong> que aparece mas abajo para entrar en tu portal.
            </p>
            <div style={s.portalLinks}>
              <Link to="/v2/lodger/auth/login" style={{ ...s.portalLink, color: "#2563eb", fontWeight: 600 }}>Acceso Inquilinos</Link>
            </div>
          </div>
        </div>
      );
    }

    if (postLogin === "no_tenant") {
      return (
        <div style={s.formInner}>
          <h1 style={s.title}>Portal de Gestion</h1>
          <div style={s.msgBox}>
            <p style={s.msgText}>Tu cuenta no tiene un espacio de gestion activo.</p>
            <Link to="/v2/planes" style={s.submitBtn}>Ver planes</Link>
          </div>
        </div>
      );
    }

    if (postLogin === "resolving") {
      return (
        <div style={s.formInner}>
          <div style={s.spinner} />
          <p style={{ color: "#6b7280", fontSize: 15 }}>Cargando tu espacio...</p>
        </div>
      );
    }

    return (
      <div style={s.formInner}>
        <h1 style={s.title}>Inicio de Sesion</h1>
        <p style={s.subtitle}>Accede a tu cuenta de SmartRoom Rental Platform</p>

        <form onSubmit={onSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => form.setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={s.input}
              autoComplete="email"
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Contrasena</label>
            <div style={s.inputWrapper}>
              <input
                type={form.showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => form.setPassword(e.target.value)}
                placeholder="Tu contrasena"
                style={{ ...s.input, paddingRight: 44 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => form.setShowPassword(!form.showPassword)}
                style={s.eyeBtn}
                aria-label={form.showPassword ? "Ocultar" : "Mostrar"}
              >
                {form.showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {form.error && !form.forgotMode && (
            <div style={s.error}>{form.error}</div>
          )}

          <button
            type="submit"
            disabled={form.busy || !form.email || !form.password}
            style={{
              ...s.submitBtn,
              opacity: form.busy || !form.email || !form.password ? 0.6 : 1,
              cursor: form.busy ? "not-allowed" : "pointer",
            }}
          >
            {form.busy ? "Entrando..." : "Iniciar sesion"}
          </button>
        </form>

        <button type="button" onClick={form.openForgotModal} style={s.forgotLink}>
          Olvidaste tu contrasena?
        </button>

        <p style={s.registerText}>
          No tienes cuenta?{" "}
          <Link to="/v2/registro" style={s.link}>Registrate</Link>
        </p>

        <div style={s.portalLinks}>
          <Link to="/v2/auth/login" style={s.portalLink}>Acceso Comercial</Link>
          <span style={s.portalSep}>|</span>
          <Link to="/v2/lodger/auth/login" style={s.portalLink}>Acceso Inquilinos</Link>
        </div>
      </div>
    );
  };

  const imageStyle = imageFailed || !imageUrl
    ? { background: FALLBACK_GRADIENT }
    : {};

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sr-login-image-panel { display: none !important; }
          .sr-login-form-panel { width: 100% !important; }
        }
        @keyframes sr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={s.page}>
        {/* Panel izquierdo — Imagen */}
        <div className="sr-login-image-panel" style={{ ...s.imagePanel, ...imageStyle }}>
          {imageUrl && !imageFailed && (
            <img src={imageUrl} alt="SmartRoom Manager" style={s.image} />
          )}
        </div>

        {/* Panel derecho — Formulario */}
        <div className="sr-login-form-panel" style={s.formPanel}>
          {renderFormPanel()}
        </div>
      </div>

      {form.forgotMode && <ForgotModal form={form} />}
    </>
  );
}

function ForgotModal({ form }) {
  return (
    <div style={s.modalOverlay} onClick={form.closeForgotModal}>
      <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
        {form.forgotSent ? (
          <>
            <h2 style={s.modalTitle}>Email enviado</h2>
            <p style={s.modalText}>
              Enlace de recuperacion enviado a <strong>{form.forgotEmail}</strong>.
            </p>
            <button onClick={form.closeForgotModal} style={s.submitBtn}>Volver</button>
          </>
        ) : (
          <>
            <h2 style={s.modalTitle}>Recuperar contrasena</h2>
            <p style={s.modalText}>Introduce tu email y te enviaremos un enlace.</p>
            <input
              type="email"
              value={form.forgotEmail}
              onChange={(e) => form.setForgotEmail(e.target.value)}
              placeholder="Email"
              style={{ ...s.input, marginBottom: 16 }}
            />
            {form.error && <div style={s.error}>{form.error}</div>}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={form.closeForgotModal} style={s.cancelBtn}>Cancelar</button>
              <button
                onClick={form.handleForgotPassword}
                disabled={form.forgotBusy || !form.forgotEmail}
                style={{
                  ...s.submitBtn,
                  flex: 1,
                  opacity: form.forgotBusy || !form.forgotEmail ? 0.6 : 1,
                }}
              >
                {form.forgotBusy ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const s = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
  },
  // Panel izquierdo — Imagen
  imagePanel: {
    width: "75%",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  // Panel derecho — Formulario
  formPanel: {
    width: "25%",
    minWidth: 340,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
    backgroundColor: "#ffffff",
    overflowY: "auto",
  },
  formInner: {
    width: "100%",
    maxWidth: 380,
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: "0 0 8px",
    color: "#111827",
  },
  brandName: {
    fontSize: 13,
    color: "#9ca3af",
    margin: "4px 0 0",
    fontWeight: 500,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    margin: "12px 0 32px",
    lineHeight: 1.4,
  },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  inputWrapper: { position: "relative" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
    color: "#111827",
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
    backgroundColor: "#ffffff",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#dc2626",
  },
  submitBtn: {
    display: "block",
    width: "100%",
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
  },
  forgotLink: {
    display: "block",
    width: "100%",
    textAlign: "center",
    marginTop: 16,
    fontSize: 13,
    color: "#6b7280",
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
  },
  registerText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#6b7280",
  },
  link: { color: "#2563eb", fontWeight: 500 },
  portalLinks: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTop: "1px solid #f3f4f6",
  },
  portalLink: {
    fontSize: 13,
    color: "#9ca3af",
    textDecoration: "none",
    fontWeight: 500,
  },
  portalSep: { fontSize: 13, color: "#d1d5db" },
  msgBox: { marginTop: 16 },
  msgText: { color: "#6b7280", fontSize: 15, lineHeight: 1.5, margin: "0 0 20px" },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e5e7eb",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "sr-spin 0.8s linear infinite",
    margin: "0 auto 16px",
  },

  // Forgot modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: "90%",
    boxShadow: "0 16px 64px rgba(0,0,0,0.15)",
  },
  modalTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "#111827" },
  modalText: { fontSize: 14, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 },
  cancelBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 10,
    background: "#f3f4f6",
    border: "none",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};
