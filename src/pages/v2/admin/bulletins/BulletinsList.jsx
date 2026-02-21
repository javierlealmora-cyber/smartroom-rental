// src/pages/v2/admin/bulletins/BulletinsList.jsx
// Admin — Gestión de Boletines de Liquidación

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Col, Input, Popconfirm, Row,
  Select, Space, Table, Tag, Tooltip, Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_COLOR = { draft: "default", published: "processing", acknowledged: "success" };
const STATUS_LABEL = { draft: "Borrador", published: "Publicado", acknowledged: "Confirmado" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function BulletinsList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [publishing, setPublishing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("bulletins")
        .select(`
          *,
          lodger:lodgers(id, full_name, email),
          accommodation:accommodations(id, name),
          room:rooms(id, number)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (qErr) throw new Error(qErr.message);
      setAll(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    let r = all;
    if (filterStatus) r = r.filter((b) => b.status === filterStatus);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((b) =>
        b.lodger?.full_name?.toLowerCase().includes(s) ||
        b.lodger?.email?.toLowerCase().includes(s) ||
        b.accommodation?.name?.toLowerCase().includes(s)
      );
    }
    return r;
  }, [all, filterStatus, search]);

  const onPublish = async (id) => {
    setPublishing(id);
    try {
      const { error: upErr } = await supabase
        .from("bulletins")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id);
      if (upErr) throw new Error(upErr.message);
      setAll((prev) => prev.map((b) =>
        b.id === id ? { ...b, status: "published", published_at: new Date().toISOString() } : b
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(null);
    }
  };

  const columns = [
    {
      title: "Inquilino",
      key: "lodger",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.lodger?.full_name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.lodger?.email || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Alojamiento / Hab.",
      key: "location",
      responsive: ["sm"],
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.accommodation?.name || "-"}</Text>
          {r.room?.number && <Tag style={{ fontSize: 11 }}>Hab. {r.room.number}</Tag>}
        </Space>
      ),
    },
    {
      title: "Período",
      key: "period",
      responsive: ["md"],
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          {fDate(r.period_start)} – {fDate(r.period_end)}
        </Text>
      ),
    },
    {
      title: "Total",
      dataIndex: "amount_total",
      key: "amount_total",
      render: (v) => <Text strong>{fEur(v)}</Text>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Publicado",
      dataIndex: "published_at",
      key: "published_at",
      responsive: ["lg"],
      render: (v) => fDate(v),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          {r.status === "draft" && (
            <Popconfirm
              title="¿Publicar este boletín al inquilino?"
              onConfirm={() => onPublish(r.id)}
              okText="Publicar" cancelText="Cancelar"
            >
              <Tooltip title="Publicar">
                <Button
                  size="small"
                  type="primary"
                  icon={<SendOutlined />}
                  loading={publishing === r.id}
                >
                  Publicar
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const draftCount = all.filter((b) => b.status === "draft").length;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Boletines</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${rows.length} boletín${rows.length !== 1 ? "es" : ""}`}
            {draftCount > 0 && ` · ${draftCount} pendiente${draftCount > 1 ? "s" : ""} de publicar`}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/v2/admin/boletines/nuevo")}>
              Nuevo Boletín
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar por inquilino o alojamiento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: "100%" }}
            placeholder="Estado"
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || "")}
            allowClear
            options={[
              { value: "draft", label: "Borrador" },
              { value: "published", label: "Publicado" },
              { value: "acknowledged", label: "Confirmado" },
            ]}
          />
        </Col>
        {(search || filterStatus) && (
          <Col>
            <Button onClick={() => { setSearch(""); setFilterStatus(""); }}>Limpiar</Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: true }}
        size="small"
        pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: search || filterStatus || filterAccommodation
          ? <EmptyState icon="🔍" title="Sin resultados" description="No hay boletines que coincidan con los filtros aplicados" />
          : <EmptyState icon="🔔" title="No hay boletines" description="Crea el primer boletin de liquidación para tus inquilinos" actionLabel="Nuevo Boletin" onAction={() => navigate("/v2/admin/boletines/nuevo")} />
        }}
      />
    </V2Layout>
  );
}
