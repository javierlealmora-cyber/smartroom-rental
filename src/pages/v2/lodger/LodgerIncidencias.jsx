// src/pages/v2/lodger/LodgerIncidencias.jsx
// Portal Inquilino — Incidencias: crear, ver y buscar

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Card, Col, Descriptions, Drawer, Empty,
  Form, Input, Row, Select, Skeleton, Space, Tag, Typography, message,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CATEGORY_OPTIONS = [
  { value: "maintenance", label: "Mantenimiento" },
  { value: "cleaning",    label: "Limpieza" },
  { value: "noise",       label: "Ruidos / Convivencia" },
  { value: "supplies",    label: "Suministros (agua, luz, gas)" },
  { value: "security",    label: "Seguridad" },
  { value: "furniture",   label: "Mobiliario / Equipamiento" },
  { value: "other",       label: "Otro" },
];

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high",   label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUS_COLOR  = { open: "processing", in_progress: "warning", resolved: "success", closed: "default" };
const STATUS_LABEL  = { open: "Abierta", in_progress: "En proceso", resolved: "Resuelta", closed: "Cerrada" };
const PRIORITY_COLOR = { low: "default", medium: "blue", high: "orange", urgent: "red" };
const PRIORITY_LABEL = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

function fDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function LodgerIncidencias() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [lodger, setLodger]         = useState(null);
  const [incidents, setIncidents]   = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [form] = Form.useForm();

  const companyBranding = tenantBranding
    ? { name: tenantBranding.name, logoUrl: tenantBranding.logo_url, primaryColor: tenantBranding.primary_color }
    : null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodgerData, error: lErr } = await supabase
        .from("profiles")
        .select("id, full_name, client_account_id")
        .eq("email", user.email)
        .eq("role", "lodger")
        .maybeSingle();
      if (lErr) throw new Error(lErr.message);
      setLodger(lodgerData || null);
      if (!lodgerData) return;

      const { data, error: iErr } = await supabase
        .from("incidents")
        .select("*")
        .eq("lodger_id", lodgerData.id)
        .order("created_at", { ascending: false });
      if (iErr) throw new Error(iErr.message);
      setIncidents(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Filter logic
  useEffect(() => {
    let list = incidents;
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        CATEGORY_LABEL[i.category]?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [incidents, search, statusFilter]);

  const handleCreate = async (values) => {
    if (!lodger) return;
    setSaving(true);
    try {
      const { error: iErr } = await supabase.from("incidents").insert({
        client_account_id: lodger.client_account_id,
        lodger_id:         lodger.id,
        title:             values.title,
        description:       values.description || null,
        category:          values.category,
        priority:          values.priority,
        status:            "open",
      });
      if (iErr) throw new Error(iErr.message);
      message.success("Incidencia creada correctamente");
      form.resetFields();
      setDrawerOpen(false);
      await load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCount  = incidents.filter((i) => i.status === "open").length;
  const inProgCount = incidents.filter((i) => i.status === "in_progress").length;

  if (loading) {
    return (
      <V2Layout role="lodger" companyBranding={companyBranding}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </V2Layout>
    );
  }

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={lodger?.full_name || user?.email}>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Reintentar</Button>}
        />
      )}

      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <WarningOutlined style={{ marginRight: 8, color: "#F59E0B" }} />Incidencias
          </Title>
          <Text type="secondary">Crea y consulta tus incidencias</Text>
        </Col>
        <Col>
          <Space>
            <Button size="small" icon={<ReloadOutlined />} onClick={load} />
            <Button type="primary" size="small" icon={<PlusOutlined />}
              onClick={() => { form.resetFields(); setDrawerOpen(true); }}>
              Nueva incidencia
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Resumen */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: "center", background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <Text strong style={{ fontSize: 22, color: "#2563EB", display: "block" }}>{openCount}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Abiertas</Text>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: "center", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <Text strong style={{ fontSize: 22, color: "#D97706", display: "block" }}>{inProgCount}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>En proceso</Text>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: "center", background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <Text strong style={{ fontSize: 22, color: "#059669", display: "block" }}>
              {incidents.filter((i) => i.status === "resolved" || i.status === "closed").length}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Resueltas</Text>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        <Col xs={24} sm={14}>
          <Input
            placeholder="Buscar por título, descripción o categoría..."
            prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
          />
        </Col>
        <Col xs={24} sm={10}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            size="small"
            style={{ width: "100%" }}
            options={[
              { value: "all",         label: "Todos los estados" },
              { value: "open",        label: "Abiertas" },
              { value: "in_progress", label: "En proceso" },
              { value: "resolved",    label: "Resueltas" },
              { value: "closed",      label: "Cerradas" },
            ]}
          />
        </Col>
      </Row>

      {/* Lista de incidencias */}
      {filtered.length === 0 ? (
        <Empty
          description={incidents.length === 0 ? "No tienes incidencias registradas" : "Sin resultados para los filtros aplicados"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 40 }}
        >
          {incidents.length === 0 && (
            <Button type="primary" size="small" icon={<PlusOutlined />}
              onClick={() => { form.resetFields(); setDrawerOpen(true); }}>
              Crear primera incidencia
            </Button>
          )}
        </Empty>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          {filtered.map((inc) => (
            <Card
              key={inc.id}
              size="small"
              hoverable
              onClick={() => setSelected(inc)}
              style={{ cursor: "pointer", borderLeft: `3px solid ${inc.status === "open" ? "#3B82F6" : inc.status === "in_progress" ? "#F59E0B" : "#10B981"}` }}
            >
              <Row justify="space-between" align="middle" wrap={false}>
                <Col flex="auto" style={{ minWidth: 0 }}>
                  <Row align="middle" gutter={8} wrap={false}>
                    <Col>
                      {inc.status === "resolved" || inc.status === "closed"
                        ? <CheckCircleOutlined style={{ color: "#10B981", fontSize: 16 }} />
                        : inc.status === "in_progress"
                          ? <ClockCircleOutlined style={{ color: "#F59E0B", fontSize: 16 }} />
                          : <WarningOutlined style={{ color: "#3B82F6", fontSize: 16 }} />
                      }
                    </Col>
                    <Col flex="auto" style={{ minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: "block" }} ellipsis>{inc.title}</Text>
                      <Space size={4} wrap>
                        <Tag color={STATUS_COLOR[inc.status] || "default"} style={{ fontSize: 10 }}>
                          {STATUS_LABEL[inc.status] || inc.status}
                        </Tag>
                        <Tag color={PRIORITY_COLOR[inc.priority] || "default"} style={{ fontSize: 10 }}>
                          {PRIORITY_LABEL[inc.priority] || inc.priority}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {CATEGORY_LABEL[inc.category] || inc.category}
                        </Text>
                      </Space>
                    </Col>
                  </Row>
                </Col>
                <Col flex="none" style={{ paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {fDateTime(inc.created_at)}
                  </Text>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}

      {/* Drawer: detalle de incidencia */}
      <Drawer
        title={selected?.title || "Detalle de incidencia"}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={400}
        footer={
          <Button block onClick={() => setSelected(null)}>Cerrar</Button>
        }
      >
        {selected && (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Row gutter={8}>
              <Col>
                <Badge status={selected.status === "open" ? "processing" : selected.status === "in_progress" ? "warning" : "success"} />
                <Tag color={STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status] || selected.status}</Tag>
              </Col>
              <Col>
                <Tag color={PRIORITY_COLOR[selected.priority]}>{PRIORITY_LABEL[selected.priority] || selected.priority}</Tag>
              </Col>
            </Row>
            <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 110 }}>
              <Descriptions.Item label="Categoría">{CATEGORY_LABEL[selected.category] || selected.category}</Descriptions.Item>
              <Descriptions.Item label="Creada">{fDateTime(selected.created_at)}</Descriptions.Item>
              {selected.resolved_at && (
                <Descriptions.Item label="Resuelta">{fDateTime(selected.resolved_at)}</Descriptions.Item>
              )}
            </Descriptions>
            {selected.description && (
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Descripción</Text>
                <Paragraph style={{ background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, margin: 0, fontSize: 13 }}>
                  {selected.description}
                </Paragraph>
              </div>
            )}
          </Space>
        )}
      </Drawer>

      {/* Drawer: nueva incidencia */}
      <Drawer
        title="Nueva incidencia"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields(); }}
        width={400}
        footer={
          <Row gutter={8}>
            <Col span={12}>
              <Button block onClick={() => { setDrawerOpen(false); form.resetFields(); }}>Cancelar</Button>
            </Col>
            <Col span={12}>
              <Button block type="primary" loading={saving} onClick={() => form.submit()}>
                Crear incidencia
              </Button>
            </Col>
          </Row>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} size="small">
          <Form.Item name="title" label="Título" rules={[{ required: true, message: "Introduce un título" }]}>
            <Input placeholder="Ej: Grifo de la cocina con fuga" maxLength={120} showCount />
          </Form.Item>
          <Form.Item name="category" label="Categoría" rules={[{ required: true, message: "Selecciona una categoría" }]}>
            <Select options={CATEGORY_OPTIONS} placeholder="Selecciona..." />
          </Form.Item>
          <Form.Item name="priority" label="Prioridad" initialValue="medium" rules={[{ required: true }]}>
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="Descripción (opcional)">
            <TextArea rows={4} placeholder="Describe el problema con el mayor detalle posible..." maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Drawer>

    </V2Layout>
  );
}
