// src/components/DeactivateTenantModal.jsx
import { useState } from "react";
import Modal from "./Modal";

export default function DeactivateTenantModal({ isOpen, onClose, tenant, onConfirm }) {
  const [exitDate, setExitDate] = useState("");

  if (!tenant) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dar de baja inquilino:", { tenantId: tenant.id, exitDate });
    onConfirm?.({ tenantId: tenant.id, exitDate });
    onClose();
    setExitDate("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dar de Baja Inquilino" size="medium">
      <form onSubmit={handleSubmit}>
        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>⚠️</span>
          <div>
            <strong>Esta acción marcará al inquilino como inactivo</strong>
            <p style={styles.warningText}>
              El inquilino dejará de aparecer en las listas activas y su habitación quedará disponible
              a partir de la fecha de salida indicada.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>DATOS DEL INQUILINO</h3>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Nombre:</span>
              <span style={styles.infoValue}>{tenant.name}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email:</span>
              <span style={styles.infoValue}>{tenant.email}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Alojamiento:</span>
              <span style={styles.infoValue}>{tenant.apartment}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Habitación:</span>
              <span style={styles.infoValue}>Habitación {tenant.room}</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>FECHA DE SALIDA</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Fecha de Salida *
              <span style={styles.helpText}>
                (La habitación quedará disponible a partir de esta fecha)
              </span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              required
              style={styles.input}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.cancelButton}>
            Cancelar
          </button>
          <button type="submit" style={styles.submitButton}>
            Confirmar Baja
          </button>
        </div>
      </form>
    </Modal>
  );
}

const styles = {
  warningBox: {
    backgroundColor: "#FEF3C7",
    border: "1px solid #FCD34D",
    borderRadius: 8,
    padding: 16,
    display: "flex",
    gap: 12,
    marginBottom: 24,
  },

  warningIcon: {
    fontSize: 24,
    flexShrink: 0,
  },

  warningText: {
    fontSize: 13,
    color: "#78350F",
    margin: "4px 0 0 0",
  },

  section: {
    marginBottom: 24,
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

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },

  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
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
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  helpText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7280",
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
    backgroundColor: "#DC2626",
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
