import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { provisionCompany } from "../../../services/companies.service";

function slugify(str) {
  return (str ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function CompanyCreate() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [themePrimaryColor, setThemePrimaryColor] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const slug = useMemo(() => slugify(name), [name]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    setError(null);
    setBusy(true);

    try {
      const payload = {
        company: {
          name,
          slug,
          plan,
          status,
          start_date: startDate,
          theme_primary_color: themePrimaryColor,
          logo_url: logoUrl || null,
        },
        admin: {
          email: adminEmail,
          full_name: adminFullName || null,
        },
      };

      await provisionCompany(payload);

      // Volver a la lista (monta de nuevo y recarga)
      nav("/superadmin/companies", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    nav("/superadmin/companies");
  };

  const canSubmit = !!name && !!adminEmail && !!slug && !busy;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Registrar Nueva Empresa</h2>
            <p style={styles.subtitle}>Rellena los datos para dar de alta a la nueva empresa.</p>
          </div>
          <button onClick={handleCancel} style={styles.closeButton} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Datos de la Empresa */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Datos de la Empresa</h3>

            {/* Nombre */}
            <div style={styles.field}>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Nombre de la empresa"
              />
              {slug && (
                <div style={styles.hint}>
                  Slug: <span style={{ fontWeight: 600 }}>{slug}</span>
                </div>
              )}
            </div>

            {/* Plan, Estado */}
            <div style={styles.row}>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Plan</label>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} style={styles.select}>
                  <option value="basic">Basic</option>
                  <option value="investor">Investor</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div style={styles.fieldHalf}>
                <label style={styles.label}>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Fecha de Alta */}
            <div style={styles.field}>
              <label style={styles.label}>Fecha de Alta</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>

            {/* Color principal */}
            <div style={styles.field}>
              <label style={styles.label}>Color Principal (Tema)</label>
              <input
                type="text"
                value={themePrimaryColor}
                onChange={(e) => setThemePrimaryColor(e.target.value)}
                style={styles.input}
                placeholder="#111827"
              />
            </div>

            {/* Logo URL */}
            <div style={styles.field}>
              <label style={styles.label}>Logo URL (opcional)</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                style={styles.input}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>

          {/* Admin de empresa */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Administrador de la Empresa</h3>

            <div style={styles.row}>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={styles.input}
                  placeholder="admin@empresa.com"
                />
              </div>

              <div style={styles.fieldHalf}>
                <label style={styles.label}>Nombre Completo</label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  style={styles.input}
                  placeholder="Nombre del administrador"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Footer: botones */}
          <div style={styles.footer}>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit} style={canSubmit ? styles.submitButton : styles.submitButtonDisabled}>
              {busy ? "Registrando..." : "Registrar Empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Estilos del modal moderno
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 24px 20px",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "4px 0 0",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    fontSize: "24px",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "all 0.2s",
  },
  section: {
    padding: "20px 24px",
    borderBottom: "1px solid #f3f4f6",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 16px",
  },
  field: {
    marginBottom: "16px",
  },
  fieldHalf: {
    flex: 1,
  },
  row: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    color: "#111827",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    color: "#111827",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  hint: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
  },
  error: {
    padding: "12px 24px",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    fontSize: "14px",
    borderLeft: "4px solid #dc2626",
    margin: "0 24px 20px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px 24px",
    borderTop: "1px solid #e5e7eb",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  submitButton: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s, transform 0.1s",
  },
  submitButtonDisabled: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#9ca3af",
    backgroundColor: "#e5e7eb",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
  },
};
