// src/pages/v2/superadmin/saas-services/SaasServiceDetail.jsx
// Detalle de un servicio SaaS: tabs Servicio / Planes / Features / Suscripciones
// Ruta: /v2/superadmin/saas-servicios/:id

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Badge, Button, Checkbox, Col, Descriptions, Form, Input,
  InputNumber, Modal, Row, Select, Skeleton, Space, Switch, Table,
  Tabs, Tag, Typography, message, Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import {
  getSaasService, updateSaasService,
  listPlans, upsertPlan, deletePlan,
  listFeatures, upsertFeature,
  listSubscriptionsByService,
} from "../../../../services/saasServices.service";

const { Title, Text } = Typography;
const { Option } = Select;

// Feature flags disponibles para planes SAL
const SAL_FEATURE_CODES = [
  { code: "provider_integration",  label: "Integración con proveedor (TTLock)" },
  { code: "common_areas",          label: "Zonas comunes" },
  { code: "actors",                label: "Actores externos" },
  { code: "access_groups",         label: "Grupos de acceso" },
  { code: "lodger_auto_grant",     label: "Auto-concesión a inquilinos" },
  { code: "remote_unlock",         label: "Desbloqueo remoto" },
  { code: "audit_logs",            label: "Logs de auditoría extendidos" },
];

const STATUS_LABELS = {
  draft: "Borrador", active: "Activo", deprecated: "Deprecado", disabled: "Deshabilitado",
};
const STATUS_COLORS = {
  draft: "default", active: "success", deprecated: "warning", disabled: "error",
};

const SUB_STATUS_CONFIG = {
  pending:   { color: "default",     label: "Pendiente" },
  active:    { color: "success",     label: "Activa" },
  suspended: { color: "warning",     label: "Suspendida" },
  cancelled: { color: "error",       label: "Cancelada" },
};

