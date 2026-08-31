// src/pages/v2/admin/catalogo/ServiceCatalogDetail.jsx
// Ruta: /v2/admin/catalogo/:serviceId

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Row, Skeleton, Space, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, CheckCircleOutlined, ShoppingOutlined,
  SettingOutlined, FileTextOutlined, AppstoreAddOutlined, CheckOutlined,
  AppstoreOutlined, UnorderedListOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import {
  getSaasService, listPlans, listFeatures, listClientSaasSubscriptions,
} from "../../../../services/saasServices.service";

const { Title, Text } = Typography;

const VIEW_MODE_KEY = "smartrent_catalog_detail_plans_viewMode";

const SVC_STATUS = {
  active:     { label: "Activo",    color: "success" },
  draft:      { label: "Borrador",  color: "default" },
  deprecated: { label: "En desuso", color: "warning" },
  disabled:   { label: "Inactivo",  color: "error"   },
};

function fmtPeriod(v) {
  return v === "monthly" ? "mes" : v === "annually" ? "año" : "";
}

function fmtPeriodLabel(v) {
  return v === "monthly" ? "Mensual" : v === "annually" ? "Anual" : "—";
}

function featLabel(feat) {
  return feat.config?._name || feat.feature_code;
}

// ── Vista tarjeta comercial ───────────────────────────────────────────────────
function PlanCard({ plan, features, subscription, isDeprecated, isHighlight, serviceId }) {
  const isCurrentPlan = subscription?.saas_service_plan_id === plan.id
    || subscription?.saas_service_plans?.id === plan.id;
  const price  = plan.price_amount != null ? Number(plan.price_amount) : null;
  const period = fmtPeriod(plan.billing_period);

  const borderColor = isCurrentPlan ? "#F97316" : isHighlight ? "#2563EB" : "#E5E7EB";
  const bgColor     = isCurrentPlan ? "#FFFBF5" : isHighlight ? "#EFF6FF" : "#fff";
  const headerBg    = isCurrentPlan
    ? "linear-gradient(135deg, #EA580C 0%, #F97316 100%)"
    : isHighlight
    ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
    : "linear-gradient(135deg, #374151 0%, #6B7280 100%)";

  return (
    <div style={{
      position: "relative", width: "100%", borderRadius: 16,
      border: `2px solid ${borderColor}`, background: bgColor,
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: isHighlight || isCurrentPlan
        ? "0 8px 32px rgba(37,99,235,0.15)"
        : "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      {(isHighlight || isCurrentPlan) && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: isCurrentPlan ? "#EA580C" : "#2563EB",
          color: "#fff", fontSize: 10, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "4px 16px", borderRadius: "0 0 10px 10px", zIndex: 1,
        }}>
          {isCurrentPlan ? "Plan contratado" : "Más popular"}
        </div>
      )}

      <div style={{ background: headerBg, padding: (isHighlight || isCurrentPlan) ? "32px 24px 20px" : "20px 24px", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{plan.name}</div>
        {plan.description && (
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>{plan.description}</div>
        )}
      </div>

      <div style={{ padding: "20px 24px 4px", borderBottom: "1px solid #F3F4F6" }}>
        {price != null ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: "#1A2438", lineHeight: 1 }}>
                {price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1A2438", paddingBottom: 4 }}>€</span>
              {period && <span style={{ fontSize: 15, color: "#6B7280", paddingBottom: 6 }}>/{period}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2, marginBottom: 12 }}>
              IVA no incluido (21%)
            </div>
          </>
        ) : (
          <div style={{ fontSize: 22, fontWeight: 700, color: "#6B7280", paddingBottom: 12 }}>Precio a consultar</div>
        )}
      </div>

      <div style={{ padding: "16px 24px", flex: 1 }}>
        {features.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {features.map((feat) => (
              <li key={feat.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <CheckOutlined style={{ color: "#16A34A", fontSize: 13, marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.4 }}>{featLabel(feat)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>Sin características definidas</Text>
        )}
      </div>

      <div style={{ padding: "16px 24px 24px" }}>
        <PlanAction plan={plan} subscription={subscription} isCurrentPlan={isCurrentPlan} isDeprecated={isDeprecated} isHighlight={isHighlight} serviceId={serviceId} block />
      </div>
    </div>
  );
}

// ── Vista lista ───────────────────────────────────────────────────────────────
function PlanRow({ plan, features, subscription, isDeprecated, serviceId }) {
  const isCurrentPlan = subscription?.saas_service_plan_id === plan.id
    || subscription?.saas_service_plans?.id === plan.id;
  const price = plan.price_amount != null ? Number(plan.price_amount) : null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "16px 20px", borderRadius: 12,
      border: isCurrentPlan ? "2px solid #F97316" : "1px solid #E5E7EB",
      background: isCurrentPlan ? "#FFFBF5" : "#fff",
      marginBottom: 12,
    }}>
      {/* Nombre + descripción */}
      <div style={{ flex: "0 0 220px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1A2438" }}>{plan.name}</div>
        {plan.description && (
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{plan.description}</div>
        )}
      </div>

      {/* Período */}
      <div style={{ flex: "0 0 90px" }}>
        <Text style={{ fontSize: 12, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Período</Text>
        <Text style={{ fontSize: 13, fontWeight: 600, color: "#2563EB" }}>{fmtPeriodLabel(plan.billing_period)}</Text>
      </div>

      {/* Precio */}
      <div style={{ flex: "0 0 100px" }}>
        <Text style={{ fontSize: 12, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Precio</Text>
        <Text style={{ fontSize: 16, fontWeight: 800, color: "#1A2438" }}>
          {price != null ? `${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)} €` : "—"}
        </Text>
      </div>

      {/* Features */}
      <div style={{ flex: 1 }}>
        {features.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {features.map((feat) => (
              <span key={feat.id} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "#F0FDF4", color: "#15803D", fontSize: 12,
                padding: "2px 10px", borderRadius: 20, fontWeight: 500,
              }}>
                <CheckOutlined style={{ fontSize: 10 }} />{featLabel(feat)}
              </span>
            ))}
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Sin características</Text>
        )}
      </div>

      {/* Badges */}
      <div style={{ flex: "0 0 110px", display: "flex", justifyContent: "center" }}>
        {isCurrentPlan && (
          <span style={{ background: "#FFEDD5", color: "#C2410C", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 12px" }}>
            Contratado
          </span>
        )}
      </div>

      {/* Acción */}
      <div style={{ flex: "0 0 180px" }}>
        <PlanAction plan={plan} subscription={subscription} isCurrentPlan={isCurrentPlan} isDeprecated={isDeprecated} isHighlight={false} serviceId={serviceId} block={false} />
      </div>
    </div>
  );
}

// ── Botón de acción compartido ────────────────────────────────────────────────
function PlanAction({ plan, subscription, isCurrentPlan, isDeprecated, isHighlight, block, serviceId }) {
  const navigate = useNavigate();
  if (isCurrentPlan) {
    return (
      <Button block={block} disabled size="large" style={{ borderRadius: 10, height: 48, fontSize: 15, fontWeight: 700 }}>
        Plan actual
      </Button>
    );
  }
  if (subscription) {
    return (
      <Button block={block} size="large"
        onClick={() => navigate(`/v2/admin/catalogo/${serviceId}/checkout/${plan.id}`)}
        style={{ borderRadius: 10, height: 48, fontSize: 15, fontWeight: 700, borderColor: "#2563EB", color: "#2563EB" }}>
        Cambiar a este plan
      </Button>
    );
  }
  if (isDeprecated) {
    return (
      <Tooltip title="Servicio en desuso, no disponible para contratar">
        <Button block={block} disabled size="large" style={{ borderRadius: 10, height: 48, fontSize: 15 }}>
          No disponible
        </Button>
      </Tooltip>
    );
  }
  return (
    <Button
      block={block} type="primary" size="large"
      icon={<ShoppingOutlined />}
      onClick={() => navigate(`/v2/admin/catalogo/${serviceId}/checkout/${plan.id}`)}
      style={{
        borderRadius: 10, height: 48, fontSize: 15, fontWeight: 700,
        background: isHighlight
          ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
          : "#1A2438",
        borderColor: "transparent",
        boxShadow: isHighlight ? "0 4px 16px rgba(37,99,235,0.4)" : "none",
      }}
    >
      Contratar {plan.name}
    </Button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ServiceCatalogDetail() {
  const { serviceId } = useParams();
  const navigate      = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [service,      setService]      = useState(null);
  const [plans,        setPlans]        = useState([]);
  const [featMap,      setFeatMap]      = useState({});
  const [subscription, setSubscription] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [viewMode,     setViewMode]     = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "cards"
  );

  const changeViewMode = (m) => { setViewMode(m); localStorage.setItem(VIEW_MODE_KEY, m); };

  useEffect(() => {
    if (!clientAccountId) return;
    Promise.all([
      getSaasService(serviceId),
      listPlans(serviceId),
      listClientSaasSubscriptions(clientAccountId),
    ])
      .then(async ([svc, plns, subs]) => {
        setService(svc);
        setPlans(plns);
        const sub = subs.find(
          (s) => s.saas_services?.id === serviceId || s.saas_service_id === serviceId
        );
        setSubscription(sub ?? null);
        const entries = await Promise.all(
          plns.map((p) => listFeatures(p.id).then((feats) => [p.id, feats]))
        );
        setFeatMap(Object.fromEntries(entries));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [serviceId, clientAccountId]);

  const isDeprecated = service?.status === "deprecated";
  const statusCfg    = SVC_STATUS[service?.status] ?? SVC_STATUS.draft;
  const highlightIdx = plans.length > 1 ? Math.floor((plans.length - 1) / 2) : 0;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <Button
          type="text" icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/v2/admin/catalogo")}
          style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}
        >
          Catálogo de Servicios
        </Button>

        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        {!loading && error && <Alert type="error" message={error} showIcon />}

        {!loading && !error && service && (
          <>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F" }}>
                  <AppstoreAddOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />{service.name}
                </Title>
                <Tag color={statusCfg.color} style={{ fontSize: 13, padding: "2px 10px", borderRadius: 20 }}>
                  {statusCfg.label}
                </Tag>
                {subscription && (
                  <Tag style={{ fontSize: 13, padding: "2px 10px", borderRadius: 20, fontWeight: 700, background: "#FFEDD5", color: "#C2410C", border: "1px solid #F97316" }}>
                    Suscrito
                  </Tag>
                )}
              </div>
              {service.description && (
                <Text style={{ fontSize: 15, color: "#6B7280" }}>{service.description}</Text>
              )}
            </div>

            {/* ── Banner suscripción activa ────────────────────────────────── */}
            {subscription && (
              <Card style={{ marginBottom: 36, borderRadius: 14, background: "#FFF7ED", border: "1px solid #FDBA74" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <CheckCircleOutlined style={{ fontSize: 22, color: "#EA580C" }} />
                    <div>
                      <Text style={{ fontWeight: 700, color: "#C2410C", fontSize: 15 }}>Servicio contratado</Text>
                      <Text style={{ display: "block", fontSize: 12, color: "#9A3412", marginTop: 2 }}>
                        Plan: <strong>{subscription.saas_service_plans?.name ?? "—"}</strong>
                        {" · "}
                        {subscription.saas_service_plans?.price_amount != null
                          ? `${Number(subscription.saas_service_plans.price_amount).toFixed(2)} € / ${fmtPeriodLabel(subscription.saas_service_plans.billing_period)}`
                          : ""}
                        {" · Inicio: "}
                        {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString("es-ES") : "—"}
                      </Text>
                    </div>
                  </div>
                  <Space>
                    <Button icon={<FileTextOutlined />} style={{ borderRadius: 8 }}
                      onClick={() => navigate(`/v2/admin/gestion-servicios/${subscription.id}?tab=suscripcion`)}>
                      Ver suscripción
                    </Button>
                    <Button type="primary" icon={<SettingOutlined />} style={{ background: "#2563EB", borderColor: "#2563EB", borderRadius: 8 }}
                      onClick={() => navigate(`/v2/admin/gestion-servicios/${subscription.id}?tab=configuracion`)}>
                      Configurar
                    </Button>
                  </Space>
                </div>
              </Card>
            )}

            {/* ── Planes: cabecera con toggle ──────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.06em", textTransform: "uppercase", borderLeft: "3px solid #0071E3", paddingLeft: 8 }}>
                Planes disponibles
              </span>
              <Space size={4}>
                <Button
                  size="small" icon={<AppstoreOutlined />}
                  type={viewMode === "cards" ? "primary" : "default"}
                  style={viewMode === "cards" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                  onClick={() => changeViewMode("cards")}
                />
                <Button
                  size="small" icon={<UnorderedListOutlined />}
                  type={viewMode === "list" ? "primary" : "default"}
                  style={viewMode === "list" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                  onClick={() => changeViewMode("list")}
                />
              </Space>
            </div>

            {/* ── Planes: contenido ───────────────────────────────────────── */}
            {plans.length === 0 ? (
              <Card style={{ borderRadius: 12, textAlign: "center", padding: "48px 0", border: "1px dashed #E5E7EB" }}>
                <Text type="secondary">Este servicio no tiene planes configurados todavía</Text>
              </Card>
            ) : viewMode === "cards" ? (
              <Row gutter={[24, 24]} justify="center">
                {plans.map((plan, idx) => (
                  <Col key={plan.id} xs={24} sm={12} lg={8} style={{ display: "flex" }}>
                    <PlanCard
                      plan={plan}
                      features={featMap[plan.id] ?? []}
                      subscription={subscription}
                      isDeprecated={isDeprecated}
                      isHighlight={idx === highlightIdx && plans.length > 1}
                      serviceId={serviceId}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div>
                {plans.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    features={featMap[plan.id] ?? []}
                    subscription={subscription}
                    isDeprecated={isDeprecated}
                    serviceId={serviceId}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </V2Layout>
  );
}
