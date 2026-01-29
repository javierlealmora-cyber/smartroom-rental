// src/pages/superadmin/companies/CompaniesList.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanies, updateCompany } from "../../../services/companies.service";
import Sidebar from "../../../components/Sidebar";

// Formatea fecha como dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function CompaniesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Estado para el modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    plan: "",
    primary_color: "",
    logo_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });
  const [saving, setSaving] = useState(false);

  const sidebarItems = [
    { label: "Visión General", path: "/clientes", icon: "⊞" },
    { type: "section", label: "CLIENTES" },
    { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
    { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
    { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
    { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
  ];

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
    const company = companies.find((c) => c.id === id);
    if (company) {
      handleEdit(id); // Por ahora, ver abre el modal de edición
    }
  };

  const handleEdit = (id) => {
    const company = companies.find((c) => c.id === id);
    if (company) {
      setEditingCompany(company);
      setEditForm({
        name: company.name || "",
        slug: company.slug || "",
        plan: company.plan || "Free",
        primary_color: company.theme_primary_color || "#111827",
        logo_url: company.logo_url || "",
        contact_name: company.contact_name || "",
        contact_email: company.contact_email || "",
        contact_phone: company.contact_phone || "",
      });
      setEditModalOpen(true);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingCompany(null);
    setEditForm({
      name: "",
      slug: "",
      plan: "",
      primary_color: "",
      logo_url: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;

    setSaving(true);
    try {
      await updateCompany({
        company_id: editingCompany.id,
        patch: {
          name: editForm.name,
          slug: editForm.slug,
          plan: editForm.plan,
          theme_primary_color: editForm.primary_color,
          logo_url: editForm.logo_url || null,
          contact_name: editForm.contact_name || null,
          contact_email: editForm.contact_email || null,
          contact_phone: editForm.contact_phone || null,
        },
      });
      handleCloseEditModal();
      loadCompanies();
    } catch (error) {
      console.error("Error updating company:", error);
      alert("Error al actualizar la empresa");
    } finally {
      setSaving(false);
    }
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
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="Clientes" />
        <div style={styles.loading}>
          <div>Cargando empresas...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="Clientes" />
      <div style={styles.container}>
      <h1 style={styles.mainTitle}>Gestión de Empresas</h1>

      <div style={styles.card}>
        {/* HEADER */}
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Listado de Empresas</h2>
          <button
            style={styles.addButton}
            onClick={() => navigate("/clientes/empresas/nueva")}
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
                <th style={styles.tableHeader}>Contacto</th>
                <th style={styles.tableHeader}>Plan</th>
                <th style={styles.tableHeader}>Fecha Alta</th>
                <th style={styles.tableHeader}>Estado</th>
                <th style={{ ...styles.tableHeader, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.emptyState}>
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
                      <div>
                        {company.contact_name && (
                          <div style={styles.contactNameText}>{company.contact_name}</div>
                        )}
                        <div style={styles.contactEmail}>{company.contact_email || "-"}</div>
                        {company.contact_phone && (
                          <div style={styles.contactPhone}>{company.contact_phone}</div>
                        )}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.planBadge}>
                        {company.plan || "Free"}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.dateText}>
                        {formatDate(company.start_date || company.created_at)}
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

      {/* MODAL DE EDICIÓN */}
      {editModalOpen && editingCompany && (
        <div style={styles.modalOverlay} onClick={handleCloseEditModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar Empresa</h3>
              <button style={styles.modalClose} onClick={handleCloseEditModal}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre de la empresa *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={styles.input}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Slug (identificador único)</label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  style={styles.input}
                  placeholder="slug-empresa"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Plan</label>
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Free">Free</option>
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Color primario</label>
                  <div style={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={editForm.primary_color}
                      onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                      style={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={editForm.primary_color}
                      onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="#111827"
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>URL del Logo (opcional)</label>
                <input
                  type="url"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                  style={styles.input}
                  placeholder="https://ejemplo.com/logo.png"
                />
                {editForm.logo_url && (
                  <div style={styles.logoPreview}>
                    <img
                      src={editForm.logo_url}
                      alt="Vista previa del logo"
                      style={styles.logoPreviewImg}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre de contacto</label>
                <input
                  type="text"
                  value={editForm.contact_name}
                  onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                  style={styles.input}
                  placeholder="Nombre del administrador"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email de contacto</label>
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    style={styles.input}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono de contacto</label>
                  <input
                    type="tel"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    style={styles.input}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.cancelButton}
                onClick={handleCloseEditModal}
              >
                Cancelar
              </button>
              <button
                style={styles.saveButton}
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  loading: {
    flex: 1,
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

  contactNameText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  contactEmail: {
    fontSize: 13,
    color: "#374151",
  },

  contactPhone: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  dateText: {
    fontSize: 13,
    color: "#374151",
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

  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #E5E7EB",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },

  modalClose: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: 20,
    color: "#6B7280",
    cursor: "pointer",
    padding: 4,
  },

  modalBody: {
    padding: 24,
    overflowY: "auto",
    maxHeight: "calc(90vh - 140px)",
  },

  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    padding: "16px 24px",
    borderTop: "1px solid #E5E7EB",
    backgroundColor: "#F9FAFB",
  },

  formGroup: {
    marginBottom: 20,
    flex: 1,
  },

  formRow: {
    display: "flex",
    gap: 16,
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  },

  colorInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  colorInput: {
    width: 44,
    height: 38,
    padding: 2,
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    cursor: "pointer",
  },

  cancelButton: {
    padding: "10px 20px",
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },

  saveButton: {
    padding: "10px 20px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "500",
    cursor: "pointer",
  },

  logoPreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    textAlign: "center",
  },

  logoPreviewImg: {
    maxWidth: 120,
    maxHeight: 60,
    objectFit: "contain",
  },
};
