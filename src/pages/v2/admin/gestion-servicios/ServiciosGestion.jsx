// src/pages/v2/admin/gestion-servicios/ServiciosGestion.jsx
// Admin — Gestión de Servicios (suscripciones contratadas)
// Ruta: /v2/admin/gestion-servicios

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Input, Row,
  Skeleton, Space, Table, Tooltip, Typography,
} from "antd";
import {
  SettingOutlined, AppstoreOutlined, UnorderedListOutlined,
  FileTextOutlined, ToolOutlined, CalendarOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listClientSaasSubscriptions } from "../../../../services/saasServices.service";

const { Title, Text } = Typography;
const { Search } = Input;

const VIEW_MODE_KEY = "smartrent_servicios_viewMode";

const SUB_STATUS = {
  active:    { label: "Activo",     bg: "#DCFCE7", tc: "#15803D" },
  suspended: { label: "Suspendido", bg: "#FEF3C7", tc: "#B45309" },
  cancelled: { label: "Cancelado",  bg: "#FEE2E2", tc: "#DC2626" },
  trial:     { label: "Trial",      bg: "#DBEAFE", tc: "#1D4ED8" },
  pending:   { label: "Pendiente",  bg: "#F3F4F6", tc: "#6B7280" },
};

function fmtPrice(v) {
  return v != null ? `${Number(v).toFixed(2)} €` : "—";
}
function fmtPeriod(v) {
  return v === "monthly" ? "Mensual" : v === "annually" ? "Anual" : "—";
}
function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString("es-ES") : "—";
}

