// src/pages/v2/admin/gestion-servicios/ServicioDetail.jsx
// Ruta: /v2/admin/gestion-servicios/:id
// ?tab=suscripcion → condiciones del contrato + cancelar
// ?tab=configuracion → gestión técnica del servicio (SAL, etc.)

import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button, Card, Col, Popconfirm, Row,
  Skeleton, Space, Tag, Typography, message,
} from "antd";
import {
  ArrowLeftOutlined, SettingOutlined,
  ToolOutlined, WarningOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listClientSaasSubscriptions } from "../../../../services/saasServices.service";
import SalGestion from "../services/smart-access/SalGestion";

const { Title, Text } = Typography;

const SUB_STATUS_TAG = {
  active:    { label: "Activo",     color: "success" },
  suspended: { label: "Suspendido", color: "warning" },
  cancelled: { label: "Cancelado",  color: "error" },
  trial:     { label: "Trial",      color: "processing" },
  pending:   { label: "Pendiente",  color: "default" },
};

function fmtPrice(v)  { return v != null ? `${Number(v).toFixed(2)} €` : "—"; }
function fmtPeriod(v) { return v === "monthly" ? "Mensual" : v === "annually" ? "Anual" : "—"; }
function fmtDate(v)   { return v ? new Date(v).toLocaleDateString("es-ES") : "—"; }

const SERVICE_COMPONENTS = {
  smart_access_lock: () => <SalGestion />,
  sal:               () => <SalGestion />,
  smart_access:      () => <SalGestion />,
  smartaccesslock:   () => <SalGestion />,
};

function getServiceComponent(code) {
  const key = (code ?? "").toLowerCase().replace(/-/g, "_");
  const factory = SERVICE_COMPONENTS[key];
  return factory ? factory() : null;
}

const cardTitleStyle = (color = "#0071E3") => ({
  fontSize: 12, fontWeight: 700, color: "#374151",
  letterSpacing: "0.06em", textTransform: "uppercase",
  borderLeft: `3px solid ${color}`, paddingLeft: 8,
});

export default function ServicioDetail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [sub, setSub]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const activeTab = searchParams.get("tab") || "suscripcion";
  const switchTab = (tab) => setSearchParams({ tab }, { replace: true });

  useEffect(() => {
    if (!clientAccountId) return;
    listClientSaasSubscriptions(clientAccountId)
      .then((list) => {
        const found = list.find((s) => s.id === id);
        if (!found) setError("Suscripción no encontrada.");
        else setSub(found);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, clientAccountId]);

  const svc       = sub?.saas_services ?? {};
  const plan      = sub?.saas_service_plans ?? {};
  const statusCfg = SUB_STATUS_TAG[sub?.status] ?? SUB_STATUS_TAG.pending;
  const mgmtComponent = getServiceComponent(svc.code);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      // TODO: llamar al endpoint de cancelación cuando esté disponible
      message.success("Cancelación solicitada. El equipo procesará la baja.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/v2/admin/gestion-servicios")}
            style={{ paddingLeft: 0, color: "#6B7280", marginBottom: 10, fontSize: 14 }}
          >
            Gestión de Servicios
          </Button>

          {loading ? (
            <Skeleton active title={{ width: 260 }} paragraph={{ rows: 1 }} />
          ) : error ? (
            <Text type="danger">{error}</Text>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F" }}>
                <ToolOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />{svc.name ?? "Servicio"}
              </Title>
              <Tag color={statusCfg.color} style={{ fontSize: 13, padding: "2px 10px", borderRadius: 20 }}>
                {statusCfg.label}
              </Tag>
            </div>
          )}

          {!loading && svc.description && (
            <Text style={{ fontSize: 14, color: "#6B7280", display: "block", marginTop: 4 }}>
              {svc.description}
            </Text>
          )}
        </div>


        {/* ── Tab: Suscripción ─────────────────────────────────────────── */}
        {!loading && !error && activeTab === "suscripcion" && (
          <Row gutter={[20, 20]}>
            {/* Detalles del contrato */}
            <Col xs={24} md={16}>
              <Card
                title={<span style={cardTitleStyle("#0071E3")}>Detalles del contrato</span>}
                style={{ borderRadius: 12 }}
              >
                <Row gutter={[24, 20]}>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</Text>
                    <Text style={{ fontSize: 15, fontWeight: 700, color: "#1A2438" }}>{plan.name ?? "—"}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Importe</Text>
                    <Text style={{ fontSize: 15, fontWeight: 700, color: "#1A2438" }}>{fmtPrice(plan.price_amount ?? svc.price_amount)}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Período</Text>
                    <Text style={{ fontSize: 15, fontWeight: 700, color: "#2563EB" }}>{fmtPeriod(plan.billing_period ?? svc.billing_period)}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado</Text>
                    <Tag color={statusCfg.color} style={{ fontSize: 12, borderRadius: 20, padding: "1px 10px", marginTop: 4 }}>
                      {statusCfg.label}
                    </Tag>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Inicio</Text>
                    <Text style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{fmtDate(sub.start_date ?? sub.activated_at)}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fin contrato</Text>
                    <Text style={{ fontSize: 14, fontWeight: 600, color: sub?.end_date ? "#374151" : "#D1D5DB" }}>{fmtDate(sub?.end_date)}</Text>
                  </Col>
                </Row>
                {svc.description && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F3F4F6" }}>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descripción del servicio</Text>
                    <Text style={{ fontSize: 14, color: "#374151" }}>{svc.description}</Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* Acciones */}
            <Col xs={24} md={8}>
              <Card
                title={<span style={cardTitleStyle("#6B7280")}>Acciones</span>}
                style={{ borderRadius: 12 }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    icon={<SettingOutlined />}
                    block
                    onClick={() => switchTab("configuracion")}
                    style={{ borderRadius: 8 }}
                  >
                    Ir a Configuración
                  </Button>
                  <Popconfirm
                    title="¿Cancelar servicio?"
                    description="Esta acción dará de baja la suscripción y no se puede deshacer."
                    okText="Sí, cancelar"
                    cancelText="Volver"
                    okButtonProps={{ danger: true, loading: cancelling }}
                    onConfirm={handleCancel}
                    icon={<WarningOutlined style={{ color: "#EF4444" }} />}
                  >
                    <Button
                      danger block
                      icon={<WarningOutlined />}
                      loading={cancelling}
                      style={{ borderRadius: 8 }}
                    >
                      Cancelar servicio
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* ── Tab: Configuración ───────────────────────────────────────── */}
        {!loading && !error && activeTab === "configuracion" && (
          mgmtComponent ?? (
            <div style={{
              background: "#FAFAFA", border: "1px dashed #D1D5DB",
              borderRadius: 14, padding: "60px 0", textAlign: "center",
            }}>
              <Text style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>
                Configuración no disponible
              </Text>
              <Text type="secondary">
                La página de configuración de este servicio estará disponible próximamente.
              </Text>
            </div>
          )
        )}

      </div>
    </V2Layout>
  );
}
