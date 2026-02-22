// src/pages/v2/admin/services/ServiceCreate.jsx
// Crear nuevo Servicio en el catálogo — Ant Design + Supabase directo (sin Edge Function específica)

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, Form, Input,
  InputNumber, Row, Select, Space, Switch, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listEntities } from "../../../../services/entities.service";
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

export default function ServiceCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [ownerEntities, setOwnerEntities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadEntities = useCallback(async () => {
    try {
      const entities = await listEntities({ type: "owner" });
      setOwnerEntities(entities.filter((e) => e.status === "active"));
    } catch {
      setOwnerEntities([]);
    }
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from("services_catalog").insert({
        client_account_id: clientAccountId,
        owner_entity_id: values.owner_entity_id,
        name: values.name,
        description: values.description || null,
        unit: values.unit,
        unit_price: values.unit_price,
        is_recurring: values.is_recurring ?? false,
        status: "active",
      });
      if (insertErr) throw new Error(insertErr.message);
      navigate("/v2/admin/servicios");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Nuevo Servicio</Title>
          <Text type="secondary">Añade un servicio al catálogo</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/servicios")}>
            Volver
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Card size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ unit: "mes", is_recurring: true, unit_price: 0 }}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Entidad Propietaria" name="owner_entity_id"
                rules={[{ required: true, message: "Selecciona una entidad" }]}>
                <Select
                  placeholder="Seleccionar entidad..."
                  options={ownerEntities.map((e) => ({
                    value: e.id,
                    label: e.legal_name || `${e.first_name} ${e.last_name1}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={10}>
              <Form.Item label="Nombre del servicio" name="name"
                rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                <Input placeholder="Ej: Limpieza semanal, Parking, Wifi..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Descripción" name="description">
                <Input.TextArea rows={2} placeholder="Descripción opcional del servicio" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item label="Unidad de facturación" name="unit"
                rules={[{ required: true, message: "Selecciona una unidad" }]}>
                <Select options={UNIT_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item label="Precio unitario" name="unit_price"
                rules={[{ required: true, message: "El precio es obligatorio" }]}>
                <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Form.Item label="¿Recurrente?" name="is_recurring" valuePropName="checked">
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" style={{ marginTop: 8 }}>
            <Space>
              <Button onClick={() => navigate("/v2/admin/servicios")}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Crear Servicio
              </Button>
            </Space>
          </Row>
        </Form>
      </Card>
    </V2Layout>
  );
}
