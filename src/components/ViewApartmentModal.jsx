// src/components/ViewApartmentModal.jsx
import Modal from "./Modal";

export default function ViewApartmentModal({ isOpen, onClose, apartment }) {
  if (!apartment) return null;

  // Datos dummy de habitaciones con ocupación
  const rooms = [
    { number: 1, occupied: true, tenant: "Juan Pérez" },
    { number: 2, occupied: false, tenant: null },
    { number: 3, occupied: true, tenant: "María García" },
    { number: 4, occupied: false, tenant: null },
    { number: 5, occupied: true, tenant: "Carlos López" },
    { number: 6, occupied: false, tenant: null },
    { number: 7, occupied: false, tenant: null },
    { number: 8, occupied: true, tenant: "Ana Martínez" },
    { number: 9, occupied: false, tenant: null },
    { number: 10, occupied: true, tenant: "Luis Rodríguez" },
    { number: 11, occupied: false, tenant: null },
    { number: 12, occupied: false, tenant: null },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ver Alojamiento: ${apartment.name}`} size="xlarge">
      <div style={styles.grid}>
        {rooms.map((room) => (
          <div
            key={room.number}
            style={{
              ...styles.roomCard,
              backgroundColor: room.occupied ? "#FEE2E2" : "#DCFCE7",
              borderColor: room.occupied ? "#FCA5A5" : "#86EFAC",
            }}
          >
            <div style={styles.roomHeader}>
              <span style={styles.roomNumber}>Habitación {room.number}</span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: room.occupied ? "#DC2626" : "#16A34A",
                }}
              >
                {room.occupied ? "Ocupada" : "Libre"}
              </span>
            </div>

            {room.occupied && room.tenant && (
              <div style={styles.tenantName}>
                <span style={styles.tenantIcon}>👤</span>
                {room.tenant}
              </div>
            )}

            {!room.occupied && (
              <button
                style={styles.assignButton}
                onClick={() => alert(`Asignar inquilino a habitación ${room.number}`)}
              >
                Asignar Inquilino
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },

  roomCard: {
    border: "2px solid",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "default",
  },

  roomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  roomNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  statusBadge: {
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  tenantName: {
    fontSize: 13,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 0",
  },

  tenantIcon: {
    fontSize: 16,
  },

  assignButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    padding: "10px 16px",
    fontSize: 12,
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
    marginTop: "auto",
  },
};
