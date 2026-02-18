// =============================================================================
// src/components/wizards/steps/StepEntidadPagadora.jsx
// =============================================================================
// Paso C (2): Entidad Pagadora (Payer Entity)
// Tipo legal, datos fiscales, direccion, contacto
// =============================================================================

const LEGAL_TYPES = [
  { value: "autonomo", label: "Autonomo" },
  { value: "persona_fisica", label: "Persona Fisica" },
  { value: "persona_juridica", label: "Persona Juridica (Sociedad)" },
];

export default function StepEntidadPagadora({ formData, errors, onChange }) {
  const isJuridica = formData.payer_type === "persona_juridica";
  const isPersona = formData.payer_type === "persona_fisica" || formData.payer_type === "autonomo";

  return (
    <div>
      <h2 style={styles.sectionTitle}>Entidad Pagadora</h2>
      <p style={styles.sectionDescription}>
        Datos fiscales y de facturacion de la entidad responsable del pago. Se creara exactamente una entidad pagadora por cuenta.
      </p>

      {/* Tipo de entidad */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          Tipo de entidad <span style={styles.required}>*</span>
        </label>
        <div style={styles.typeGrid}>
          {LEGAL_TYPES.map((type) => (
            <div
              key={type.value}
              style={{
                ...styles.typeOption,
                ...(formData.payer_type === type.value ? styles.typeOptionSelected : {}),
              }}
              onClick={() => onChange("payer_type", type.value)}
            >
              <span style={styles.typeName}>{type.label}</span>
              {formData.payer_type === type.value && (
                <span style={styles.selectedCheck}>&#10003;</span>
              )}
            </div>
          ))}
        </div>
        {errors.payer_type && (
          <span style={styles.errorText}>{errors.payer_type}</span>
        )}
      </div>

      {/* Datos fiscales */}
      {formData.payer_type && (
        <>
          <div style={styles.subsection}>
            <h3 style={styles.subsectionTitle}>Datos Fiscales</h3>
            <div style={styles.formGrid}>
              {isJuridica && (
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>
                    Razon social <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.payer_legal_name}
                    onChange={(e) => onChange("payer_legal_name", e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.payer_legal_name ? styles.inputError : {}),
                    }}
                    placeholder="Empresa Ejemplo S.L."
                  />
                  {errors.payer_legal_name && (
                    <span style={styles.errorText}>{errors.payer_legal_name}</span>
                  )}
                </div>
              )}
              {isPersona && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Nombre <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.payer_first_name}
                      onChange={(e) => onChange("payer_first_name", e.target.value)}
                      style={{
                        ...styles.input,
                        ...(errors.payer_first_name ? styles.inputError : {}),
                      }}
                      placeholder="Juan"
                    />
                    {errors.payer_first_name && (
                      <span style={styles.errorText}>{errors.payer_first_name}</span>
                    )}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Primer apellido <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.payer_last_name_1}
                      onChange={(e) => onChange("payer_last_name_1", e.target.value)}
                      style={{
                        ...styles.input,
                        ...(errors.payer_last_name_1 ? styles.inputError : {}),
                      }}
                      placeholder="Garcia"
                    />
                    {errors.payer_last_name_1 && (
                      <span style={styles.errorText}>{errors.payer_last_name_1}</span>
                    )}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Segundo apellido</label>
                    <input
                      type="text"
                      value={formData.payer_last_name_2}
                      onChange={(e) => onChange("payer_last_name_2", e.target.value)}
                      style={styles.input}
                      placeholder="Lopez"
                    />
                  </div>
                </>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  CIF / NIF <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.payer_tax_id}
                  onChange={(e) => onChange("payer_tax_id", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_tax_id ? styles.inputError : {}),
                  }}
                  placeholder="B12345678"
                />
                {errors.payer_tax_id && (
                  <span style={styles.errorText}>{errors.payer_tax_id}</span>
                )}
              </div>
            </div>
          </div>

          {/* Direccion */}
          <div style={styles.subsection}>
            <h3 style={styles.subsectionTitle}>Direccion Fiscal</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Calle <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.payer_street}
                  onChange={(e) => onChange("payer_street", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_street ? styles.inputError : {}),
                  }}
                  placeholder="Calle Gran Via"
                />
                {errors.payer_street && (
                  <span style={styles.errorText}>{errors.payer_street}</span>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Numero</label>
                <input
                  type="text"
                  value={formData.payer_street_number}
                  onChange={(e) => onChange("payer_street_number", e.target.value)}
                  style={styles.input}
                  placeholder="45"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Info adicional</label>
                <input
                  type="text"
                  value={formData.payer_address_extra}
                  onChange={(e) => onChange("payer_address_extra", e.target.value)}
                  style={styles.input}
                  placeholder="Planta 3, Oficina 12"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Codigo postal <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.payer_zip}
                  onChange={(e) => onChange("payer_zip", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_zip ? styles.inputError : {}),
                  }}
                  placeholder="28013"
                />
                {errors.payer_zip && (
                  <span style={styles.errorText}>{errors.payer_zip}</span>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Ciudad <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.payer_city}
                  onChange={(e) => onChange("payer_city", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_city ? styles.inputError : {}),
                  }}
                  placeholder="Madrid"
                />
                {errors.payer_city && (
                  <span style={styles.errorText}>{errors.payer_city}</span>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Provincia</label>
                <input
                  type="text"
                  value={formData.payer_province}
                  onChange={(e) => onChange("payer_province", e.target.value)}
                  style={styles.input}
                  placeholder="Madrid"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Pais <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.payer_country}
                  onChange={(e) => onChange("payer_country", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_country ? styles.inputError : {}),
                  }}
                  placeholder="Espana"
                />
                {errors.payer_country && (
                  <span style={styles.errorText}>{errors.payer_country}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contacto de facturacion */}
          <div style={styles.subsection}>
            <h3 style={styles.subsectionTitle}>Contacto de Facturacion</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email de facturacion <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.payer_billing_email}
                  onChange={(e) => onChange("payer_billing_email", e.target.value)}
                  style={{
                    ...styles.input,
                    ...(errors.payer_billing_email ? styles.inputError : {}),
                  }}
                  placeholder="facturacion@empresa.es"
                />
                {errors.payer_billing_email && (
                  <span style={styles.errorText}>{errors.payer_billing_email}</span>
                )}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Telefono de facturacion</label>
                <input
                  type="tel"
                  value={formData.payer_billing_phone}
                  onChange={(e) => onChange("payer_billing_phone", e.target.value)}
                  style={styles.input}
                  placeholder="+34 915 123 456"
                />
              </div>
            </div>
          </div>
        </>
      )}
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
  subsection: {
    marginBottom: 28,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 4,
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
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 8,
  },
  typeOption: {
    border: "2px solid #E5E7EB",
    borderRadius: 10,
    padding: "14px 16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  typeOptionSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  typeName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  selectedCheck: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 16,
  },
};
