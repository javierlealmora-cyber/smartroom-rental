// src/pages/v2/admin/services/ServicesList.jsx
// Gestión de Servicios — diseño de cards homogéneo con AccommodationsList
//
// Tabs principales:
//   catalogo      → Catálogo de Servicios (grid de cards)
//   lavanderia    → Lavandería (placeholder)
//   smart-access  → Smart Access Lock (SalGestion)
//   incidencias   → Ticket Incidencias (placeholder)
//   encuestas     → Encuestas (placeholder)

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Input, Row, Select,
  Skeleton, Tabs, Tooltip, Typography,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, EditOutlined, StopOutlined, CheckOutlined,
  AppstoreOutlined, ToolOutlined, SettingOutlined, TagOutlined,
} from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listServicesCatalog } from "../../../../services/services.service";
import { setEntityStatus } from "../../../../services/entities.service";
import { LodgerServicesTab } from "../tenants/LodgerServicesList";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_LABEL = { active: "Activo", inactive: "Inactivo" };
const STATUS_COLOR = { active: "#16A34A", inactive: "#6B7280" };
const STATUS_BG    = { active: "#DCFCE7", inactive: "#F3F4F6" };

const UNIT_COLOR = {
  hour: "blue", day: "cyan", month: "geekblue",
  unit: "purple", service: "magenta",
};

