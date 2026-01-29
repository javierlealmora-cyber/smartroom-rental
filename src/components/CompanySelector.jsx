// src/components/CompanySelector.jsx
// Componente para seleccionar empresa según el rol del usuario
// - Superadmin: muestra dropdown con todas las empresas
// - Admin/Tenant: muestra la empresa asignada (readonly)

import { useState, useEffect } from "react";
import { useAuth } from "../providers/AuthProvider";
import { getCompanies } from "../services/companies.service";

export default function CompanySelector({
  value,
  onChange,
  required = true,
  disabled = false,
  label = "Empresa",
  showLabel = true,
  style = {},
}) {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const role = profile?.role;
  const userCompanyId = profile?.company_id;

  // Si es admin o tenant, usar automáticamente su company_id
  const isSuperadmin = role === "superadmin";

  useEffect(() => {
    // Si NO es superadmin, establecer automáticamente el company_id del perfil
    if (!isSuperadmin && userCompanyId && onChange) {
      onChange(userCompanyId);
    }
  }, [isSuperadmin, userCompanyId, onChange]);

  useEffect(() => {
    // Solo cargar lista de empresas si es superadmin
    if (isSuperadmin) {
      loadCompanies();
    }
  }, [isSuperadmin]);

  const loadCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanies();
      // Filtrar solo empresas activas
      const activeCompanies = data.filter(c => c.status === "active");
      setCompanies(activeCompanies);
    } catch (err) {
      console.error("[CompanySelector] Error loading companies:", err);
      setError("Error al cargar empresas");
    } finally {
      setLoading(false);
    }
  };

  // Para admin/tenant: obtener nombre de la empresa del perfil
  const getCompanyNameFromProfile = () => {
    // El nombre podría venir del theme o necesitamos cargarlo
    // Por ahora mostraremos el ID o "Tu empresa"
    return profile?.company_name || "Tu empresa asignada";
  };

  // Si es admin o tenant, mostrar campo readonly
  if (!isSuperadmin) {
    return (
      <div style={{ ...styles.container, ...style }}>
        {showLabel && (
          <label style={styles.label}>
            {label}
            {required && <span style={styles.required}> *</span>}
          </label>
        )}
        <div style={styles.readonlyField}>
          <span style={styles.companyIcon}>🏢</span>
          <span style={styles.companyName}>{getCompanyNameFromProfile()}</span>
          <span style={styles.autoAssigned}>(asignada automáticamente)</span>
        </div>
      </div>
    );
  }

  // Para superadmin: mostrar dropdown
  return (
    <div style={{ ...styles.container, ...style }}>
      {showLabel && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}> *</span>}
        </label>
      )}

      {loading ? (
        <div style={styles.loading}>Cargando empresas...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <select
          value={value || ""}
          onChange={(e) => onChange && onChange(e.target.value)}
          required={required}
          disabled={disabled}
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

      {companies.length === 0 && !loading && !error && (
        <div style={styles.hint}>
          No hay empresas activas disponibles
        </div>
      )}
    </div>
  );
}

// Hook para usar en formularios que necesitan company_id
export function useCompanyId() {
  const { profile } = useAuth();
  const role = profile?.role;
  const userCompanyId = profile?.company_id;

  // Si NO es superadmin, devolver automáticamente su company_id
  if (role !== "superadmin") {
    return {
      companyId: userCompanyId,
      isSuperadmin: false,
      isReady: !!userCompanyId,
    };
  }

  // Si es superadmin, necesita seleccionar
  return {
    companyId: null,
    isSuperadmin: true,
    isReady: true,
  };
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  required: {
    color: "#EF4444",
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

  readonlyField: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
  },

  companyIcon: {
    fontSize: 18,
  },

  companyName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  autoAssigned: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },

  loading: {
    padding: "12px 16px",
    fontSize: 14,
    color: "#6B7280",
    backgroundColor: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
  },

  error: {
    padding: "12px 16px",
    fontSize: 14,
    color: "#DC2626",
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
  },

  hint: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },
};