export default function SaasServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [service, setService]             = useState(null);
  const [plans, setPlans]                 = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState("service");

  // Service edit
  const [editMode, setEditMode]   = useState(false);
  const [savingSvc, setSavingSvc] = useState(false);
  const [svcForm]                 = Form.useForm();

  // Plan modal
  const [planModal, setPlanModal]   = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [savingPlan, setSavingPlan]   = useState(false);
  const [planForm]                    = Form.useForm();

  // Feature modal
  const [featModal, setFeatModal]   = useState(false);
  const [featPlan, setFeatPlan]     = useState(null);
  const [, setFeatData]     = useState([]);
  const [savingFeat, setSavingFeat] = useState(false);
  const [featForm]                  = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [svc, plns, subs] = await Promise.all([
        getSaasService(id),
        listPlans(id),
        listSubscriptionsByService(id),
      ]);
      setService(svc);
      setPlans(plns);
      setSubscriptions(subs);
    } catch (e) {
      message.error("Error cargando servicio: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Servicio ──────────────────────────────────────────────────────────────
  const startEditService = () => {
    svcForm.setFieldsValue({
      name:                       service.name,
      description:                service.description,
      status:                     service.status,
      visible_in_catalog:         service.visible_in_catalog,
      requires_manual_activation: service.requires_manual_activation,
    });
    setEditMode(true);
  };

  const saveService = async () => {
    let values;
    try { values = await svcForm.validateFields(); } catch { return; }
    setSavingSvc(true);
    try {
      await updateSaasService(id, values);
      message.success("Servicio actualizado");
      setEditMode(false);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingSvc(false);
    }
  };

  // ── Planes ────────────────────────────────────────────────────────────────
  const openPlanCreate = () => {
    setEditingPlan(null);
    planForm.resetFields();
    planForm.setFieldsValue({ billing_period: "monthly", price_currency: "EUR", is_active: true });
    setPlanModal(true);
  };

  const openPlanEdit = (plan) => {
    setEditingPlan(plan);
    planForm.setFieldsValue(plan);
    setPlanModal(true);
  };

  const savePlan = async () => {
    let values;
    try { values = await planForm.validateFields(); } catch { return; }
    setSavingPlan(true);
    try {
      await upsertPlan({ ...values, saas_service_id: id, ...(editingPlan ? { id: editingPlan.id } : {}) });
      message.success(editingPlan ? "Plan actualizado" : "Plan creado");
      setPlanModal(false);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await deletePlan(planId);
      message.success("Plan eliminado");
      load();
    } catch (e) {
      message.error(e.message);
    }
  };

  // ── Features ──────────────────────────────────────────────────────────────
  const openFeatEdit = async (plan) => {
    setFeatPlan(plan);
    setSavingFeat(false);
    try {
      const existing = await listFeatures(plan.id);
      const defaults = {};
      SAL_FEATURE_CODES.forEach(({ code }) => {
        const found = existing.find((f) => f.feature_code === code);
        defaults[code] = found?.is_enabled ?? false;
      });
      featForm.setFieldsValue(defaults);
      setFeatData(existing);
      setFeatModal(true);
    } catch (e) {
      message.error(e.message);
    }
  };

  const saveFeatures = async () => {
    const values = featForm.getFieldsValue();
    setSavingFeat(true);
    try {
      await Promise.all(
        SAL_FEATURE_CODES.map(({ code }) =>
          upsertFeature({
            saas_service_plan_id: featPlan.id,
            feature_code: code,
            is_enabled: values[code] ?? false,
          })
        )
      );
      message.success("Features actualizadas");
      setFeatModal(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingFeat(false);
    }
  };

  const userName = profile?.full_name || user?.email || "Superadmin";

  if (loading) {
    return (
      <V2Layout role="superadmin" userName={userName}>
        <div style={{ padding: 32 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
      </V2Layout>
    );
  }

  if (!service) {
    return (
      <V2Layout role="superadmin" userName={userName}>
        <div style={{ padding: 32 }}>
          <Alert type="error" message="Servicio no encontrado" />
          <Button onClick={() => navigate("/v2/superadmin/saas-servicios")} style={{ marginTop: 16 }}>
            Volver al catálogo
          </Button>
        </div>
      </V2Layout>
    );
  }

  const planColumns = [
    { title: "Código",      dataIndex: "code",           key: "code",
      render: (v) => <Tag style={{ fontFamily: "monospace" }}>{v}</Tag> },
    { title: "Nombre",      dataIndex: "name",           key: "name" },
    { title: "Periodo",     dataIndex: "billing_period", key: "billing_period",
      render: (v) => ({ monthly: "Mensual", annual: "Anual", one_time: "Único" }[v] ?? v) },
    { title: "Precio",      dataIndex: "price_amount",   key: "price_amount",
      render: (v, row) => `${Number(v).toFixed(2)} ${row.price_currency}` },
    { title: "Stripe Price", dataIndex: "stripe_price_id", key: "stripe_price_id",
      render: (v) => v ? <Tag color="purple" style={{ fontFamily: "monospace" }}>{v}</Tag> : <Text type="secondary">—</Text> },
    { title: "Estado", dataIndex: "is_active", key: "is_active",
      render: (v) => <Badge status={v ? "success" : "default"} text={v ? "Activo" : "Inactivo"} /> },
    {
      title: "Acciones", key: "actions",
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openFeatEdit(row)}>Features</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openPlanEdit(row)} />
          <Popconfirm title="¿Eliminar este plan?" onConfirm={() => handleDeletePlan(row.id)} okText="Eliminar" okType="danger">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subColumns = [
    { title: "Cliente", dataIndex: ["client_accounts", "name"], key: "client",
      render: (_, row) => row.client_accounts?.name ?? "—" },
    { title: "Plan",    dataIndex: ["saas_service_plans", "name"], key: "plan",
      render: (_, row) => row.saas_service_plans?.name ?? <Text type="secondary">Sin plan</Text> },
    { title: "Estado",  dataIndex: "status", key: "status",
      render: (v) => {
        const cfg = SUB_STATUS_CONFIG[v] ?? { color: "default", label: v };
        return <Badge status={cfg.color} text={cfg.label} />;
      }},
    { title: "Activada",   dataIndex: "activated_at",  key: "activated_at",
      render: (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—" },
    { title: "Ver cuenta", key: "account_link",
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/v2/superadmin/cuentas/${row.client_account_id}`)}>
          Ver cuenta
        </Button>
      )},
  ];

  const tabItems = [
    {
      key: "service",
      label: "Servicio",
      children: (
        <div style={{ maxWidth: 600 }}>
          {!editMode ? (
            <>
              <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Código">
                  <code>{service.code}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Nombre">{service.name}</Descriptions.Item>
                <Descriptions.Item label="Descripción">{service.description ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Estado">
                  <Badge status={STATUS_COLORS[service.status]} text={STATUS_LABELS[service.status]} />
                </Descriptions.Item>
                <Descriptions.Item label="Visible en catálogo">
                  {service.visible_in_catalog ? <Tag color="blue">Visible</Tag> : <Tag>Oculto</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Activación">
                  {service.requires_manual_activation
                    ? <Text type="warning">Manual (superadmin)</Text>
                    : <Text type="success">Autoservicio</Text>}
                </Descriptions.Item>
              </Descriptions>
              <Button icon={<EditOutlined />} onClick={startEditService}>Editar</Button>
            </>
          ) : (
            <Form form={svcForm} layout="vertical">
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="Descripción">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item name="status" label="Estado">
                <Select>
                  <Option value="draft">Borrador</Option>
                  <Option value="active">Activo</Option>
                  <Option value="deprecated">Deprecado</Option>
                  <Option value="disabled">Deshabilitado</Option>
                </Select>
              </Form.Item>
              <Form.Item name="visible_in_catalog" label="Visible en catálogo" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="requires_manual_activation" label="Requiere activación manual" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Space>
                <Button type="primary" loading={savingSvc} onClick={saveService}>Guardar</Button>
                <Button onClick={() => setEditMode(false)}>Cancelar</Button>
              </Space>
            </Form>
          )}
        </div>
      ),
    },
    {
      key: "plans",
      label: `Planes (${plans.length})`,
      children: (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPlanCreate}>
              Nuevo plan
            </Button>
          </div>
          <Table
            columns={planColumns}
            dataSource={plans}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </>
      ),
    },
    {
      key: "subscriptions",
      label: `Suscripciones (${subscriptions.length})`,
      children: (
        <Table
          columns={subColumns}
          dataSource={subscriptions}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20 }}
        />
      ),
    },
  ];

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/v2/superadmin/saas-servicios")}
            style={{ marginBottom: 8, padding: 0, color: "#6B7280" }}
          >
            Catálogo SaaS
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Title level={4} style={{ margin: 0 }}>{service.name}</Title>
            <Badge status={STATUS_COLORS[service.status]} text={STATUS_LABELS[service.status]} />
            <Tag style={{ fontFamily: "monospace", marginLeft: 4 }}>{service.code}</Tag>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "0 24px" }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ paddingTop: 4 }}
          />
        </div>
      </div>

      {/* Modal Plan */}
      <Modal
        open={planModal}
        title={editingPlan ? "Editar plan" : "Nuevo plan"}
        onOk={savePlan}
        onCancel={() => setPlanModal(false)}
        confirmLoading={savingPlan}
        width={500}
      >
        <Form form={planForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                <Input placeholder="basic" style={{ fontFamily: "monospace" }} disabled={!!editingPlan} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Plan Básico" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billing_period" label="Periodo" rules={[{ required: true }]}>
                <Select>
                  <Option value="monthly">Mensual</Option>
                  <Option value="annual">Anual</Option>
                  <Option value="one_time">Único</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price_currency" label="Divisa">
                <Select>
                  <Option value="EUR">EUR</Option>
                  <Option value="USD">USD</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="price_amount" label="Precio" rules={[{ required: true }]}>
                <InputNumber prefix={<DollarOutlined />} min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="setup_fee" label="Tarifa de alta">
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="stripe_price_id" label="Stripe Price ID">
            <Input placeholder="price_..." style={{ fontFamily: "monospace" }} />
          </Form.Item>
          <Form.Item name="is_active" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Features */}
      <Modal
        open={featModal}
        title={featPlan ? `Features — ${featPlan.name}` : "Features"}
        onOk={saveFeatures}
        onCancel={() => setFeatModal(false)}
        confirmLoading={savingFeat}
        width={480}
      >
        <Form form={featForm} layout="vertical" style={{ marginTop: 16 }}>
          {SAL_FEATURE_CODES.map(({ code, label }) => (
            <Form.Item key={code} name={code} valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>{label}</Checkbox>
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </V2Layout>
  );
}
