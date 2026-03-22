import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { createEntity } from "../../../../services/entities.service";
import EntityFormFields from "../../../../components/shared/EntityFormFields";
import { PROVINCIAS_ES, LEGAL_TYPES } from "../../../../constants/formOptions";

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
  const isPhysical = legalType === "persona_fisica";

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
        nickname: values.nickname || null,
        gender: values.gender || null,
        tax_id: values.tax_id || null,
        billing_email: values.billing_email || null,
        phone: values.phone || null,
        country: values.country || "España",
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
            country: "España",
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
                <Select options={LEGAL_TYPES} />
              </Form.Item>
            </Col>

            <EntityFormFields legalType={legalType} showLegalTypeSelector={false} />

            <Col xs={24}>
              <Divider orientation="left" style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 4px" }}>Dirección</Divider>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Tipo de vía" name="street"
                rules={[{ required: true, message: "Indique la calle" }]}
                extra="Ej: Calle Mayor, Avda. de la Constitución, Plaza del Sol...">
                <Input placeholder="Calle, Avenida, Plaza, Paseo..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Número" name="street_number"
                rules={[{ required: true, message: "Indique el número" }]}>
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
              <Form.Item label="Código Postal" name="zip"
                rules={[{ required: true, message: "Indique el código postal" }]}>
                <Input placeholder="28001" maxLength={5} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Ciudad / Municipio" name="city"
                rules={[{ required: true, message: "Indique la ciudad" }]}>
                <Input placeholder="Madrid" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Provincia" name="province"
                rules={[{ required: true, message: "Seleccione la provincia" }]}>
                <Select
                  showSearch
                  placeholder="Seleccionar provincia..."
                  optionFilterProp="label"
                  options={PROVINCIAS_ES}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="País" name="country"
                rules={[{ required: true, message: "Indique el país" }]}>
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
