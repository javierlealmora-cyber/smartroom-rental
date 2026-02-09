// src/pages/admin/apartments/ApartmentEdit.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../providers/AuthProvider";

export default function ApartmentEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();
  const isSuperadmin = profile?.role === "superadmin";

  // Estado del formulario
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [apartmentName, setApartmentName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("España");
  const [numRooms, setNumRooms] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [originalNumRooms, setOriginalNumRooms] = useState(1);

  const sidebarItems = [
    { label: "Visión General", path: "/alojamientos", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTO" },
    { label: "Gestión de Alojamiento", path: "/alojamientos/gestion", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/alojamientos/inquilinos", icon: "👥", isSubItem: true },
    { label: "Historial de Ocupación", path: "/alojamientos/ocupacion", icon: "⏱", isSubItem: true },
  ];

  // Simular carga de datos del alojamiento (POC)
  useEffect(() => {
    // Datos dummy - en producción se cargarían desde Supabase
    const dummyApartments = {
      "1": {
        id: 1,
        company_name: "Empresa Demo S.L.",
        name: "Edificio Central",
        address_line1: "Calle Mayor 15",
        address_line2: "Planta 2",
        city: "Madrid",
        postal_code: "28001",
        country: "España",
        rooms: [
          { number: 1, price: 350, electricity: 40, area: 15, bathroomType: "Compartido", kitchenType: "Compartida", lockId: "LC-001", notes: "", status: "occupied" },
          { number: 2, price: 380, electricity: 45, area: 18, bathroomType: "Privado", kitchenType: "Compartida", lockId: "LC-002", notes: "", status: "free" },
          { number: 3, price: 400, electricity: 50, area: 20, bathroomType: "Suite", kitchenType: "Suite", lockId: "LC-003", notes: "Habitación premium", status: "pending_checkout" },
        ],
      },
      "2": {
        id: 2,
        company_name: "Empresa Demo S.L.",
        name: "Residencia Norte",
        address_line1: "Av. del Norte 42",
        address_line2: "",
        city: "Barcelona",
        postal_code: "08001",
        country: "España",
        rooms: [
          { number: 1, price: 320, electricity: 35, area: 14, bathroomType: "Compartido", kitchenType: "Compartida", lockId: "", notes: "", status: "free" },
          { number: 2, price: 320, electricity: 35, area: 14, bathroomType: "Compartido", kitchenType: "Compartida", lockId: "", notes: "", status: "occupied" },
        ],
      },
    };

    setTimeout(() => {
      const apartment = dummyApartments[id];
      if (apartment) {
        setCompanyName(apartment.company_name);
        setApartmentName(apartment.name);
        setAddressLine1(apartment.address_line1);
        setAddressLine2(apartment.address_line2);
        setCity(apartment.city);
        setPostalCode(apartment.postal_code);
        setCountry(apartment.country);
        setNumRooms(apartment.rooms.length);
        setOriginalNumRooms(apartment.rooms.length);
        setRooms(apartment.rooms);
      }
      setLoading(false);
    }, 500);
  }, [id]);

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
      status: "free",
    };
  }

  const handleNumRoomsChange = (value) => {
    const num = parseInt(value) || 1;

    // Validar que no se reduzcan habitaciones ocupadas
    if (num < rooms.length) {
      const roomsToRemove = rooms.slice(num);
      const hasOccupiedRooms = roomsToRemove.some(r => r.status === "occupied" || r.status === "pending_checkout");
      if (hasOccupiedRooms) {
        alert("No se pueden eliminar habitaciones que están ocupadas o pendientes de baja.");
        return;
      }
    }

    setNumRooms(num);

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
    const room = rooms[index];

    // Validar que no se modifiquen ciertos campos de habitaciones ocupadas
    if (room.status === "occupied" && ["price", "electricity"].includes(field)) {
      alert("No se puede modificar el precio o electricidad de una habitación ocupada.");
      return;
    }

    const newRooms = [...rooms];
    newRooms[index][field] = value;
    setRooms(newRooms);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const apartmentData = {
      id,
      name: apartmentName,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      postal_code: postalCode,
      country,
      rooms
    };
    console.log("Actualizar alojamiento:", apartmentData);
    alert("Alojamiento actualizado (pendiente implementación backend)");
    navigate("/alojamientos/gestion");
  };

  const getRoomStatusLabel = (status) => {
    switch (status) {
      case "occupied": return "Ocupada";
      case "pending_checkout": return "Pendiente baja";
      case "free": return "Libre";
      default: return status;
    }
  };

  const getRoomStatusColor = (status) => {
    switch (status) {
      case "occupied": return { bg: "#DCFCE7", color: "#166534" };
      case "pending_checkout": return { bg: "#FEF3C7", color: "#92400E" };
      case "free": return { bg: "#DBEAFE", color: "#1E40AF" };
      default: return { bg: "#F3F4F6", color: "#374151" };
    }
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="Alojamientos" />
        <div style={styles.container}>
          <div style={styles.loadingState}>Cargando alojamiento...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Alojamientos" />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Editar Alojamiento</h1>
          <button
            style={styles.cancelButton}
            onClick={() => navigate("/alojamientos/gestion")}
            type="button"
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>INFORMACIÓN GENERAL</h2>

            <div style={styles.formGrid}>
              {/* Empresa - solo lectura */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Empresa</label>
                <input
                  type="text"
                  value={companyName}
                  disabled
                  style={{ ...styles.input, backgroundColor: "#F9FAFB", color: "#6B7280" }}
                />
              </div>

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
                <label style={styles.label}>Dirección Línea 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  style={styles.input}
                  placeholder="Ej: Calle Mayor 15"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Dirección Línea 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  style={styles.input}
                  placeholder="Ej: Piso 3, Puerta A"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ciudad</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={styles.input}
                  placeholder="Ej: Madrid"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Código Postal</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  style={styles.input}
                  placeholder="Ej: 28001"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>País</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={styles.select}
                >
                  <option value="España">España</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Francia">Francia</option>
                  <option value="Italia">Italia</option>
                  <option value="Alemania">Alemania</option>
                  <option value="Reino Unido">Reino Unido</option>
                </select>
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
                {numRooms < originalNumRooms && (
                  <span style={styles.warningText}>
                    Se eliminarán {originalNumRooms - numRooms} habitación(es)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>CONFIGURACIÓN DE HABITACIONES</h2>

            {rooms.map((room, index) => {
              const statusColors = getRoomStatusColor(room.status);
              const isOccupied = room.status === "occupied" || room.status === "pending_checkout";

              return (
                <div key={index} style={styles.roomCard}>
                  <div style={styles.roomHeader}>
                    <h3 style={styles.roomTitle}>Habitación {room.number}</h3>
                    <span
                      style={{
                        ...styles.roomStatusBadge,
                        backgroundColor: statusColors.bg,
                        color: statusColors.color,
                      }}
                    >
                      {getRoomStatusLabel(room.status)}
                    </span>
                  </div>

                  {isOccupied && (
                    <div style={styles.occupiedWarning}>
                      Algunos campos no se pueden modificar mientras la habitación está ocupada.
                    </div>
                  )}

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
                        style={{
                          ...styles.input,
                          ...(isOccupied ? { backgroundColor: "#F9FAFB", color: "#6B7280" } : {}),
                        }}
                        disabled={isOccupied}
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
                        style={{
                          ...styles.input,
                          ...(isOccupied ? { backgroundColor: "#F9FAFB", color: "#6B7280" } : {}),
                        }}
                        disabled={isOccupied}
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
              );
            })}
          </div>

          <div style={styles.footer}>
            <button type="submit" style={styles.submitButton}>
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },

  container: {
    flex: 1,
    padding: 40,
    overflow: "auto",
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

  roomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  roomTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },

  roomStatusBadge: {
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
  },

  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },

  occupiedWarning: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
  },

  warningText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
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

  loadingState: {
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 16,
  },
};
