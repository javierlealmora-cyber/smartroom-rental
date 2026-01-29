// src/pages/admin/tenants/TenantsList.jsx
import { useState, useEffect } from "react";
import RegisterTenantModal from "../../../components/RegisterTenantModal";
import DeactivateTenantModal from "../../../components/DeactivateTenantModal";
import Sidebar from "../../../components/Sidebar";
import { useAuth } from "../../../providers/AuthProvider";
import { getCompanies } from "../../../services/companies.service";

export default function TenantsList() {
  const { profile } = useAuth();
  const role = profile?.role;
  const userCompanyId = profile?.company_id;
  const isSuperadmin = role === "superadmin";

  // Estado para filtro de empresa (solo visible para superadmin)
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(userCompanyId || "");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApartment, setSelectedApartment] = useState("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

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
      // Si hay empresas, seleccionar la primera por defecto
      if (activeCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    } catch (err) {
      console.error("[TenantsList] Error loading companies:", err);
    }
  };

  const sidebarItems = [
    { label: "Visión General", path: "/alojamientos", icon: "⊞" },
    { type: "section", label: "ALOJAMIENTO" },
    { label: "Gestión de Alojamiento", path: "/alojamientos/gestion", icon: "🏢", isSubItem: true },
    { label: "Gestión de Inquilinos", path: "/alojamientos/inquilinos", icon: "👥", isSubItem: true },
    { label: "Historial de Ocupación", path: "/alojamientos/ocupacion", icon: "⏱", isSubItem: true },
  ];

  // Datos dummy para POC
  const tenants = [
    {
      id: 1,
      name: "Juan Pérez",
      email: "juan.perez@email.com",
      apartment: "Edificio Central",
      room: 5,
      status: "Activo",
    },
    {
      id: 2,
      name: "María García",
      email: "maria.garcia@email.com",
      apartment: "Edificio Central",
      room: 8,
      status: "Activo",
    },
    {
      id: 3,
      name: "Carlos López",
      email: "carlos.lopez@email.com",
      apartment: "Residencia Norte",
      room: 3,
      status: "Activo",
    },
    {
      id: 4,
      name: "Ana Martínez",
      email: "ana.martinez@email.com",
      apartment: "Edificio Central",
      room: 1,
      status: "Inactivo",
    },
  ];

  const apartments = ["Edificio Central", "Residencia Norte", "Apartamento Sur"];

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesApartment =
      selectedApartment === "all" || tenant.apartment === selectedApartment;

    const matchesStatus = includeInactive || tenant.status === "Activo";

    return matchesSearch && matchesApartment && matchesStatus;
  });

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Alojamientos" />
      <div style={styles.container}>
        <div style={styles.header}>
        <h1 style={styles.title}>Gestión de Inquilinos</h1>
        <button
          style={styles.addButton}
          onClick={() => setIsRegisterModalOpen(true)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Registrar Inquilino
        </button>
      </div>

      <div style={styles.filtersContainer}>
        {/* Selector de empresa - solo visible para superadmin */}
        {isSuperadmin && (
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            style={{ ...styles.select, minWidth: 220 }}
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
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />

        <select
          value={selectedApartment}
          onChange={(e) => setSelectedApartment(e.target.value)}
          style={styles.select}
        >
          <option value="all">Todos los alojamientos</option>
          {apartments.map((apt) => (
            <option key={apt} value={apt}>
              {apt}
            </option>
          ))}
        </select>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            style={styles.checkbox}
          />
          <span>Incluir inactivos</span>
        </label>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Alojamiento</th>
              <th style={styles.th}>Habitación</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} style={styles.tr}>
                <td style={styles.td}>{tenant.name}</td>
                <td style={styles.td}>{tenant.email}</td>
                <td style={styles.td}>{tenant.apartment}</td>
                <td style={styles.td}>{tenant.room}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: tenant.status === "Activo" ? "#DCFCE7" : "#FEE2E2",
                      color: tenant.status === "Activo" ? "#166534" : "#991B1B",
                    }}
                  >
                    {tenant.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={styles.actionButton}
                      onClick={() => alert(`Editar inquilino ${tenant.id}`)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setIsDeactivateModalOpen(true);
                      }}
                      title="Dar de baja"
                      disabled={tenant.status === "Inactivo"}
                    >
                      ❌
                    </button>
                    <button
                      style={styles.actionButton}
                      onClick={() => alert(`Enviar correo a ${tenant.name}`)}
                      title="Enviar correo"
                    >
                      📧
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTenants.length === 0 && (
          <div style={styles.emptyState}>
            <p>No se encontraron inquilinos</p>
          </div>
        )}
      </div>

      <RegisterTenantModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        companyId={selectedCompanyId}
        onSubmit={(data) => {
          alert(`Inquilino registrado: ${data.firstName} ${data.lastName1}`);
        }}
      />

      <DeactivateTenantModal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setSelectedTenant(null);
        }}
        tenant={selectedTenant}
        onConfirm={(data) => {
          alert(`Inquilino dado de baja: ${data.tenantId} - Fecha: ${data.exitDate}`);
        }}
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

  searchInput: {
    flex: 1,
    minWidth: 250,
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease",
  },

  select: {
    padding: "12px 16px",
    fontSize: 14,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    outline: "none",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    minWidth: 200,
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#374151",
    cursor: "pointer",
  },

  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
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
