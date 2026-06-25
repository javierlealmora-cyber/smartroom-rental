import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { createEntity } from "../../../../services/entities.service";
import EntityFormFields from "../../../../components/shared/EntityFormFields";
import AddressFormFields from "../../../../components/AddressFormFields";
import { LEGAL_TYPES } from "../../../../constants/formOptions";

export default function EntityCreate() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const canWrite = role !== "viewer";

  const [form] = Form.useForm();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const legalType = Form.useWatch("legal_type", form) || "persona_juridica";

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
        address_country: values.address_country || "España",
        address_province: values.address_province || null,
        address_city: values.address_city || null,
        address_postal_code: values.address_postal_code || null,
        address_street: values.address_street || null,
        address_number: values.address_number || null,
        address_floor: values.address_floor || null,
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
            address_country: "España",
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

            <AddressFormFields />
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
