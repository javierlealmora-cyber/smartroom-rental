// src/pages/v2/admin/tenants/TenantsList.jsx
// Lista de Inquilinos para Admin — Ant Design + Supabase real

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Avatar, Button, Input, Row, Col, Select, Space,
  Table, Tag, Typography, Tooltip,
} from "antd";
import { PlusOutlined, ReloadOutlined, LogoutOutlined, EditOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers, scheduleCheckout } from "../../../../services/lodgers.service";
import { listAccommodations } from "../../../../services/accommodations.service";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_LABEL = {
  active: "Activo",
  invited: "Invitado",
  pending_checkout: "Pendiente de baja",
  inactive: "Inactivo",
};
const STATUS_COLOR = {
  active: "#059669",
  invited: "#3B82F6",
  pending_checkout: "#F59E0B",
  inactive: "#6B7280",
};

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TenantsList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [allLodgers, setAllLodgers] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lodgers, accs] = await Promise.all([
        listLodgers(),
        listAccommodations({ status: "active" }),
      ]);
      setAllLodgers(lodgers);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tenants = useMemo(() => {
    let result = allLodgers;
    if (!showInactive) result = result.filter((t) => t.status !== "inactive");
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterAccommodation) {
      result = result.filter((t) =>
        t.active_assignment?.[0]?.accommodation?.id === filterAccommodation
      );
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.full_name.toLowerCase().includes(s) ||
          t.email.toLowerCase().includes(s) ||
          t.phone?.includes(s)
      );
    }
    return result;
  }, [allLodgers, searchTerm, filterStatus, filterAccommodation, showInactive]);

  const onScheduleCheckout = async (tenant) => {
    const date = prompt("Fecha de baja (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    if (!date) return;
    try {
      await scheduleCheckout(tenant.id, date);
      setAllLodgers((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: "pending_checkout" } : t))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const clearFilters = () => {
    setSearchTerm(""); setFilterStatus(""); setFilterAccommodation(""); setShowInactive(false);
  };

  const hasFilters = searchTerm || filterStatus || filterAccommodation;

  const columns = [
    {
      title: "Inquilino",
      key: "name",
      render: (_, t) => (
        <Space>
          <Avatar style={{ backgroundColor: "#111827", flexShrink: 0 }}>
            {t.full_name.charAt(0).toUpperCase()}
          </Avatar>
          <Text strong>{t.full_name}</Text>
        </Space>
      ),
    },
    {
      title: "Contacto",
      key: "contact",
      responsive: ["md"],
      render: (_, t) => (
        <Space direction="vertical" size={0}>
          <Text>{t.email}</Text>
          {t.phone && <Text type="secondary" style={{ fontSize: 12 }}>{t.phone}</Text>}
        </Space>
      ),
    },
    {
      title: "Alojamiento / Hab.",
      key: "assignment",
      responsive: ["sm"],
      render: (_, t) => {
        const asgn = t.active_assignment?.[0];
        if (!asgn) return <Text type="secondary" italic>Sin asignar</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Text>{asgn.accommodation?.name}</Text>
            <Tag>Hab. {asgn.room?.number}</Tag>
          </Space>
        );
      },
    },
    {
      title: "Estado",
      key: "status",
      render: (_, t) => (
        <Tag color={STATUS_ANT_COLOR[t.status] || "default"}>
          {STATUS_LABEL[t.status] || t.status}
        </Tag>
      ),
    },
    {
      title: "Alta",
      dataIndex: "created_at",
      key: "created_at",
      responsive: ["lg"],
      render: (v) => formatDate(v),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, t) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/inquilinos/${t.id}/editar`)}
            />
          </Tooltip>
          {t.status === "active" && (
            <Tooltip title="Programar baja">
              <Button
                size="small"
                icon={<LogoutOutlined />}
                onClick={() => onScheduleCheckout(t)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Gestión de Inquilinos</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${tenants.length} inquilino${tenants.length !== 1 ? "s" : ""}`}
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/inquilinos/nuevo")}
          >
            Nuevo Inquilino
          </Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }} align="middle">
        <Col xs={24} sm={24} md={8} lg={7}>
          <Search
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={(v) => setSearchTerm(v)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={8} md={5} lg={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "active", label: "Activo" },
              { value: "invited", label: "Invitado" },
              { value: "pending_checkout", label: "Pendiente de baja" },
            ]}
          />
        </Col>
        <Col xs={12} sm={8} md={6} lg={5}>
          <Select
            style={{ width: "100%" }}
            placeholder="Alojamiento"
            value={filterAccommodation || undefined}
            onChange={(v) => setFilterAccommodation(v || "")}
            allowClear
            options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Button
            icon={<ReloadOutlined />}
            onClick={clearFilters}
            disabled={!hasFilters && !showInactive}
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
          action={<Button size="small" onClick={load}>Reintentar</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Tabla */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={tenants}
        loading={loading}
        scroll={{ x: true }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{
          emptyText: hasFilters
            ? <EmptyState icon="🔍" title="Sin resultados" description="No se encontraron inquilinos con los filtros aplicados" />
            : <EmptyState icon="👥" title="No hay inquilinos" description="Registra tu primer inquilino para empezar" actionLabel="Nuevo Inquilino" onAction={() => navigate("/v2/admin/inquilinos/nuevo")} />,
        }}
      />
    </V2Layout>
  );
}

const STATUS_ANT_COLOR = {
  active: "success",
  invited: "processing",
  pending_checkout: "warning",
  inactive: "default",
};
