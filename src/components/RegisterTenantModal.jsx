// src/components/RegisterTenantModal.jsx
import { useState } from "react";
import Modal from "./Modal";

export default function RegisterTenantModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName1: "",
    lastName2: "",
    email: "",
    phone: "",
    entryDate: "",
    apartment: "",
    room: "",
  });

  // Datos dummy
  const apartments = [
    { id: 1, name: "Edificio Central" },
    { id: 2, name: "Residencia Norte" },
    { id: 3, name: "Apartamento Sur" },
  ];

  // Habitaciones disponibles por alojamiento (dummy)
  const availableRoomsByApartment = {
    1: [2, 4, 6, 7, 9, 11, 12],
    2: [1, 3, 5, 7],
    3: [2, 4, 6],
  };

  const availableRooms = formData.apartment
    ? availableRoomsByApartment[parseInt(formData.apartment)] || []
    : [];

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Reset room when apartment changes
      ...(field === "apartment" ? { room: "" } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registrar inquilino:", formData);
    onSubmit?.(formData);
    onClose();
    // Reset form
    setFormData({
      firstName: "",
      lastName1: "",
      lastName2: "",
      email: "",
      phone: "",
      entryDate: "",
      apartment: "",
      room: "",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nuevo Inquilino" size="large">
      <form onSubmit={handleSubmit}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>DATOS PERSONALES</h3>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
                style={styles.input}
                placeholder="Juan"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Primer Apellido *</label>
              <input
                type="text"
                value={formData.lastName1}
                onChange={(e) => handleChange("lastName1", e.target.value)}
                required
                style={styles.input}
                placeholder="Pérez"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Segundo Apellido</label>
              <input
                type="text"
                value={formData.lastName2}
                onChange={(e) => handleChange("lastName2", e.target.value)}
                style={styles.input}
                placeholder="García"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                style={styles.input}
                placeholder="juan.perez@email.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Teléfono *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                style={styles.input}
                placeholder="+34 600 123 456"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Fecha de Entrada *</label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => handleChange("entryDate", e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>ASIGNACIÓN DE HABITACIÓN</h3>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Alojamiento *</label>
              <select
                value={formData.apartment}
                onChange={(e) => handleChange("apartment", e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Seleccionar alojamiento</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Habitación *</label>
              <select
                value={formData.room}
                onChange={(e) => handleChange("room", e.target.value)}
                required
                disabled={!formData.apartment}
                style={styles.select}
              >
                <option value="">Seleccionar habitación</option>
                {availableRooms.map((room) => (
                  <option key={room} value={room}>
                    Habitación {room}
                  </option>
                ))}
              </select>
              {formData.apartment && availableRooms.length === 0 && (
                <span style={styles.helpText}>No hay habitaciones disponibles</span>
              )}
            </div>
          </div>

          {!formData.apartment && (
            <div style={styles.infoBox}>
              ℹ️ Selecciona un alojamiento para ver las habitaciones disponibles
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.cancelButton}>
            Cancelar
          </button>
          <button type="submit" style={styles.submitButton}>
            Registrar Inquilino
          </button>
        </div>
      </form>
    </Modal>
  );
}

const styles = {
  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    letterSpacing: "0.5px",
    margin: 0,
    marginBottom: 16,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  input: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
    fontFamily: "inherit",
  },

  select: {
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
    fontFamily: "inherit",
  },

  helpText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },

  infoBox: {
    backgroundColor: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1E40AF",
    marginTop: 16,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
    marginTop: 24,
  },

  cancelButton: {
    backgroundColor: "transparent",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  submitButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },
};
