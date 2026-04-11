// src/pages/v2/admin/settings/AdminSettings.jsx
// Página de configuración de la cuenta admin

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Card, Col, Divider, Form, Input, Modal,
  Row, Select, Skeleton, Space, Tag, Tabs, Typography, message,
} from "antd";
import {
  SaveOutlined, ReloadOutlined, UserOutlined,
  BgColorsOutlined, CrownOutlined, InfoCircleOutlined, BankOutlined, HomeOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useTenant } from "../../../../providers/TenantProvider";
import { supabase } from "../../../../services/supabaseClient";
import EntityFormFields from "../../../../components/shared/EntityFormFields";
import { PROVINCIAS_ES } from "../../../../constants/formOptions";
import { createEntity, updateEntity } from "../../../../services/entities.service";

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

function DataRow({ label, value, valueStyle }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500, ...valueStyle }}>{value || "—"}</span>
    </div>
  );
}

function SectionBlock({ title, extra, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, paddingBottom: 8, borderBottom: "2px solid #F3F4F6" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", letterSpacing: "0.04em", textTransform: "uppercase" }}>{title}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

export default function AdminSettings() {
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const { tenant: _tenant, planCode, billingCycle, accountStatus, branding: _branding } = useTenant();

  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState(null);

  const [brandingForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [entityForm] = Form.useForm();
  const [ownerForm] = Form.useForm();

  const [entityData, setEntityData] = useState(null);
  const [savingEntity, setSavingEntity] = useState(false);
  const [entityLegalType, setEntityLegalType] = useState("persona_juridica");

  const [ownerData, setOwnerData] = useState(null);
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerLegalType, setOwnerLegalType] = useState("persona_juridica");

  const [userEmail, setUserEmail] = useState("");
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [editBillingModalVisible, setEditBillingModalVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener email del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "");

      const ENTITY_SELECT = "id, legal_type, legal_name, first_name, last_name1, last_name2, nickname, gender, tax_id, billing_email, phone, country, province, city, zip, street, street_number, address_extra, status, type";
      const [{ data, error: err }, { data: payerEntities }] = await Promise.all([
        supabase.from("client_accounts")
          .select("id, name, slug, plan_code, billing_cycle, status, start_date, end_date, branding_name, branding_primary_color, branding_secondary_color, branding_logo_url, contact_email, contact_phone, last_name1, last_name2, created_at")
          .single(),
        supabase.from("entities")
          .select(ENTITY_SELECT)
          .eq("type", "payer")
          .order("created_at", { ascending: true })
          .limit(1),
      ]);
      if (err) throw new Error(err.message);
      setAccountData(data);

      const entity = payerEntities?.[0] || null;
      setEntityData(entity);
      if (entity) {
        setEntityLegalType(entity.legal_type || "persona_juridica");
        entityForm.setFieldsValue({
          legal_type: entity.legal_type || null,
          legal_name: entity.legal_name || "",
          first_name: entity.first_name || "",
          last_name1: entity.last_name1 || "",
          last_name2: entity.last_name2 || "",
          nickname: entity.nickname || "",
          gender: entity.gender || null,
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

      // Propietario de cuenta: datos directamente de client_accounts
      const ownerFromAccount = {
        first_name:    data.name            || "",
        last_name1:    data.last_name1      || "",
        last_name2:    data.last_name2      || "",
        billing_email: data.contact_email   || "",
        phone:         data.contact_phone   || "",
      };
      setOwnerData(ownerFromAccount);
      ownerForm.setFieldsValue(ownerFromAccount);

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
  }, [brandingForm, contactForm, entityForm, ownerForm]);

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

  const buildEntityPatch = (values) => ({
    legal_type: values.legal_type || null,
    legal_name: values.legal_name || null,
    first_name: values.first_name || null,
    last_name1: values.last_name1 || null,
    last_name2: values.last_name2 || null,
    nickname: values.nickname || null,
    gender: values.gender || null,
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
  });

  const handleSaveEntity = async (values) => {
    setSavingEntity(true);
    try {
      if (entityData?.id) {
        await updateEntity(entityData.id, { ...buildEntityPatch(values), type: "payer" }, clientAccountId);
      } else {
        await createEntity({ ...buildEntityPatch(values), type: "payer", client_account_id: clientAccountId });
      }
      message.success("Entidad de facturación guardada correctamente");
      setEditBillingModalVisible(false);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingEntity(false);
    }
  };

  const handleSaveOwner = async (values) => {
    setSavingOwner(true);
    try {
      const fullName = [values.first_name, values.last_name1, values.last_name2]
        .filter(Boolean).join(" ");

      // Guardar todo en client_accounts
      const { error: err } = await supabase
        .from("client_accounts")
        .update({
          name:          values.first_name     || accountData.name,
          last_name1:    values.last_name1     || null,
          last_name2:    values.last_name2     || null,
          contact_email: values.billing_email  || null,
          contact_phone: values.phone          || null,
        })
        .eq("id", accountData.id);
      if (err) throw new Error(err.message);

      // Actualizar auth.users metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName, phone: values.phone || null }
      });

      message.success("Información de usuario guardada correctamente");
      setEditUserModalVisible(false);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingOwner(false);
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
      label: <span><InfoCircleOutlined /> Mi Cuenta</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : accountData ? (
            <>
              {/* Información de la Cuenta */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Información de la Cuenta</span>}
                style={{ marginBottom: 20 }}
                extra={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>}
              >
                <SectionBlock title="Cuenta">
                  <div style={{ display: "flex", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Usuario de acceso</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>{userEmail || "—"}</span>
                      <Tag color="blue" style={{ margin: 0 }}>Admin</Tag>
                    </span>
                  </div>
                  <DataRow label="Nombre de cuenta" value={[accountData.name, accountData.last_name1, accountData.last_name2].filter(Boolean).join(" ")} />
                  <div style={{ display: "flex", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Estado</span>
                    <Tag color={STATUS_COLORS[accountData.status] || "default"} style={{ margin: 0 }}>
                      {STATUS_LABELS[accountData.status] || accountData.status}
                    </Tag>
                  </div>
                  <DataRow label="Fecha de alta"  value={fDate(accountData.created_at)} />
                  <DataRow label="Teléfono"       value={ownerData?.phone || accountData.contact_phone} />
                </SectionBlock>
              </Card>

              {/* Información de Usuario */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Información de Usuario</span>}
                style={{ marginBottom: 20 }}
                extra={
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => setEditUserModalVisible(true)}>
                    Editar
                  </Button>
                }
              >
                {accountData?.name || accountData?.contact_email ? (
                  <SectionBlock title="Propietario de la Cuenta">
                    <DataRow label="Nombre"     value={accountData?.name} />
                    <DataRow label="Apellido 1" value={accountData?.last_name1} />
                    <DataRow label="Apellido 2" value={accountData?.last_name2} />
                    <DataRow label="Email"     value={accountData?.contact_email} />
                    <DataRow label="Teléfono"  value={accountData?.contact_phone} />
                  </SectionBlock>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message="No hay información de usuario registrada"
                    description="Haz clic en 'Editar' para añadir la información del usuario propietario de la cuenta."
                  />
                )}
              </Card>

              {/* Cambio de Contraseña */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Cambio de contraseña</span>}
              >
                <Alert
                  type="info"
                  showIcon
                  message="Cambio de contraseña"
                  description="Para cambiar tu contraseña, cierra sesión y usa la opción '¿Olvidaste tu contraseña?' en el login."
                />
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
                title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Plan contratado</span>}
                style={{ marginBottom: 20 }}
              >
                <Row gutter={[24, 16]} align="middle">
                  {/* Tarjeta visual del plan */}
                  <Col xs={24} sm={7}>
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
                  {/* Detalle del plan con DataRow */}
                  <Col xs={24} sm={17}>
                    <SectionBlock title="Suscripción">
                      <div style={{ display: "flex", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Código de plan</span>
                        <Tag color={PLAN_COLORS[planCode || accountData?.plan_code] || "default"} style={{ margin: 0 }}>
                          {planCode || accountData?.plan_code || "—"}
                        </Tag>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Estado</span>
                        <Tag color={STATUS_COLORS[accountStatus || accountData?.status] || "default"} style={{ margin: 0 }}>
                          {STATUS_LABELS[accountStatus || accountData?.status] || accountStatus || "—"}
                        </Tag>
                      </div>
                      {accountData?.start_date && <DataRow label="Inicio"      value={fDate(accountData.start_date)} />}
                      {accountData?.end_date   && <DataRow label="Vencimiento" value={fDate(accountData.end_date)} />}
                    </SectionBlock>
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
            <Card size="small" title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Personalización visual</span>}>
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
      key: "facturacion",
      label: <span><BankOutlined /> Entidad de Facturación</span>,
      children: (
        <div>
          {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
            <Card
              size="small"
              title={<span style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" }}>Información de la Entidad de Facturación</span>}
              extra={
                <Button
                  size="small"
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => setEditBillingModalVisible(true)}
                >
                  Editar
                </Button>
              }
            >
              <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
                Datos fiscales y de facturación de la entidad responsable del pago
              </Text>
              {entityData ? (
                <>
                  <SectionBlock title="Tipo de Entidad">
                    <Tag color={entityData.legal_type === "persona_juridica" ? "blue" : "default"} style={{ marginTop: 8 }}>
                      {LEGAL_TYPE_OPTIONS.find(opt => opt.value === entityData.legal_type)?.label || entityData.legal_type}
                    </Tag>
                  </SectionBlock>

                  <SectionBlock title="Datos Fiscales">
                    <DataRow label="Razón social" value={entityData.legal_name} />
                    <DataRow label="CIF / NIF"    value={entityData.tax_id} />
                  </SectionBlock>

                  <SectionBlock title="Dirección Fiscal">
                    <DataRow label="Calle"         value={[entityData.street, entityData.street_number].filter(Boolean).join(" ") || "—"} />
                    <DataRow label="Info adicional" value={entityData.address_extra} />
                    <DataRow label="Código postal"  value={entityData.zip} />
                    <DataRow label="Ciudad"         value={entityData.city} />
                    <DataRow label="Provincia"      value={entityData.province} />
                    <DataRow label="País"           value={entityData.country} />
                  </SectionBlock>

                  <SectionBlock title="Contacto de Facturación">
                    <DataRow label="Email"    value={entityData.billing_email} />
                    <DataRow label="Teléfono" value={entityData.phone} />
                  </SectionBlock>
                </>
              ) : (
                <Alert
                  type="info"
                  showIcon
                  message="No hay entidad de facturación registrada"
                  description="Haz clic en 'Editar' para añadir la información de facturación."
                />
              )}
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Modal: Editar Información de Usuario */}
      <Modal
        title="Información de Usuario (persona o entidad propietaria de la cuenta)"
        open={editUserModalVisible}
        onCancel={() => setEditUserModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={ownerForm} layout="vertical" onFinish={handleSaveOwner}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Nombre de la Persona propietaria de la Cuenta"
                name="first_name"
                rules={[{ required: true, message: "Campo requerido" }]}
              >
                <Input placeholder="María Rosa" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Primer Apellido" name="last_name1">
                <Input placeholder="Martínez" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Segundo Apellido" name="last_name2">
                <Input placeholder="Díaz" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email de contacto"
                name="billing_email"
                rules={[
                  { required: true, message: "Campo requerido" },
                  { type: "email", message: "Email no válido" }
                ]}
              >
                <Input placeholder="rosikikkki@gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Teléfono"
                name="phone"
                rules={[{ required: true, message: "Campo requerido" }]}
              >
                <Input placeholder="+34658520256" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button onClick={() => setEditUserModalVisible(false)} style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingOwner}>
              Guardar cambios
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal: Editar Entidad de Facturación */}
      <Modal
        title="Entidad Pagadora"
        open={editBillingModalVisible}
        onCancel={() => setEditBillingModalVisible(false)}
        footer={null}
        width={900}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Datos fiscales y de facturación de la entidad responsable del pago. Se creará exactamente una entidad pagadora por cuenta.
        </Text>
        <Form form={entityForm} layout="vertical" onFinish={handleSaveEntity}>
          {/* Tipo de Entidad */}
          <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280", marginTop: 0 }}>Tipo de Entidad</Divider>
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item
                label="Tipo de entidad"
                name="legal_type"
                rules={[{ required: true, message: "Seleccione el tipo legal" }]}
              >
                <Select
                  options={LEGAL_TYPE_OPTIONS}
                  placeholder="Seleccionar"
                  onChange={(value) => setEntityLegalType(value)}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Datos Fiscales */}
          <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>Datos Fiscales</Divider>
          <EntityFormFields legalType={entityLegalType} showLegalTypeSelector={false} />

          {/* Dirección Fiscal */}
          <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280", marginTop: 16 }}>Dirección Fiscal</Divider>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="Calle" name="street" rules={[{ required: true, message: "Campo requerido" }]}>
                <Input placeholder="Calle Gran Vía" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label="Número" name="street_number">
                <Input placeholder="45" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label="Info adicional" name="address_extra">
                <Input placeholder="Planta 3, Oficina 12" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label="Código postal" name="zip" rules={[{ required: true, message: "Campo requerido" }]}>
                <Input placeholder="28013" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item label="Ciudad" name="city" rules={[{ required: true, message: "Campo requerido" }]}>
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={9}>
              <Form.Item label="Provincia" name="province">
                <Select
                  options={PROVINCIAS_ES}
                  placeholder="Seleccionar"
                  showSearch
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="País" name="country" rules={[{ required: true, message: "Campo requerido" }]}>
                <Input placeholder="España" />
              </Form.Item>
            </Col>
          </Row>

          {/* Contacto de Facturación */}
          <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>Contacto de Facturación</Divider>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email de facturación"
                name="billing_email"
                rules={[
                  { required: true, message: "Campo requerido" },
                  { type: "email", message: "Email no válido" }
                ]}
              >
                <Input placeholder="Rosi@gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Teléfono de facturación" name="phone">
                <Input placeholder="+34 915 123 456" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button onClick={() => setEditBillingModalVisible(false)} style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingEntity}>
              Guardar cambios
            </Button>
          </div>
        </Form>
      </Modal>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
      </div>
    </V2Layout>
  );
}
