// src/pages/v2/admin/bulletins/BulletinCreate.jsx
// Admin — Crear Boletín de Liquidación manualmente

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Form, Input,
  InputNumber, Row, Select, Space, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers } from "../../../../services/lodgers.service";
import { listAccommodations, listRooms } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

export default function BulletinCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [lodgers, setLodgers] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [energyBills, setEnergyBills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedAccommodation = Form.useWatch("accommodation_id", form);

  const loadBase = useCallback(async () => {
    try {
      const [lodgerList, accList] = await Promise.all([
        listLodgers({ status: "active" }),
        listAccommodations({ status: "active" }),
      ]);
      setLodgers(lodgerList);
      setAccommodations(accList);
    } catch {
      setLodgers([]);
      setAccommodations([]);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!selectedAccommodation) { setRooms([]); setEnergyBills([]); return; }
    Promise.all([
      listRooms(selectedAccommodation),
      supabase
        .from("energy_bills")
        .select("id, supplier, issue_date, period_start, period_end, status")
        .eq("accommodation_id", selectedAccommodation)
        .order("issue_date", { ascending: false })
        .limit(20),
    ]).then(([roomList, { data: bills }]) => {
      setRooms(roomList.filter((r) => r.status !== "inactive"));
      setEnergyBills(bills || []);
      form.setFieldsValue({ room_id: undefined, energy_bill_id: undefined });
    });
  }, [selectedAccommodation]);

  const recalcTotal = () => {
    const v = form.getFieldsValue(["amount_fixed", "amount_variable", "amount_services"]);
    const total = (v.amount_fixed || 0) + (v.amount_variable || 0) + (v.amount_services || 0);
    form.setFieldValue("amount_total", Number(total.toFixed(2)));
  };

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("bulletins").insert({
        client_account_id: clientAccountId,
        lodger_id: values.lodger_id,
        accommodation_id: values.accommodation_id,
        room_id: values.room_id || null,
        energy_bill_id: values.energy_bill_id || null,
        period_start: values.period_start.format("YYYY-MM-DD"),
        period_end: values.period_end.format("YYYY-MM-DD"),
        days_present: values.days_present ?? 0,
        kwh_consumed: values.kwh_consumed ?? 0,
        amount_fixed: values.amount_fixed ?? 0,
        amount_variable: values.amount_variable ?? 0,
        amount_services: values.amount_services ?? 0,
        amount_total: values.amount_total ?? 0,
        status: values.publish ? "published" : "draft",
        published_at: values.publish ? new Date().toISOString() : null,
        notes: values.notes || null,
      });
      if (insErr) throw new Error(insErr.message);
      navigate("/v2/admin/boletines");
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
          <Title level={2} style={{ margin: 0 }}>Nuevo Boletín</Title>
          <Text type="secondary">Crea un boletín de liquidación para un inquilino</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/boletines")}>
            Volver
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ days_present: 0, kwh_consumed: 0, amount_fixed: 0, amount_variable: 0, amount_services: 0, amount_total: 0 }}>
        <Row gutter={[16, 0]}>
          <Col xs={24} lg={12}>
            <Card title="Datos del Boletín" size="small" style={{ marginBottom: 16 }}>
              <Form.Item label="Inquilino" name="lodger_id"
                rules={[{ required: true, message: "Selecciona un inquilino" }]}>
                <Select
                  showSearch
                  placeholder="Seleccionar inquilino..."
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                  options={lodgers.map((l) => ({
                    value: l.id,
                    label: `${l.full_name || l.email} (${l.email})`,
                  }))}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Alojamiento" name="accommodation_id"
                    rules={[{ required: true, message: "Selecciona un alojamiento" }]}>
                    <Select
                      placeholder="Seleccionar alojamiento..."
                      options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Habitación" name="room_id">
                    <Select
                      placeholder="Opcional..."
                      allowClear
                      disabled={!selectedAccommodation}
                      options={rooms.map((r) => ({ value: r.id, label: `Hab. ${r.number}` }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Factura de Energía (opcional)" name="energy_bill_id">
                <Select
                  placeholder="Vincular a factura..."
                  allowClear
                  disabled={!selectedAccommodation}
                  options={energyBills.map((b) => ({
                    value: b.id,
                    label: `${b.supplier} · ${new Date(b.issue_date).toLocaleDateString("es-ES")}`,
                  }))}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Período inicio" name="period_start"
                    rules={[{ required: true }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Período fin" name="period_end"
                    rules={[{ required: true }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Días presentes" name="days_present">
                    <InputNumber style={{ width: "100%" }} min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="kWh consumidos" name="kwh_consumed">
                    <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="kWh" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Notas" name="notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Importes" size="small" style={{ marginBottom: 16 }}>
              {[
                { name: "amount_fixed", label: "Importe fijo" },
                { name: "amount_variable", label: "Importe variable" },
                { name: "amount_services", label: "Servicios" },
              ].map(({ name, label }) => (
                <Form.Item key={name} label={label} name={name}>
                  <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" onChange={recalcTotal} />
                </Form.Item>
              ))}
              <Form.Item label={<Text strong>TOTAL</Text>} name="amount_total"
                rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%", fontWeight: 700 }} min={0} precision={2} addonAfter="€" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Row justify="end">
          <Space>
            <Button onClick={() => navigate("/v2/admin/boletines")}>Cancelar</Button>
            <Button htmlType="submit" loading={saving}
              onClick={() => form.setFieldValue("publish", false)}>
              Guardar como borrador
            </Button>
            <Button type="primary" loading={saving}
              onClick={() => { form.setFieldValue("publish", true); form.submit(); }}>
              Guardar y Publicar
            </Button>
          </Space>
        </Row>
        <Form.Item name="publish" hidden><Input /></Form.Item>
      </Form>
    </V2Layout>
  );
}
