// src/pages/v2/admin/settings/AdminSettings.jsx
// Página de configuración de la cuenta admin

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Card, Col, Divider, Form, Input,
  Row, Select, Skeleton, Space, Tag, Tabs, Typography, message,
} from "antd";
import {
  SaveOutlined, ReloadOutlined, UserOutlined,
  BgColorsOutlined, CrownOutlined, InfoCircleOutlined, BankOutlined,
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
  const { tenant: _tenant, planCode, billingCycle, accountStatus, branding: _branding } = useTenant();

  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState(null);

  const [brandingForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [entityForm] = Form.useForm();

  const [entityData, setEntityData] = useState(null);
  const [savingEntity, setSavingEntity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data, error: err }, { data: entities }] = await Promise.all([
        supabase.from("client_accounts")
          .select("id, name, slug, plan_code, billing_cycle, status, start_date, end_date, branding_name, branding_primary_color, branding_secondary_color, branding_logo_url, contact_email, contact_phone, created_at")
          .single(),
        supabase.from("entities")
          .select("id, legal_type, legal_name, first_name, last_name1, last_name2, tax_id, billing_email, phone, country, province, city, zip, street, street_number, address_extra, status")
          .order("created_at", { ascending: true })
          .limit(1),
      ]);
      if (err) throw new Error(err.message);
      setAccountData(data);
      const entity = entities?.[0] || null;
      setEntityData(entity);
      if (entity) {
        entityForm.setFieldsValue({
          legal_type: entity.legal_type || null,
          legal_name: entity.legal_name || "",
          first_name: entity.first_name || "",
          last_name1: entity.last_name1 || "",
          last_name2: entity.last_name2 || "",
          tax_id: entity.tax_id || "",
          billing_email: entity.billing_email || "",
          phone: entity.phone || "",
          street: entity.street || "",
          street_number: entity.street_number || "",
          address_extra: entity.address_extra || "",
          city: entity.city || "",
          zip: entity.zip || "",
          province: entity.province || "",
          country: entity.country || "",
        });
      }

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
  }, [brandingForm, contactForm, entityForm]);

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

  const handleSaveEntity = async (values) => {
    if (!entityData?.id) return;
    setSavingEntity(true);
    try {
      const { error: err } = await supabase
        .from("entities")
        .update({
          legal_type: values.legal_type || null,
          legal_name: values.legal_name || null,
          first_name: values.first_name || null,
          last_name1: values.last_name1 || null,
          last_name2: values.last_name2 || null,
          tax_id: values.tax_id || null,
          billing_email: values.billing_email || null,
          phone: values.phone || null,
          street: values.street || null,
          street_number: values.street_number || null,
          address_extra: values.address_extra || null,
          city: values.city || null,
          zip: values.zip || null,
          province: values.province || null,
          country: values.country || null,
        })
        .eq("id", entityData.id);
      if (err) throw new Error(err.message);
      message.success("Entidad pagadora actualizada");
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingEntity(false);
    }
  };

  const LEGAL_TYPE_OPTIONS = [
    { value: "persona_fisica", label: "Persona física" },
    { value: "autonomo", label: "Autónomo" },
    { value: "persona_juridica", label: "Persona jurídica / Empresa" },
  ];

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
                      <Form.Item noStyle shouldUpdate={(p, c) => p.branding_primary_color !== c.branding_primary_color}>
                        {({ getFieldValue, setFieldValue }) => (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Input
                              value={getFieldValue("branding_primary_color") || ""}
                              onChange={(e) => setFieldValue("branding_primary_color", e.target.value)}
                              placeholder="#0071E3"
                              maxLength={7}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="color"
                              value={getFieldValue("branding_primary_color") || "#0071E3"}
                              onChange={(e) => setFieldValue("branding_primary_color", e.target.value)}
                              style={{ width: 40, height: 32, border: "1px solid #d9d9d9", borderRadius: 6, cursor: "pointer", padding: 2 }}
                              title="Seleccionar color"
                            />
                          </div>
                        )}
                      </Form.Item>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Color secundario (opcional)" name="branding_secondary_color">
                      <Form.Item noStyle shouldUpdate={(p, c) => p.branding_secondary_color !== c.branding_secondary_color}>
                        {({ getFieldValue, setFieldValue }) => (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Input
                              value={getFieldValue("branding_secondary_color") || ""}
                              onChange={(e) => setFieldValue("branding_secondary_color", e.target.value)}
                              placeholder="#34C759"
                              maxLength={7}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="color"
                              value={getFieldValue("branding_secondary_color") || "#34C759"}
                              onChange={(e) => setFieldValue("branding_secondary_color", e.target.value)}
                              style={{ width: 40, height: 32, border: "1px solid #d9d9d9", borderRadius: 6, cursor: "pointer", padding: 2 }}
                              title="Seleccionar color"
                            />
                          </div>
                        )}
                      </Form.Item>
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
      key: "entidad",
      label: <span><BankOutlined /> Entidad Pagadora</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : !entityData ? (
            <Alert
              type="warning"
              showIcon
              message="No hay entidad pagadora registrada"
              description="Crea una entidad desde la sección Entidades para poder gestionarla aquí."
            />
          ) : (
            <Card size="small" title="Datos de la entidad pagadora" extra={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>}>
              <Form form={entityForm} layout="vertical" onFinish={handleSaveEntity}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Tipo de entidad" name="legal_type">
                      <Select options={LEGAL_TYPE_OPTIONS} placeholder="Seleccionar" allowClear />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={16}>
                    <Form.Item label="Razón social / Nombre legal" name="legal_name">
                      <Input placeholder="Mi Empresa SL" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Nombre" name="first_name">
                      <Input placeholder="Juan" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Primer apellido" name="last_name1">
                      <Input placeholder="García" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Segundo apellido" name="last_name2">
                      <Input placeholder="López" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="NIF / CIF" name="tax_id">
                      <Input placeholder="B12345678" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Email de facturación" name="billing_email"
                      rules={[{ type: "email", message: "Email no válido" }]}>
                      <Input placeholder="facturacion@empresa.com" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Teléfono" name="phone">
                      <Input placeholder="+34 600 000 000" />
                    </Form.Item>
                  </Col>
                </Row>
                <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>Dirección</Divider>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Calle" name="street">
                      <Input placeholder="Calle Mayor" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={4}>
                    <Form.Item label="Número" name="street_number">
                      <Input placeholder="12" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Piso / Puerta" name="address_extra">
                      <Input placeholder="3º B" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Ciudad" name="city">
                      <Input placeholder="Madrid" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={4}>
                    <Form.Item label="C.P." name="zip">
                      <Input placeholder="28001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item label="Provincia" name="province">
                      <Input placeholder="Madrid" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item label="País" name="country">
                      <Input placeholder="España" />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingEntity}>
                  Guardar entidad
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
