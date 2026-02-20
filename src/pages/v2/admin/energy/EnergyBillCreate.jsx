// src/pages/v2/admin/energy/EnergyBillCreate.jsx
// Crear nueva Factura de Energía — Ant Design + Supabase real

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert, Button, Card, Col, DatePicker, Form,
  Input, InputNumber, Row, Select, Space, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { createEnergyBill } from "../../../../services/energy.service";
import { listAccommodations } from "../../../../services/accommodations.service";

const { Title, Text } = Typography;

export default function EnergyBillCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [accommodations, setAccommodations] = useState([]);

  const loadAccommodations = useCallback(async () => {
    try {
      const accs = await listAccommodations({ status: "active" });
      setAccommodations(accs);
    } catch {
      setAccommodations([]);
    }
  }, []);

  useEffect(() => { loadAccommodations(); }, [loadAccommodations]);

  const onFinish = async (values) => {
    setSaving(true);
    setSaveError(null);
    try {
      await createEnergyBill({
        client_account_id: clientAccountId,
        accommodation_id: values.accommodation_id,
        supplier: values.supplier,
        bill_number: values.bill_number || null,
        reference: values.reference || null,
        issue_date: values.issue_date.format("YYYY-MM-DD"),
        period_start: values.period_start.format("YYYY-MM-DD"),
        period_end: values.period_end.format("YYYY-MM-DD"),
        total_kwh: values.total_kwh || null,
        amount_energy: values.amount_energy ?? 0,
        amount_power: values.amount_power ?? 0,
        amount_meter: values.amount_meter ?? 0,
        amount_discounts: values.amount_discounts ?? 0,
        amount_other: values.amount_other ?? 0,
        amount_taxes: values.amount_taxes ?? 0,
        amount_total: values.amount_total ?? 0,
        notes: values.notes || null,
        status: "draft",
      });
      navigate("/v2/admin/energia/facturas");
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const recalcTotal = () => {
    const vals = form.getFieldsValue([
      "amount_energy", "amount_power", "amount_meter",
      "amount_discounts", "amount_other", "amount_taxes",
    ]);
    const total =
      (vals.amount_energy || 0) +
      (vals.amount_power || 0) +
      (vals.amount_meter || 0) -
      (vals.amount_discounts || 0) +
      (vals.amount_other || 0) +
      (vals.amount_taxes || 0);
    form.setFieldValue("amount_total", Math.max(0, Number(total.toFixed(2))));
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Nueva Factura de Energía</Title>
          <Text type="secondary">Registra una factura del proveedor eléctrico</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/energia/facturas")}>
            Volver
          </Button>
        </Col>
      </Row>

      {saveError && (
        <Alert type="error" message={saveError} showIcon style={{ marginBottom: 16 }} />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ issue_date: dayjs(), amount_energy: 0, amount_power: 0, amount_meter: 0, amount_discounts: 0, amount_other: 0, amount_taxes: 0, amount_total: 0 }}
      >
        <Row gutter={[24, 0]}>
          {/* Datos generales */}
          <Col xs={24} lg={12}>
            <Card title="Datos de la Factura" size="small" style={{ marginBottom: 16 }}>
              <Form.Item label="Alojamiento" name="accommodation_id"
                rules={[{ required: true, message: "Seleccione un alojamiento" }]}>
                <Select placeholder="Seleccionar alojamiento..."
                  options={accommodations.map((a) => ({ value: a.id, label: a.name }))} />
              </Form.Item>

              <Form.Item label="Proveedor" name="supplier"
                rules={[{ required: true, message: "El proveedor es obligatorio" }]}>
                <Input placeholder="Ej: Endesa, Iberdrola..." />
              </Form.Item>

              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Nº Factura" name="bill_number">
                    <Input placeholder="Ej: FAC-2024-001" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Referencia" name="reference">
                    <Input placeholder="Referencia interna" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Fecha emisión" name="issue_date"
                    rules={[{ required: true, message: "Requerido" }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Período inicio" name="period_start"
                    rules={[{ required: true, message: "Requerido" }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Período fin" name="period_end"
                    rules={[{ required: true, message: "Requerido" }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Total kWh consumidos" name="total_kwh">
                <InputNumber style={{ width: "100%" }} min={0} precision={2}
                  placeholder="kWh totales del período" addonAfter="kWh" />
              </Form.Item>

              <Form.Item label="Notas" name="notes">
                <Input.TextArea rows={2} placeholder="Observaciones opcionales" />
              </Form.Item>
            </Card>
          </Col>

          {/* Desglose importes */}
          <Col xs={24} lg={12}>
            <Card title="Desglose de Importes" size="small" style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                Los campos se suman automáticamente al Total. Los descuentos se restan.
              </Text>

              {[
                { name: "amount_energy", label: "Energía consumida" },
                { name: "amount_power", label: "Potencia contratada" },
                { name: "amount_meter", label: "Alquiler de contador" },
                { name: "amount_discounts", label: "Descuentos (−)" },
                { name: "amount_other", label: "Otros conceptos" },
                { name: "amount_taxes", label: "Impuestos (IVA, etc.)" },
              ].map(({ name, label }) => (
                <Form.Item key={name} label={label} name={name}>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    addonAfter="€"
                    onChange={recalcTotal}
                  />
                </Form.Item>
              ))}

              <Form.Item
                label={<Text strong style={{ fontSize: 14 }}>TOTAL FACTURA</Text>}
                name="amount_total"
                rules={[{ required: true, message: "El total es obligatorio" }]}
              >
                <InputNumber
                  style={{ width: "100%", fontWeight: 700 }}
                  min={0}
                  precision={2}
                  addonAfter="€"
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => navigate("/v2/admin/energia/facturas")}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Guardar Factura
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </V2Layout>
  );
}
