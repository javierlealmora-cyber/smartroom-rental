// src/pages/v2/admin/accommodations/AccommodationCreate.jsx
// Crear nuevo Alojamiento con habitaciones dinámicas
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import {
  mockLegalCompanies,
  LEGAL_COMPANY_TYPES,
  ROOM_STATUS,
} from "../../../../mocks/clientAccountsData";

export default function AccommodationCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const CURRENT_CLIENT_ACCOUNT_ID = clientAccountId || "ca-001";
  const [step, setStep] = useState(1); // 1: datos básicos, 2: habitaciones
  const [errors, setErrors] = useState({});
  const [fiscalCompanies, setFiscalCompanies] = useState([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    numRooms: "",
    address_line1: "",
    address_line2: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    fiscal_company_id: "",
  });

  // Estado de las habitaciones (se generan dinámicamente)
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    // Cargar empresas fiscales del cliente
    const fiscals = mockLegalCompanies.filter(
      (lc) =>
        lc.client_account_id === CURRENT_CLIENT_ACCOUNT_ID &&
        lc.type === LEGAL_COMPANY_TYPES.FISCAL
    );
    setFiscalCompanies(fiscals);
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio";
    if (!formData.numRooms || parseInt(formData.numRooms) < 1) {
      newErrors.numRooms = "Indica al menos 1 habitación";
    }
    if (parseInt(formData.numRooms) > 100) {
      newErrors.numRooms = "Máximo 100 habitaciones por alojamiento";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToRooms = () => {
    if (!validateStep1()) return;

    // Generar habitaciones
    const numRooms = parseInt(formData.numRooms);
    const generatedRooms = [];
    for (let i = 1; i <= numRooms; i++) {
      generatedRooms.push({
        id: `temp-${i}`,
        number: i.toString().padStart(2, "0"),
        monthly_rent: 450,
        square_meters: "",
        bathroom_type: "shared", // shared, private, suite
        kitchen_type: "shared", // shared, private, suite
        notes: "",
        status: ROOM_STATUS.FREE,
      });
    }
    setRooms(generatedRooms);
    setStep(2);
  };

  const handleRoomChange = (roomId, field, value) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, [field]: value } : room
      )
    );
  };

  const handleSubmit = () => {
    // Validar que todas las habitaciones tengan número
    const invalidRooms = rooms.filter((r) => !r.number.trim());
    if (invalidRooms.length > 0) {
      alert("Todas las habitaciones deben tener un número/identificador");
      return;
    }

    // Mock: simular creación
    console.log("Crear alojamiento:", { ...formData, rooms });
    alert("Alojamiento creado correctamente (mock)");
    navigate("/v2/admin/alojamientos");
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Nuevo Alojamiento</h1>
          <p style={styles.subtitle}>
            {step === 1
              ? "Paso 1 de 2: Datos del alojamiento"
              : "Paso 2 de 2: Configurar habitaciones"}
          </p>
        </div>

        {/* Progress bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressStep}>
            <div style={{ ...styles.progressDot, backgroundColor: "#111827" }}>1</div>
            <span style={styles.progressLabel}>Datos básicos</span>
          </div>
          <div style={{ ...styles.progressLine, backgroundColor: step === 2 ? "#111827" : "#E5E7EB" }} />
          <div style={styles.progressStep}>
            <div style={{ ...styles.progressDot, backgroundColor: step === 2 ? "#111827" : "#E5E7EB" }}>2</div>
            <span style={styles.progressLabel}>Habitaciones</span>
          </div>
        </div>

        {/* Paso 1: Datos básicos */}
        {step === 1 && (
          <div style={styles.formCard}>
            <h2 style={styles.sectionTitle}>Datos del Alojamiento</h2>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Nombre del alojamiento <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                  placeholder="Ej: Residencia Central, Piso Chamberí..."
                />
                {errors.name && <span style={styles.errorText}>{errors.name}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Número de habitaciones <span style={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.numRooms}
                  onChange={(e) => handleChange("numRooms", e.target.value)}
                  style={{ ...styles.input, ...(errors.numRooms ? styles.inputError : {}) }}
                  placeholder="Ej: 8"
                />
                {errors.numRooms && <span style={styles.errorText}>{errors.numRooms}</span>}
                <span style={styles.helpText}>
                  Se generarán automáticamente las habitaciones en el siguiente paso
                </span>
              </div>

              <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                <label style={styles.label}>Dirección</label>
                <input
                  type="text"
                  value={formData.address_line1}
                  onChange={(e) => handleChange("address_line1", e.target.value)}
                  style={styles.input}
                  placeholder="Calle, número..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Código Postal</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  style={styles.input}
                  placeholder="28001"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ciudad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  style={styles.input}
                  placeholder="Madrid"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Provincia</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  style={styles.input}
                  placeholder="Madrid"
                />
              </div>

              {fiscalCompanies.length > 0 && (
                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Empresa fiscal asignada</label>
                  <select
                    value={formData.fiscal_company_id}
                    onChange={(e) => handleChange("fiscal_company_id", e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Seleccionar empresa fiscal...</option>
                    {fiscalCompanies.map((fc) => (
                      <option key={fc.id} value={fc.id}>
                        {fc.legal_name} ({fc.tax_id})
                      </option>
                    ))}
                  </select>
                  <span style={styles.helpText}>
                    La empresa fiscal se usará para la facturación de este alojamiento
                  </span>
                </div>
              )}
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => navigate("/v2/admin/alojamientos")}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={handleContinueToRooms}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Configurar habitaciones */}
        {step === 2 && (
          <div style={styles.formCard}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Configurar Habitaciones</h2>
                <p style={styles.sectionSubtitle}>
                  Alojamiento: <strong>{formData.name}</strong> · {rooms.length} habitaciones
                </p>
              </div>
              <button
                type="button"
                style={styles.backButton}
                onClick={() => setStep(1)}
              >
                ← Volver
              </button>
            </div>

            <div style={styles.roomsTable}>
              <div style={styles.roomsHeader}>
                <span style={{ ...styles.roomsHeaderCell, flex: "0 0 70px" }}>Nº</span>
                <span style={{ ...styles.roomsHeaderCell, flex: "0 0 120px" }}>Precio/mes</span>
                <span style={{ ...styles.roomsHeaderCell, flex: "0 0 90px" }}>m²</span>
                <span style={{ ...styles.roomsHeaderCell, flex: "0 0 150px" }}>Baño</span>
                <span style={{ ...styles.roomsHeaderCell, flex: "0 0 150px" }}>Cocina</span>
                <span style={{ ...styles.roomsHeaderCell, flex: 1, minWidth: 120 }}>Notas</span>
              </div>

              <div style={styles.roomsList}>
                {rooms.map((room, index) => (
                  <div key={room.id} style={styles.roomRow}>
                    <div style={{ flex: "0 0 70px" }}>
                      <input
                        type="text"
                        value={room.number}
                        onChange={(e) => handleRoomChange(room.id, "number", e.target.value)}
                        style={{ ...styles.roomInput, width: "100%" }}
                        placeholder={`${index + 1}`}
                      />
                    </div>
                    <div style={{ ...styles.roomInputWrapper, flex: "0 0 120px" }}>
                      <input
                        type="number"
                        value={room.monthly_rent}
                        onChange={(e) => handleRoomChange(room.id, "monthly_rent", e.target.value)}
                        style={{ ...styles.roomInput, width: "100%", paddingRight: 28 }}
                        placeholder="450"
                      />
                      <span style={styles.inputSuffix}>€</span>
                    </div>
                    <div style={{ ...styles.roomInputWrapper, flex: "0 0 90px" }}>
                      <input
                        type="number"
                        value={room.square_meters}
                        onChange={(e) => handleRoomChange(room.id, "square_meters", e.target.value)}
                        style={{ ...styles.roomInput, width: "100%", paddingRight: 32 }}
                        placeholder="12"
                      />
                      <span style={styles.inputSuffix}>m²</span>
                    </div>
                    <div style={{ flex: "0 0 150px" }}>
                      <select
                        value={room.bathroom_type}
                        onChange={(e) => handleRoomChange(room.id, "bathroom_type", e.target.value)}
                        style={{ ...styles.roomSelect, width: "100%" }}
                      >
                        <option value="shared">Compartido</option>
                        <option value="private">Privado</option>
                        <option value="suite">Suite</option>
                      </select>
                    </div>
                    <div style={{ flex: "0 0 150px" }}>
                      <select
                        value={room.kitchen_type}
                        onChange={(e) => handleRoomChange(room.id, "kitchen_type", e.target.value)}
                        style={{ ...styles.roomSelect, width: "100%" }}
                      >
                        <option value="shared">Compartida</option>
                        <option value="private">Privada</option>
                        <option value="suite">Suite</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <input
                        type="text"
                        value={room.notes}
                        onChange={(e) => handleRoomChange(room.id, "notes", e.target.value)}
                        style={{ ...styles.roomInput, width: "100%" }}
                        placeholder="Notas..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => navigate("/v2/admin/alojamientos")}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={handleSubmit}
              >
                Crear Alojamiento
              </button>
            </div>
          </div>
        )}
    </V2Layout>
  );
}

const styles = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: 32,
  },
  progressStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  progressLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  progressLine: {
    flex: 1,
    height: 2,
    margin: "0 16px",
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 32,
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
  },
  inputError: {
    borderColor: "#DC2626",
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
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
  },
  cancelButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  primaryButton: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "#111827",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    color: "#FFFFFF",
  },
  backButton: {
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    cursor: "pointer",
    color: "#374151",
  },
  roomsTable: {
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  roomsHeader: {
    display: "flex",
    gap: 16,
    padding: "12px 20px",
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
    alignItems: "center",
  },
  roomsHeaderCell: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  roomsList: {
    maxHeight: 400,
    overflowY: "auto",
  },
  roomRow: {
    display: "flex",
    gap: 16,
    padding: "10px 20px",
    borderBottom: "1px solid #F3F4F6",
    alignItems: "center",
  },
  roomInput: {
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    outline: "none",
    boxSizing: "border-box",
  },
  roomInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputSuffix: {
    position: "absolute",
    right: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
  roomSelect: {
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    boxSizing: "border-box",
  },
};
