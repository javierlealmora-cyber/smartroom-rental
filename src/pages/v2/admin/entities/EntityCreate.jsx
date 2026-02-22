import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { createEntity } from "../../../../services/entities.service";

const LEGAL_TYPES = [
  { value: "autonomo", label: "Autónomo" },
  { value: "persona_fisica", label: "Persona física" },
  { value: "persona_juridica", label: "Persona jurídica" },
];

const PROVINCIAS_ES = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona",
  "Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba","Cuenca",
  "Girona","Granada","Guadalajara","Guipúzcoa","Huelva","Huesca","Islas Baleares",
  "Jaén","La Coruña","La Rioja","Las Palmas","León","Lleida","Lugo","Madrid","Málaga",
  "Murcia","Navarra","Ourense","Palencia","Pontevedra","Salamanca","Santa Cruz de Tenerife",
  "Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo","Valencia","Valladolid",
  "Vizcaya","Zamora","Zaragoza","Ceuta","Melilla",
];

export default function EntityCreate() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const canWrite = role !== "viewer";

  const [form] = Form.useForm();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const legalType = Form.useWatch("legal_type", form) || "persona_juridica";
  const isCompany = legalType === "persona_juridica";

  const canSubmit = useMemo(() => !!clientAccountId, [clientAccountId]);

  const onFinish = async (values) => {
    if (!canWrite || !canSubmit || busy) return;

    setBusy(true);
    setError(null);

    try {
      await createEntity({
        client_account_id: clientAccountId,
        type: "owner",
        status: "active",
        legal_type: values.legal_type,
        legal_name: values.legal_name || null,
        first_name: values.first_name || null,
        last_name1: values.last_name1 || null,
        last_name2: values.last_name2 || null,
        tax_id: values.tax_id || null,
        billing_email: values.billing_email || null,
        phone: values.phone || null,
        country: values.country || "Espana",
        province: values.province || null,
        city: values.city || null,
        zip: values.zip || null,
        street: values.street || null,
        street_number: values.street_number || null,
        address_extra: values.address_extra || null,
      });

      navigate("/v2/admin/entidades", { replace: true });
    } catch (err) {
      setError(err?.message || "Error creando entidad");
      setBusy(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        Nueva entidad
      </Typography.Title>
      <Typography.Text type="secondary">
        Se crea dentro de tu Cuenta Cliente
      </Typography.Text>

      <div style={{ height: 16 }} />

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            legal_type: "persona_juridica",
            country: "Espana",
          }}
          onFinish={onFinish}
          disabled={!canWrite || busy}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Tipo legal"
                name="legal_type"
                rules={[{ required: true, message: "Seleccione el tipo legal" }]}
              >
                <Select
                  options={LEGAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </Form.Item>
            </Col>

            {isCompany ? (
              <Col xs={24} md={16}>
                <Form.Item
                  label="Razón social"
                  name="legal_name"
                  rules={[{ required: true, message: "Indique la razón social" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            ) : (
              <>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Nombre"
                    name="first_name"
                    rules={[{ required: true, message: "Indique el nombre" }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Apellido 1"
                    name="last_name1"
                    rules={[{ required: true, message: "Indique el primer apellido" }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Apellido 2" name="last_name2">
                    <Input />
                  </Form.Item>
                </Col>
              </>
            )}

            <Col xs={24} md={8}>
              <Form.Item label="NIF/CIF" name="tax_id">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Email" name="billing_email" rules={[{ type: "email", message: "Email inválido" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Teléfono" name="phone">
                <Input />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Divider orientation="left" style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 4px" }}>Dirección</Divider>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Tipo de vía" name="street"
                extra="Ej: Calle Mayor, Avda. de la Constitución, Plaza del Sol...">
                <Input placeholder="Calle, Avenida, Plaza, Paseo..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Número" name="street_number">
                <Input placeholder="12" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Piso" name="floor">
                <Input placeholder="2" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Puerta" name="door">
                <Input placeholder="A" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Código Postal" name="zip">
                <Input placeholder="28001" maxLength={5} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Ciudad / Municipio" name="city">
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Provincia" name="province">
                <Select
                  showSearch
                  placeholder="Seleccionar provincia..."
                  optionFilterProp="label"
                  options={PROVINCIAS_ES.map((p) => ({ value: p, label: p }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="País" name="country">
                <Input placeholder="España" />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Información adicional" name="address_extra"
                extra="Escalera, bloque, referencia catastral, etc.">
                <Input placeholder="Escalera B, Bloque 3..." />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end">
            <Col>
              <Space>
                <Button onClick={() => navigate("/v2/admin/entidades")}>Volver</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={busy}
                  disabled={!canWrite || !canSubmit}
                >
                  {canWrite ? "Crear" : "Solo lectura"}
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    </V2Layout>
  );
}
