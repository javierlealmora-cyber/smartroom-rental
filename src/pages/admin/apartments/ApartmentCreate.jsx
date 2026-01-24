// src/pages/admin/apartments/ApartmentCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ApartmentCreate() {
  const navigate = useNavigate();
  const [apartmentName, setApartmentName] = useState("");
  const [numRooms, setNumRooms] = useState(1);
  const [rooms, setRooms] = useState([createEmptyRoom(1)]);

  function createEmptyRoom(number) {
    return {
      number,
      price: "",
      electricity: "",
      area: "",
      bathroomType: "Compartido",
      kitchenType: "Compartida",
      lockId: "",
      notes: "",
    };
  }

  const handleNumRoomsChange = (value) => {
    const num = parseInt(value) || 1;
    setNumRooms(num);

    // Ajustar el array de habitaciones
    if (num > rooms.length) {
      const newRooms = [...rooms];
      for (let i = rooms.length; i < num; i++) {
        newRooms.push(createEmptyRoom(i + 1));
      }
      setRooms(newRooms);
    } else {
      setRooms(rooms.slice(0, num));
    }
  };

  const handleRoomChange = (index, field, value) => {
    const newRooms = [...rooms];
    newRooms[index][field] = value;
    setRooms(newRooms);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Crear alojamiento:", { apartmentName, numRooms, rooms });
    alert("Alojamiento creado (pendiente implementación backend)");
    navigate("/admin/apartments");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Añadir Alojamiento</h1>
        <button
          style={styles.cancelButton}
          onClick={() => navigate("/admin/apartments")}
          type="button"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>INFORMACIÓN GENERAL</h2>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre del Alojamiento *</label>
              <input
                type="text"
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
                required
                style={styles.input}
                placeholder="Ej: Edificio Central"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Número de Habitaciones *</label>
              <input
                type="number"
                value={numRooms}
                onChange={(e) => handleNumRoomsChange(e.target.value)}
                required
                min="1"
                max="50"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>CONFIGURACIÓN DE HABITACIONES</h2>

          {rooms.map((room, index) => (
            <div key={index} style={styles.roomCard}>
              <h3 style={styles.roomTitle}>Habitación {room.number}</h3>

              <div style={styles.roomGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Precio Alquiler (€) *</label>
                  <input
                    type="number"
                    value={room.price}
                    onChange={(e) => handleRoomChange(index, "price", e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    style={styles.input}
                    placeholder="300.00"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Electricidad (€) *</label>
                  <input
                    type="number"
                    value={room.electricity}
                    onChange={(e) => handleRoomChange(index, "electricity", e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    style={styles.input}
                    placeholder="50.00"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Metros Cuadrados (m²) *</label>
                  <input
                    type="number"
                    value={room.area}
                    onChange={(e) => handleRoomChange(index, "area", e.target.value)}
                    required
                    min="0"
                    step="0.1"
                    style={styles.input}
                    placeholder="15.5"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Baño *</label>
                  <select
                    value={room.bathroomType}
                    onChange={(e) => handleRoomChange(index, "bathroomType", e.target.value)}
                    required
                    style={styles.select}
                  >
                    <option value="Suite">Suite</option>
                    <option value="Privado">Privado</option>
                    <option value="Compartido">Compartido</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Cocina *</label>
                  <select
                    value={room.kitchenType}
                    onChange={(e) => handleRoomChange(index, "kitchenType", e.target.value)}
                    required
                    style={styles.select}
                  >
                    <option value="Suite">Suite</option>
                    <option value="Privada">Privada</option>
                    <option value="Compartida">Compartida</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>ID Cerradura</label>
                  <input
                    type="text"
                    value={room.lockId}
                    onChange={(e) => handleRoomChange(index, "lockId", e.target.value)}
                    style={styles.input}
                    placeholder="LOC-001"
                  />
                </div>

                <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Notas</label>
                  <textarea
                    value={room.notes}
                    onChange={(e) => handleRoomChange(index, "notes", e.target.value)}
                    style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                    placeholder="Notas adicionales sobre esta habitación..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <button type="submit" style={styles.submitButton}>
            Guardar Alojamiento
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: 40,
    maxWidth: 1200,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
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

  section: {
    marginBottom: 40,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 24,
    letterSpacing: "0.5px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 20,
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
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
    fontFamily: "inherit",
  },

  select: {
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
    fontFamily: "inherit",
  },

  roomCard: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },

  roomTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 20,
    margin: 0,
    marginBottom: 20,
  },

  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: 24,
    borderTop: "1px solid #E5E7EB",
  },

  submitButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 32px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },
};
