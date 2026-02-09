// =============================================================================
// src/components/wizards/steps/StepUsuariosAdmin.jsx
// =============================================================================
// Paso 2: Usuarios Admin Iniciales (máximo 3)
// Admin titular (obligatorio) + 2 asociados (opcionales)
// =============================================================================

export default function StepUsuariosAdmin({ formData, errors, onAdminsChange }) {
  const admins = formData.admins;

  const handleAdminChange = (index, field, value) => {
    const updated = admins.map((admin, i) => {
      if (i === index) {
        return { ...admin, [field]: value };
      }
      return admin;
    });
    onAdminsChange(updated);
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>Usuarios Admin Inicial</h2>
      <p style={styles.sectionDescription}>
        Configure los usuarios que tendrán acceso de administración a la cuenta (máximo 3)
      </p>

      {/* Error global de duplicados */}
      {errors.admins_duplicate && (
        <div style={styles.globalError}>{errors.admins_duplicate}</div>
      )}
      {errors.admins_duplicate_main && (
        <div style={styles.globalError}>{errors.admins_duplicate_main}</div>
      )}

      {/* Admin 1 - Titular */}
      <div style={styles.userCard}>
        <div style={styles.userCardHeader}>
          <div style={styles.userCardHeaderLeft}>
            <span style={styles.userCardTitle}>Admin Titular</span>
            <span style={styles.userCardSubtitle}>Administrador principal de la cuenta</span>
          </div>
          <span style={styles.badgeRequired}>Obligatorio</span>
        </div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Email <span style={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={admins[0].email}
              onChange={(e) => handleAdminChange(0, "email", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.admins_0_email ? styles.inputError : {}),
              }}
              placeholder="admin@empresa.es"
            />
            {errors.admins_0_email && <span style={styles.errorText}>{errors.admins_0_email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nombre completo <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={admins[0].full_name}
              onChange={(e) => handleAdminChange(0, "full_name", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.admins_0_full_name ? styles.inputError : {}),
              }}
              placeholder="Juan García López"
            />
            {errors.admins_0_full_name && <span style={styles.errorText}>{errors.admins_0_full_name}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Teléfono <span style={styles.required}>*</span>
            </label>
            <input
              type="tel"
              value={admins[0].phone}
              onChange={(e) => handleAdminChange(0, "phone", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.admins_0_phone ? styles.inputError : {}),
              }}
              placeholder="+34 666 123 456"
            />
            {errors.admins_0_phone && <span style={styles.errorText}>{errors.admins_0_phone}</span>}
          </div>
        </div>
      </div>

      {/* Admin 2 - Asociado 1 */}
      <div style={styles.userCard}>
        <div style={styles.userCardHeader}>
          <div style={styles.userCardHeaderLeft}>
            <span style={styles.userCardTitle}>Asociado 1</span>
            <span style={styles.userCardSubtitle}>Usuario adicional con acceso de gestión</span>
          </div>
          <span style={styles.badgeOptional}>Opcional</span>
        </div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={admins[1].email}
              onChange={(e) => handleAdminChange(1, "email", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.admins_1_email ? styles.inputError : {}),
              }}
              placeholder="asociado1@empresa.es"
            />
            {errors.admins_1_email && <span style={styles.errorText}>{errors.admins_1_email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre completo</label>
            <input
              type="text"
              value={admins[1].full_name}
              onChange={(e) => handleAdminChange(1, "full_name", e.target.value)}
              style={styles.input}
              placeholder="María López Hernández"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              type="tel"
              value={admins[1].phone}
              onChange={(e) => handleAdminChange(1, "phone", e.target.value)}
              style={styles.input}
              placeholder="+34 666 789 012"
            />
          </div>
        </div>
      </div>

      {/* Admin 3 - Asociado 2 */}
      <div style={styles.userCard}>
        <div style={styles.userCardHeader}>
          <div style={styles.userCardHeaderLeft}>
            <span style={styles.userCardTitle}>Asociado 2</span>
            <span style={styles.userCardSubtitle}>Usuario adicional con acceso de gestión</span>
          </div>
          <span style={styles.badgeOptional}>Opcional</span>
        </div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={admins[2].email}
              onChange={(e) => handleAdminChange(2, "email", e.target.value)}
              style={{
                ...styles.input,
                ...(errors.admins_2_email ? styles.inputError : {}),
              }}
              placeholder="asociado2@empresa.es"
            />
            {errors.admins_2_email && <span style={styles.errorText}>{errors.admins_2_email}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre completo</label>
            <input
              type="text"
              value={admins[2].full_name}
              onChange={(e) => handleAdminChange(2, "full_name", e.target.value)}
              style={styles.input}
              placeholder="Carlos Martín Ruiz"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              type="tel"
              value={admins[2].phone}
              onChange={(e) => handleAdminChange(2, "phone", e.target.value)}
              style={styles.input}
              placeholder="+34 666 345 678"
            />
          </div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <span style={styles.infoIcon}>ℹ️</span>
        <span>Se enviará un email de invitación a cada usuario para crear su contraseña y acceder al sistema.</span>
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
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
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
  globalError: {
    padding: "10px 14px",
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 16,
  },
  userCard: {
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    backgroundColor: "#FAFAFA",
  },
  userCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #E5E7EB",
  },
  userCardHeaderLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  userCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  userCardSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  badgeRequired: {
    padding: "4px 10px",
    backgroundColor: "#DBEAFE",
    color: "#1E40AF",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  badgeOptional: {
    padding: "4px 10px",
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
  },
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
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
};
