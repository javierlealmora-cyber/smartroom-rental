// =============================================================================
// src/components/wizards/steps/StepDatosCuenta.jsx
// =============================================================================
// Paso 1: Datos de la Cuenta + Slug
// full_name, email, phone, start_date, slug
// =============================================================================

export default function StepDatosCuenta({ formData, errors, onChange }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Datos de la Cuenta</h2>
      <p style={styles.sectionDescription}>
        Informacion basica del titular de la cuenta
      </p>

      <div style={styles.formGrid}>
        {/* Nombre completo */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Nombre completo del titular <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => onChange("full_name", e.target.value)}
            style={{
              ...styles.input,
              ...(errors.full_name ? styles.inputError : {}),
            }}
            placeholder="Ej: Juan Garcia Lopez"
          />
          {errors.full_name && <span style={styles.errorText}>{errors.full_name}</span>}
        </div>

        {/* Email */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Email del titular <span style={styles.required}>*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            style={{
              ...styles.input,
              ...(errors.email ? styles.inputError : {}),
            }}
            placeholder="titular@empresa.es"
          />
          {errors.email && <span style={styles.errorText}>{errors.email}</span>}
        </div>

        {/* Telefono */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Telefono <span style={styles.required}>*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            style={{
              ...styles.input,
              ...(errors.phone ? styles.inputError : {}),
            }}
            placeholder="+34 666 123 456"
          />
          {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
        </div>

        {/* Fecha de inicio */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Fecha de inicio <span style={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => onChange("start_date", e.target.value)}
            style={{
              ...styles.input,
              ...(errors.start_date ? styles.inputError : {}),
            }}
          />
          {errors.start_date && <span style={styles.errorText}>{errors.start_date}</span>}
        </div>

        {/* Slug */}
        <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
          <label style={styles.label}>
            Slug (identificador URL) <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => onChange("slug", e.target.value)}
            style={{
              ...styles.input,
              ...(errors.slug ? styles.inputError : {}),
            }}
            placeholder="mi-empresa"
          />
          {errors.slug && <span style={styles.errorText}>{errors.slug}</span>}
          <span style={styles.helpText}>
            Se genera automaticamente desde el nombre. Solo letras minusculas, numeros y guiones.
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
};
