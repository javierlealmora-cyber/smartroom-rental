// =============================================================================
// src/pages/v2/superadmin/plans/PlanDetail.jsx
// =============================================================================
// Detalle y edición de un plan. Detecta /editar en la URL para el modo form.
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Alert, Badge, Button, Card, Checkbox, Col, ConfigProvider, DatePicker,
  Descriptions, Form, InputNumber, Menu, Modal, Row,
  Select, Skeleton, Space, Switch, Tag, Tooltip, Typography, message,
} from "antd";
import {
  AppstoreOutlined, ArrowLeftOutlined, CalendarOutlined,
  CheckCircleOutlined, DollarOutlined, EditOutlined, FileTextOutlined,
  OrderedListOutlined, SafetyCertificateOutlined, SettingOutlined,
  StopOutlined, TagOutlined,
} from "@ant-design/icons";

import V2Layout from "../../../../layouts/V2Layout";
import {
  getPlanById, updatePlan, deactivatePlan,
  PLAN_STATUS, getPlanStatusLabel, getPlanStatusColor,
} from "../../../../services/plans.service";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Form.Item;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (amount) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "—");

const fmtLimit = (v) => (v === -1 || v == null ? "Ilimitado" : String(v));

const STATUS_BADGE = {
  draft:      "default",
  active:     "success",
  deprecated: "warning",
  expired:    "error",
  disabled:   "error",
};

const AVAILABLE_SERVICES = [
  { id: "energy_management", name: "Gestión de Energía",    description: "Control de consumos" },
  { id: "maintenance",       name: "Mantenimiento",         description: "Gestión de incidencias" },
  { id: "reports",           name: "Informes",              description: "Reportes avanzados" },
  { id: "smart_access",      name: "Smart Access Lock",     description: "Control de accesos" },
  { id: "surveys",           name: "Encuestas",             description: "Encuestas de satisfacción" },
];

// ── Secciones del menú lateral ─────────────────────────────────────────────

