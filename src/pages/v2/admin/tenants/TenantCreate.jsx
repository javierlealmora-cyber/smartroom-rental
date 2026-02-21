// src/pages/v2/admin/tenants/TenantCreate.jsx
// Crear nuevo Inquilino con asignación de habitación — Ant Design + Supabase real

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert, Button, Card, Checkbox, Col, DatePicker, Form,
  Input, Row, Select, Space, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { createLodger } from "../../../../services/lodgers.service";
import { listAccommodations, listRooms } from "../../../../services/accommodations.service";

const { Title, Text } = Typography;

const ROOM_STATUS_TAG = { free: "success", occupied: "error", pending_checkout: "warning", maintenance: "default" };
const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pendiente baja", maintenance: "Mantenimiento" };

export default function TenantCreate() {
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [billingSameAsMoveIn, setBillingSameAsMoveIn] = useState(true);

  const loadAccommodations = useCallback(async () => {
    try {
      const accs = await listAccommodations({ status: "active" });
      setAccommodations(accs);
    } catch {
      setAccommodations([]);
    }
  }, []);

  useEffect(() => { loadAccommodations(); }, [loadAccommodations]);

  const onAccommodationChange = (accId) => {
    setSelectedRoomId(null);
    form.setFieldValue("room_id", undefined);
    if (!accId) { setAvailableRooms([]); return; }
    setLoadingRooms(true);
    listRooms(accId)
      .then(setAvailableRooms)
      .catch(() => setAvailableRooms([]))
      .finally(() => setLoadingRooms(false));
  };

  const onFinish = async (values) => {
    const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId);

    const moveInDate = values.move_in_date.format("YYYY-MM-DD");
    const billingDate = billingSameAsMoveIn
      ? moveInDate
      : (values.billing_start_date?.format("YYYY-MM-DD") || moveInDate);

    setSaving(true);
    setSaveError(null);
    try {
      await createLodger({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone || null,
        document_id: values.document_id || null,
        room_id: selectedRoomId,
        accommodation_id: values.accommodation_id,
        move_in_date: moveInDate,
        billing_start_date: billingDate,
        monthly_rent: selectedRoom?.monthly_rent ?? null,
      });
      navigate("/v2/admin/inquilinos");
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Registrar Inquilino</Title>
          <Text type="secondary">Complete los datos del nuevo inquilino y asigne una habitación</Text>
        </Col>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
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
        initialValues={{
          move_in_date: dayjs(),
          send_onboarding: true,
        }}
      >
        <Row gutter={[24, 0]}>
          {/* Datos personales */}
          <Col xs={24} lg={12}>
            <Card title="Datos Personales" style={{ marginBottom: 24 }}>
              <Form.Item
                label="Nombre completo"
                name="full_name"
                rules={[{ required: true, message: "El nombre es obligatorio" }]}
              >
                <Input placeholder="Nombre y apellidos" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "El email es obligatorio" },
                  { type: "email", message: "Email inválido" },
                ]}
              >
                <Input placeholder="email@ejemplo.com" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Teléfono" name="phone">
                    <Input placeholder="+34 666 123 456" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Documento (DNI/NIE)" name="document_id">
                    <Input placeholder="12345678A" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="send_onboarding" valuePropName="checked">
                <Checkbox>Enviar email de onboarding al crear el inquilino</Checkbox>
              </Form.Item>
            </Card>
          </Col>

          {/* Asignación */}
          <Col xs={24} lg={12}>
            <Card title="Asignación de Habitación" style={{ marginBottom: 24 }}>
              <Form.Item
                label="Alojamiento"
                name="accommodation_id"
                rules={[{ required: true, message: "Seleccione un alojamiento" }]}
              >
                <Select
                  placeholder="Seleccionar alojamiento..."
                  onChange={onAccommodationChange}
                  options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="Habitación"
                name="room_id"
                rules={[{ required: true, message: "Seleccione una habitación" }]}
              >
                {loadingRooms ? (
                  <Text type="secondary">Cargando habitaciones...</Text>
                ) : availableRooms.length === 0 ? (
                  <Text type="secondary">
                    {form.getFieldValue("accommodation_id")
                      ? "No hay habitaciones en este alojamiento"
                      : "Selecciona primero un alojamiento"}
                  </Text>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                    {availableRooms.map((room) => {
                      const isFree = room.status === "free";
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <div
                          key={room.id}
                          onClick={() => { if (isFree) { setSelectedRoomId(room.id); form.setFieldValue("room_id", room.id); } }}
                          style={{
                            padding: "12px 8px",
                            border: `2px solid ${isSelected ? "#111827" : isFree ? "#d9f7be" : "#ffd8bf"}`,
                            borderRadius: 8,
                            backgroundColor: isSelected ? "#f0f0f0" : "#fff",
                            cursor: isFree ? "pointer" : "not-allowed",
                            opacity: isFree ? 1 : 0.5,
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>Hab. {room.number}</div>
                          <Tag color={ROOM_STATUS_TAG[room.status] || "default"} style={{ fontSize: 10 }}>
                            {ROOM_STATUS_LABEL[room.status] || room.status}
                          </Tag>
                          {room.monthly_rent > 0 && (
                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{room.monthly_rent}€/mes</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Form.Item>

              <Form.Item
                label="Fecha de entrada"
                name="move_in_date"
                rules={[{ required: true, message: "La fecha de entrada es obligatoria" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item>
                <Checkbox
                  checked={billingSameAsMoveIn}
                  onChange={(e) => setBillingSameAsMoveIn(e.target.checked)}
                >
                  Facturar desde la fecha de entrada
                </Checkbox>
              </Form.Item>

              {!billingSameAsMoveIn && (
                <Form.Item label="Fecha inicio facturación" name="billing_start_date">
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
              )}
            </Card>
          </Col>
        </Row>

        {/* Acciones */}
        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={() => navigate("/v2/admin/inquilinos")}>Cancelar</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saving}
              >
                Registrar Inquilino
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </V2Layout>
  );
}