function fEur(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function formatEntityName(e) {
  if (!e) return null;
  if (e.legal_type === "persona_juridica") return e.legal_name || null;
  return [e.first_name, e.last_name1, e.last_name2].filter(Boolean).join(" ") || e.legal_name || null;
}

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({ service: svc, onEdit, onToggle, toggling }) {
  const [hovered, setHovered] = useState(false);
  const isActive = svc.status === "active";
  const entityName = formatEntityName(svc.owner_entity);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
        boxShadow: hovered
          ? "0 12px 32px rgba(0,0,0,0.13)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        overflow: "hidden",
        opacity: isActive ? 1 : 0.75,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* ── Cabecera coloreada con icono ── */}
      <div style={{
        background: "linear-gradient(135deg, #0096D6 0%, #0078b8 100%)",
        padding: "20px 18px 16px",
        position: "relative",
      }}>
        {/* Badge estado — esquina superior derecha */}
        <span style={{
          position: "absolute",
          top: 10,
          right: 12,
          fontSize: 11,
          fontWeight: 700,
          color: STATUS_COLOR[svc.status] || "#6B7280",
          background: STATUS_BG[svc.status] || "#F3F4F6",
          borderRadius: 20,
          padding: "2px 10px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}>
          {STATUS_LABEL[svc.status] || svc.status}
        </span>

        {/* Icono de servicio */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(255,255,255,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}>
          <ToolOutlined style={{ fontSize: 22, color: "#fff" }} />
        </div>

        {/* Nombre del servicio */}
        <Text strong style={{
          fontSize: 15,
          color: "#fff",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.35,
          minHeight: "2.7em",
          letterSpacing: "-0.2px",
        }}>
          {svc.name}
        </Text>
      </div>

      {/* ── Descripción ── */}
      <div style={{ padding: "12px 16px 4px" }}>
        <Text type="secondary" style={{
          fontSize: 12,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          lineHeight: 1.55,
          minHeight: "3.1em",
        }}>
          {svc.description || "Sin descripción"}
        </Text>
      </div>

      {/* ── KPIs en fila ── */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 0 }}>
        {[
          { label: "Precio", value: fEur(svc.unit_price), color: "#374151" },
          { label: "Unidad", value: svc.unit || "—", color: "#0078b8" },
          { label: "Recurrente", value: svc.is_recurring ? "Sí" : "No", color: svc.is_recurring ? "#16A34A" : "#9CA3AF" },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{ flex: 1, textAlign: i === 0 ? "left" : "center" }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", display: "block", lineHeight: 1.3 }}>
              {label}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1.3, display: "block" }}>
              {value}
            </Text>
          </div>
        ))}
      </div>

      {/* ── Entidad ── */}
      {entityName && (
        <div style={{ padding: "8px 16px 0" }}>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Entidad: </Text>
          <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{entityName}</Text>
        </div>
      )}

      {/* ── Separador ── */}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: "#F3F4F6", margin: "10px 0 0" }} />

      {/* ── Botones ── */}
      <div
        style={{ padding: "10px 14px 14px", display: "flex", gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          style={{
            borderRadius: 20,
            fontWeight: 600,
            fontSize: 12,
            flex: 1,
            background: "#0096D6",
            borderColor: "#0096D6",
          }}
          onClick={onEdit}
        >
          Editar
        </Button>
        <Tooltip title={isActive ? "Desactivar servicio" : "Activar servicio"}>
          <Button
            size="small"
            icon={isActive ? <StopOutlined /> : <CheckOutlined />}
            loading={toggling}
            style={{
              borderRadius: 20,
              fontWeight: 600,
              fontSize: 12,
              flex: 1,
              borderColor: isActive ? "#E5E7EB" : "#16A34A",
              color: isActive ? "#6B7280" : "#16A34A",
            }}
            onClick={onToggle}
          >
            {isActive ? "Desactivar" : "Activar"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Tab: Catálogo de Servicios ────────────────────────────────────────────────
function CatalogTab() {
  const navigate = useNavigate();
  const { clientAccountId } = useAdminLayout();

  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingId, setTogglingId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listServicesCatalog();
      setAllServices(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

   
  useEffect(() => { load(); }, [load]);

  const services = useMemo(() => {
    let r = allServices;
    if (filterStatus) r = r.filter((s) => s.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [allServices, filterStatus, search]);

  const toggleStatus = async (svc) => {
    const newStatus = svc.status === "active" ? "inactive" : "active";
    setTogglingId(svc.id);
    try {
      await setEntityStatus(svc.id, newStatus, clientAccountId);
      setAllServices((prev) =>
        prev.map((s) => s.id === svc.id ? { ...s, status: newStatus } : s)
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const hasFilters = search || filterStatus;

  return (
    <>
      {/* Subheader con conteo + botón */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Text type="secondary">
          {loading
            ? "Cargando..."
            : `${services.length} prestación${services.length !== 1 ? "es" : ""}`}
        </Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/v2/admin/servicios/nuevo")}
          style={{ borderRadius: 20, fontWeight: 600, height: 36 }}
        >
          Nueva Prestación
        </Button>
      </Row>

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={12} md={9}>
          <Search
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "active",   label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { setSearch(""); setFilterStatus(""); }}
          >
            Limpiar
          </Button>
        </Col>
      </Row>

      {/* Error */}
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      {/* Skeleton loading */}
      {loading && (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card style={{ borderRadius: 14 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <Card style={{ borderRadius: 14, textAlign: "center", padding: "32px 0" }}>
          <ToolOutlined style={{ fontSize: 48, color: "#D1D5DB", marginBottom: 16 }} />
          <Title level={4} style={{ color: "#6B7280", marginBottom: 8 }}>
            {hasFilters ? "Sin resultados" : "No hay prestaciones"}
          </Title>
          <Text type="secondary">
            {hasFilters
              ? "No hay prestaciones que coincidan con los filtros aplicados"
              : "Crea la primera prestación del catálogo"}
          </Text>
          {!hasFilters && (
            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ borderRadius: 20 }}
                onClick={() => navigate("/v2/admin/servicios/nuevo")}
              >
                Nueva Prestación
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Grid de cards */}
      {!loading && services.length > 0 && (
        <Row gutter={[20, 20]}>
          {services.map((svc) => (
            <Col key={svc.id} xs={24} sm={12} lg={8} xl={6}>
              <ServiceCard
                service={svc}
                onEdit={() => navigate(`/v2/admin/servicios/${svc.id}/editar`)}
                onToggle={() => toggleStatus(svc)}
                toggling={togglingId === svc.id}
              />
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}

// ── Tabs principales ──────────────────────────────────────────────────────────
const MAIN_TABS = [
  {
    key: "catalogo",
    label: <span><AppstoreOutlined style={{ marginRight: 6 }} />Catálogo de Prestaciones</span>,
    children: <CatalogTab />,
  },
  {
    key: "inquilinos",
    label: <span><TagOutlined style={{ marginRight: 6 }} />Prestaciones a Inquilinos</span>,
    children: <LodgerServicesTab />,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function ServicesList() {
  const { userName, companyBranding } = useAdminLayout();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "catalogo";

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <SettingOutlined style={{ marginRight: 10 }} />
              Gestión de Prestaciones
            </Title>
            <Text type="secondary">
              Configura y gestiona las prestaciones disponibles para tus alojamientos
            </Text>
          </Col>
        </Row>

        {/* Tabs estilo SmartRoom con dropdown de Ant Design */}
        <style>{`
          .services-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #0071E3 !important;
            font-weight: 700 !important;
          }
          .services-tabs .ant-tabs-ink-bar {
            background: #0071E3 !important;
          }
          .services-tabs .ant-tabs-tab-btn {
            color: #374151 !important;
          }
          .services-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
            color: #0071E3 !important;
          }
        `}</style>
        <Tabs
          className="services-tabs"
          activeKey={activeTab}
          onChange={(key) => setSearchParams({ tab: key }, { replace: true })}
          type="line"
          size="middle"
          items={MAIN_TABS}
          style={{ marginTop: 4 }}
          tabBarStyle={{ marginBottom: 20, borderBottom: "1px solid #E5E7EB" }}
        />

      </div>
    </V2Layout>
  );
}
