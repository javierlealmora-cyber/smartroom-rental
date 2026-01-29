// src/pages/admin/apartments/ApartmentsList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ViewApartmentModal from "../../../components/ViewApartmentModal";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../providers/AuthProvider";
import { getCompanies } from "../../../services/companies.service";

export default function ApartmentsList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role;
  const userCompanyId = profile?.company_id;
  const isSuperadmin = role === "superadmin";

  // Estado para filtro de empresa (solo visible para superadmin)
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(userCompanyId || "");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Cargar lista de empresas para superadmin
  useEffect(() => {
    if (isSuperadmin) {
      loadCompanies();
    } else if (userCompanyId) {
      setSelectedCompanyId(userCompanyId);
    }
  }, [isSuperadmin, userCompanyId]);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      const activeCompanies = data.filter(c => c.status === "active");
      setCompanies(activeCompanies);
      if (activeCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    } catch (err) {
      console.error("[ApartmentsList] Error loading companies:", err);
    }
  };

  const sidebarItems = [
    { label: "Visión General", path: "/alojamientos", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTO" },
    { label: "Gestión de Alojamiento", path: "/alojamientos/gestion", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/alojamientos/inquilinos", icon: "👥", isSubItem: true },
    { label: "Historial de Ocupación", path: "/alojamientos/ocupacion", icon: "⏱", isSubItem: true },
  ];

  // Datos dummy para la POC
  const apartments = [
    { id: 1, name: "Edificio Central", rooms: 12, status: "Activo" },
    { id: 2, name: "Residencia Norte", rooms: 8, status: "Activo" },
    { id: 3, name: "Apartamento Sur", rooms: 6, status: "Desactivado" },
  ];

  const filteredApartments = apartments.filter((apt) =>
    apt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Alojamientos" />
      <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestión de Alojamientos</h1>
        <button
          style={styles.addButton}
          onClick={() => navigate("/alojamientos/gestion/nuevo")}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Añadir Alojamiento
        </button>
      </div>

      <div style={styles.filtersContainer}>
        {/* Selector de empresa - solo visible para superadmin */}
        {isSuperadmin && (
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            style={styles.select}
          >
            <option value="">-- Seleccionar empresa --</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Nº Habitaciones</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredApartments.map((apt) => (
              <tr key={apt.id} style={styles.tr}>
                <td style={styles.td}>{apt.name}</td>
                <td style={styles.td}>{apt.rooms}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: apt.status === "Activo" ? "#DCFCE7" : "#FEE2E2",
                      color: apt.status === "Activo" ? "#166534" : "#991B1B",
                    }}
                  >
                    {apt.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={styles.actionButton}
                      onClick={() => {
                        setSelectedApartment(apt);
                        setIsViewModalOpen(true);
                      }}
                      title="Ver"
                    >
                      👁️
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => alert(`Editar alojamiento ${apt.id}`)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => {
                        if (confirm(`¿Eliminar ${apt.name}?`)) {
                          alert("Eliminar (pendiente implementación)");
                        }
                      }}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredApartments.length === 0 && (
          <div style={styles.emptyState}>
            <p>No se encontraron alojamientos</p>
          </div>
        )}
      </div>

      <ViewApartmentModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedApartment(null);
        }}
        apartment={selectedApartment}
      />
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

  addButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s ease",
  },

  filtersContainer: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
    alignItems: "center",
  },

  select: {
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    minWidth: 220,
  },

  searchInput: {
    flex: 1,
    minWidth: 250,
    maxWidth: 400,
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
  },

  tableContainer: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    backgroundColor: "#F9FAFB",
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #E5E7EB",
  },

  tr: {
    borderBottom: "1px solid #F3F4F6",
  },

  td: {
    padding: "16px",
    fontSize: 14,
    color: "#111827",
  },

  statusBadge: {
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    display: "inline-block",
  },

  actions: {
    display: "flex",
    gap: 8,
  },

  actionButton: {
    backgroundColor: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 16,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  emptyState: {
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
  },
};
