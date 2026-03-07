// src/pages/clientes/planes/PlanDetail.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../../components/Sidebar";
import {
  getPlanById,
  getPlanServices,
  calculateAnnualPrice,
  calculatePriceWithVAT,
  planStatuses,
} from "../../../mocks/plans.mock";

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

export default function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const found = getPlanById(id);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlan(found);
    } else {
      navigate("/clientes/planes");
    }
  }, [id, navigate]);

  if (!plan) {
    return (
      <div style={styles.pageContainer}>
        <Sidebar items={sidebarItems} title="CLIENTES" />
        <div style={styles.loading}>
          <p>Cargando plan...</p>
        </div>
      </div>
    );
  }

  const statusConfig = planStatuses.find((s) => s.key === plan.status) || planStatuses[0];
  const bgColors = {
    draft: "#F3F4F6",
    active: "#DEF7EC",
    archived: "#FDE8E8",
  };
  const textColors = {
    draft: "#374151",
    active: "#03543F",
    archived: "#9B1C1C",
  };

  const getAnnualPrice = () => {
    if (plan.pricing.annual_price != null) {
      return plan.pricing.annual_price;
    }
    return calculateAnnualPrice(plan.pricing.monthly_price);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: plan.pricing.currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  const services = getPlanServices(plan);

  return (
    <div style={styles.pageContainer}>
      <Sidebar items={sidebarItems} title="CLIENTES" />
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate("/clientes/planes")}>
            ← Volver al listado
        </button>
        <div style={styles.headerRow}>
          <div style={styles.headerInfo}>
            <h1 style={styles.title}>{plan.name}</h1>
            <div style={styles.badges}>
              <span
                style={{
                  backgroundColor: bgColors[plan.status],
                  color: textColors[plan.status],
                  padding: "6px 14px",
                  borderRadius: 16,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {statusConfig.label}
              </span>
              <code style={styles.codeChip}>{plan.code}</code>
            </div>
          </div>
          <button
            style={styles.editBtn}
            onClick={() => navigate(`/clientes/planes/${id}/edit`)}
          >
            Editar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={styles.content}>
        {/* Descripción */}
        {plan.description && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Descripción</h2>
            <p style={styles.description}>{plan.description}</p>
          </div>
        )}

        {/* Vigencia */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Vigencia</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Válido desde</span>
              <span style={styles.infoValue}>
                {plan.valid_from || "Sin fecha de inicio"}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Válido hasta</span>
              <span style={styles.infoValue}>
                {plan.valid_to || "Indefinido (∞)"}
              </span>
            </div>
          </div>
        </div>

        {/* Límites */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Límites y Restricciones</h2>
          <div style={styles.limitsGrid}>
            <div style={styles.limitCard}>
              <div style={styles.limitValue}>
                {plan.limits.unlimited_properties ? "∞" : plan.limits.max_properties}
              </div>
              <div style={styles.limitLabel}>Residencias máx.</div>
            </div>
            <div style={styles.limitCard}>
              <div style={styles.limitValue}>{plan.limits.max_admin_users}</div>
              <div style={styles.limitLabel}>Usuarios Admin</div>
            </div>
            <div style={styles.limitCard}>
              <div style={styles.limitValue}>{plan.limits.max_api_users}</div>
              <div style={styles.limitLabel}>Usuarios API</div>
            </div>
            <div style={styles.limitCard}>
              <div style={styles.limitValue}>
                {plan.limits.custom_theme_allowed ? "✓" : "✗"}
              </div>
              <div style={styles.limitLabel}>Tema personalizado</div>
            </div>
          </div>
        </div>

        {/* Servicios */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Servicios Incluidos</h2>
          {services.length === 0 ? (
            <p style={styles.noServices}>No hay servicios incluidos en este plan.</p>
          ) : (
            <div style={styles.servicesGrid}>
              {services.map((service) => {
                const isArchived = service.status === "archived";
                return (
                  <div
                    key={service.key}
                    style={{
                      ...styles.serviceChip,
                      backgroundColor: isArchived ? "#F3F4F6" : "#E0E7FF",
                      color: isArchived ? "#9CA3AF" : "#3730A3",
                    }}
                  >
                    <span style={styles.serviceName}>{service.label}</span>
                    {isArchived && (
                      <span style={styles.archivedBadge}>(archivado)</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Precios</h2>
          <div style={styles.pricingGrid}>
            {/* Mensual */}
            <div style={styles.priceCard}>
              <div style={styles.priceHeader}>Mensual</div>
              <div style={styles.priceRow}>
                <span>Base (sin IVA)</span>
                <span style={styles.priceValue}>
                  {formatPrice(plan.pricing.monthly_price)}
                </span>
              </div>
              <div style={styles.priceRow}>
                <span>IVA ({plan.pricing.vat_rate}%)</span>
                <span>
                  {formatPrice(
                    plan.pricing.monthly_price * (plan.pricing.vat_rate / 100)
                  )}
                </span>
              </div>
              <div style={{ ...styles.priceRow, ...styles.priceTotal }}>
                <span>Total con IVA</span>
                <span style={styles.priceTotalValue}>
                  {formatPrice(
                    calculatePriceWithVAT(
                      plan.pricing.monthly_price,
                      plan.pricing.vat_rate
                    )
                  )}
                </span>
              </div>
            </div>

            {/* Anual */}
            <div style={styles.priceCard}>
              <div style={styles.priceHeader}>
                Anual
                {plan.pricing.annual_price == null && (
                  <span style={styles.autoLabel}>(2 meses gratis)</span>
                )}
              </div>
              <div style={styles.priceRow}>
                <span>Base (sin IVA)</span>
                <span style={styles.priceValue}>{formatPrice(getAnnualPrice())}</span>
              </div>
              <div style={styles.priceRow}>
                <span>IVA ({plan.pricing.vat_rate}%)</span>
                <span>
                  {formatPrice(getAnnualPrice() * (plan.pricing.vat_rate / 100))}
                </span>
              </div>
              <div style={{ ...styles.priceRow, ...styles.priceTotal }}>
                <span>Total con IVA</span>
                <span style={styles.priceTotalValue}>
                  {formatPrice(
                    calculatePriceWithVAT(getAnnualPrice(), plan.pricing.vat_rate)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auditoría */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Información de Auditoría</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ID interno</span>
              <code style={styles.codeValueSmall}>{plan.id}</code>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Fecha de creación</span>
              <span style={styles.infoValue}>
                {formatDate(plan.created_at)}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Última actualización</span>
              <span style={styles.infoValue}>
                {formatDate(plan.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Sección futura: Promociones */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            Promociones{" "}
            <span style={styles.futureTag}>(Futuro)</span>
          </h2>
          <p style={styles.placeholderText}>
            Aquí se gestionarán descuentos, cupones y códigos promocionales asociados a
            este plan.
          </p>
        </div>

        {/* Sección futura: Política de cambios */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            Política de Cambios de Plan{" "}
            <span style={styles.futureTag}>(Futuro)</span>
          </h2>
          <p style={styles.placeholderText}>
            Aquí se definirán las reglas para upgrades, downgrades y prorrateos cuando un
            cliente cambie de plan.
          </p>
        </div>
      </div>
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
    maxWidth: 900,
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
    marginBottom: 12,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  headerInfo: {},
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  badges: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  codeChip: {
    backgroundColor: "#F3F4F6",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "monospace",
    color: "#374151",
  },
  editBtn: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 16px 0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  description: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 1.6,
    margin: 0,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20,
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
  },
  codeValueSmall: {
    backgroundColor: "#F3F4F6",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
    color: "#6B7280",
    display: "inline-block",
  },
  limitsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  limitCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
  },
  limitValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  limitLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: 500,
  },
  servicesGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  },
  serviceName: {},
  archivedBadge: {
    fontSize: 11,
    fontWeight: 400,
  },
  noServices: {
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
    margin: 0,
  },
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  priceCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 20,
  },
  priceHeader: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  autoLabel: {
    fontSize: 11,
    color: "#059669",
    fontWeight: 500,
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#374151",
    padding: "8px 0",
  },
  priceValue: {
    fontWeight: 500,
  },
  priceTotal: {
    borderTop: "1px solid #E5E7EB",
    marginTop: 8,
    paddingTop: 12,
    fontWeight: 600,
    color: "#111827",
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  futureTag: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
  },
  placeholderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
    margin: 0,
  },
};
