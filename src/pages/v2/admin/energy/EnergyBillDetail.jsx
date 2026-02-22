// src/pages/v2/admin/energy/EnergyBillDetail.jsx
// Detalle y edición de Factura de Energía — Ant Design + Supabase real

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert, Button, Card, Col, DatePicker, Descriptions,
  Form, Input, InputNumber, Row, Select, Space, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getEnergyBill, updateEnergyBill } from "../../../../services/energy.service";

const { Title, Text } = Typography;

const STATUS_COLOR = { draft: "default", processed: "processing", closed: "success" };
const STATUS_LABEL = { draft: "Borrador", processed: "Procesada", closed: "Cerrada" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function EnergyBillDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userName, companyBranding } = useAdminLayout();
  const [form] = Form.useForm();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEnergyBill(id);
      setBill(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    form.setFieldsValue({
      supplier: bill.supplier,
      bill_number: bill.bill_number || "",
      reference: bill.reference || "",
      issue_date: dayjs(bill.issue_date),
      period_start: dayjs(bill.period_start),
      period_end: dayjs(bill.period_end),
      total_kwh: bill.total_kwh,
      amount_energy: bill.amount_energy,
      amount_power: bill.amount_power,
      amount_meter: bill.amount_meter,
      amount_discounts: bill.amount_discounts,
      amount_other: bill.amount_other,
      amount_taxes: bill.amount_taxes,
      amount_total: bill.amount_total,
      notes: bill.notes || "",
      status: bill.status,
    });
    setEditing(true);
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

  const onSave = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateEnergyBill(id, {
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
        status: values.status,
      });
      setBill(updated);
      setEditing(false);
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
          <Title level={2} style={{ margin: 0 }}>Factura de Energía</Title>
          {bill && (
            <Space>
              <Text type="secondary">{bill.accommodation?.name}</Text>
              <Tag color={STATUS_COLOR[bill.status] || "default"}>{STATUS_LABEL[bill.status] || bill.status}</Tag>
            </Space>
          )}
        </Col>
        <Col>
          <Space>
            {!editing && (
              <Button icon={<EditOutlined />} onClick={startEdit} loading={loading}>
                Editar
              </Button>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/energia/facturas")}>
              Volver
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          closable onClose={() => setError(null)} />
      )}

      {!editing ? (
        /* ── Vista de detalle ── */
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Datos de la Factura" size="small" loading={loading}>
              {bill && (
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" labelStyle={{ color: "#6b7280" }}>
                  <Descriptions.Item label="Alojamiento">{bill.accommodation?.name}</Descriptions.Item>
                  <Descriptions.Item label="Proveedor"><Text strong>{bill.supplier}</Text></Descriptions.Item>
                  <Descriptions.Item label="Nº Factura">{bill.bill_number || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Referencia">{bill.reference || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Fecha emisión">{fDate(bill.issue_date)}</Descriptions.Item>
                  <Descriptions.Item label="Período">
                    {fDate(bill.period_start)} – {fDate(bill.period_end)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Total kWh">
                    {bill.total_kwh ? `${Number(bill.total_kwh).toFixed(2)} kWh` : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    <Tag color={STATUS_COLOR[bill.status] || "default"}>{STATUS_LABEL[bill.status] || bill.status}</Tag>
                  </Descriptions.Item>
                  {bill.notes && (
                    <Descriptions.Item label="Notas" span={2}>{bill.notes}</Descriptions.Item>
                  )}
                </Descriptions>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Desglose de Importes" size="small" loading={loading}>
              {bill && (
                <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 160 }}>
                  <Descriptions.Item label="Energía consumida">{fEur(bill.amount_energy)}</Descriptions.Item>
                  <Descriptions.Item label="Potencia contratada">{fEur(bill.amount_power)}</Descriptions.Item>
                  <Descriptions.Item label="Alquiler contador">{fEur(bill.amount_meter)}</Descriptions.Item>
                  <Descriptions.Item label="Descuentos (−)">
                    <Text type="success">−{fEur(bill.amount_discounts)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Otros conceptos">{fEur(bill.amount_other)}</Descriptions.Item>
                  <Descriptions.Item label="Impuestos">{fEur(bill.amount_taxes)}</Descriptions.Item>
                  <Descriptions.Item label={<Text strong>TOTAL</Text>}>
                    <Text strong style={{ fontSize: 16, color: "#111827" }}>{fEur(bill.amount_total)}</Text>
                  </Descriptions.Item>
                </Descriptions>
              )}
            </Card>
          </Col>
        </Row>
      ) : (
        /* ── Formulario de edición ── */
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={[24, 0]}>
            <Col xs={24} lg={12}>
              <Card title="Datos de la Factura" size="small" style={{ marginBottom: 16 }}>
                <Form.Item label="Proveedor" name="supplier"
                  rules={[{ required: true, message: "El proveedor es obligatorio" }]}>
                  <Input />
                </Form.Item>
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Nº Factura" name="bill_number">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Referencia" name="reference">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Fecha emisión" name="issue_date"
                      rules={[{ required: true }]}>
                      <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Período inicio" name="period_start"
                      rules={[{ required: true }]}>
                      <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Período fin" name="period_end"
                      rules={[{ required: true }]}>
                      <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Total kWh" name="total_kwh">
                      <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="kWh" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Estado" name="status">
                      <Select options={[
                        { value: "draft", label: "Borrador" },
                        { value: "processed", label: "Procesada" },
                        { value: "closed", label: "Cerrada" },
                      ]} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Notas" name="notes">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Desglose de Importes" size="small" style={{ marginBottom: 16 }}>
                {[
                  { name: "amount_energy", label: "Energía consumida" },
                  { name: "amount_power", label: "Potencia contratada" },
                  { name: "amount_meter", label: "Alquiler de contador" },
                  { name: "amount_discounts", label: "Descuentos (−)" },
                  { name: "amount_other", label: "Otros conceptos" },
                  { name: "amount_taxes", label: "Impuestos" },
                ].map(({ name, label }) => (
                  <Form.Item key={name} label={label} name={name}>
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" onChange={recalcTotal} />
                  </Form.Item>
                ))}
                <Form.Item label={<Text strong>TOTAL FACTURA</Text>} name="amount_total"
                  rules={[{ required: true }]}>
                  <InputNumber style={{ width: "100%", fontWeight: 700 }} min={0} precision={2} addonAfter="€" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Row justify="end">
            <Space>
              <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Guardar Cambios
              </Button>
            </Space>
          </Row>
        </Form>
      )}
    </V2Layout>
  );
}
