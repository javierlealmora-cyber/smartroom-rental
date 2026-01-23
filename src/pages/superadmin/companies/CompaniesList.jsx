// src/pages/superadmin/companies/CompaniesList.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanies, updateCompany } from "../../../services/companies.service";

export default function CompaniesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCompanies();
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies, location.key]);

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          company.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || company.status === "active";
    return matchesSearch && matchesStatus;
  });

  const handleView = (id) => {
    console.log("Ver empresa:", id);
    // TODO: Implementar vista de detalles
  };

  const handleEdit = (id) => {
    console.log("Editar empresa:", id);
    // TODO: Implementar edición
  };

  const handleToggleStatus = async (company) => {
    if (!confirm(`¿Deseas ${company.status === "active" ? "desactivar" : "activar"} la empresa "${company.name}"?`)) return;

    try {
      const newStatus = company.status === "active" ? "inactive" : "active";
      await updateCompany({
        company_id: company.id,
        patch: { status: newStatus }
      });
      loadCompanies();
    } catch (error) {
      console.error("Error updating company status:", error);
      alert("Error al actualizar el estado de la empresa");
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Cargando empresas...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Gestión de Empresas</h1>

      <div style={styles.card}>
        {/* HEADER */}
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Listado de Empresas</h2>
          <button
            style={styles.addButton}
            onClick={() => navigate("/superadmin/companies/new")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1F2937";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#111827";
            }}
          >
            <span style={styles.addButtonIcon}>⊕</span>
            Añadir Empresa
          </button>
        </div>

        {/* FILTERS */}
        <div style={styles.filters}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>Mostrar desactivadas</span>
          </label>
        </div>

        {/* TABLE */}
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={{ ...styles.tableHeader, ...styles.tableHeaderFirst }}>
                  Nombre <span style={styles.sortIcon}>↕</span>
                </th>
                <th style={styles.tableHeader}>Plan</th>
                <th style={styles.tableHeader}>Estado</th>
                <th style={{ ...styles.tableHeader, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.emptyState}>
                    {searchTerm
                      ? "No se encontraron empresas con ese criterio"
                      : "No hay empresas registradas aún"}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.companyName}>
                        <div style={styles.companyIcon}>
                          {company.logo_url ? (
                            <img src={company.logo_url} alt={company.name} style={styles.companyLogo} />
                          ) : (
                            company.name?.[0]?.toUpperCase() || "E"
                          )}
                        </div>
                        <div>
                          <div style={styles.companyNameText}>{company.name || "Sin nombre"}</div>
                          <div style={styles.companySlug}>{company.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.planBadge}>
                        {company.plan || "Free"}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(company.status === "active"
                            ? styles.statusActive
                            : styles.statusInactive),
                        }}
                      >
                        {company.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: "center" }}>
                      <div style={styles.actions}>
                        <button
                          style={styles.actionButton}
                          onClick={() => handleView(company.id)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <button
                          style={styles.actionButton}
                          onClick={() => handleEdit(company.id)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          style={{ ...styles.actionButton, ...styles.actionButtonDanger }}
                          onClick={() => handleToggleStatus(company)}
                          title={company.status === "active" ? "Desactivar" : "Activar"}
                        >
                          {company.status === "active" ? "🗑️" : "✅"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1400,
  },

  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    fontSize: 16,
    color: "#6B7280",
  },

  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    margin: 0,
    marginBottom: 32,
  },

  card: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 32px",
    borderBottom: "1px solid #E5E7EB",
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },

  addButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  addButtonIcon: {
    fontSize: 18,
    fontWeight: "400",
  },

  filters: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
  },

  searchContainer: {
    flex: 1,
    maxWidth: 400,
  },

  searchInput: {
    width: "100%",
    padding: "10px 16px",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s ease",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    userSelect: "none",
  },

  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },

  checkboxText: {
    fontSize: 14,
    color: "#374151",
  },

  tableContainer: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  tableHeaderRow: {
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
  },

  tableHeader: {
    padding: "12px 32px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  tableHeaderFirst: {
    paddingLeft: 32,
  },

  sortIcon: {
    marginLeft: 4,
    fontSize: 10,
    opacity: 0.5,
  },

  tableRow: {
    borderBottom: "1px solid #E5E7EB",
    transition: "background-color 0.15s ease",
    cursor: "default",
  },

  tableCell: {
    padding: "16px 32px",
    fontSize: 14,
    color: "#374151",
  },

  companyName: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  companyIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 0,
    overflow: "hidden",
  },

  companyLogo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  companyNameText: {
    fontWeight: "500",
    color: "#111827",
  },

  companySlug: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  planBadge: {
    display: "inline-block",
    padding: "4px 12px",
    backgroundColor: "#F3F4F6",
    color: "#4B5563",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
  },

  statusBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "500",
  },

  statusActive: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },

  statusInactive: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },

  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  actionButton: {
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 16,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  actionButtonDanger: {
    borderColor: "#FCA5A5",
  },

  emptyState: {
    padding: "48px 32px",
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
  },
};
