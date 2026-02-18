// src/pages/v2/auth/CommercialLogin.jsx
// Login Comercial — web marketing style, CTA card post-login (no auto-redirect for tenanted users)
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../providers/AuthProvider";
import useLoginForm from "../../../hooks/useLoginForm";
import SessionResolver from "../../../components/auth/SessionResolver";
import PublicHeader from "../../../components/public/PublicHeader";
import PublicFooter from "../../../components/public/PublicFooter";
import { isLodgerRole } from "../../../constants/roles";

export default function CommercialLogin() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [showResolver, setShowResolver] = useState(false);

  const form = useLoginForm();

  // If already authenticated, show resolver immediately
  useEffect(() => {
    if (!auth.loading && auth.user && auth.profile) {
      setShowResolver(true);
    }
  }, [auth.loading, auth.user, auth.profile]);

  const onSubmit = (e) => {
    e.preventDefault();
    form.handleLogin(() => setShowResolver(true));
  };

  const resolveDestination = (authState) => {
    const { role, hasTenant } = authState;

    // 1. Query param redirect (plan flow)
    const plan = searchParams.get("plan");
    const billing = searchParams.get("billing") || "monthly";
    if (plan) return `/v2/wizard/contratar?plan=${plan}&billing=${billing}`;

    // 2. ReturnUrl from guard
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl) return decodeURIComponent(returnUrl);

    // 3. Superadmin → auto-redirect
    if (role === "superadmin") return "/v2/superadmin";

    // 4. No tenant → planes
    if (!hasTenant) return "/v2/planes";

    // 5. Has tenant → redirigir al dashboard segun rol
    if (isLodgerRole(role)) return "/v2/lodger/dashboard";
    return "/v2/manager/dashboard";
  };

  // Post-login resolver
  if (showResolver) {
    return <SessionResolver resolveDestination={resolveDestination} />;
  }

  // Login href preserving plan params
  const registerHref = searchParams.get("plan")
    ? `/v2/registro?plan=${searchParams.get("plan")}&billing=${searchParams.get("billing") || "monthly"}`
    : "/v2/registro";

  return (
    <div style={s.page}>
      <PublicHeader />

      <section style={s.section}>
        <div style={s.container}>
          <div style={s.card}>
            <h1 style={s.title}>Iniciar sesion</h1>
            <p style={s.subtitle}>
              Accede a tu cuenta de SmartRoom
            </p>

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

            <button
              type="button"
              onClick={form.openForgotModal}
              style={s.forgotLink}
            >
              Olvidaste tu contrasena?
            </button>

            <p style={s.registerLink}>
              No tienes cuenta?{" "}
              <Link to={registerHref} style={s.link}>Registrate</Link>
            </p>

            <div style={s.portalLinks}>
              <Link to="/v2/manager/auth/login" style={s.portalLink}>Acceso Gestores</Link>
              <span style={s.portalSep}>|</span>
              <Link to="/v2/lodger/auth/login" style={s.portalLink}>Acceso Inquilinos</Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* Forgot password modal */}
      {form.forgotMode && (
        <ForgotModal form={form} />
      )}
    </div>
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
              Hemos enviado un enlace de recuperacion a <strong>{form.forgotEmail}</strong>.
              Revisa tu bandeja de entrada.
            </p>
            <button onClick={form.closeForgotModal} style={s.submitBtn}>
              Volver al login
            </button>
          </>
        ) : (
          <>
            <h2 style={s.modalTitle}>Recuperar contrasena</h2>
            <p style={s.modalText}>
              Introduce tu email y te enviaremos un enlace para restablecer tu contrasena.
            </p>
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
                {form.forgotBusy ? "Enviando..." : "Enviar enlace"}
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
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
    minHeight: "100vh",
    background: "#f9fafb",
  },
  section: { padding: "48px 24px 80px" },
  container: { maxWidth: 440, margin: "0 auto" },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 40,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  title: { fontSize: 28, fontWeight: 800, margin: "0 0 8px", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6b7280", margin: "0 0 32px", textAlign: "center", lineHeight: 1.4 },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
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
    width: "100%",
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
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
  registerLink: {
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