// ── Card de suscripción ────────────────────────────────────────────────────────
function SubscripcionCard({ sub, onSuscripcion, onConfigurar }) {
  const svc    = sub.saas_services ?? {};
  const plan   = sub.saas_service_plans ?? {};
  const cfg    = SUB_STATUS[sub.status] ?? SUB_STATUS.pending;
  const importe = fmtPrice(plan.price_amount ?? svc.price_amount);
  const periodo = fmtPeriod(plan.billing_period ?? svc.billing_period);
  const inicio  = fmtDate(sub.start_date ?? sub.activated_at);
  const fin     = fmtDate(sub.end_date);

  return (
    <Card
      hoverable
      className="service-card"
      bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "none",
        width: "100%",
      }}
    >
      {/* Header azul gradiente */}
      <div style={{
        background: "linear-gradient(135deg, #1A3A6B 0%, #2563EB 100%)",
        padding: "16px 16px 20px",
        position: "relative",
      }}>
        {/* Badge estado */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <span style={{
            background: cfg.bg, color: cfg.tc,
            fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Icono */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 10,
        }}>
          <ToolOutlined style={{ fontSize: 20, color: "#fff" }} />
        </div>

        {/* Nombre */}
        <div style={{
          color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.3,
          paddingRight: 60, height: 40, overflow: "hidden",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {svc.name ?? "—"}
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Descripción */}
        <div style={{
          fontSize: 12, color: "#6B7280", marginBottom: 12, height: 34,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {svc.description || <span style={{ color: "#D1D5DB" }}>Sin descripción</span>}
        </div>

        {/* Importe + Período */}
        <Row gutter={8} style={{ marginBottom: 6 }}>
          <Col span={12}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Importe</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: "#1A2438" }}>{importe}</Text>
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Período</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{periodo}</Text>
          </Col>
        </Row>

        {/* Inicio + Fin */}
        <Row gutter={8} style={{ marginBottom: 14 }}>
          <Col span={12}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Inicio</Text>
            <Text style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{inicio}</Text>
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fin contrato</Text>
            <Text style={{ fontSize: 12, fontWeight: 600, color: sub.end_date ? "#374151" : "#D1D5DB" }}>{fin}</Text>
          </Col>
        </Row>

        {/* Plan */}
        <Text style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 14 }}>
          <span style={{ color: "#9CA3AF" }}>Plan: </span>{plan.name ?? "Sin plan asignado"}
        </Text>

        {/* Botones */}
        <Row gutter={8} style={{ marginTop: "auto" }}>
          <Col span={12}>
            <Button
              block
              icon={<FileTextOutlined />}
              onClick={(e) => { e.stopPropagation(); onSuscripcion(); }}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Suscripción
            </Button>
          </Col>
          <Col span={12}>
            <Button
              block
              type="primary"
              icon={<SettingOutlined />}
              onClick={(e) => { e.stopPropagation(); onConfigurar(); }}
              style={{ background: "#2563EB", borderColor: "#2563EB", borderRadius: 8, fontWeight: 600 }}
            >
              Configurar
            </Button>
          </Col>
        </Row>
      </div>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ServiciosGestion() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [allSubs, setAllSubs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "cards"
  );

  const changeViewMode = (m) => { setViewMode(m); localStorage.setItem(VIEW_MODE_KEY, m); };

  const load = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listClientSaasSubscriptions(clientAccountId);
      setAllSubs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = allSubs;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.saas_services?.name?.toLowerCase().includes(q) ||
        s.saas_services?.description?.toLowerCase().includes(q) ||
        s.saas_service_plans?.name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [allSubs, search]);

  const hasFilters = !!search;

  const goSuscripcion = (sub) => navigate(`/v2/admin/gestion-servicios/${sub.id}?tab=suscripcion`);
  const goConfigurar  = (sub) => navigate(`/v2/admin/gestion-servicios/${sub.id}?tab=configuracion`);

  // Columnas vista lista
  const columns = [
    {
      title: "Servicio",
      key: "servicio",
      render: (_, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => goSuscripcion(row)}>
          {row.saas_services?.name ?? "—"}
        </Button>
      ),
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v) => {
        const cfg = SUB_STATUS[v] ?? SUB_STATUS.pending;
        return (
          <span style={{ background: cfg.bg, color: cfg.tc, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => <Text type="secondary">{row.saas_service_plans?.name ?? "—"}</Text>,
    },
    {
      title: "Importe",
      key: "importe",
      width: 100,
      render: (_, row) => fmtPrice(row.saas_service_plans?.price_amount ?? row.saas_services?.price_amount),
    },
    {
      title: "Período",
      key: "periodo",
      width: 100,
      render: (_, row) => fmtPeriod(row.saas_service_plans?.billing_period ?? row.saas_services?.billing_period),
    },
    {
      title: "Inicio",
      key: "inicio",
      width: 110,
      render: (_, row) => fmtDate(row.start_date ?? row.activated_at),
    },
    {
      title: "Fin contrato",
      dataIndex: "end_date",
      key: "end_date",
      width: 110,
      render: (v) => fmtDate(v),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 200,
      render: (_, row) => (
        <Space size={4} style={{ whiteSpace: "nowrap" }}>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => goSuscripcion(row)}>
            Suscripción
          </Button>
          <Button size="small" icon={<SettingOutlined />} type="primary" style={{ background: "#2563EB", borderColor: "#2563EB" }} onClick={() => goConfigurar(row)}>
            Configurar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <style>{`
        .service-card {
          transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        }
        .service-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 6px 18px rgba(0,0,0,0.10) !important;
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header — mismo estilo que AccommodationDetail */}
        <div style={{ marginBottom: 20 }}>
          <Row justify="space-between" align="top">
            <Col flex="auto">
              <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F", marginBottom: 4 }}>
                <ToolOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />Gestión de Servicios
              </Title>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {loading ? "Cargando..." : `${filtered.length} suscripción${filtered.length !== 1 ? "es" : ""} contratada${filtered.length !== 1 ? "s" : ""}`}
              </Text>
            </Col>
            <Col>
              <Button icon={<AppstoreOutlined />} onClick={load} loading={loading}>
                Actualizar
              </Button>
            </Col>
          </Row>
        </div>

        {/* Fila filtros + toggle */}
        <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Search
              style={{ width: 300 }}
              placeholder="Buscar por nombre de servicio o plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          {hasFilters && (
            <Col>
              <Button onClick={() => setSearch("")}>Limpiar</Button>
            </Col>
          )}
          <Col flex="auto" />
          <Col>
            <Space size={4}>
              <Tooltip title="Vista tarjetas">
                <Button
                  size="small"
                  icon={<AppstoreOutlined />}
                  type={viewMode === "cards" ? "primary" : "default"}
                  style={viewMode === "cards" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                  onClick={() => changeViewMode("cards")}
                />
              </Tooltip>
              <Tooltip title="Vista lista">
                <Button
                  size="small"
                  icon={<UnorderedListOutlined />}
                  type={viewMode === "list" ? "primary" : "default"}
                  style={viewMode === "list" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                  onClick={() => changeViewMode("list")}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {/* Error */}
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        {/* Skeleton */}
        {loading && viewMode === "cards" && (
          <Row gutter={[20, 20]}>
            {[1, 2, 3].map((i) => (
              <Col key={i} xs={24} sm={12} lg={8}>
                <Card style={{ borderRadius: 14 }}><Skeleton active paragraph={{ rows: 5 }} /></Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <Card style={{ borderRadius: 14, textAlign: "center", padding: "48px 0", border: "1px dashed #E5E7EB" }}>
            <CalendarOutlined style={{ fontSize: 48, color: "#D1D5DB", marginBottom: 16 }} />
            <Title level={4} style={{ color: "#6B7280", marginBottom: 8 }}>
              {hasFilters ? "Sin resultados" : "Sin suscripciones contratadas"}
            </Title>
            <Text type="secondary">
              {hasFilters
                ? "No hay suscripciones que coincidan con los filtros aplicados."
                : "Visita el Catálogo de Servicios para contratar nuevos módulos."}
            </Text>
            {!hasFilters && (
              <div style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  style={{ background: "#2563EB", borderColor: "#2563EB", borderRadius: 20 }}
                  onClick={() => navigate("/v2/admin/catalogo")}
                >
                  Ver Catálogo de Servicios
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Vista tarjetas */}
        {!loading && filtered.length > 0 && viewMode === "cards" && (
          <Row gutter={[20, 20]}>
            {filtered.map((sub) => (
              <Col key={sub.id} xs={24} sm={12} lg={8} xl={6} style={{ display: "flex" }}>
                <SubscripcionCard
                  sub={sub}
                  onSuscripcion={() => goSuscripcion(sub)}
                  onConfigurar={() => goConfigurar(sub)}
                />
              </Col>
            ))}
          </Row>
        )}

        {/* Vista lista */}
        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(11,46,109,0.08)", overflow: "hidden" }}>
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              size="middle"
            />
          </div>
        )}

      </div>
    </V2Layout>
  );
}
