// src/pages/v2/admin/catalogo/ServicesCatalogList.jsx
// Admin — Gestión de Servicios (Catálogo de módulos SaaS)
//
// Tabs principales:
//   catalogo      → Catálogo de Servicios (dos secciones: Contratados + Disponibles)
//   lavanderia    → Lavandería (placeholder)
//   smart-access  → Smart Access Lock (SalGestion)
//   incidencias   → Ticket Incidencias (placeholder)
//   encuestas     → Encuestas (placeholder)

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Input, Row, Select,
  Skeleton, Space, Table, Tooltip, Typography,
} from "antd";
import {
  AppstoreOutlined, ToolOutlined, FileTextOutlined, SettingOutlined,
  UnorderedListOutlined, EyeOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listCatalogSaasServices, listClientSaasSubscriptions } from "../../../../services/saasServices.service";

const { Title, Text } = Typography;
const { Search } = Input;

const VIEW_MODE_KEY_AVAILABLE   = "smartrent_catalog_available_viewMode";

const SVC_STATUS = {
  active:     { label: "Activo",    bg: "#DCFCE7", tc: "#15803D" },
  draft:      { label: "Borrador",  bg: "#F3F4F6", tc: "#6B7280" },
  deprecated: { label: "Obsoleto",  bg: "#FEF3C7", tc: "#B45309" },
  disabled:   { label: "Inactivo",  bg: "#FEE2E2", tc: "#DC2626" },
};

function StatusBadge({ label, bg, tc }) {
  return (
    <span style={{ background: bg, color: tc, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>
      {label}
    </span>
  );
}

// ── Card base (header azul gradiente) ─────────────────────────────────────────
function BaseCard({ statusCfg, name, body }) {
  return (
    <Card
      hoverable
      className="catalog-card"
      bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
      style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "none", width: "100%" }}
    >
      <div style={{ background: "linear-gradient(135deg, #1A3A6B 0%, #2563EB 100%)", padding: "16px 16px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          {statusCfg && <StatusBadge {...statusCfg} />}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <ToolOutlined style={{ fontSize: 20, color: "#fff" }} />
        </div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.3, paddingRight: 60, height: 40, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {name}
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
        {body}
      </div>
    </Card>
  );
}

// ── Card: servicio del catálogo (suscrito o disponible) ───────────────────────
function CatalogCard({ service, subscription, onSuscripcion, onConfigurar, onVerDetalle }) {
  const contracted = !!subscription;
  // Badge superior: naranja pastel si suscrito, estado normal si no
  const cfg = contracted
    ? { label: "Suscrito", bg: "#FFEDD5", tc: "#C2410C" }
    : (SVC_STATUS[service.status] ?? SVC_STATUS.draft);
  const fmtPeriod = (v) => v === "monthly" ? "Mensual" : v === "annually" ? "Anual" : "—";

  return (
    <BaseCard
      statusCfg={cfg}
      name={service.name}
      body={
        <>
          {/* Indicador "Servicio contratado" en naranja */}
          {contracted && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, color: "#EA580C", fontSize: 12, fontWeight: 600 }}>
              <CheckCircleOutlined style={{ fontSize: 13 }} />
              Servicio contratado
            </div>
          )}
          <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12, height: 34, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {service.description || <span style={{ color: "#D1D5DB" }}>Sin descripción</span>}
          </div>
          <Row gutter={8} style={{ marginBottom: 10 }}>
            <Col span={12}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Importe</Text>
              <Text style={{ fontSize: 13, fontWeight: 700, color: "#1A2438" }}>
                {service.price_amount != null ? `${Number(service.price_amount).toFixed(2)} €` : "—"}
              </Text>
            </Col>
            <Col span={12}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Período</Text>
              <Text style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>
                {fmtPeriod(service.billing_period)}
              </Text>
            </Col>
          </Row>
          <Text style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 14 }}>
            <span style={{ color: "#9CA3AF" }}>Tipo: </span>Add-on SaaS
          </Text>

          {/* Botones según estado */}
          {contracted ? (
            <Row gutter={8} style={{ marginTop: "auto" }}>
              <Col span={12}>
                <Button
                  block size="small" icon={<FileTextOutlined />} onClick={onSuscripcion}
                  style={{ borderRadius: 8, fontWeight: 600, background: "#FFEDD5", borderColor: "#F97316", color: "#C2410C" }}
                >
                  Suscripción
                </Button>
              </Col>
              <Col span={12}>
                <Button block size="small" type="primary" icon={<SettingOutlined />} onClick={onConfigurar}
                  style={{ background: "#2563EB", borderColor: "#2563EB", borderRadius: 8, fontWeight: 600 }}>
                  Configurar
                </Button>
              </Col>
            </Row>
          ) : (
            <div style={{ marginTop: "auto" }}>
              <Button
                block size="small" icon={<EyeOutlined />} onClick={onVerDetalle}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Ver detalle
              </Button>
            </div>
          )}
        </>
      }
    />
  );
}

