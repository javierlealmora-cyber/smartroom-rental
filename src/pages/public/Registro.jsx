import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get("plan") || "";
  const billingFromUrl = searchParams.get("billing") || "";

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    if (!form.email) return "El email es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El formato del email no es valido.";
    if (!form.password) return "La contrasena es obligatoria.";
    if (form.password.length < 8) return "La contrasena debe tener al menos 8 caracteres.";
    if (form.password !== form.confirmPassword) return "Las contrasenas no coinciden.";
    if (!form.acceptTerms) return "Debes aceptar los terminos y condiciones.";
    return null;
  };

  const navigatePostSignup = () => {
    if (planFromUrl) {
      navigate(`/v2/wizard/contratar?plan=${planFromUrl}&billing=${billingFromUrl || "monthly"}`);
    } else {
      navigate("/v2/planes", { state: { message: "Cuenta creada. Selecciona un plan para continuar." } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError(null);
    setBusy(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName || undefined,
          phone: form.phone || undefined,
        },
        emailRedirectTo: `${window.location.origin}/v2/auth/callback`,
      },
    });

    if (signUpError) {
      setBusy(false);
      if (signUpError.message?.includes("already registered")) {
        setError("Este email ya esta registrado. Prueba a iniciar sesion.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // 1) Si signUp devolvio sesion directamente → navegar
    if (signUpData?.session) {
      setBusy(false);
      navigatePostSignup();
      return;
    }

    // 2) Detectar usuario ya existente (Supabase devuelve user con identities vacio
    //    como proteccion anti-enumeracion de emails)
    if (signUpData?.user?.identities?.length === 0) {
      setBusy(false);
      setError("Este email ya esta registrado. Prueba a iniciar sesion.");
      return;
    }

    // 3) Usuario nuevo pero sin sesion → intentar signIn con pequeno delay
    //    (puede pasar si email confirmation esta deshabilitada en remoto pero
    //    Supabase necesita un instante para confirmar internamente)
    await new Promise((r) => setTimeout(r, 600));

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInData?.session) {
      setBusy(false);
      navigatePostSignup();
      return;
    }

    // 4) Si signIn fallo, analizar el motivo
    setBusy(false);
    const msg = signInError?.message?.toLowerCase() || "";

    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      setError(
        "Cuenta creada. Revisa tu bandeja de entrada y confirma tu email antes de iniciar sesion."
      );
    } else if (msg.includes("invalid login credentials")) {
      setError("Este email ya esta registrado con otra contrasena. Prueba a iniciar sesion.");
    } else {
      setError(signInError?.message || "Cuenta creada pero no se pudo iniciar sesion. Prueba a iniciar sesion manualmente.");
    }
  };

  // Preserve query params for login link
  const loginHref = planFromUrl
    ? `/v2/auth/login?plan=${planFromUrl}&billing=${billingFromUrl || "monthly"}`
    : "/v2/auth/login";

  return (
    <div style={styles.page}>
      <PublicHeader />

      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Crear cuenta</h1>
            <p style={styles.subtitle}>
              Registrate para empezar a gestionar tus alojamientos con SmartRoom
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="tu@email.com"
                  style={styles.input}
                  autoComplete="email"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Contrasena *</label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    style={{ ...styles.input, paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Confirmar contrasena *</label>
                <div style={styles.inputWrapper}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    placeholder="Repite la contrasena"
                    style={{ ...styles.input, paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                    aria-label={showConfirm ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Nombre completo</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Juan Perez"
                  style={styles.input}
                  autoComplete="name"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Telefono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+34 600 000 000"
                  style={styles.input}
                  autoComplete="tel"
                />
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={(e) => set("acceptTerms", e.target.checked)}
                  style={styles.checkbox}
                />
                <span>
                  Acepto los{" "}
                  <Link to="/legal/terminos" target="_blank" style={styles.link}>
                    terminos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link to="/legal/privacidad" target="_blank" style={styles.link}>
                    politica de privacidad
                  </Link>
                </span>
              </label>

              {error && <div style={styles.error}>{error}</div>}

              <button
                type="submit"
                disabled={busy}
                style={{
                  ...styles.submitBtn,
                  opacity: busy ? 0.6 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <p style={styles.loginLink}>
              Ya tienes cuenta?{" "}
              <Link to={loginHref} style={styles.link}>Iniciar sesion</Link>
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
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

const styles = {
  page: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
    minHeight: "100vh",
    background: "#f9fafb",
  },
  section: { padding: "48px 24px 80px" },
  container: { maxWidth: 480, margin: "0 auto" },
  card: {
    background: "#fff", borderRadius: 16, padding: 40,
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
    width: "100%", boxSizing: "border-box",
    padding: "12px 16px", borderRadius: 10, border: "1px solid #d1d5db",
    fontSize: 15, color: "#111827", outline: "none",
    transition: "border-color 0.2s",
  },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", padding: 4, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  checkboxLabel: {
    display: "flex", alignItems: "flex-start", gap: 10,
    fontSize: 13, color: "#4b5563", lineHeight: 1.4, cursor: "pointer",
  },
  checkbox: { marginTop: 2, accentColor: "#2563eb" },
  link: { color: "#2563eb", fontWeight: 500 },
  error: {
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
    padding: "10px 14px", fontSize: 13, color: "#dc2626",
  },
  submitBtn: {
    width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 16, fontWeight: 700, cursor: "pointer",
  },
  loginLink: { textAlign: "center", marginTop: 24, fontSize: 14, color: "#6b7280" },
};
