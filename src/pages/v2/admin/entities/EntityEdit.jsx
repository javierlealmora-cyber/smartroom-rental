import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { updateEntity } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient"; // read-only: load entity by id

const GENDER_OPTIONS = [
  { value: "male", label: "Hombre" },
  { value: "female", label: "Mujer" },
  { value: "other", label: "Otro" },
];

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

export default function EntityEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role } = useAuth();
  const { userName, companyBranding } = useAdminLayout();

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

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

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
          gender: data.gender || null,
          tax_id: data.tax_id || "",
          billing_email: data.billing_email || "",
          phone: data.phone || "",
          country: data.country || "Espana",
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
          gender: data.gender || null,
          tax_id: data.tax_id || "",
          billing_email: data.billing_email || "",
          phone: data.phone || "",
          country: data.country || "Espana",
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
        gender: values.gender || null,
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
                  <Select
                    options={LEGAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  />
                </Form.Item>
              </Col>

              {isCompanyAntd ? (
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

              {isPhysicalAntd && (
                <Col xs={24} md={8}>
                  <Form.Item label="Género" name="gender">
                    <Select
                      placeholder="Seleccionar..."
                      options={GENDER_OPTIONS}
                      allowClear
                    />
                  </Form.Item>
                </Col>
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
                  extra="Ej: Calle Mayor, Avda. de la Constitución, Plaza del Sol...">
                  <Input placeholder="Calle, Avenida, Plaza, Paseo..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Número" name="street_number">
                  <Input placeholder="12" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Piso / Puerta / Escalera" name="address_extra"
                  extra="Ej: 2º B, Escalera C, Bloque 3...">
                  <Input placeholder="2º B" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="C.P." name="zip">
                  <Input placeholder="28001" maxLength={5} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Ciudad / Municipio" name="city">
                  <Input placeholder="Madrid" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Provincia" name="province">
                  <Select
                    showSearch
                    placeholder="Seleccionar provincia..."
                    optionFilterProp="label"
                    options={PROVINCIAS_ES.map((p) => ({ value: p, label: p }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="País" name="country">
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
