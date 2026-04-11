import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { updateEntity } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";
import EntityFormFields from "../../../../components/shared/EntityFormFields";
import { PROVINCIAS_ES, LEGAL_TYPES } from "../../../../constants/formOptions";

export default function EntityEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role } = useAuth();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const canWrite = role !== "viewer";

  const [formAntd] = Form.useForm();

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entity, setEntity] = useState(null);
  const [form, setForm] = useState(null);

  const isCompany = form?.legal_type === "persona_juridica";

  const canSubmit = useMemo(() => {
    if (!form) return false;
    if (isCompany) return !!form.legal_name;
    return !!form.first_name && !!form.last_name1;
  }, [form, isCompany]);

  const _set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("entities")
          .select("*")
          .eq("id", id)
          .single();

        if (qErr) throw new Error(qErr.message);
        setEntity(data);
        setForm({
          legal_type: data.legal_type,
          legal_name: data.legal_name || "",
          first_name: data.first_name || "",
          last_name1: data.last_name1 || "",
          last_name2: data.last_name2 || "",
          nickname: data.nickname || "",
          gender: data.gender || null,
          tax_id: data.tax_id || "",
          billing_email: data.billing_email || "",
          phone: data.phone || "",
          country: data.country || "España",
          province: data.province || "",
          city: data.city || "",
          zip: data.zip || "",
          street: data.street || "",
          street_number: data.street_number || "",
          address_extra: data.address_extra || "",
          status: data.status,
        });

        formAntd.setFieldsValue({
          legal_type: data.legal_type,
          legal_name: data.legal_name || "",
          first_name: data.first_name || "",
          last_name1: data.last_name1 || "",
          last_name2: data.last_name2 || "",
          nickname: data.nickname || "",
          gender: data.gender || null,
          tax_id: data.tax_id || "",
          billing_email: data.billing_email || "",
          phone: data.phone || "",
          country: data.country || "España",
          province: data.province || "",
          city: data.city || "",
          zip: data.zip || "",
          street: data.street || "",
          street_number: data.street_number || "",
          address_extra: data.address_extra || "",
          status: data.status,
        });
      } catch (e) {
        setError(e?.message || "Error cargando entidad");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const onFinish = async (values) => {
    if (!canWrite || !canSubmit || busy) return;

    setBusy(true);
    setError(null);

    try {
      if (!entity) throw new Error("Entidad no cargada");

      await updateEntity(entity.id, {
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
        status: values.status,
      });

      navigate("/v2/admin/entidades", { replace: true });
    } catch (err) {
      setError(err?.message || "Error guardando entidad");
      setBusy(false);
    }
  };

  const legalType = Form.useWatch("legal_type", formAntd) || entity?.legal_type;
  const isCompanyAntd = legalType === "persona_juridica";
  const isPhysicalAntd = legalType === "persona_fisica";

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Typography.Title level={2} style={{ marginTop: 0 }}>
        Editar entidad
      </Typography.Title>
      <Typography.Text type="secondary">
        {loading ? "" : entity ? `ID: ${entity.id}` : ""}
      </Typography.Text>

      <div style={{ height: 16 }} />

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card loading={loading}>
        {!loading && !entity ? (
          <Typography.Text type="secondary">Entidad no encontrada</Typography.Text>
        ) : (
          <Form
            form={formAntd}
            layout="vertical"
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

              <EntityFormFields legalType={form?.legal_type} showLegalTypeSelector={false} />

              <Col xs={24} md={8}>
                <Form.Item
                  label="Estado"
                  name="status"
                  rules={[{ required: true, message: "Seleccione el estado" }]}
                >
                  <Select
                    options={[
                      { value: "active", label: "active" },
                      { value: "disabled", label: "disabled" },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Divider orientation="left" style={{ fontSize: 13, color: "#6B7280", margin: "8px 0 4px" }}>Dirección</Divider>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Calle / Vía" name="street"
                  rules={[
                    { required: true, message: "Indique la calle" },
                    { min: 3, message: "La calle debe tener al menos 3 caracteres" },
                    { max: 200, message: "La calle no puede exceder 200 caracteres" }
                  ]}
                  extra="Ej: Calle Mayor, Avda. de la Constitución, Plaza del Sol...">
                  <Input placeholder="Calle Pendiente" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Número" name="street_number"
                  rules={[
                    { required: true, message: "Indique el número" },
                    { max: 10, message: "El número no puede exceder 10 caracteres" }
                  ]}>
                  <Input placeholder="S/N" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Piso / Puerta / Escalera" name="address_extra"
                  rules={[
                    { max: 50, message: "No puede exceder 50 caracteres" }
                  ]}
                  extra="Ej: 2º B, Escalera C, Bloque 3...">
                  <Input placeholder="Ej. 2º B, Escalera C, Bloque 3..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="C.P." name="zip"
                  rules={[
                    { required: true, message: "Indique el código postal" },
                    { pattern: /^\d{5}$/, message: "Debe ser un código postal válido de 5 dígitos" }
                  ]}>
                  <Input placeholder="00000" maxLength={5} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Ciudad / Municipio" name="city"
                  rules={[
                    { required: true, message: "Indique la ciudad" },
                    { min: 2, message: "La ciudad debe tener al menos 2 caracteres" },
                    { max: 100, message: "La ciudad no puede exceder 100 caracteres" }
                  ]}>
                  <Input placeholder="Ciudad Pendiente" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Provincia" name="province"
                  rules={[{ required: true, message: "Seleccione la provincia" }]} >
                  <Select
                    showSearch
                    placeholder="Seleccionar provincia..."
                    optionFilterProp="label"
                    options={PROVINCIAS_ES}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="País" name="country"
                  rules={[
                    { required: true, message: "Indique el país" },
                    { min: 2, message: "El país debe tener al menos 2 caracteres" },
                    { max: 50, message: "El país no puede exceder 50 caracteres" }
                  ]} >
                  <Input placeholder="España" />
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
                    {canWrite ? "Guardar" : "Solo lectura"}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        )}
      </Card>
    </V2Layout>
  );
}
