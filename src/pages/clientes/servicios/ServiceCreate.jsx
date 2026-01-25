// src/pages/clientes/servicios/ServiceCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import { createService, serviceCategories } from "../../../mocks/services.mock";

const sidebarItems = [
  { label: "Visión General", path: "/clientes", icon: "⊞" },
  { type: "section", label: "CLIENTES" },
  { label: "Gestión de Empresas", path: "/clientes/empresas", icon: "🏢", isSubItem: true },
  { label: "Planes de Suscripción", path: "/clientes/planes", icon: "📋", isSubItem: true },
  { label: "Catálogo de Servicios", path: "/clientes/servicios", icon: "🛠️", isSubItem: true },
  { label: "Configuración", path: "/clientes/configuracion", icon: "⚙️", isSubItem: true },
];

export default function ServiceCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    key: "",
    label: "",
    description: "",
    category: "operación",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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

  const handleKeyFromLabel = () => {
    if (!form.key && form.label) {
      const generatedKey = form.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setForm({ ...form, key: generatedKey });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      createService(form);
      navigate("/clientes/servicios");
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSaving(false);
    }
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
          <h1 style={styles.title}>Nuevo Servicio</h1>
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
                onBlur={handleKeyFromLabel}
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
                Solo minúsculas, números y guiones bajos. No se puede cambiar después.
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
              <label style={styles.label}>Estado inicial</label>
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
            {saving ? "Guardando..." : "Crear Servicio"}
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
    padding: 24,
    maxWidth: 800,
    overflow: "auto",
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
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  form: {},
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 24,
    marginBottom: 20,
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
};
