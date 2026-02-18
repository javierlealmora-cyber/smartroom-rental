import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../providers/AuthProvider";
import { getPortalHomeForRole } from "../../constants/roles";
import PublicHeader from "../../components/public/PublicHeader";
import PublicFooter from "../../components/public/PublicFooter";

export default function PlanesPage() {
  const { isAuthenticated, hasTenant, tenantState, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [flashMessage, setFlashMessage] = useState(null);

  // Read flash message from navigation state (e.g. from RequireTenant redirect)
  useEffect(() => {
    if (location.state?.message) {
      setFlashMessage(location.state.message);
      // Clean up so message doesn't persist on browser back/forward
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans_catalog")
        .select("*")
        .order("monthly_price", { ascending: true });

      if (!error && data) setPlans(data);
      setLoading(false);
    };
    load();
  }, []);

  // Tenant-aware "Contratar" click
  const isBlocked = isAuthenticated && hasTenant && role !== "superadmin";

  const handleContract = (plan) => {
    if (isBlocked) return; // Safety: button should be disabled

    const params = `plan=${plan.code}&billing=${billing}`;
    if (isAuthenticated) {
      navigate(`/v2/wizard/contratar?${params}`);
    } else {
      navigate(`/v2/registro?${params}`);
    }
  };

  const getPrice = (plan) => {
    if (billing === "annual") {
      return { amount: plan.annual_price, label: "/ano" };
    }
    return { amount: plan.monthly_price, label: "/mes" };
  };

  const formatPrice = (num) => {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div style={styles.page}>
      <PublicHeader />

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Planes y precios</h1>
        <p style={styles.heroSub}>
          Elige el plan que mejor se adapte a tu negocio. Todos incluyen acceso completo a la plataforma.
        </p>

        {/* Toggle billing */}
        <div style={styles.toggle}>
          <button
            onClick={() => setBilling("monthly")}
            style={billing === "monthly" ? styles.toggleActive : styles.toggleInactive}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling("annual")}
            style={billing === "annual" ? styles.toggleActive : styles.toggleInactive}
          >
            Anual
          </button>
        </div>
      </section>

      {/* Banners condicionales */}
      <div style={styles.bannersContainer}>
        {/* Flash message from redirects */}
        {flashMessage && (
          <div style={styles.flashBanner}>
            <span>{flashMessage}</span>
            <button
              onClick={() => setFlashMessage(null)}
              style={styles.flashClose}
              aria-label="Cerrar"
            >
              &times;
            </button>
          </div>
        )}

        {/* Payment pending banner */}
        {isAuthenticated && tenantState === "payment_pending" && (
          <div style={styles.pendingBanner}>
            <span>Tienes un pago pendiente. Completa el proceso para activar tu cuenta.</span>
            <button
              onClick={() => navigate("/v2/wizard/contratar")}
              style={styles.pendingButton}
            >
              Reintentar pago
            </button>
          </div>
        )}

        {/* Already active banner */}
        {isBlocked && (
          <div style={styles.activeBanner}>
            <span>Ya tienes un plan activo. En la version actual no puedes contratar otro plan.</span>
            <button
              onClick={() => navigate(getPortalHomeForRole(role))}
              style={styles.dashboardButton}
            >
              Ir a Dashboard
            </button>
          </div>
        )}
      </div>

      <section style={styles.section}>
        <div style={styles.container}>
          {loading ? (
            <div className="planes-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={styles.skeleton}>
                  <div style={{ ...styles.skeletonBar, width: "60%", height: 24 }} />
                  <div style={{ ...styles.skeletonBar, width: "40%", height: 40, marginTop: 16 }} />
                  <div style={{ ...styles.skeletonBar, width: "80%", height: 14, marginTop: 24 }} />
                  <div style={{ ...styles.skeletonBar, width: "70%", height: 14, marginTop: 8 }} />
                  <div style={{ ...styles.skeletonBar, width: "75%", height: 14, marginTop: 8 }} />
                  <div style={{ ...styles.skeletonBar, width: "100%", height: 44, marginTop: 24, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No hay planes disponibles en este momento.</p>
              <p style={styles.emptyHint}>Contacta con nosotros para mas informacion.</p>
            </div>
          ) : (
            <div className="planes-grid">
              {plans.map((plan) => {
                const price = getPrice(plan);
                const featuresList = Array.isArray(plan.features) ? plan.features : [];
                const isFeatured = plan.is_featured;

                return (
                  <div
                    key={plan.id}
                    style={{
                      ...styles.card,
                      ...(isFeatured ? styles.cardFeatured : {}),
                    }}
                  >
                    {isFeatured && (
                      <span style={styles.badge}>MEJOR CALIDAD-PRECIO</span>
                    )}

                    <h3 style={styles.planName}>{plan.name}</h3>
                    <p style={styles.planDesc}>{plan.description}</p>

                    <div style={styles.priceBlock}>
                      <span style={styles.priceAmount}>{formatPrice(price.amount)}&euro;</span>
                      <span style={styles.priceUnit}>{price.label}</span>
                    </div>

                    {billing === "annual" && plan.annual_discount_months > 0 && (
                      <span style={styles.saveBadge}>
                        Ahorra {plan.annual_discount_months} meses
                      </span>
                    )}

                    <p style={styles.taxNote}>IVA no incluido ({plan.tax_percent}%)</p>

                    {/* Limits */}
                    <div style={styles.limits}>
                      <span style={styles.limitItem}>
                        {plan.max_accommodations === -1 ? "Ilimitados" : `Hasta ${plan.max_accommodations}`} alojamientos
                      </span>
                      <span style={styles.limitItem}>
                        {plan.max_rooms === -1 ? "Ilimitadas" : `Hasta ${plan.max_rooms}`} habitaciones
                      </span>
                      <span style={styles.limitItem}>
                        {plan.max_admin_users} usuario{plan.max_admin_users !== 1 ? "s" : ""} admin
                      </span>
                    </div>

                    {/* Features */}
                    {featuresList.length > 0 && (
                      <ul style={styles.featureList}>
                        {featuresList.map((f, i) => (
                          <li key={i} style={styles.featureItem}>
                            <span style={styles.checkIcon}>&#10003;</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={() => handleContract(plan)}
                      disabled={isBlocked}
                      style={{
                        ...(isFeatured ? styles.ctaPrimary : styles.ctaDefault),
                        ...(isBlocked ? { opacity: 0.5, cursor: "not-allowed" } : {}),
                      }}
                    >
                      {isBlocked ? "Plan activo" : `Contratar ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
      <style>{planesCss}</style>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#111827",
  },
  hero: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)",
    padding: "60px 24px 48px",
    textAlign: "center",
  },
  heroTitle: { fontSize: 36, fontWeight: 800, color: "#fff", margin: "0 0 12px" },
  heroSub: { fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "0 0 32px", maxWidth: 600, marginLeft: "auto", marginRight: "auto" },

  toggle: {
    display: "inline-flex", background: "rgba(255,255,255,0.15)",
    borderRadius: 10, padding: 4, gap: 4,
  },
  toggleActive: {
    padding: "10px 24px", borderRadius: 8, border: "none",
    background: "#fff", color: "#2563eb", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  toggleInactive: {
    padding: "10px 24px", borderRadius: 8, border: "none",
    background: "transparent", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 500, cursor: "pointer",
  },

  // Banners
  bannersContainer: { maxWidth: 1200, margin: "0 auto", padding: "0 24px" },
  flashBanner: {
    padding: "12px 20px", marginTop: 16,
    background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    color: "#1E40AF", fontSize: 14,
  },
  flashClose: {
    background: "none", border: "none", fontSize: 20, cursor: "pointer",
    color: "#1E40AF", padding: "0 8px",
  },
  pendingBanner: {
    padding: "12px 20px", marginTop: 16,
    background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    color: "#92400E", fontSize: 14, gap: 16, flexWrap: "wrap",
  },
  pendingButton: {
    padding: "8px 16px", background: "#F59E0B", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  activeBanner: {
    padding: "12px 20px", marginTop: 16,
    background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    color: "#166534", fontSize: 14, gap: 16, flexWrap: "wrap",
  },
  dashboardButton: {
    padding: "8px 16px", background: "#16A34A", color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap",
  },

  section: { padding: "60px 24px 80px" },
  container: { maxWidth: 1200, margin: "0 auto" },

  // Skeleton
  skeleton: {
    background: "#fff", borderRadius: 16, padding: 32,
    border: "1px solid #e5e7eb",
  },
  skeletonBar: {
    background: "#f3f4f6", borderRadius: 6, animation: "pulse 1.5s infinite",
  },

  // Empty
  empty: { textAlign: "center", padding: "60px 0" },
  emptyText: { fontSize: 18, fontWeight: 600, color: "#6b7280" },
  emptyHint: { fontSize: 14, color: "#9ca3af", marginTop: 8 },

  // Card
  card: {
    background: "#fff", borderRadius: 16, padding: 32,
    border: "1px solid #e5e7eb",
    display: "flex", flexDirection: "column", position: "relative",
  },
  cardFeatured: {
    border: "2px solid #2563eb",
    boxShadow: "0 4px 24px rgba(37,99,235,0.12)",
  },
  badge: {
    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
    letterSpacing: 0.5, whiteSpace: "nowrap",
  },
  planName: { fontSize: 22, fontWeight: 700, margin: "8px 0 4px" },
  planDesc: { fontSize: 14, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.4 },

  priceBlock: { margin: "0 0 4px" },
  priceAmount: { fontSize: 40, fontWeight: 800, color: "#2563eb" },
  priceUnit: { fontSize: 16, color: "#6b7280", marginLeft: 4 },
  saveBadge: {
    display: "inline-block", background: "#ecfdf5", color: "#059669",
    fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, marginBottom: 4,
  },
  taxNote: { fontSize: 12, color: "#9ca3af", margin: "4px 0 16px" },

  limits: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  limitItem: { fontSize: 13, color: "#4b5563", fontWeight: 500 },

  featureList: { listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 },
  featureItem: { fontSize: 14, color: "#374151", padding: "5px 0", display: "flex", alignItems: "center", gap: 8 },
  checkIcon: { color: "#2563eb", fontWeight: 700, fontSize: 14 },

  ctaPrimary: {
    width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: "auto",
  },
  ctaDefault: {
    width: "100%", padding: "14px 0", borderRadius: 10,
    border: "1px solid #d1d5db", background: "#fff", color: "#374151",
    fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: "auto",
  },
};

const planesCss = `
  .planes-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @media (max-width: 1024px) { .planes-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .planes-grid { grid-template-columns: 1fr; } }
`;
