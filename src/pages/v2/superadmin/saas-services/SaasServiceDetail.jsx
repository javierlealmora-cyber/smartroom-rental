// src/pages/v2/superadmin/saas-services/SaasServiceDetail.jsx
// Detalle de un servicio SaaS: tabs Servicio / Planes / Features / Suscripciones
// Ruta: /v2/superadmin/saas-servicios/:id

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useParams, useNavigate } from "react-router-dom";
import {
  Alert, Badge, Button, Card, Col, DatePicker, Descriptions, Drawer, Form, Input,
  InputNumber, Modal, Row, Select, Skeleton, Space, Switch, Table,
  Tabs, Tag, Tooltip, Typography, message, Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, AppstoreOutlined, UnorderedListOutlined, SettingOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import { SalShardsContent } from "../sal-shards/SalShardsList";
import {
  getSaasService, updateSaasService,
  listPlans, upsertPlan, deletePlan,
  listFeatures, upsertFeature, deleteFeature,
  listSubscriptionsByService,
} from "../../../../services/saasServices.service";

const { Title, Text } = Typography;
const { Option } = Select;

const PERIOD_LABEL = { monthly: "mes", annual: "año", one_time: "único" };

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

  // Plan view mode
  const [planViewMode, setPlanViewMode] = useState(
    () => localStorage.getItem("smartrent_superadmin_plans_viewMode") || "list"
  );
  const changePlanViewMode = (m) => { setPlanViewMode(m); localStorage.setItem("smartrent_superadmin_plans_viewMode", m); };

  // Plan modal
  const [planModal, setPlanModal]   = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [savingPlan, setSavingPlan]   = useState(false);
  const [planForm]                    = Form.useForm();

  // Features drawer
  const [featDrawer, setFeatDrawer]   = useState(false);
  const [featPlan, setFeatPlan]       = useState(null);
  const [featData, setFeatData]       = useState([]);
  const [loadingFeat, setLoadingFeat] = useState(false);
  // Feature add/edit sub-modal
  const [featModal, setFeatModal]     = useState(false);
  const [editingFeat, setEditingFeat] = useState(null);
  const [savingFeat, setSavingFeat]   = useState(false);
  const [featForm]                    = Form.useForm();

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    planForm.setFieldsValue({
      ...plan,
      start_date:     plan.start_date     ? dayjs(plan.start_date)     : null,
      end_date:       plan.end_date       ? dayjs(plan.end_date)       : null,
      deactivated_at: plan.deactivated_at ? dayjs(plan.deactivated_at) : null,
    });
    setPlanModal(true);
  };

  const savePlan = async () => {
    let values;
    try { values = await planForm.validateFields(); } catch { return; }
    setSavingPlan(true);
    try {
      const payload = {
        ...values,
        start_date:     values.start_date     ? values.start_date.format("YYYY-MM-DD")     : null,
        end_date:       values.end_date       ? values.end_date.format("YYYY-MM-DD")       : null,
        deactivated_at: values.deactivated_at ? values.deactivated_at.toISOString()        : null,
        saas_service_id: id,
        ...(editingPlan ? { id: editingPlan.id } : {}),
      };
      await upsertPlan(payload);
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
  const loadFeatures = async (plan) => {
    setLoadingFeat(true);
    try {
      const data = await listFeatures(plan.id);
      setFeatData(data);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoadingFeat(false);
    }
  };

  const openFeatDrawer = async (plan) => {
    setFeatPlan(plan);
    setFeatDrawer(true);
    await loadFeatures(plan);
  };

  const openFeatCreate = () => {
    setEditingFeat(null);
    featForm.resetFields();
    setFeatModal(true);
  };

  const openFeatEdit = (feat) => {
    setEditingFeat(feat);
    featForm.setFieldsValue({
      feature_code: feat.feature_code,
      name:         feat.config?._name ?? "",
      description:  feat.config?._description ?? "",
    });
    setFeatModal(true);
  };

  const saveFeat = async () => {
    let values;
    try { values = await featForm.validateFields(); } catch { return; }
    setSavingFeat(true);
    try {
      await upsertFeature({
        ...(editingFeat ? { id: editingFeat.id } : {}),
        saas_service_plan_id: featPlan.id,
        feature_code: values.feature_code,
        is_enabled:   true,
        config: {
          _name:        values.name ?? null,
          _description: values.description ?? null,
        },
      });
      message.success(editingFeat ? "Característica actualizada" : "Característica añadida");
      setFeatModal(false);
      await loadFeatures(featPlan);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingFeat(false);
    }
  };

  const handleDeleteFeat = async (featId) => {
    try {
      await deleteFeature(featId);
      message.success("Característica eliminada");
      await loadFeatures(featPlan);
    } catch (e) {
      message.error(e.message);
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
      title: "Acciones", key: "actions", width: 150,
      render: (_, row) => (
        <Space size={4} style={{ whiteSpace: "nowrap", display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="Gestionar características del plan">
            <Button size="small" onClick={() => openFeatDrawer(row)}>Features</Button>
          </Tooltip>
          <Tooltip title="Editar plan">
            <Button size="small" icon={<EditOutlined />} onClick={() => openPlanEdit(row)} />
          </Tooltip>
          <Popconfirm title="¿Eliminar este plan?" onConfirm={() => handleDeletePlan(row.id)} okText="Eliminar" okType="danger" cancelText="Cancelar">
            <Tooltip title="Eliminar plan">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
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
      key: "configuracion",
      label: "Configuración",
      children: (
        <Tabs
          type="card"
          size="small"
          style={{ marginTop: 8 }}
          items={[
            ...(service?.code === "smart_access_lock" ? [{
              key: "email-shards",
              label: "Email Shards",
              children: <SalShardsContent />,
            }] : []),
            {
              key: "general",
              label: "General",
              children: (
                <div style={{ padding: "24px 0", color: "#9CA3AF", textAlign: "center" }}>
                  <SettingOutlined style={{ fontSize: 32, marginBottom: 12, display: "block" }} />
                  <div style={{ fontSize: 14 }}>Configuración general — próximamente</div>
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      key: "plans",
      label: `Planes (${plans.length})`,
      children: (
        <>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginBottom: 12 }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openPlanCreate} style={{ background: "#0B2E6D", borderColor: "#0B2E6D" }}>
              Nuevo plan
            </Button>
            <Space size={4}>
              <Button
                size="small" icon={<AppstoreOutlined />}
                type={planViewMode === "cards" ? "primary" : "default"}
                style={planViewMode === "cards" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                onClick={() => changePlanViewMode("cards")}
              />
              <Button
                size="small" icon={<UnorderedListOutlined />}
                type={planViewMode === "list" ? "primary" : "default"}
                style={planViewMode === "list" ? { background: "#2563EB", borderColor: "#2563EB" } : {}}
                onClick={() => changePlanViewMode("list")}
              />
            </Space>
          </div>

          {planViewMode === "list" ? (
            <Table
              columns={planColumns}
              dataSource={plans}
              tableLayout="fixed"
              rowKey="id"
              size="small"
              pagination={false}
            />
          ) : (
            <Row gutter={[20, 20]} justify="center">
              {plans.map((plan, idx) => {
                const isHighlight = idx === Math.floor((plans.length - 1) / 2) && plans.length > 1;
                const price = plan.price_amount != null ? Number(plan.price_amount) : null;
                const headerBg = !plan.is_active
                  ? "linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)"
                  : isHighlight
                  ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
                  : "linear-gradient(135deg, #374151 0%, #6B7280 100%)";

                return (
                  <Col key={plan.id} xs={24} sm={12} xl={8} style={{ display: "flex" }}>
                    <div style={{
                      position: "relative", width: "100%", borderRadius: 16,
                      border: isHighlight ? "2px solid #2563EB" : "1px solid #E5E7EB",
                      background: isHighlight ? "#EFF6FF" : "#fff",
                      overflow: "hidden", display: "flex", flexDirection: "column",
                      boxShadow: isHighlight ? "0 8px 32px rgba(37,99,235,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
                    }}>
                      {/* Badge popular */}
                      {isHighlight && (
                        <div style={{
                          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                          background: "#2563EB", color: "#fff", fontSize: 10, fontWeight: 800,
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          padding: "4px 16px", borderRadius: "0 0 10px 10px", zIndex: 1,
                        }}>
                          Más popular
                        </div>
                      )}

                      {/* Header */}
                      <div style={{ background: headerBg, padding: isHighlight ? "32px 24px 20px" : "20px 24px", color: "#fff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Tag style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 11 }}>
                            {plan.code}
                          </Tag>
                          {!plan.is_active && (
                            <Tag style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 10 }}>Inactivo</Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{plan.name}</div>
                        {plan.description && (
                          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>{plan.description}</div>
                        )}
                      </div>

                      {/* Precio */}
                      <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid #F3F4F6" }}>
                        {price != null ? (
                          <>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                              <span style={{ fontSize: 42, fontWeight: 900, color: "#1A2438", lineHeight: 1 }}>
                                {price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 22, fontWeight: 700, color: "#1A2438", paddingBottom: 4 }}>€</span>
                              <span style={{ fontSize: 15, color: "#6B7280", paddingBottom: 6 }}>
                                /{PERIOD_LABEL[plan.billing_period] ?? plan.billing_period}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                              IVA no incluido ({plan.tax_percent ?? 21}%)
                            </div>
                            {/* Precios mensual / anual */}
                            {(plan.monthly_price != null || plan.annual_price != null) && (
                              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                                {plan.monthly_price != null && (
                                  <div style={{ background: "#F0F9FF", borderRadius: 8, padding: "6px 12px", flex: 1, textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "#0284C7", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Mensual</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0C4A6E" }}>
                                      {Number(plan.monthly_price).toFixed(2)} €
                                    </div>
                                  </div>
                                )}
                                {plan.annual_price != null && (
                                  <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "6px 12px", flex: 1, textAlign: "center" }}>
                                    <div style={{ fontSize: 10, color: "#16A34A", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Anual</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: "#14532D" }}>
                                      {Number(plan.annual_price).toFixed(2)} €
                                    </div>
                                    {plan.annual_discount_months > 0 && (
                                      <div style={{ fontSize: 10, color: "#16A34A" }}>
                                        {plan.annual_discount_months} mes{plan.annual_discount_months > 1 ? "es" : ""} gratis
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#6B7280" }}>Precio a consultar</div>
                        )}
                        {plan.stripe_price_id && (
                          <div style={{ marginTop: 8 }}>
                            <Tag color="purple" style={{ fontFamily: "monospace", fontSize: 10 }}>{plan.stripe_price_id}</Tag>
                          </div>
                        )}
                      </div>

                      {/* Botones de gestión */}
                      <div style={{ padding: "14px 20px 20px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        <Button
                          block
                          type="primary"
                          style={{
                            borderRadius: 10, height: 44, fontWeight: 700, fontSize: 14,
                            background: isHighlight
                              ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
                              : "#1A2438",
                            borderColor: "transparent",
                            boxShadow: isHighlight ? "0 4px 16px rgba(37,99,235,0.35)" : "none",
                          }}
                          onClick={() => openFeatDrawer(plan)}
                        >
                          Gestionar características
                        </Button>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button block style={{ borderRadius: 8, flex: 1 }} icon={<EditOutlined />} onClick={() => openPlanEdit(plan)}>
                            Editar
                          </Button>
                          <Popconfirm title="¿Eliminar este plan?" onConfirm={() => handleDeletePlan(plan.id)} okText="Eliminar" okType="danger" cancelText="Cancelar">
                            <Button danger style={{ borderRadius: 8 }} icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>
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
        width={640}
        destroyOnClose
      >
        <Form
          form={planForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onValuesChange={(changed, all) => {
            if ("monthly_price" in changed || "annual_discount_months" in changed) {
              const monthly  = all.monthly_price ?? all.price_amount ?? 0;
              const discount = all.annual_discount_months ?? 0;
              const computed = parseFloat((monthly * (12 - discount)).toFixed(2));
              planForm.setFieldsValue({ annual_price: computed >= 0 ? computed : 0 });
            }
          }}
        >

          {/* Identificación */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                <Input placeholder="basic" style={{ fontFamily: "monospace" }} disabled={!!editingPlan} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {/* Periodo y divisa */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="billing_period" label="Periodo de facturación" rules={[{ required: true }]}>
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

          {/* Precios principales */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="price_amount" label="Precio base" rules={[{ required: true }]}>
                <InputNumber prefix="€" min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="monthly_price" label="Precio mensual">
                <InputNumber prefix="€" min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="annual_price" label="Precio anual" tooltip="Calculado: precio mensual × (12 − meses de descuento)">
                <InputNumber prefix="€" min={0} step={0.01} style={{ width: "100%", background: "#F9FAFB" }} disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* Descuento anual y tarifa de alta */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="annual_discount_months" label="Meses descuento anual" tooltip="Nº de meses gratuitos al contratar anualmente">
                <InputNumber min={0} max={12} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tax_percent" label="% IVA">
                <InputNumber min={0} max={100} step={0.1} suffix="%" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="setup_fee" label="Tarifa de alta">
                <InputNumber prefix="€" min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Vigencia */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="start_date" label="Fecha de inicio">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="end_date" label="Fecha de fin">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="deactivated_at" label="Desactivado el">
                <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          {/* Stripe y estado */}
          <Form.Item name="stripe_price_id" label="Stripe Price ID">
            <Input placeholder="price_..." style={{ fontFamily: "monospace" }} />
          </Form.Item>
          <Form.Item name="is_active" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>

        </Form>
      </Modal>

      {/* ── Drawer Features ──────────────────────────────────────────────── */}
      <Drawer
        open={featDrawer}
        title={featPlan ? `Características — ${featPlan.name}` : "Características"}
        onClose={() => setFeatDrawer(false)}
        width={600}
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small"
            style={{ background: "#2563EB", borderColor: "#2563EB" }}
            onClick={openFeatCreate}>
            Nueva característica
          </Button>
        }
      >
        <Table
          dataSource={featData}
          rowKey="id"
          loading={loadingFeat}
          size="small"
          pagination={false}
          tableLayout="fixed"
          locale={{ emptyText: "Sin características. Pulsa «Nueva característica» para añadir." }}
          columns={[
            {
              title: "Código",
              dataIndex: "feature_code",
              key: "feature_code",
              render: (v) => <Tag style={{ fontFamily: "monospace" }}>{v}</Tag>,
            },
            {
              title: "Nombre",
              key: "name",
              render: (_, row) => {
                const v = row.config?._name;
                return v
                  ? <Text style={{ fontSize: 13 }}>{v}</Text>
                  : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
              },
            },
            {
              title: "Descripción",
              key: "description",
              render: (_, row) => {
                const v = row.config?._description;
                return v
                  ? <Text style={{ fontSize: 13, color: "#6B7280" }}>{v}</Text>
                  : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
              },
            },
            {
              title: "Acciones",
              key: "actions",
              width: 80,
              render: (_, row) => (
                <Space size={4} style={{ whiteSpace: "nowrap", display: "flex", justifyContent: "flex-end" }}>
                  <Tooltip title="Editar característica">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openFeatEdit(row)} />
                  </Tooltip>
                  <Popconfirm
                    title="¿Eliminar esta característica?"
                    onConfirm={() => handleDeleteFeat(row.id)}
                    okText="Eliminar" okType="danger" cancelText="Cancelar"
                  >
                    <Tooltip title="Eliminar característica">
                      <Button size="small" icon={<DeleteOutlined />} danger />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      {/* ── Sub-modal: añadir / editar característica ────────────────────── */}
      <Modal
        open={featModal}
        title={editingFeat ? "Editar característica" : "Nueva característica"}
        onOk={saveFeat}
        onCancel={() => setFeatModal(false)}
        confirmLoading={savingFeat}
        okText={editingFeat ? "Guardar cambios" : "Añadir"}
        width={460}
        destroyOnClose
      >
        <Form form={featForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="feature_code"
            label="Código de característica"
            rules={[{ required: true, message: "El código es obligatorio" }]}
          >
            <Input placeholder="Ej: remote_unlock" disabled={!!editingFeat} />
          </Form.Item>
          <Form.Item name="name" label="Nombre">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </V2Layout>
  );
}
