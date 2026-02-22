// src/pages/v2/admin/settings/AdminSettings.jsx
// Página de configuración de la cuenta admin

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Card, Col, Divider, Form, Input,
  Row, Select, Skeleton, Space, Tag, Tabs, Typography, message,
} from "antd";
import {
  SaveOutlined, ReloadOutlined, UserOutlined,
  BgColorsOutlined, CrownOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

const PLAN_LABELS = {
  basic: "Plan Basic",
  agent: "Plan Agent",
  pro: "Plan Pro",
  enterprise: "Plan Enterprise",
};

const PLAN_COLORS = {
  basic: "default",
  agent: "blue",
  pro: "purple",
  enterprise: "gold",
};

const BILLING_LABELS = {
  monthly: "Mensual",
  annual: "Anual",
  yearly: "Anual",
};

const STATUS_COLORS = {
  active: "success",
  suspended: "warning",
  cancelled: "error",
  trial: "processing",
};

const STATUS_LABELS = {
  active: "Activa",
  suspended: "Suspendida",
  cancelled: "Cancelada",
  trial: "Prueba",
};

export default function AdminSettings() {
  const { userName, companyBranding } = useAdminLayout();
  const { tenant, planCode, billingCycle, accountStatus, branding } = useTenant();

  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState(null);

  const [brandingForm] = Form.useForm();
  const [contactForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("client_accounts")
        .select("id, name, slug, plan_code, billing_cycle, status, start_date, end_date, branding_name, branding_primary_color, branding_secondary_color, branding_logo_url, contact_email, contact_phone, created_at")
        .single();
      if (err) throw new Error(err.message);
      setAccountData(data);

      brandingForm.setFieldsValue({
        branding_name: data.branding_name || data.name || "",
        branding_primary_color: data.branding_primary_color || "#0071E3",
        branding_secondary_color: data.branding_secondary_color || "",
        branding_logo_url: data.branding_logo_url || "",
      });
      contactForm.setFieldsValue({
        name: data.name || "",
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [brandingForm, contactForm]);

  useEffect(() => { load(); }, [load]);

  const handleSaveBranding = async (values) => {
    setSavingBranding(true);
    try {
      const { error: err } = await supabase
        .from("client_accounts")
        .update({
          branding_name: values.branding_name || null,
          branding_primary_color: values.branding_primary_color || null,
          branding_secondary_color: values.branding_secondary_color || null,
          branding_logo_url: values.branding_logo_url || null,
        })
        .eq("id", accountData.id);
      if (err) throw new Error(err.message);
      message.success("Branding actualizado correctamente");
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSaveContact = async (values) => {
    setSavingContact(true);
    try {
      const { error: err } = await supabase
        .from("client_accounts")
        .update({
          name: values.name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
        })
        .eq("id", accountData.id);
      if (err) throw new Error(err.message);
      message.success("Datos de contacto actualizados");
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingContact(false);
    }
  };

  const fDate = (d) => d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const tabItems = [
    {
      key: "cuenta",
      label: <span><InfoCircleOutlined /> Cuenta</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : accountData ? (
            <>
              {/* Info de la cuenta */}
              <Card
                size="small"
                title="Información de la cuenta"
                style={{ marginBottom: 20 }}
                extra={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>}
              >
                <Row gutter={[24, 12]}>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Nombre de cuenta</Text>
                    <Text strong>{accountData.name || "—"}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Slug / Identificador</Text>
                    <Text code>{accountData.slug || "—"}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Estado</Text>
                    <Tag color={STATUS_COLORS[accountData.status] || "default"}>
                      {STATUS_LABELS[accountData.status] || accountData.status}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Fecha de alta</Text>
                    <Text>{fDate(accountData.created_at)}</Text>
                  </Col>
                  {accountData.contact_email && (
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Email de contacto</Text>
                      <Text>{accountData.contact_email}</Text>
                    </Col>
                  )}
                  {accountData.contact_phone && (
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Teléfono</Text>
                      <Text>{accountData.contact_phone}</Text>
                    </Col>
                  )}
                </Row>
              </Card>

              {/* Editar datos de contacto */}
              <Card size="small" title="Editar datos de contacto">
                <Form form={contactForm} layout="vertical" onFinish={handleSaveContact}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Nombre de la cuenta" name="name">
                        <Input placeholder="Mi empresa SL" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Email de contacto" name="contact_email"
                        rules={[{ type: "email", message: "Email no válido" }]}>
                        <Input placeholder="admin@miempresa.com" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Teléfono" name="contact_phone">
                        <Input placeholder="+34 600 000 000" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingContact}>
                    Guardar cambios
                  </Button>
                </Form>
              </Card>
            </>
          ) : (
            <Alert type="error" message={error || "No se pudo cargar la información de la cuenta"} showIcon />
          )}
        </div>
      ),
    },
    {
      key: "plan",
      label: <span><CrownOutlined /> Plan y suscripción</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : (
            <>
              <Card
                size="small"
                title="Plan contratado"
                style={{ marginBottom: 20 }}
              >
                <Row gutter={[24, 16]} align="middle">
                  <Col xs={24} sm={8}>
                    <div style={{
                      background: "linear-gradient(135deg, #0071E3 0%, #0051a8 100%)",
                      borderRadius: 16, padding: "24px 20px", textAlign: "center", color: "#fff",
                    }}>
                      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Plan activo</div>
                      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                        {PLAN_LABELS[planCode || accountData?.plan_code] || planCode || accountData?.plan_code || "—"}
                      </div>
                      <Tag color="rgba(255,255,255,0.25)" style={{ marginTop: 10, color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>
                        {BILLING_LABELS[billingCycle || accountData?.billing_cycle] || billingCycle || "—"}
                      </Tag>
                    </div>
                  </Col>
                  <Col xs={24} sm={16}>
                    <Row gutter={[16, 12]}>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Código de plan</Text>
                        <Tag color={PLAN_COLORS[planCode || accountData?.plan_code] || "default"}>
                          {planCode || accountData?.plan_code || "—"}
                        </Tag>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Estado de suscripción</Text>
                        <Tag color={STATUS_COLORS[accountStatus || accountData?.status] || "default"}>
                          {STATUS_LABELS[accountStatus || accountData?.status] || accountStatus || "—"}
                        </Tag>
                      </Col>
                      {accountData?.start_date && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Inicio</Text>
                          <Text>{fDate(accountData.start_date)}</Text>
                        </Col>
                      )}
                      {accountData?.end_date && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Vencimiento</Text>
                          <Text>{fDate(accountData.end_date)}</Text>
                        </Col>
                      )}
                    </Row>
                  </Col>
                </Row>
              </Card>

              <Alert
                type="info"
                showIcon
                icon={<CrownOutlined />}
                message="¿Quieres cambiar de plan?"
                description="Para cambiar tu plan de suscripción, contacta con el equipo de SmartRoom Rental. Podemos ayudarte a encontrar el plan que mejor se adapte a tus necesidades."
                action={
                  <Button type="primary" size="small" href="mailto:soporte@smartroomrental.com">
                    Contactar
                  </Button>
                }
              />
            </>
          )}
        </div>
      ),
    },
    {
      key: "branding",
      label: <span><BgColorsOutlined /> Branding</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : (
            <Card size="small" title="Personalización visual">
              <Alert
                type="info"
                showIcon
                message="Los cambios de branding se aplicarán en el próximo inicio de sesión"
                style={{ marginBottom: 20 }}
              />
              <Form form={brandingForm} layout="vertical" onFinish={handleSaveBranding}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Nombre de la empresa (branding)" name="branding_name">
                      <Input placeholder="Mi Empresa SL" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="URL del logotipo" name="branding_logo_url"
                      extra="URL pública de la imagen (PNG, SVG recomendado)">
                      <Input placeholder="https://miempresa.com/logo.png" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Color primario" name="branding_primary_color"
                      extra="Formato hexadecimal: #RRGGBB">
                      <Input placeholder="#0071E3" maxLength={7} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Color secundario (opcional)" name="branding_secondary_color">
                      <Input placeholder="#34C759" maxLength={7} />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Preview */}
                <Divider>Vista previa</Divider>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const name = getFieldValue("branding_name") || "Mi Empresa";
                    const color = getFieldValue("branding_primary_color") || "#0071E3";
                    const logo = getFieldValue("branding_logo_url");
                    return (
                      <div style={{
                        background: color, borderRadius: 12, padding: "16px 20px",
                        display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
                      }}>
                        {logo ? (
                          <img src={logo} alt="logo" style={{ height: 36, borderRadius: 6, background: "#fff", padding: 2 }} onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontWeight: 700, fontSize: 18,
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{name}</div>
                          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                            {PLAN_LABELS[planCode] || "Panel de Gestión"}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>

                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingBranding}>
                  Guardar branding
                </Button>
              </Form>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "usuario",
      label: <span><UserOutlined /> Mi usuario</span>,
      children: (
        <Card size="small" title="Información del usuario actual">
          <Row gutter={[24, 12]}>
            <Col xs={24} sm={12}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Nombre</Text>
              <Text strong>{userName}</Text>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Rol</Text>
              <Tag color="blue">Admin</Tag>
            </Col>
          </Row>
          <Divider />
          <Alert
            type="info"
            showIcon
            message="Cambio de contraseña"
            description="Para cambiar tu contraseña, cierra sesión y usa la opción '¿Olvidaste tu contraseña?' en el login."
          />
        </Card>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>⚙️ Configuración</Title>
          <Text type="secondary">Gestiona los datos de tu cuenta, plan y personalización</Text>
        </Col>
      </Row>

      {error && !loading && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Tabs items={tabItems} defaultActiveKey="cuenta" />
    </V2Layout>
  );
}