// ── Subcomponente de sección (contratados o disponibles) ──────────────────────
function CatalogSection({
  title,
  items,
  loading,
  viewMode,
  onViewModeChange,
  viewModeKey,
  search,
  onSearch,
  filterStatus,
  onFilterStatus,
  statusOptions,
  filterPlaceholder = "Filtrar",
  renderCard,
  columns,
  countLabel,
  emptyText,
  actionButton,
}) {
  const hasFilters = search || filterStatus;

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Fila 1: conteo + acción */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text type="secondary">
          {loading ? "Cargando..." : `${items.length} ${countLabel}`}
        </Text>
        {actionButton}
      </div>

      {/* Fila 2: filtros + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Search
          style={{ width: 280 }}
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          placeholder={filterPlaceholder}
          value={filterStatus || undefined}
          onChange={(v) => onFilterStatus(v || "")}
          allowClear
          options={statusOptions}
        />
        {hasFilters && (
          <Button onClick={() => { onSearch(""); onFilterStatus(""); }}>Limpiar</Button>
        )}
        <div style={{ flex: 1 }} />
        <Space size={4}>
          <Tooltip title="Vista tarjetas">
            <Button size="small" icon={<AppstoreOutlined />} type={viewMode === "cards" ? "primary" : "default"} style={viewMode === "cards" ? { background: "#2563EB", borderColor: "#2563EB" } : {}} onClick={() => onViewModeChange("cards")} />
          </Tooltip>
          <Tooltip title="Vista lista">
            <Button size="small" icon={<UnorderedListOutlined />} type={viewMode === "list" ? "primary" : "default"} style={viewMode === "list" ? { background: "#2563EB", borderColor: "#2563EB" } : {}} onClick={() => onViewModeChange("list")} />
          </Tooltip>
        </Space>
      </div>

      {/* Skeleton */}
      {loading && viewMode === "cards" && (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card style={{ borderRadius: 14 }}><Skeleton active paragraph={{ rows: 4 }} /></Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <Card style={{ borderRadius: 14, textAlign: "center", padding: "24px 0", border: "1px dashed #E5E7EB" }}>
          <ToolOutlined style={{ fontSize: 36, color: "#D1D5DB", marginBottom: 12 }} />
          <Text type="secondary" style={{ display: "block" }}>
            {hasFilters ? "Sin resultados con los filtros aplicados" : emptyText}
          </Text>
        </Card>
      )}

      {/* Cards */}
      {!loading && items.length > 0 && viewMode === "cards" && (
        <Row gutter={[20, 20]}>
          {items.map((item, idx) => (
            <Col key={item.id ?? idx} xs={24} sm={12} lg={8} xl={6} style={{ display: "flex" }}>
              {renderCard(item)}
            </Col>
          ))}
        </Row>
      )}

      {/* Lista */}
      {!loading && items.length > 0 && viewMode === "list" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(11,46,109,0.08)", overflow: "hidden" }}>
          <Table
            columns={columns}
            dataSource={items}
            rowKey={(r) => r.id ?? r.saas_services?.id}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="middle"
          />
        </div>
      )}
    </div>
  );
}

