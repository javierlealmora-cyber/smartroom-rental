// src/pages/v2/admin/services/ServicesList.jsx
// Catálogo de Servicios del Admin — Ant Design + Supabase real

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Badge, Button, Col, Input, Row, Select,
  Space, Table, Tag, Tooltip, Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, EditOutlined, StopOutlined, CheckOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listServicesCatalog } from "../../../../services/services.service";
import { invokeWithAuth } from "../../../../services/supabaseInvoke.services";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_COLOR = { active: "success", inactive: "default" };
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo" };

function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function ServicesList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingId, setTogglingId] = useState(null);

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
      r = r.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    return r;
  }, [allServices, filterStatus, search]);

  const toggleStatus = async (record) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    setTogglingId(record.id);
    try {
      await invokeWithAuth("manage_entity", {
        body: { action: "set_status", payload: { id: record.id, status: newStatus } },
      });
      setAllServices((prev) => prev.map((s) => s.id === record.id ? { ...s, status: newStatus } : s));
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
          {r.description && <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>}
        </Space>
      ),
    },
    {
      title: "Entidad",
      key: "entity",
      responsive: ["md"],
      render: (_, r) => r.owner_entity?.name || <Text type="secondary">-</Text>,
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
      render: (v) => <Badge status={STATUS_COLOR[v] || "default"} text={STATUS_LABEL[v] || v} />,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/servicios/${r.id}/editar`)} />
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
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Catálogo de Servicios</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${services.length} servicio${services.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/servicios/nuevo")}>
            Nuevo Servicio
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={14} md={10}>
          <Search placeholder="Buscar por nombre o descripción..."
            value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Select style={{ width: "100%" }} placeholder="Estado"
            value={filterStatus || undefined} onChange={(v) => setFilterStatus(v || "")} allowClear
            options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
          />
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearch(""); setFilterStatus(""); }}>
            Limpiar
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
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
        locale={{ emptyText: search || filterStatus ? "Sin resultados para los filtros aplicados" : "Crea tu primer servicio" }}
      />
    </V2Layout>
  );
}
