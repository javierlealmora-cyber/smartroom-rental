// =============================================================================
// src/components/wizards/steps/StepBranding.jsx
// =============================================================================
// Paso B (1): Branding y personalizacion visual
// Nombre de marca, colores primario/secundario, logo
// =============================================================================

export default function StepBranding({ formData, errors, onChange, selectedPlan }) {
  const brandingEnabled = selectedPlan?.branding_enabled !== false;

  return (
    <div>
      <h2 style={styles.sectionTitle}>Branding y Personalizacion</h2>
      <p style={styles.sectionDescription}>
        Configura la identidad visual de tu cuenta. Los colores y logo se aplicaran en toda la plataforma.
      </p>

      {!brandingEnabled && (
        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>&#9888;&#65039;</span>
          <div>
            <strong>Plan Basic</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Tu plan actual no incluye personalizacion de branding. Se usara el tema por defecto de SmartRoom.
              Puedes actualizar a un plan superior para desbloquear esta funcionalidad.
            </p>
          </div>
        </div>
      )}

      <div style={{ opacity: brandingEnabled ? 1 : 0.5, pointerEvents: brandingEnabled ? "auto" : "none" }}>
        {/* Nombre de marca */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre de marca</label>
          <input
            type="text"
            value={formData.brand_name}
            onChange={(e) => onChange("brand_name", e.target.value)}
            style={styles.input}
            placeholder="Mi Empresa (aparecera en cabeceras y correos)"
          />
          <span style={styles.helpText}>
            Si se deja vacio, se usara el nombre de la cuenta
          </span>
        </div>

        {/* Colores */}
        <div style={styles.colorsRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Color primario</label>
            <div style={styles.colorInputWrapper}>
              <input
                type="color"
                value={formData.primary_color || "#111827"}
                onChange={(e) => onChange("primary_color", e.target.value)}
                style={styles.colorPicker}
              />
              <input
                type="text"
                value={formData.primary_color || "#111827"}
                onChange={(e) => onChange("primary_color", e.target.value)}
                style={{
                  ...styles.input,
                  ...styles.colorTextInput,
                  ...(errors.primary_color ? styles.inputError : {}),
                }}
                placeholder="#111827"
              />
            </div>
            {errors.primary_color && (
              <span style={styles.errorText}>{errors.primary_color}</span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Color secundario</label>
            <div style={styles.colorInputWrapper}>
              <input
                type="color"
                value={formData.secondary_color || "#6B7280"}
                onChange={(e) => onChange("secondary_color", e.target.value)}
                style={styles.colorPicker}
              />
              <input
                type="text"
                value={formData.secondary_color || ""}
                onChange={(e) => onChange("secondary_color", e.target.value)}
                style={{
                  ...styles.input,
                  ...styles.colorTextInput,
                  ...(errors.secondary_color ? styles.inputError : {}),
                }}
                placeholder="#6B7280 (opcional)"
              />
            </div>
            {errors.secondary_color && (
              <span style={styles.errorText}>{errors.secondary_color}</span>
            )}
          </div>
        </div>

        {/* Preview */}
        <div style={styles.previewSection}>
          <h4 style={styles.previewTitle}>Vista previa</h4>
          <div style={styles.previewBar}>
            <div
              style={{
                ...styles.previewHeader,
                backgroundColor: formData.primary_color || "#111827",
              }}
            >
              <span style={styles.previewLogo}>
                {formData.brand_name || formData.account_name || "SmartRoom"}
              </span>
            </div>
            <div style={styles.previewContent}>
              <div
                style={{
                  ...styles.previewButton,
                  backgroundColor: formData.primary_color || "#111827",
                }}
              >
                Boton ejemplo
              </div>
              {formData.secondary_color && (
                <div
                  style={{
                    ...styles.previewBadge,
                    backgroundColor: formData.secondary_color,
                  }}
                >
                  Badge
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logo URL */}
        <div style={styles.formGroup}>
          <label style={styles.label}>URL del Logo</label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => onChange("logo_url", e.target.value)}
            style={styles.input}
            placeholder="https://ejemplo.com/logo.png"
          />
          <span style={styles.helpText}>
            URL directa a una imagen PNG o SVG. La subida de archivos se implementara mas adelante.
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
  warningBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    color: "#92400E",
  },
  warningIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
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
    color: "#6B7280",
    marginTop: 4,
  },
  colorsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 20,
  },
  colorInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  colorPicker: {
    width: 40,
    height: 40,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    padding: 2,
  },
  colorTextInput: {
    flex: 1,
    fontFamily: "monospace",
  },
  previewSection: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  previewBar: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewHeader: {
    padding: "12px 20px",
    color: "#FFFFFF",
  },
  previewLogo: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewContent: {
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
  },
  previewButton: {
    padding: "8px 16px",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  previewBadge: {
    padding: "4px 10px",
    borderRadius: 20,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
};