const SECTIONS = [
  { key: "identity", label: "Identidad",       icon: <TagOutlined /> },
  { key: "status",   label: "Estado y Vigencia", icon: <CalendarOutlined /> },
  { key: "pricing",  label: "Pricing",          icon: <DollarOutlined /> },
  { key: "limits",   label: "Límites",          icon: <SafetyCertificateOutlined /> },
  { key: "branding", label: "Branding",         icon: <AppstoreOutlined /> },
  { key: "services", label: "Servicios",        icon: <CheckCircleOutlined /> },
  { key: "rules",    label: "Reglas",           icon: <SettingOutlined /> },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function PlanDetail() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const isEdit    = location.pathname.endsWith("/editar");

  const [plan, setPlan]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [section, setSection] = useState("identity");

  const [form] = Form.useForm();

  // ── Carga ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const found = await getPlanById(id);
        if (!found) { message.error("Plan no encontrado"); navigate("/v2/superadmin/planes"); return; }
        setPlan(found);
        form.setFieldsValue({
          ...found,
          start_date: found.start_date ? dayjs(found.start_date) : null,
          end_date:   found.end_date   ? dayjs(found.end_date)   : null,
          services_included: Array.isArray(found.services_included) ? found.services_included : [],
          max_owners:            found.max_owners            ?? -1,
          max_accommodations:    found.max_accommodations    ?? -1,
          max_rooms:             found.max_rooms             ?? -1,
          max_admin_users:       found.max_admin_users       ?? -1,
          max_associated_admins: found.max_associated_admins ?? -1,
          max_api_users:         found.max_api_users         ?? -1,
          max_viewer_users:      found.max_viewer_users      ?? -1,
          tax_percent:           found.tax_percent           ?? 0,
        });
      } catch {
        message.error("Error al cargar el plan");
        navigate("/v2/superadmin/planes");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Guardar ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setSaving(true);
    try {
      const payload = {
        ...values,
        start_date:            values.start_date ? values.start_date.format("YYYY-MM-DD") : null,
        end_date:              values.end_date   ? values.end_date.format("YYYY-MM-DD")   : null,
        monthly_price:         parseFloat(values.monthly_price)         || 0,
        tax_percent:           parseFloat(values.tax_percent ?? 0),
        max_owners:            parseInt(values.max_owners            ?? -1) || -1,
        max_accommodations:    parseInt(values.max_accommodations    ?? -1) || -1,
        max_rooms:             parseInt(values.max_rooms             ?? -1) || -1,
        max_admin_users:       parseInt(values.max_admin_users       ?? -1) || -1,
        max_associated_admins: parseInt(values.max_associated_admins ?? -1) || -1,
        max_api_users:         parseInt(values.max_api_users         ?? -1) || -1,
        max_viewer_users:      parseInt(values.max_viewer_users      ?? -1) || -1,
      };
      // Limpiar aliases incorrectos y campos calculados
      delete payload.price_monthly;
      delete payload.price_annual;
      delete payload.annual_price; // columna GENERATED en BD
      await updatePlan(id, payload);
      message.success("Plan actualizado correctamente");
      navigate(`/v2/superadmin/planes/${id}`);
    } catch (e) {
      message.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Desactivar ─────────────────────────────────────────────────────────────

  const handleDeactivate = () => {
    Modal.confirm({
      title:      "Desactivar plan",
      content:    `¿Desactivar el plan "${plan?.name}"? Los clientes existentes no se verán afectados inmediatamente.`,
      okText:     "Desactivar",
      okType:     "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await deactivatePlan(id);
          message.success("Plan desactivado");
          navigate("/v2/superadmin/planes");
        } catch (e) {
          message.error(e.message || "Error al desactivar");
        }
      },
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading || !plan) {
    return (
      <V2Layout role="superadmin" userName="Administrador">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </V2Layout>
    );
  }

  // ── Breadcrumbs ────────────────────────────────────────────────────────────

  const crumbs = [
    { label: "Dashboard",       path: "/v2/superadmin" },
    { label: "Gestión de Planes", path: "/v2/superadmin/planes" },
    { label: plan.name,         path: `/v2/superadmin/planes/${id}` },
    ...(isEdit ? [{ label: "Editar", path: null }] : []),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA DETALLE (solo lectura)
  // ══════════════════════════════════════════════════════════════════════════

  if (!isEdit) {
    const statusColor = getPlanStatusColor(plan.status);
    const statusLabel = getPlanStatusLabel(plan.status);

    return (
      <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Space align="center" size={10}>
                <Title level={2} style={{ margin: 0 }}>
                  <FileTextOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
                  {plan.name}
                </Title>
                <Tag style={{
                  background: `${statusColor}18`, color: statusColor,
                  border: `1px solid ${statusColor}40`, fontWeight: 600,
                  borderRadius: 6, fontSize: 12,
                }}>
                  {statusLabel}
                </Tag>
              </Space>
              <Text type="secondary" style={{ display: "block", marginTop: 2 }}>
                Código: <code style={{ fontSize: 12 }}>{plan.code}</code>
              </Text>
            </Col>
            <Col>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/superadmin/planes")}>
                  Volver
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/v2/superadmin/planes/${id}/editar`)}
                >
                  Editar Plan
                </Button>
              </Space>
            </Col>
          </Row>

          {/* ── Cards de detalle ────────────────────────────────────────── */}
          <Row gutter={[16, 16]}>

            {/* Información General */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>INFORMACIÓN GENERAL</span>}
                style={{ borderLeft: "3px solid #0071E3", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Nombre">{plan.name}</Descriptions.Item>
                  <Descriptions.Item label="Código">
                    <code style={{ background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{plan.code}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Descripción">{plan.description || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Visible para nuevas altas">
                    <Badge status={plan.visible_for_new_accounts ? "success" : "default"}
                      text={plan.visible_for_new_accounts ? "Sí" : "No"} />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* Vigencia */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>VIGENCIA</span>}
                style={{ borderLeft: "3px solid #8B5CF6", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Fecha creación">{fmtDate(plan.created_at)}</Descriptions.Item>
                  <Descriptions.Item label="Fecha inicio">{fmtDate(plan.start_date)}</Descriptions.Item>
                  <Descriptions.Item label="Fecha fin">{plan.end_date ? fmtDate(plan.end_date) : "Sin fecha"}</Descriptions.Item>
                  {plan.deactivated_at && (
                    <Descriptions.Item label="Fecha baja">
                      <Text type="danger">{fmtDate(plan.deactivated_at)}</Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            </Col>

            {/* Pricing */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>PRICING</span>}
                style={{ borderLeft: "3px solid #10B981", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Precio mensual">
                    <Text strong>{fmt(plan.monthly_price)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Precio anual">
                    <Text strong>{fmt(plan.annual_price)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Meses gratis">{plan.annual_discount_months ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="IVA">
                    {plan.vat_applicable ? `${plan.vat_percentage}%` : "No aplica"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* Límites */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>LÍMITES</span>}
                style={{ borderLeft: "3px solid #F59E0B", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Max Owners">{fmtLimit(plan.max_owners)}</Descriptions.Item>
                  <Descriptions.Item label="Max Alojamientos">{fmtLimit(plan.max_accommodations)}</Descriptions.Item>
                  <Descriptions.Item label="Max Habitaciones">{fmtLimit(plan.max_rooms)}</Descriptions.Item>
                  <Descriptions.Item label="Max Usuarios Admin">{fmtLimit(plan.max_admin_users)}</Descriptions.Item>
                  <Descriptions.Item label="Max Asociados">{fmtLimit(plan.max_associated_admins)}</Descriptions.Item>
                  <Descriptions.Item label="Max API">{fmtLimit(plan.max_api_users)}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* Branding */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>BRANDING</span>}
                style={{ borderLeft: "3px solid #EC4899", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Branding habilitado">
                    <Badge status={plan.branding_enabled ? "success" : "default"} text={plan.branding_enabled ? "Sí" : "No"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Logo permitido">
                    <Badge status={plan.logo_allowed ? "success" : "default"} text={plan.logo_allowed ? "Sí" : "No"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Tema editable">
                    <Badge status={plan.theme_editable ? "success" : "default"} text={plan.theme_editable ? "Sí" : "No"} />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* Reglas */}
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>REGLAS</span>}
                style={{ borderLeft: "3px solid #6366F1", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 180 }}>
                  <Descriptions.Item label="Multi-owner">
                    <Badge status={plan.allows_multi_owner ? "success" : "default"} text={plan.allows_multi_owner ? "Sí" : "No"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Cambio de propietario">
                    <Badge status={plan.allows_owner_change ? "success" : "default"} text={plan.allows_owner_change ? "Sí" : "No"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Subida de recibos">
                    <Badge status={plan.allows_receipt_upload ? "success" : "default"} text={plan.allows_receipt_upload ? "Sí" : "No"} />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

          </Row>
        </div>
      </V2Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA EDICIÓN (modo formulario con menú lateral)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <OrderedListOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
              Editar Plan: {plan.name}
            </Title>
            <Text type="secondary">Modifique los parámetros del plan</Text>
          </Col>
          <Col>
            <Space>
              <Tooltip title="Desactivar este plan permanentemente">
                <Button danger icon={<StopOutlined />} onClick={handleDeactivate}>
                  Desactivar Plan
                </Button>
              </Tooltip>
              <Button onClick={() => navigate(`/v2/superadmin/planes/${id}`)}>
                Cancelar
              </Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                Guardar Cambios
              </Button>
            </Space>
          </Col>
        </Row>

        {/* ── Layout: menú lateral + formulario ────────────────────────── */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Menú lateral */}
          <div style={{ width: 168, flexShrink: 0, position: "sticky", top: 80 }}>
            <ConfigProvider theme={{ token: { colorPrimary: "#3B82F6" } }}>
              <Menu
                mode="inline"
                selectedKeys={[section]}
                onClick={({ key }) => setSection(key)}
                style={{ borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}
                items={SECTIONS.map((s) => ({ key: s.key, icon: s.icon, label: s.label }))}
              />
            </ConfigProvider>
          </div>

          {/* Formulario */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Form form={form} layout="vertical">

              {/* ── 1. Identidad ──────────────────────────────────────── */}
              {section === "identity" && (
                <Card
                  title={<span style={{ fontWeight: 700 }}>Identidad del Plan</span>}
                  style={{ borderRadius: 10 }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="name" label="Nombre" rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                        <Form.Item name="name" noStyle>
                          <input
                            className="ant-input"
                            placeholder="Business Pro"
                            style={{ width: "100%", padding: "4px 11px", borderRadius: 6, border: "1px solid #d9d9d9", fontSize: 14 }}
                            onChange={(e) => form.setFieldValue("name", e.target.value)}
                            defaultValue={form.getFieldValue("name")}
                          />
                        </Form.Item>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="code" label="Código">
                        <input
                          disabled
                          style={{ width: "100%", padding: "4px 11px", borderRadius: 6, border: "1px solid #d9d9d9", background: "#F9FAFB", fontSize: 14, fontFamily: "monospace", color: "#9CA3AF" }}
                          value={form.getFieldValue("code")}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>El código no se puede modificar</Text>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="Descripción">
                    <Form.Item name="description" noStyle>
                      <textarea
                        rows={3}
                        placeholder="Descripción del plan..."
                        style={{ width: "100%", padding: "4px 11px", borderRadius: 6, border: "1px solid #d9d9d9", fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
                        onChange={(e) => form.setFieldValue("description", e.target.value)}
                        defaultValue={form.getFieldValue("description")}
                      />
                    </Form.Item>
                  </Form.Item>
                  <Form.Item name="visible_for_new_accounts" label="Visible para nuevas altas" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                </Card>
              )}

              {/* ── 2. Estado y Vigencia ──────────────────────────────── */}
              {section === "status" && (
                <Card title={<span style={{ fontWeight: 700 }}>Estado y Vigencia</span>} style={{ borderRadius: 10 }}>
                  <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
                    <Select options={[
                      { value: "draft",      label: "Borrador" },
                      { value: "active",     label: "Activo" },
                      { value: "deprecated", label: "Obsoleto" },
                      { value: "disabled",   label: "Desactivado" },
                    ]} />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="start_date" label="Fecha de inicio">
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="end_date" label="Fecha de fin (opcional)">
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* ── 3. Pricing ────────────────────────────────────────── */}
              {section === "pricing" && (
                <Card title={<span style={{ fontWeight: 700 }}>Pricing</span>} style={{ borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="monthly_price" label="Precio mensual (€)"
                        rules={[{ required: true, message: "Obligatorio" }, { type: "number", min: 0.01, message: "Debe ser mayor que 0" }]}>
                        <InputNumber
                          style={{ width: "100%" }} min={0.01} precision={2} addonAfter="€"
                          onChange={(val) => {
                            const discount = form.getFieldValue("annual_discount_months") ?? 0;
                            form.setFieldValue("annual_price", parseFloat(((val ?? 0) * (12 - discount)).toFixed(2)));
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="annual_discount_months" label="Meses gratis (descuento anual)">
                        <InputNumber
                          style={{ width: "100%" }} min={0} max={12}
                          onChange={(val) => {
                            const monthly = form.getFieldValue("monthly_price") ?? 0;
                            form.setFieldValue("annual_price", parseFloat((monthly * (12 - (val ?? 0))).toFixed(2)));
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Precio anual (€) — calculado automáticamente">
                        <Form.Item name="annual_price" noStyle>
                          <InputNumber
                            style={{ width: "100%", background: "#F9FAFB", color: "#374151" }}
                            precision={2} addonAfter="€" disabled
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          precio mensual × (12 − meses gratis)
                        </Text>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="vat_applicable" label="Aplica IVA" valuePropName="checked">
                        <Switch checkedChildren="Sí" unCheckedChildren="No" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="vat_percentage" label="Porcentaje IVA (%)">
                        <InputNumber style={{ width: "100%" }} min={0} max={100} addonAfter="%" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* ── 4. Límites ────────────────────────────────────────── */}
              {section === "limits" && (
                <Card title={<span style={{ fontWeight: 700 }}>Límites del Plan</span>} style={{ borderRadius: 10 }}>
                  <Alert
                    type="info" showIcon style={{ marginBottom: 16 }}
                    message="Usa -1 para indicar ilimitado en cualquier campo"
                  />
                  <Row gutter={16}>
                    {[
                      { name: "max_owners",            label: "Max Owners" },
                      { name: "max_accommodations",    label: "Max Alojamientos" },
                      { name: "max_rooms",             label: "Max Habitaciones" },
                      { name: "max_admin_users",       label: "Max Usuarios Admin" },
                      { name: "max_associated_admins", label: "Max Asociados" },
                      { name: "max_api_users",         label: "Max Usuarios API" },
                      { name: "max_viewer_users",      label: "Max Viewers" },
                    ].map((f) => (
                      <Col xs={24} md={12} key={f.name}>
                        <Form.Item name={f.name} label={f.label}
                          rules={[{ type: "number", message: "Debe ser un número" }]}>
                          <InputNumber style={{ width: "100%" }} min={-1} />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </Card>
              )}

              {/* ── 5. Branding ───────────────────────────────────────── */}
              {section === "branding" && (
                <Card title={<span style={{ fontWeight: 700 }}>Branding</span>} style={{ borderRadius: 10 }}>
                  <Form.Item name="branding_enabled" label="Branding habilitado" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                  <Form.Item name="logo_allowed" label="Logo personalizado permitido" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                  <Form.Item name="theme_editable" label="Tema editable por el cliente" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                </Card>
              )}

              {/* ── 6. Servicios ──────────────────────────────────────── */}
              {section === "services" && (
                <Card title={<span style={{ fontWeight: 700 }}>Servicios Incluidos</span>} style={{ borderRadius: 10 }}>
                  <Form.Item name="services_included" label="Servicios habilitados en este plan">
                    <Checkbox.Group style={{ width: "100%" }}>
                      <Row gutter={[16, 12]}>
                        {AVAILABLE_SERVICES.map((svc) => (
                          <Col xs={24} md={12} key={svc.id}>
                            <Checkbox value={svc.id}>
                              <Space direction="vertical" size={0}>
                                <Text strong style={{ fontSize: 13 }}>{svc.name}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{svc.description}</Text>
                              </Space>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                </Card>
              )}

              {/* ── 7. Reglas ─────────────────────────────────────────── */}
              {section === "rules" && (
                <Card title={<span style={{ fontWeight: 700 }}>Reglas Funcionales</span>} style={{ borderRadius: 10 }}>
                  <Form.Item name="allows_multi_owner" label="Permite múltiples propietarios" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                  <Form.Item name="allows_owner_change" label="Permite cambio de propietario" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                  <Form.Item name="allows_receipt_upload" label="Permite subida de recibos" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                </Card>
              )}

            </Form>
          </div>
        </div>
      </div>
    </V2Layout>
  );
}
