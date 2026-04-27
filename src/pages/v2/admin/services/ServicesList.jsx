// src/pages/v2/admin/services/ServicesList.jsx
// Gestión de Servicios — hub tabular del admin cliente.
//
// Tabs principales:
//   catalogo      → Catálogo de Servicios (tabla existente de services_catalog)
//   lavanderia    → Lavandería (placeholder Fase futura)
//   smart-access  → Smart Access Lock (SalGestion con sub-pestañas)
//   incidencias   → Ticket Incidencias (placeholder)
//   encuestas     → Encuestas (placeholder)

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert, Badge, Button, Col, Input, Row, Select,
  Space, Table, Tabs, Tag, Tooltip, Typography,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, EditOutlined, StopOutlined, CheckOutlined,
  AppstoreOutlined, ExperimentOutlined, LockOutlined,
  ExclamationCircleOutlined, FormOutlined,
} from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listServicesCatalog } from "../../../../services/services.service";
import { setEntityStatus } from "../../../../services/entities.service";
import SalGestion from "./smart-access/SalGestion";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_COLOR = { active: "success", inactive: "default" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo" };

function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
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

  const toggleStatus = async (record) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    setTogglingId(record.id);
    try {
      await setEntityStatus(record.id, newStatus, clientAccountId);
      setAllServices((prev) =>
        prev.map((s) => s.id === record.id ? { ...s, status: newStatus } : s)
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      title: "Servicio",
      key: "name",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.name}</Text>
          {r.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Entidad",
      key: "entity",
      responsive: ["md"],
      render: (_, r) => {
        const e = r.owner_entity;
        if (!e) return <Text type="secondary">-</Text>;
        const n = e.legal_type === "persona_juridica"
          ? e.legal_name
          : [e.first_name, e.last_name1, e.last_name2].filter(Boolean).join(" ");
        return n || <Text type="secondary">-</Text>;
      },
    },
    {
      title: "Unidad",
      dataIndex: "unit",
      key: "unit",
      responsive: ["sm"],
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Precio",
      dataIndex: "unit_price",
      key: "unit_price",
      align: "right",
      render: (v) => <Text strong>{fEur(v)}</Text>,
    },
    {
      title: "Recurrente",
      dataIndex: "is_recurring",
      key: "is_recurring",
      responsive: ["lg"],
      render: (v) => <Tag color={v ? "blue" : "default"}>{v ? "Sí" : "No"}</Tag>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Badge status={STATUS_COLOR[v] || "default"} text={STATUS_LABEL[v] || v} />
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/servicios/${r.id}/editar`)}
            />
          </Tooltip>
          <Tooltip title={r.status === "active" ? "Desactivar" : "Activar"}>
            <Button
              size="small"
              icon={r.status === "active" ? <StopOutlined /> : <CheckOutlined />}
              loading={togglingId === r.id}
              onClick={() => toggleStatus(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Text type="secondary">
            {loading
              ? "Cargando..."
              : `${services.length} servicio${services.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/servicios/nuevo")}
          >
            Nuevo Servicio
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={14} md={10}>
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
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { setSearch(""); setFilterStatus(""); }}
          >
            Limpiar
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={services}
        loading={loading}
        scroll={{ x: true }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{
          emptyText: search || filterStatus ? (
            <EmptyState
              icon="🔍"
              title="Sin resultados"
              description="No hay servicios que coincidan con los filtros aplicados"
            />
          ) : (
            <EmptyState
              icon="🔧"
              title="No hay servicios"
              description="Crea el primer servicio del catálogo"
              actionLabel="Nuevo Servicio"
              onAction={() => navigate("/v2/admin/servicios/nuevo")}
            />
          ),
        }}
      />
    </>
  );
}

// ── Tab genérico placeholder ──────────────────────────────────────────────────
function PlaceholderServiceTab({ title, description }) {
  return (
    <div style={{ paddingTop: 32, maxWidth: 640 }}>
      <div style={{
        background: "#FAFAFA",
        border: "1px dashed #D1D5DB",
        borderRadius: 12,
        padding: "40px 32px",
        textAlign: "center",
      }}>
        <Text style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>
          {title}
        </Text>
        <Text type="secondary" style={{ fontSize: 14 }}>{description}</Text>
      </div>
    </div>
  );
}

// ── Tabs principales ──────────────────────────────────────────────────────────
const MAIN_TABS = [
  {
    key: "catalogo",
    label: (
      <span><AppstoreOutlined style={{ marginRight: 6 }} />Catálogo de Servicios</span>
    ),
    children: <CatalogTab />,
  },
  {
    key: "lavanderia",
    label: (
      <span><ExperimentOutlined style={{ marginRight: 6 }} />Lavandería</span>
    ),
    children: (
      <PlaceholderServiceTab
        title="Gestión de Lavandería"
        description="Configuración de tarifas, turnos y registro de uso de lavandería. Disponible en próximas fases."
      />
    ),
  },
  {
    key: "smart-access",
    label: (
      <span><LockOutlined style={{ marginRight: 6 }} />Smart Access Lock</span>
    ),
    children: <SalGestion />,
  },
  {
    key: "incidencias",
    label: (
      <span><ExclamationCircleOutlined style={{ marginRight: 6 }} />Ticket Incidencias</span>
    ),
    children: (
      <PlaceholderServiceTab
        title="Gestión de Incidencias"
        description="Sistema de tickets para reportar y resolver incidencias de los alojamientos. Disponible en próximas fases."
      />
    ),
  },
  {
    key: "encuestas",
    label: (
      <span><FormOutlined style={{ marginRight: 6 }} />Encuestas</span>
    ),
    children: (
      <PlaceholderServiceTab
        title="Encuestas de Satisfacción"
        description="Envía encuestas automáticas al check-in y check-out para medir la satisfacción de los inquilinos. Disponible en próximas fases."
      />
    ),
  },
];

// ── Componente principal exportado ────────────────────────────────────────────
export default function ServicesList() {
  const { userName, companyBranding } = useAdminLayout();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "catalogo";

  const handleTabChange = (key) => {
    setSearchParams({ tab: key }, { replace: true });
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Gestión de Servicios</Title>
        <Text type="secondary">
          Configura y gestiona los servicios disponibles para tus alojamientos
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        size="middle"
        items={MAIN_TABS}
        style={{ marginTop: 8 }}
      />
    </V2Layout>
  );
}
