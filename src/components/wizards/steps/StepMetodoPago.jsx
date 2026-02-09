// =============================================================================
// src/components/wizards/steps/StepMetodoPago.jsx
// =============================================================================
// Paso 4: Entidad Pagadora + Branding + Metodo de Pago (tarjeta)
// =============================================================================

import { LEGAL_FORMS } from "../../../mocks/clientAccountsData";

const LEGAL_FORM_LABELS = {
  [LEGAL_FORMS.PERSONA_FISICA]: "Persona Fisica",
  [LEGAL_FORMS.AUTONOMO]: "Autonomo",
  [LEGAL_FORMS.PERSONA_JURIDICA]: "Persona Juridica (S.L., S.A.)",
};

const COUNTRIES = [
  "Espana",
  "Portugal",
  "Francia",
  "Italia",
  "Alemania",
  "Reino Unido",
];

export default function StepMetodoPago({ formData, errors, onChange, mode, selectedPlan }) {
  const isPersona = formData.payer_type === LEGAL_FORMS.PERSONA_FISICA || formData.payer_type === LEGAL_FORMS.AUTONOMO;
  const isJuridica = formData.payer_type === LEGAL_FORMS.PERSONA_JURIDICA;
  const brandingEnabled = selectedPlan?.branding_enabled !== false;
  const logoAllowed = selectedPlan?.logo_allowed !== false;

  return (
    <div>
      <h2 style={styles.sectionTitle}>Facturacion y Pago</h2>
      <p style={styles.sectionDescription}>
        Datos de facturacion, personalizacion y metodo de pago
      </p>

      {/* ============================================================ */}
      {/* SECCION 1: Entidad Pagadora */}
      {/* ============================================================ */}
      <div>
        <h3 style={styles.subsectionTitle}>Entidad Pagadora</h3>
        <p style={styles.payerDescription}>
          Datos fiscales de la entidad que pagara las facturas del servicio
        </p>

        <div style={styles.formGrid}>
          {/* Tipo de entidad */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>
              Tipo de entidad <span style={styles.required}>*</span>
            </label>
            <div style={styles.typeGrid}>
              {Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  style={{
                    ...styles.typeCard,
                    ...(formData.payer_type === value ? styles.typeCardSelected : {}),
                  }}
                  onClick={() => onChange("payer_type", value)}
                >
                  <span style={styles.typeIcon}>
                    {value === LEGAL_FORMS.PERSONA_FISICA && "\uD83D\uDC64"}
                    {value === LEGAL_FORMS.AUTONOMO && "\uD83D\uDCBC"}
                    {value === LEGAL_FORMS.PERSONA_JURIDICA && "\uD83C\uDFE2"}
                  </span>
                  <span style={styles.typeLabel}>{label}</span>
                </button>
              ))}
            </div>
            {errors.payer_type && <span style={styles.errorText}>{errors.payer_type}</span>}
          </div>

          {/* Razon social (juridica) */}
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
              {errors.payer_legal_name && <span style={styles.errorText}>{errors.payer_legal_name}</span>}
            </div>
          )}

          {/* Nombre persona fisica / autonomo */}
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
                {errors.payer_first_name && <span style={styles.errorText}>{errors.payer_first_name}</span>}
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
                {errors.payer_last_name_1 && <span style={styles.errorText}>{errors.payer_last_name_1}</span>}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Segundo apellido <span style={styles.optional}>(opcional)</span>
                </label>
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

          {/* CIF/NIF */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              CIF/NIF <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.payer_tax_id}
              onChange={(e) => onChange("payer_tax_id", e.target.value.toUpperCase())}
              style={{
                ...styles.input,
                ...(errors.payer_tax_id ? styles.inputError : {}),
              }}
              placeholder="B12345678"
            />
            {errors.payer_tax_id && <span style={styles.errorText}>{errors.payer_tax_id}</span>}
          </div>
        </div>

        {/* Direccion fiscal */}
        <div style={styles.addressBlock}>
          <h4 style={styles.addressTitle}>Direccion fiscal</h4>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Calle <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.payer_address_line1}
                onChange={(e) => onChange("payer_address_line1", e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.payer_address_line1 ? styles.inputError : {}),
                }}
                placeholder="Calle Gran Via"
              />
              {errors.payer_address_line1 && <span style={styles.errorText}>{errors.payer_address_line1}</span>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Numero <span style={styles.optional}>(opcional)</span>
              </label>
              <input
                type="text"
                value={formData.payer_address_number}
                onChange={(e) => onChange("payer_address_number", e.target.value)}
                style={styles.input}
                placeholder="45"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Codigo postal <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.payer_postal_code}
                onChange={(e) => onChange("payer_postal_code", e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.payer_postal_code ? styles.inputError : {}),
                }}
                placeholder="28001"
              />
              {errors.payer_postal_code && <span style={styles.errorText}>{errors.payer_postal_code}</span>}
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
              {errors.payer_city && <span style={styles.errorText}>{errors.payer_city}</span>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Provincia <span style={styles.optional}>(opcional)</span>
              </label>
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
              <select
                value={formData.payer_country}
                onChange={(e) => onChange("payer_country", e.target.value)}
                style={{
                  ...styles.select,
                  ...(errors.payer_country ? styles.inputError : {}),
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.payer_country && <span style={styles.errorText}>{errors.payer_country}</span>}
            </div>
          </div>
        </div>

        {/* Contacto de facturacion */}
        <div style={styles.addressBlock}>
          <h4 style={styles.addressTitle}>Contacto de facturacion</h4>
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
              {errors.payer_billing_email && <span style={styles.errorText}>{errors.payer_billing_email}</span>}
              <span style={styles.helpText}>
                Se usa el email del titular por defecto
              </span>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Telefono de facturacion <span style={styles.optional}>(opcional)</span>
              </label>
              <input
                type="tel"
                value={formData.payer_billing_phone}
                onChange={(e) => onChange("payer_billing_phone", e.target.value)}
                style={styles.input}
                placeholder="+34 912 345 678"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECCION 2: Branding */}
      {/* ============================================================ */}
      <div style={styles.dividerSection}>
        <h3 style={styles.subsectionTitle}>Branding</h3>

        {!brandingEnabled && (
          <div style={styles.warningBox}>
            <span style={styles.warningIcon}>&#8505;&#65039;</span>
            <span>
              El plan Basic utiliza el theme estandar. Actualice a Investor o superior para personalizar.
            </span>
          </div>
        )}

        <div style={styles.formGrid}>
          {/* Nombre de marca */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>
              Nombre de marca (visible en header)
              <span style={styles.optional}> (recomendado)</span>
            </label>
            <input
              type="text"
              value={formData.brand_name}
              onChange={(e) => onChange("brand_name", e.target.value)}
              style={{
                ...styles.input,
                ...(brandingEnabled ? {} : styles.inputDisabled),
              }}
              placeholder="Ej: Residencias Madrid"
              disabled={!brandingEnabled}
            />
          </div>

          {/* Color primario */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Color primario</label>
            <div style={styles.colorInputWrapper}>
              <input
                type="color"
                value={formData.primary_color || "#111827"}
                onChange={(e) => onChange("primary_color", e.target.value)}
                style={styles.colorInput}
                disabled={!brandingEnabled}
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => onChange("primary_color", e.target.value)}
                style={{
                  ...styles.input,
                  flex: 1,
                  ...(errors.primary_color ? styles.inputError : {}),
                  ...(brandingEnabled ? {} : styles.inputDisabled),
                }}
                placeholder="#111827"
                disabled={!brandingEnabled}
              />
            </div>
            {errors.primary_color && <span style={styles.errorText}>{errors.primary_color}</span>}
          </div>

          {/* Color secundario */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Color secundario <span style={styles.optional}>(opcional)</span>
            </label>
            <div style={styles.colorInputWrapper}>
              <input
                type="color"
                value={formData.secondary_color || "#3B82F6"}
                onChange={(e) => onChange("secondary_color", e.target.value)}
                style={styles.colorInput}
                disabled={!brandingEnabled}
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => onChange("secondary_color", e.target.value)}
                style={{
                  ...styles.input,
                  flex: 1,
                  ...(brandingEnabled ? {} : styles.inputDisabled),
                }}
                placeholder="#3B82F6"
                disabled={!brandingEnabled}
              />
            </div>
          </div>

          {/* Logo URL */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>
              URL del Logo <span style={styles.optional}>(opcional)</span>
            </label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => onChange("logo_url", e.target.value)}
              style={{
                ...styles.input,
                ...(logoAllowed ? {} : styles.inputDisabled),
              }}
              placeholder="https://ejemplo.com/logo.png"
              disabled={!logoAllowed}
            />
          </div>

          {/* Vista previa */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>Vista previa</label>
            <div
              style={{
                ...styles.brandingPreview,
                borderColor: formData.primary_color || "#111827",
              }}
            >
              <div
                style={{
                  ...styles.previewHeader,
                  backgroundColor: formData.primary_color || "#111827",
                }}
              >
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt=""
                    style={styles.previewLogo}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div style={styles.previewLogoPlaceholder}>
                    {(formData.brand_name || formData.full_name || "SR").charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={styles.previewName}>
                  {formData.brand_name || formData.full_name || "Nombre de la cuenta"}
                </span>
              </div>
              <div style={styles.previewContent}>
                <button
                  type="button"
                  style={{
                    ...styles.previewButton,
                    backgroundColor: formData.primary_color || "#111827",
                  }}
                >
                  Boton primario
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECCION 3: Metodo de Pago (Tarjeta) */}
      {/* ============================================================ */}
      <div style={styles.dividerSection}>
        <h3 style={styles.subsectionTitle}>
          Metodo de pago{" "}
          {mode === "self_signup" ? (
            <span style={styles.required}>*</span>
          ) : (
            <span style={styles.optionalTag}>(opcional)</span>
          )}
        </h3>

        {mode === "superadmin_create" && (
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>&#8505;&#65039;</span>
            <span>El pago se gestionara fuera del wizard. Puede dejar estos campos vacios.</span>
          </div>
        )}

        <div style={styles.cardMethodSelector}>
          <div style={styles.cardMethodActive}>
            <span style={styles.cardMethodIcon}>&#128179;</span>
            <span style={styles.cardMethodLabel}>Tarjeta de credito/debito</span>
          </div>
        </div>

        <div style={styles.cardContainer}>
          {/* Numero de tarjeta */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>
              Numero de tarjeta{" "}
              {mode === "self_signup" && <span style={styles.required}>*</span>}
            </label>
            <input
              type="text"
              value={formData.card_number}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                onChange("card_number", formatted);
              }}
              style={{
                ...styles.input,
                ...styles.cardInput,
                ...(errors.card_number ? styles.inputError : {}),
              }}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
            {errors.card_number && <span style={styles.errorText}>{errors.card_number}</span>}
          </div>

          {/* Titular de la tarjeta */}
          <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>
              Titular de la tarjeta{" "}
              {mode === "self_signup" && <span style={styles.required}>*</span>}
            </label>
            <input
              type="text"
              value={formData.card_holder}
              onChange={(e) => onChange("card_holder", e.target.value.toUpperCase())}
              style={{
                ...styles.input,
                ...(errors.card_holder ? styles.inputError : {}),
              }}
              placeholder="JUAN GARCIA LOPEZ"
            />
            {errors.card_holder && <span style={styles.errorText}>{errors.card_holder}</span>}
          </div>

          <div style={styles.cardRow}>
            {/* Fecha de caducidad */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Caducidad{" "}
                {mode === "self_signup" && <span style={styles.required}>*</span>}
              </label>
              <input
                type="text"
                value={formData.card_expiry}
                onChange={(e) => {
                  let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (raw.length > 2) raw = raw.slice(0, 2) + "/" + raw.slice(2);
                  onChange("card_expiry", raw);
                }}
                style={{
                  ...styles.input,
                  ...(errors.card_expiry ? styles.inputError : {}),
                }}
                placeholder="MM/AA"
                maxLength={5}
              />
              {errors.card_expiry && <span style={styles.errorText}>{errors.card_expiry}</span>}
            </div>

            {/* CVV */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                CVV{" "}
                {mode === "self_signup" && <span style={styles.required}>*</span>}
              </label>
              <input
                type="text"
                value={formData.card_cvv}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                  onChange("card_cvv", raw);
                }}
                style={{
                  ...styles.input,
                  ...(errors.card_cvv ? styles.inputError : {}),
                }}
                placeholder="123"
                maxLength={4}
              />
              {errors.card_cvv && <span style={styles.errorText}>{errors.card_cvv}</span>}
            </div>
          </div>
        </div>

        <div style={styles.securityNote}>
          <span style={styles.securityIcon}>&#128274;</span>
          <span>Los datos de pago se procesaran de forma segura. No almacenamos los datos de tu tarjeta.</span>
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 16px 0",
  },
  dividerSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
  },
  payerDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
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
  optional: {
    color: "#9CA3AF",
    fontWeight: "400",
    fontSize: 12,
  },
  optionalTag: {
    color: "#9CA3AF",
    fontWeight: "400",
    fontSize: 13,
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
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
    cursor: "not-allowed",
  },
  select: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
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
  // Payer type cards
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 8,
  },
  typeCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 16,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  typeCardSelected: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
  },
  typeIcon: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  addressBlock: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid #F3F4F6",
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 12px 0",
  },
  // Branding
  warningBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF3C7",
    border: "1px solid #F59E0B",
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: "#92400E",
  },
  warningIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  colorInputWrapper: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  colorInput: {
    width: 48,
    height: 40,
    padding: 4,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
  },
  brandingPreview: {
    border: "2px solid",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    color: "#FFFFFF",
  },
  previewLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    objectFit: "cover",
    backgroundColor: "#FFFFFF",
  },
  previewLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: "700",
  },
  previewName: {
    fontWeight: "600",
    fontSize: 16,
  },
  previewContent: {
    padding: 24,
  },
  previewButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    cursor: "default",
  },
  // Card payment
  infoBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 8,
    fontSize: 13,
    color: "#1E40AF",
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  cardMethodSelector: {
    marginBottom: 16,
  },
  cardMethodActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    backgroundColor: "#F9FAFB",
    border: "2px solid #111827",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  cardMethodIcon: {
    fontSize: 18,
  },
  cardMethodLabel: {
    fontSize: 14,
  },
  cardContainer: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    padding: 20,
    backgroundColor: "#FAFAFA",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
  },
  cardInput: {
    fontFamily: "'Courier New', Courier, monospace",
    letterSpacing: "2px",
    fontSize: 16,
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    fontSize: 12,
    color: "#6B7280",
  },
  securityIcon: {
    fontSize: 14,
  },
};
