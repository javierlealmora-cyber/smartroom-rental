// src/pages/v2/admin/tenants/LodgerServiceCreate.jsx
// Admin — Asignar Servicio a Inquilino

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Col, DatePicker, Form, InputNumber,
  Row, Select, Space, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listLodgers } from "../../../../services/lodgers.service";
import { listAccommodations, listRooms } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;

export default function LodgerServiceCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [lodgers, setLodgers] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [accServices, setAccServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedAccommodation = Form.useWatch("accommodation_id", form);
  const selectedAccService = Form.useWatch("accommodation_service_id", form);

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
    if (!selectedAccommodation) { setRooms([]); setAccServices([]); return; }
    Promise.all([
      listRooms(selectedAccommodation),
      supabase
        .from("accommodation_services")
        .select("id, service_id, custom_price, status, service:services_catalog(id, name, unit, unit_price)")
        .eq("accommodation_id", selectedAccommodation)
        .eq("status", "active"),
    ]).then(([roomList, { data: svcData }]) => {
      setRooms(roomList.filter((r) => r.status === "free" || r.status === "occupied"));
      setAccServices(svcData || []);
      form.setFieldsValue({ room_id: undefined, accommodation_service_id: undefined });
    });
  }, [selectedAccommodation]);

  const selectedSvc = accServices.find((s) => s.id === selectedAccService);

  const onFinish = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("lodger_services").insert({
        client_account_id: clientAccountId,
        lodger_id: values.lodger_id,
        accommodation_service_id: values.accommodation_service_id,
        room_id: values.room_id || null,
        start_date: values.start_date.format("YYYY-MM-DD"),
        end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
        quantity: values.quantity ?? 1,
        price_applied: values.price_applied,
        status: "active",
        notes: values.notes || null,
      });
      if (insErr) throw new Error(insErr.message);
      navigate("/v2/admin/inquilinos/servicios");
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
          <Title level={2} style={{ margin: 0 }}>Asignar Servicio a Inquilino</Title>
          <Text type="secondary">Vincula un servicio del catálogo a un inquilino</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos/servicios")}>
            Volver
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Card size="small">
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ quantity: 1 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Inquilino" name="lodger_id"
                rules={[{ required: true, message: "Selecciona un inquilino" }]}>
                <Select
                  showSearch
                  placeholder="Seleccionar inquilino..."
                  filterOption={(input, opt) =>
                    opt.label.toLowerCase().includes(input.toLowerCase())
                  }
                  options={lodgers.map((l) => ({
                    value: l.id,
                    label: `${l.full_name || l.email} (${l.email})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Alojamiento" name="accommodation_id"
                rules={[{ required: true, message: "Selecciona un alojamiento" }]}>
                <Select
                  placeholder="Seleccionar alojamiento..."
                  options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Habitación" name="room_id">
                <Select
                  placeholder="Opcional..."
                  allowClear
                  disabled={!selectedAccommodation}
                  options={rooms.map((r) => ({ value: r.id, label: `Hab. ${r.number}` }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={10}>
              <Form.Item label="Servicio" name="accommodation_service_id"
                rules={[{ required: true, message: "Selecciona un servicio" }]}>
                <Select
                  placeholder="Seleccionar servicio..."
                  disabled={!selectedAccommodation}
                  options={accServices.map((s) => ({
                    value: s.id,
                    label: `${s.service?.name} (${s.custom_price ?? s.service?.unit_price}€/${s.service?.unit})`,
                  }))}
                  onChange={() => {
                    const svc = accServices.find((s) => s.id === form.getFieldValue("accommodation_service_id"));
                    if (svc) form.setFieldValue("price_applied", svc.custom_price ?? svc.service?.unit_price ?? 0);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6} md={4}>
              <Form.Item label="Cantidad" name="quantity">
                <InputNumber style={{ width: "100%" }} min={1} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6} md={4}>
              <Form.Item label="Precio aplicado" name="price_applied"
                rules={[{ required: true, message: "Introduce el precio" }]}>
                <InputNumber style={{ width: "100%" }} min={0} precision={2} addonAfter="€" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Fecha inicio" name="start_date"
                rules={[{ required: true, message: "Fecha de inicio requerida" }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Fecha fin" name="end_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          {selectedSvc && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Servicio: ${selectedSvc.service?.name} · Precio base: ${selectedSvc.custom_price ?? selectedSvc.service?.unit_price}€/${selectedSvc.service?.unit}`}
            />
          )}

          <Row justify="end">
            <Space>
              <Button onClick={() => navigate("/v2/admin/inquilinos/servicios")}>Cancelar</Button>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Asignar Servicio
              </Button>
            </Space>
          </Row>
        </Form>
      </Card>
    </V2Layout>
  );
}
