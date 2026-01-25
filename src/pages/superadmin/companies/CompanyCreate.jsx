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
  const [adminPhone, setAdminPhone] = useState("");

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
          contact_email: adminEmail,
          contact_phone: adminPhone || null,
        },
        admin: {
          email: adminEmail,
          full_name: adminFullName || null,
        },
      };

      await provisionCompany(payload);

      // Volver a la lista (monta de nuevo y recarga)
      nav("/clientes/empresas", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    nav("/clientes/empresas");
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

            {/* Nombre y Slug */}
            <div style={styles.row}>
              <div style={styles.fieldFlex2}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div style={styles.fieldFlex1}>
                <label style={styles.label}>Slug</label>
                <input
                  type="text"
                  value={slug}
                  readOnly
                  style={{ ...styles.input, backgroundColor: "#F9FAFB", color: "#6B7280" }}
                />
              </div>
            </div>

            {/* Plan, Estado, Fecha */}
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
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Fecha Alta</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Color y Logo URL */}
            <div style={styles.row}>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Color Tema</label>
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    value={themePrimaryColor}
                    onChange={(e) => setThemePrimaryColor(e.target.value)}
                    style={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={themePrimaryColor}
                    onChange={(e) => setThemePrimaryColor(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="#111827"
                  />
                </div>
              </div>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={styles.input}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </div>
          </div>

          {/* Admin de empresa */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Administrador / Contacto</h3>

            <div style={styles.row}>
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
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={styles.input}
                  placeholder="admin@empresa.com"
                />
              </div>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Teléfono</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  style={styles.input}
                  placeholder="+34 600 000 000"
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
    maxWidth: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: "13px",
    color: "#6b7280",
    margin: "4px 0 0",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "0",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "all 0.2s",
  },
  section: {
    padding: "16px 24px",
    borderBottom: "1px solid #f3f4f6",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 12px",
  },
  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },
  fieldFlex1: {
    flex: 1,
    minWidth: 0,
  },
  fieldFlex2: {
    flex: 2,
    minWidth: 0,
  },
  row: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "4px",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    color: "#111827",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "13px",
    color: "#111827",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  colorRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  colorInput: {
    width: "36px",
    height: "34px",
    padding: "2px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
  },
  error: {
    padding: "10px 24px",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    fontSize: "13px",
    borderLeft: "4px solid #dc2626",
    margin: "0 24px 16px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
  },
  cancelButton: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  submitButton: {
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s, transform 0.1s",
  },
  submitButtonDisabled: {
    padding: "8px 20px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#9ca3af",
    backgroundColor: "#e5e7eb",
    border: "none",
    borderRadius: "6px",
    cursor: "not-allowed",
  },
};
