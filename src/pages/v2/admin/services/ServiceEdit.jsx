// src/pages/v2/admin/services/ServiceEdit.jsx
// Editar Servicio del catálogo — Ant Design + Supabase directo

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Form, Input,
  InputNumber, Row, Select, Space, Switch, Typography,
} from "antd";
import { AppstoreOutlined, ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listEntities } from "../../../../services/entities.service";
import { getService } from "../../../../services/services.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

const UNIT_OPTIONS = [
  { value: "mes", label: "Mes" },
  { value: "dia", label: "Día" },
  { value: "unidad", label: "Unidad" },
  { value: "kwh", label: "kWh" },
  { value: "m3", label: "m³" },
  { value: "hora", label: "Hora" },
];

const cardTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderLeft: "3px solid #0071E3",
  paddingLeft: 8,
};

export default function ServiceEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userName, companyBranding } = useAdminLayout();
  const [form] = Form.useForm();

  const [ownerEntities, setOwnerEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [serviceName, setServiceName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [service, entities] = await Promise.all([
        getService(id),
        listEntities({ type: "owner" }),
      ]);
      setOwnerEntities(entities.filter((e) => e.status === "active"));
      setServiceName(service.name || "");
      form.setFieldsValue({
        owner_entity_id: service.owner_entity_id,
        name: service.name,
        description: service.description || "",
        unit: service.unit,
        unit_price: service.unit_price,
        is_recurring: service.is_recurring,
        status: service.status,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("benefits_catalog")
        .update({
          owner_entity_id: values.owner_entity_id,
          name: values.name,
          description: values.description || null,
          unit: values.unit,
          unit_price: values.unit_price,
          is_recurring: values.is_recurring ?? false,
          status: values.status,
        })
        .eq("id", id);
      if (updateErr) throw new Error(updateErr.message);
      navigate("/v2/admin/servicios");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/v2/admin/servicios")}
          style={{ padding: 0, color: "#6B7280", marginBottom: 8 }}
        >
          Gestión de Prestaciones
        </Button>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <AppstoreOutlined style={{ marginRight: 10 }} />
              {serviceName ? `Editar: ${serviceName}` : "Editar Servicio"}
            </Title>
            <Text type="secondary">Modifica los datos del servicio</Text>
          </Col>
        </Row>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        {/* ── Datos del servicio ────────────────────────────────────────── */}
        <Card
          size="small"
          loading={loading}
          title={<span style={cardTitleStyle}>Datos del Servicio</span>}
          style={{ marginBottom: 16 }}
        >
          {!loading && (
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item
                    label="Entidad Propietaria"
                    name="owner_entity_id"
                    rules={[{ required: true, message: "Selecciona una entidad" }]}
                  >
                    <Select
                      placeholder="Seleccionar entidad..."
                      options={ownerEntities.map((e) => ({
                        value: e.id,
                        label: e.legal_name || `${e.first_name} ${e.last_name1}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={16}>
                  <Form.Item
                    label="Nombre del servicio"
                    name="name"
                    rules={[{ required: true, message: "El nombre es obligatorio" }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Descripción" name="description">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>

              {/* ── Facturación ──────────────────────────────────────────── */}
              <div style={{ ...cardTitleStyle, marginBottom: 16, marginTop: 8 }}>
                Facturación
              </div>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={8} md={6}>
                  <Form.Item
                    label="Unidad"
                    name="unit"
                    rules={[{ required: true }]}
                  >
                    <Select options={UNIT_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} md={6}>
                  <Form.Item
                    label="Precio unitario"
                    name="unit_price"
                    rules={[{ required: true }]}
                  >
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} md={4}>
                  <Form.Item label="¿Recurrente?" name="is_recurring" valuePropName="checked">
                    <Switch checkedChildren="Sí" unCheckedChildren="No" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} md={4}>
                  <Form.Item label="Estado" name="status" rules={[{ required: true }]}>
                    <Select options={[
                      { value: "active", label: "Activo" },
                      { value: "inactive", label: "Inactivo" },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>

              <Row justify="end" style={{ marginTop: 8 }}>
                <Space>
                  <Button onClick={() => navigate("/v2/admin/servicios")}>Cancelar</Button>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    Guardar Cambios
                  </Button>
                </Space>
              </Row>
            </Form>
          )}
        </Card>

      </div>
    </V2Layout>
  );
}