// ── Tab: Catálogo de Servicios ────────────────────────────────────────────────
function CatalogTab() {
  const navigate = useNavigate();
  const { clientAccountId } = useAdminLayout();

  const [allServices, setAllServices]       = useState([]);
  const [subscriptions, setSubscriptions]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const [searchA, setSearchA]               = useState("");
  const [filterA, setFilterA]               = useState("");   // "" | "contracted" | "available"
  const [viewModeA, setViewModeA]           = useState(() => localStorage.getItem(VIEW_MODE_KEY_AVAILABLE) || "cards");

  const changeViewA = (m) => { setViewModeA(m); localStorage.setItem(VIEW_MODE_KEY_AVAILABLE, m); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcs, subs] = await Promise.all([
        listCatalogSaasServices(),
        clientAccountId ? listClientSaasSubscriptions(clientAccountId) : Promise.resolve([]),
      ]);
      setAllServices(svcs);
      setSubscriptions(subs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { load(); }, [load]);

  // Mapa serviceId → subscription (para saber si está contratado)
  const contractedMap = useMemo(() => {
    const map = {};
    subscriptions.forEach((s) => {
      if (s.saas_services?.id) map[s.saas_services.id] = s;
    });
    return map;
  }, [subscriptions]);

  // Filtrado: suscripción + búsqueda
  const filteredAvailable = useMemo(() => {
    let r = allServices;
    if (filterA === "contracted") r = r.filter((s) => contractedMap[s.id]);
    else if (filterA === "available") r = r.filter((s) => !contractedMap[s.id]);
    if (searchA) {
      const q = searchA.toLowerCase();
      r = r.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [allServices, contractedMap, filterA, searchA]);

  // Columnas — lista
  const columnsAvailable = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Descripción",
      dataIndex: "description",
      key: "description",
      render: (v) => <Text type="secondary" style={{ fontSize: 13 }}>{v || "—"}</Text>,
    },
    {
      title: "Suscripción",
      key: "contracted",
      width: 120,
      render: (_, row) => contractedMap[row.id]
        ? <StatusBadge label="Suscrito"   bg="#FFEDD5" tc="#C2410C" />
        : <StatusBadge label="Disponible" bg="#F3F4F6"  tc="#6B7280" />,
    },
    {
      title: "Importe",
      dataIndex: "price_amount",
      key: "price_amount",
      width: 100,
      render: (v) => v != null ? `${Number(v).toFixed(2)} €` : "—",
    },
    {
      title: "Período",
      dataIndex: "billing_period",
      key: "billing_period",
      width: 100,
      render: (v) => v === "monthly" ? "Mensual" : v === "annually" ? "Anual" : "—",
    },
    {
      title: "Acciones",
      key: "actions",
      width: 200,
      render: (_, row) => {
        const sub = contractedMap[row.id];
        return sub ? (
          <Space size={4} style={{ whiteSpace: "nowrap" }}>
            <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate(`/v2/admin/gestion-servicios/${sub.id}?tab=suscripcion`)}>
              Suscripción
            </Button>
            <Button size="small" icon={<SettingOutlined />} type="primary" style={{ background: "#2563EB", borderColor: "#2563EB" }} onClick={() => navigate(`/v2/admin/gestion-servicios/${sub.id}?tab=configuracion`)}>
              Configurar
            </Button>
          </Space>
        ) : (
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/v2/admin/catalogo/${row.id}`)}>
            Ver detalle
          </Button>
        );
      },
    },
  ];

  return (
    <>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* ── Servicios Disponibles ── */}
      <CatalogSection
        title="Servicios disponibles"
        items={filteredAvailable}
        loading={loading}
        viewMode={viewModeA}
        onViewModeChange={changeViewA}
        viewModeKey={VIEW_MODE_KEY_AVAILABLE}
        search={searchA}
        onSearch={setSearchA}
        filterStatus={filterA}
        onFilterStatus={setFilterA}
        statusOptions={[
          { value: "contracted", label: "Suscrito" },
          { value: "available",  label: "No suscrito" },
        ]}
        filterPlaceholder="Suscripción"
        renderCard={(svc) => {
          const sub = contractedMap[svc.id];
          return (
            <CatalogCard
              service={svc}
              subscription={sub || null}
              onSuscripcion={() => navigate(`/v2/admin/gestion-servicios/${sub?.id}?tab=suscripcion`)}
              onConfigurar={() => navigate(`/v2/admin/gestion-servicios/${sub?.id}?tab=configuracion`)}
              onVerDetalle={() => navigate(`/v2/admin/catalogo/${svc.id}`)}
            />
          );
        }}
        columns={columnsAvailable}
        countLabel={`servicio${filteredAvailable.length !== 1 ? "s" : ""}`}
        emptyText="No hay servicios adicionales disponibles"
        actionButton={null}
      />
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ServicesCatalogList() {
  const { userName, companyBranding } = useAdminLayout();

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: "-0.5px", color: "#1D1D1F", marginBottom: 4 }}>
              <AppstoreOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />Catálogo de Servicios
            </Title>
            <Text style={{ fontSize: 14, color: "#6B7280" }}>
              Consulta y contrata los módulos y servicios disponibles
            </Text>
          </Col>
        </Row>

        <style>{`
          .catalog-card {
            transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          }
          .catalog-card:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.10) !important;
          }
        `}</style>

        <CatalogTab />

      </div>
    </V2Layout>
  );
}
