import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Form, Input, Row, Select, Space, Typography } from "antd";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { useAuth } from "../../../../providers/AuthProvider";
import { updateEntity } from "../../../../services/entities.service";
import { supabase } from "../../../../services/supabaseClient";
import EntityFormFields from "../../../../components/shared/EntityFormFields";
import AddressFormFields from "../../../../components/AddressFormFields";
import { LEGAL_TYPES } from "../../../../constants/formOptions";

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
          address_country: data.address_country || "España",
          address_province: data.address_province || "",
          address_city: data.address_city || "",
          address_postal_code: data.address_postal_code || "",
          address_street: data.address_street || "",
          address_number: data.address_number || "",
          address_floor: data.address_floor || "",
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
          address_country: data.address_country || "España",
          address_province: data.address_province || "",
          address_city: data.address_city || "",
          address_postal_code: data.address_postal_code || "",
          address_street: data.address_street || "",
          address_number: data.address_number || "",
          address_floor: data.address_floor || "",
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
        address_country: values.address_country || "España",
        address_province: values.address_province || null,
        address_city: values.address_city || null,
        address_postal_code: values.address_postal_code || null,
        address_street: values.address_street || null,
        address_number: values.address_number || null,
        address_floor: values.address_floor || null,
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
            {/* Datos de Entidad */}
            <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280", marginTop: 0 }}>
              Datos de Entidad
            </Divider>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Tipo legal"
                  name="legal_type"
                  rules={[{ required: true, message: "Seleccione el tipo legal" }]}
                >
                  <Select options={LEGAL_TYPES} placeholder="Seleccionar" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  label="Estado"
                  name="status"
                  rules={[{ required: true, message: "Seleccione el estado" }]}
                >
                  <Select
                    placeholder="Seleccionar"
                    options={[
                      { value: "active", label: "Activo" },
                      { value: "disabled", label: "Deshabilitado" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Datos Fiscales */}
            <Divider orientation="left" style={{ fontSize: 12, color: "#6B7280" }}>
              Datos Fiscales
            </Divider>
            <Row gutter={[16, 0]}>
              <EntityFormFields legalType={legalType} showLegalTypeSelector={false} />
              <AddressFormFields />
            </Row>

            <Row justify="end" style={{ marginTop: 16 }}>
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
