// src/pages/v2/admin/tenants/TenantCreate.jsx
// Crear nuevo Inquilino con asignación de habitación
// NOTA: Esta es una rama paralela v2 - NO afecta a la estructura existente

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../../components/Sidebar";
import {
  mockAccommodations,
  mockRooms,
  ROOM_STATUS,
  getRoomStatusLabel,
  getRoomStatusColor,
} from "../../../../mocks/clientAccountsData";

// Simular cliente activo
const CURRENT_CLIENT_ACCOUNT_ID = "ca-001";

export default function TenantCreate() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [accommodations, setAccommodations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    document: "",
    accommodation_id: "",
    room_id: "",
    move_in_date: new Date().toISOString().split("T")[0],
    billing_start_date: "",
    billing_same_as_move_in: true,
    send_onboarding: true,
  });

  const sidebarItems = [
    { label: "Visión General", path: "/v2/admin", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTOS" },
    { label: "Gestión de Alojamientos", path: "/v2/admin/alojamientos", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/v2/admin/inquilinos", icon: "👥", isSubItem: true },
  ];

  useEffect(() => {
    // Cargar alojamientos del cliente
    const accs = mockAccommodations.filter(
      (a) => a.client_account_id === CURRENT_CLIENT_ACCOUNT_ID && a.status === "active"
    );
    setAccommodations(accs);
  }, []);

  // Actualizar habitaciones disponibles cuando cambia el alojamiento
  useEffect(() => {
    if (formData.accommodation_id) {
      const rooms = mockRooms.filter(
        (r) => r.accommodation_id === formData.accommodation_id
      );
      setAvailableRooms(rooms);
      // Reset room selection
      setFormData((prev) => ({ ...prev, room_id: "" }));
    } else {
      setAvailableRooms([]);
    }
  }, [formData.accommodation_id]);

  // Actualizar billing_start_date cuando cambia move_in_date y está marcado el checkbox
  useEffect(() => {
    if (formData.billing_same_as_move_in) {
      setFormData((prev) => ({ ...prev, billing_start_date: prev.move_in_date }));
    }
  }, [formData.move_in_date, formData.billing_same_as_move_in]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "El nombre es obligatorio";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.accommodation_id) {
      newErrors.accommodation_id = "Seleccione un alojamiento";
    }

    if (!formData.room_id) {
      newErrors.room_id = "Seleccione una habitación";
    }

    if (!formData.move_in_date) {
      newErrors.move_in_date = "La fecha de entrada es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Verificar que la habitación sigue libre
    const selectedRoom = availableRooms.find((r) => r.id === formData.room_id);
    if (selectedRoom && selectedRoom.status !== ROOM_STATUS.FREE) {
      setErrors({ room_id: "Esta habitación ya está ocupada" });
      return;
    }

    // Mock: simular creación
    console.log("Crear inquilino:", formData);
    alert(
      `Inquilino ${formData.full_name} registrado correctamente (mock).\n` +
        (formData.send_onboarding
          ? `Se enviará email de onboarding a ${formData.email}`
          : "No se enviará email de onboarding")
    );
    navigate("/v2/admin/inquilinos");
  };

  const selectedAccommodation = accommodations.find((a) => a.id === formData.accommodation_id);

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Alojamientos" />

      <div style={styles.container}>
        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <span style={styles.breadcrumbLink} onClick={() => navigate("/v2/admin")}>
            Dashboard
          </span>
          <span style={styles.breadcrumbSeparator}>/</span>
          <span style={styles.breadcrumbLink} onClick={() => navigate("/v2/admin/inquilinos")}>
            Inquilinos
          </span>
          <span style={styles.breadcrumbSeparator}>/</span>
          <span style={styles.breadcrumbCurrent}>Nuevo Inquilino</span>
        </div>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Registrar Inquilino</h1>
          <p style={styles.subtitle}>Complete los datos del nuevo inquilino y asigne una habitación</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            {/* Datos personales */}
            <div style={styles.formCard}>
              <h2 style={styles.sectionTitle}>Datos Personales</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Nombre completo <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  style={{ ...styles.input, ...(errors.full_name ? styles.inputError : {}) }}
                  placeholder="Nombre y apellidos"
                />
                {errors.full_name && <span style={styles.errorText}>{errors.full_name}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                  placeholder="email@ejemplo.com"
                />
                {errors.email && <span style={styles.errorText}>{errors.email}</span>}
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    style={styles.input}
                    placeholder="+34 666 123 456"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Documento (DNI/NIE)</label>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => handleChange("document", e.target.value)}
                    style={styles.input}
                    placeholder="12345678A"
                  />
                </div>
              </div>

              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="send_onboarding"
                  checked={formData.send_onboarding}
                  onChange={(e) => handleChange("send_onboarding", e.target.checked)}
                  style={styles.checkboxInput}
                />
                <label htmlFor="send_onboarding" style={styles.checkboxLabelText}>
                  Enviar email de onboarding al crear el inquilino
                </label>
              </div>
            </div>

            {/* Asignación de habitación */}
            <div style={styles.formCard}>
              <h2 style={styles.sectionTitle}>Asignación de Habitación</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Alojamiento <span style={styles.required}>*</span>
                </label>
                <select
                  value={formData.accommodation_id}
                  onChange={(e) => handleChange("accommodation_id", e.target.value)}
                  style={{ ...styles.select, ...(errors.accommodation_id ? styles.inputError : {}) }}
                >
                  <option value="">Seleccionar alojamiento...</option>
                  {accommodations.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.accommodation_id && (
                  <span style={styles.errorText}>{errors.accommodation_id}</span>
                )}
              </div>

              {formData.accommodation_id && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Habitación <span style={styles.required}>*</span>
                  </label>
                  <div style={styles.roomsGrid}>
                    {availableRooms.map((room) => {
                      const isSelected = formData.room_id === room.id;
                      const isAvailable = room.status === ROOM_STATUS.FREE;

                      return (
                        <button
                          key={room.id}
                          type="button"
                          style={{
                            ...styles.roomCard,
                            ...(isSelected ? styles.roomCardSelected : {}),
                            ...(isAvailable ? {} : styles.roomCardDisabled),
                            borderColor: isSelected
                              ? "#111827"
                              : getRoomStatusColor(room.status),
                          }}
                          onClick={() => isAvailable && handleChange("room_id", room.id)}
                          disabled={!isAvailable}
                        >
                          <span style={styles.roomNumber}>Hab. {room.number}</span>
                          <span
                            style={{
                              ...styles.roomStatus,
                              color: getRoomStatusColor(room.status),
                            }}
                          >
                            {getRoomStatusLabel(room.status)}
                          </span>
                          {room.monthly_rent && (
                            <span style={styles.roomPrice}>{room.monthly_rent}€/mes</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.room_id && <span style={styles.errorText}>{errors.room_id}</span>}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Fecha de entrada (move-in) <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.move_in_date}
                  onChange={(e) => handleChange("move_in_date", e.target.value)}
                  style={{ ...styles.input, ...(errors.move_in_date ? styles.inputError : {}) }}
                />
                {errors.move_in_date && <span style={styles.errorText}>{errors.move_in_date}</span>}
              </div>

              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="billing_same"
                  checked={formData.billing_same_as_move_in}
                  onChange={(e) => handleChange("billing_same_as_move_in", e.target.checked)}
                  style={styles.checkboxInput}
                />
                <label htmlFor="billing_same" style={styles.checkboxLabelText}>
                  Facturar desde la fecha de entrada
                </label>
              </div>

              {!formData.billing_same_as_move_in && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha inicio facturación</label>
                  <input
                    type="date"
                    value={formData.billing_start_date}
                    onChange={(e) => handleChange("billing_start_date", e.target.value)}
                    style={styles.input}
                  />
                  <span style={styles.helpText}>
                    Permite diferir el inicio de facturación respecto a la entrada real
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resumen y acciones */}
          <div style={styles.summaryCard}>
            <div style={styles.summary}>
              <h3 style={styles.summaryTitle}>Resumen</h3>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Inquilino:</span>
                  <span style={styles.summaryValue}>
                    {formData.full_name || "-"}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Email:</span>
                  <span style={styles.summaryValue}>{formData.email || "-"}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Alojamiento:</span>
                  <span style={styles.summaryValue}>
                    {selectedAccommodation?.name || "-"}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Habitación:</span>
                  <span style={styles.summaryValue}>
                    {formData.room_id
                      ? `Hab. ${availableRooms.find((r) => r.id === formData.room_id)?.number}`
                      : "-"}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Fecha entrada:</span>
                  <span style={styles.summaryValue}>{formData.move_in_date || "-"}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Inicio facturación:</span>
                  <span style={styles.summaryValue}>
                    {formData.billing_same_as_move_in
                      ? formData.move_in_date || "-"
                      : formData.billing_start_date || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => navigate("/v2/admin/inquilinos")}
              >
                Cancelar
              </button>
              <button type="submit" style={styles.primaryButton}>
                Registrar Inquilino
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    padding: 32,
  },
  breadcrumb: {
    marginBottom: 16,
    fontSize: 14,
    color: "#6B7280",
  },
  breadcrumbLink: {
    color: "#3B82F6",
    cursor: "pointer",
  },
  breadcrumbSeparator: {
    margin: "0 8px",
    color: "#9CA3AF",
  },
  breadcrumbCurrent: {
    color: "#374151",
    fontWeight: "500",
  },
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
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 20px 0",
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  errorText: {
    display: "block",
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  helpText: {
    display: "block",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  checkboxInput: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  checkboxLabelText: {
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
  },
  roomsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
  },
  roomCard: {
    padding: 16,
    border: "2px solid",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease",
  },
  roomCardSelected: {
    backgroundColor: "#F3F4F6",
  },
  roomCardDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  roomNumber: {
    display: "block",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  roomStatus: {
    display: "block",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  roomPrice: {
    display: "block",
    fontSize: 12,
    color: "#6B7280",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summary: {},
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 12px 0",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px 24px",
  },
  summaryItem: {
    display: "flex",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  formActions: {
    display: "flex",
    gap: 12,
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
};
