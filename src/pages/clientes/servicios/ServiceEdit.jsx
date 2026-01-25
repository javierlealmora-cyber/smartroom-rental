// src/pages/clientes/servicios/ServiceEdit.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import {
  getServiceById,
  updateService,
  archiveService,
  serviceCategories,
} from "../../../mocks/services.mock";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

// Formatea fecha como dd-mm-yyyy
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function ServiceEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    const service = getServiceById(id);
    if (service) {
      setForm({ ...service });
    } else {
      navigate("/clientes/servicios");
    }
  }, [id, navigate]);

  if (!form) {
    return (
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="CLIENTES" />
        <div style={styles.loading}>
          <p>Cargando servicio...</p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const newErrors = {};

    if (!form.label.trim()) {
      newErrors.label = "El nombre es requerido";
    }

    if (!form.key.trim()) {
      newErrors.key = "El key es requerido";
    } else if (!/^[a-z0-9_]+$/.test(form.key)) {
      newErrors.key = "Solo minúsculas, números y guiones bajos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      updateService(id, {
        label: form.label,
        key: form.key,
        description: form.description,
        category: form.category,
        status: form.status,
      });
      navigate("/clientes/servicios");
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    archiveService(id);
    navigate("/clientes/servicios");
  };

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate("/clientes/servicios")}>
            ← Volver
        </button>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Editar Servicio</h1>
          {form.status === "active" && (
            <button
              style={styles.archiveBtn}
              onClick={() => setConfirmArchive(true)}
            >
              Archivar
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Datos del Servicio</h2>

          {errors.submit && (
            <div style={styles.errorBanner}>{errors.submit}</div>
          )}

          <div style={styles.formGrid}>
            {/* Nombre */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Nombre <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Ej: Lavandería"
                style={{
                  ...styles.input,
                  ...(errors.label ? styles.inputError : {}),
                }}
              />
              {errors.label && <span style={styles.errorText}>{errors.label}</span>}
            </div>

            {/* Key */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Key (identificador único) <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => handleChange("key", e.target.value.toLowerCase())}
                placeholder="Ej: lavanderia"
                style={{
                  ...styles.input,
                  fontFamily: "monospace",
                  ...(errors.key ? styles.inputError : {}),
                }}
              />
              {errors.key && <span style={styles.errorText}>{errors.key}</span>}
              <span style={styles.hint}>
                Precaución: cambiar el key puede afectar a planes que lo usan.
              </span>
            </div>

            {/* Descripción */}
            <div style={{ ...styles.formGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Descripción opcional del servicio..."
                rows={3}
                style={styles.textarea}
              />
            </div>

            {/* Categoría */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Categoría</label>
              <select
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                style={styles.select}
              >
                {serviceCategories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado</label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                style={styles.select}
              >
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info de auditoría */}
        <div style={styles.auditInfo}>
          <span>Creado: {formatDate(form.created_at)}</span>
          <span>Actualizado: {formatDate(form.updated_at)}</span>
        </div>

        {/* Acciones */}
        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => navigate("/clientes/servicios")}
          >
            Cancelar
          </button>
          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      {/* Modal de confirmación de archivo */}
      {confirmArchive && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Archivar Servicio</h3>
            <p style={styles.modalText}>
              ¿Estás seguro de que deseas archivar "{form.label}"? El servicio
              dejará de estar disponible para nuevos planes.
            </p>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setConfirmArchive(false)}
              >
                Cancelar
              </button>
              <button style={styles.dangerBtn} onClick={handleArchive}>
                Archivar
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
    padding: 24,
    maxWidth: 800,
    overflow: "auto",
  },
  loading: {
    flex: 1,
    padding: 40,
    textAlign: "center",
    color: "#6B7280",
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
    marginBottom: 8,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  archiveBtn: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  form: {},
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 24,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 20px 0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
  },
  required: {
    color: "#DC2626",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #D1D5DB",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 20,
  },
  auditInfo: {
    display: "flex",
    gap: 20,
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  formActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
    color: "#374151",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "12px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
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
    padding: 24,
    maxWidth: 440,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  modalText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.5,
    margin: "0 0 20px 0",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  dangerBtn: {
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
