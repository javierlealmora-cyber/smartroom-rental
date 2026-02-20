// src/pages/v2/admin/tenants/TenantEdit.jsx
// Editar Inquilino — Ant Design + manage_lodger Edge Function

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Descriptions, Form,
  Input, Row, Select, Space, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger, updateLodger, setLodgerStatus } from "../../../../services/lodgers.service";

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: "invited", label: "Invitado" },
  { value: "active", label: "Activo" },
  { value: "pending_checkout", label: "Pendiente de baja" },
  { value: "inactive", label: "Inactivo" },
];

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TenantEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userName, companyBranding } = useAdminLayout();
  const [form] = Form.useForm();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLodger(id);
      setLodger(data);
      form.setFieldsValue({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || "",
        document_id: data.document_id || "",
        status: data.status,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      if (values.status !== lodger.status) {
        await setLodgerStatus(id, values.status);
      }
      await updateLodger(id, {
        full_name: values.full_name,
        phone: values.phone || null,
        document_id: values.document_id || null,
      });
      navigate("/v2/admin/inquilinos");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Editar Inquilino</Title>
          {lodger && (
            <Text type="secondary">{lodger.full_name} · {lodger.email}</Text>
          )}
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
            Volver
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[20, 20]}>
        {/* Formulario de edición */}
        <Col xs={24} lg={14}>
          <Card title="Datos del Inquilino" size="small" loading={loading}>
            {!loading && (
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Nombre completo" name="full_name"
                      rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Email" name="email">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Teléfono" name="phone">
                      <Input placeholder="+34 600 000 000" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Documento (DNI/NIE/Pasaporte)" name="document_id">
                      <Input placeholder="12345678A" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Estado" name="status"
                      rules={[{ required: true, message: "Selecciona un estado" }]}>
                      <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row justify="end" style={{ marginTop: 8 }}>
                  <Space>
                    <Button onClick={() => navigate("/v2/admin/inquilinos")}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                      Guardar Cambios
                    </Button>
                  </Space>
                </Row>
              </Form>
            )}
          </Card>
        </Col>

        {/* Info de asignación actual */}
        <Col xs={24} lg={10}>
          <Card title="Habitación Actual" size="small" loading={loading}>
            {activeAssignment ? (
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 110 }}>
                <Descriptions.Item label="Alojamiento">
                  <Text strong>{activeAssignment.accommodation?.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Habitación">
                  <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Entrada">
                  {fDate(activeAssignment.move_in_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Facturación">
                  {fDate(activeAssignment.billing_start_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Renta">
                  <Text strong style={{ color: "#059669" }}>
                    {activeAssignment.monthly_rent != null
                      ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(activeAssignment.monthly_rent)
                      : "-"}
                    <Text type="secondary" style={{ fontSize: 11 }}>/mes</Text>
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">Sin habitación asignada actualmente</Text>
            )}
          </Card>

          {lodger && (
            <Card title="Historial de Asignaciones" size="small" style={{ marginTop: 16 }}>
              {(lodger.assignments || []).length === 0 ? (
                <Text type="secondary">Sin historial</Text>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  {lodger.assignments.map((a) => (
                    <div key={a.id} style={{
                      padding: "8px 12px", background: "#f9fafb",
                      borderRadius: 6, borderLeft: `3px solid ${a.move_out_date ? "#d1d5db" : "#059669"}`,
                    }}>
                      <Text strong style={{ fontSize: 12 }}>
                        {a.accommodation?.name} · Hab. {a.room?.number}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {fDate(a.move_in_date)} → {a.move_out_date ? fDate(a.move_out_date) : "Actual"}
                      </Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </V2Layout>
  );
}
