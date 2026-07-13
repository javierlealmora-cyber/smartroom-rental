// src/pages/v2/admin/accommodations/AccommodationEdit.jsx
// Editar Alojamiento y sus habitaciones — Ant Design + Edge Functions

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Button, Card, Col, Form, Input, InputNumber,
  Popconfirm, Row, Select, Space, Table, Tag, Typography,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listEntities } from "../../../../services/entities.service";
import {
  getAccommodation, updateAccommodation,
  listRooms, updateRoom, setRoomMaintenance,
} from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";
import { PROVINCIAS_ES } from "../../../../constants/formOptions";

const { Title, Text } = Typography;

const ROOM_STATUS_BADGE = {
  free:             { bg: "#DCFCE7", color: "#15803D" },
  occupied:         { bg: "#FFE4E6", color: "#BE123C" },
  pending_checkout: { bg: "#FEF3C7", color: "#B45309" },
  maintenance:      { bg: "#F3F4F6", color: "#4B5563" },
  inactive:         { bg: "#F3F4F6", color: "#4B5563" },
};
const ROOM_STATUS_LABEL = { free: "Libre", occupied: "Ocupada", pending_checkout: "Pend. baja", maintenance: "Mantenimiento", inactive: "Inactiva" };

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

export default function AccommodationEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userName, companyBranding, clientAccountId: _clientAccountId } = useAdminLayout();
  const [form] = Form.useForm();

  const [accommodation, setAccommodation] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [ownerEntities, setOwnerEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm] = Form.useForm();
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acc, roomList, entities] = await Promise.all([
        getAccommodation(id),
        listRooms(id),
        listEntities({ type: "owner" }),
      ]);
      setAccommodation(acc);
      setRooms(roomList);
      setOwnerEntities(entities.filter((e) => e.status === "active"));
      form.setFieldsValue({
        name: acc.name,
        owner_entity_id: acc.owner_entity_id,
        address_street: acc.address_street || "",
        address_number: acc.address_number || "",
        address_floor: acc.address_floor || "",
        address_postal_code: acc.address_postal_code || "",
        address_city: acc.address_city || "",
        address_province: acc.address_province || null,
        address_country: acc.address_country || "",
        notes: acc.notes || "",
        status: acc.status,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onSaveAccommodation = async (values) => {
    setSaving(true);
    setError(null);
    try {
      await updateAccommodation(id, {
        name: values.name,
        owner_entity_id: values.owner_entity_id,
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
        street_number: values.street_number || null,
        floor: values.floor || null,
        door: values.door || null,
        postal_code: values.postal_code || null,
        city: values.city || null,
        province: values.province || null,
        notes: values.notes || null,
        status: values.status,
      });
      navigate("/v2/admin/alojamientos");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onSaveRoom = async (roomId, values) => {
    try {
      const updated = await updateRoom(roomId, {
        number: values.number,
        monthly_rent: values.monthly_rent,
        square_meters: values.square_meters || null,
        bathroom_type: values.bathroom_type,
        kitchen_type: values.kitchen_type,
        notes: values.notes || null,
      }, _clientAccountId);
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, ...updated } : r));
      setEditingRoom(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const onToggleRoomStatus = async (room) => {
    const next = !room.is_maintenance;
    try {
      await setRoomMaintenance(room.id, next, _clientAccountId);
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, is_maintenance: next } : r));
    } catch (e) {
      setError(e.message);
    }
  };

  const onAddRoom = async (values) => {
    console.log("onAddRoom called with values:", values);
    try {
      const { data: newRoom, error } = await supabase
        .from("rooms")
        .insert({
          accommodation_id: id,
          client_account_id: _clientAccountId,
          number: values.number,
          monthly_rent: values.monthly_rent || 0,
          square_meters: values.square_meters || null,
          bathroom_type: values.bathroom_type || "shared",
          kitchen_type: values.kitchen_type || "shared",
          notes: values.notes || null,
        })
        .select()
        .single();
      if (error) {
        console.error("Error inserting room:", error);
        throw new Error(error.message);
      }
      console.log("Room added successfully:", newRoom);
      setRooms((prev) => [...prev, newRoom]);
      setAddingRoom(false);
      newRoomForm.resetFields();
    } catch (e) {
      console.error("Exception in onAddRoom:", e);
      setError(e.message);
    }
  };

  const roomColumns = [
    {
      title: "Nº",
      dataIndex: "number",
      key: "number",
      width: 120,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Estado",
      key: "status",
      width: 120,
      render: (_, room) => {
        const s = room.derivedStatus || (room.is_maintenance ? "maintenance" : "free");
        const badge = ROOM_STATUS_BADGE[s] || ROOM_STATUS_BADGE.free;
        return (
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500,
            background: badge.bg, color: badge.color,
          }}>
            {ROOM_STATUS_LABEL[s] || s}
          </span>
        );
      },
    },
    {
      title: "Precio/mes",
      dataIndex: "monthly_rent",
      key: "monthly_rent",
      width: 110,
      render: (v) => v != null
        ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v)
        : "-",
    },
    {
      title: "m²",
      dataIndex: "square_meters",
      key: "square_meters",
      responsive: ["md"],
      width: 70,
      render: (v) => v ? `${v} m²` : "-",
    },
    {
      title: "Baño",
      dataIndex: "bathroom_type",
      key: "bathroom_type",
      responsive: ["lg"],
      render: (v) => v === "private" ? "Privado" : v === "suite" ? "Suite" : "Compartido",
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, room) => (
        <Space>
          <Button size="small" onClick={() => {
            setEditingRoom(room.id);
            roomForm.setFieldsValue({
              number: room.number,
              monthly_rent: room.monthly_rent,
              square_meters: room.square_meters,
              bathroom_type: room.bathroom_type || "shared",
              kitchen_type: room.kitchen_type || "shared",
              notes: room.notes || "",
            });
          }}>
            Editar
          </Button>
          {(room.derivedStatus ?? "free") !== "occupied" && (room.derivedStatus ?? "free") !== "pending_checkout" && (
            <Popconfirm
              title={room.is_maintenance ? "¿Quitar de mantenimiento?" : "¿Poner en mantenimiento?"}
              onConfirm={() => onToggleRoomStatus(room)}
              okText="Sí" cancelText="No"
            >
              <Button size="small" danger={!room.is_maintenance}>
                {room.is_maintenance ? "Reactivar" : "Mantenimiento"}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const BATHROOM_OPTIONS = [
    { value: "shared", label: "Compartido" },
    { value: "private", label: "Privado" },
    { value: "suite", label: "Suite" },
  ];
  const KITCHEN_OPTIONS = [
    { value: "shared", label: "Compartida" },
    { value: "private", label: "Privada" },
    { value: "suite", label: "Suite" },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Editar Alojamiento</Title>
          {accommodation && <Text type="secondary">{accommodation.name}</Text>}
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate(`/v2/admin/alojamientos/${id}/servicios`)}>
              Servicios
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/alojamientos")}>
              Volver
            </Button>
          </Space>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          closable onClose={() => setError(null)} />
      )}

      {/* Datos del alojamiento */}
      <Card title="Datos del Alojamiento" size="small" loading={loading} style={{ marginBottom: 16 }}>
        {!loading && (
          <Form form={form} layout="vertical" onFinish={onSaveAccommodation}>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Nombre" name="name"
                  rules={[
                    { required: true, message: "El nombre es obligatorio" },
                    { max: 100, message: "Máximo 100 caracteres" },
                  ]}>
                  <Input maxLength={100} showCount />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Entidad Propietaria" name="owner_entity_id"
                  rules={[{ required: true, message: "Selecciona una entidad" }]}>
                  <Select
                    options={ownerEntities.map((e) => ({
                      value: e.id,
                      label: e.legal_name || `${e.first_name} ${e.last_name1}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Form.Item label="Estado" name="status">
                  <Select options={[
                    { value: "active", label: "Activo" },
                    { value: "inactive", label: "Inactivo" },
                  ]} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item label="Calle" name="address_line1"
                  rules={[{ max: 200, message: "Máximo 200 caracteres" }]}>
                  <Input placeholder="Calle Gran Vía, Av. de la Constitución..." maxLength={200} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={4}>
                <Form.Item label="Número" name="street_number">
                  <Input placeholder="12" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={3}>
                <Form.Item label="Piso" name="floor">
                  <Input placeholder="3" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={3}>
                <Form.Item label="Puerta" name="door">
                  <Input placeholder="A" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Bloque / Escalera (opcional)" name="address_line2"
                  rules={[{ max: 200, message: "Máximo 200 caracteres" }]}>
                  <Input placeholder="Bloque B, Escalera 2..." maxLength={200} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={4}>
                <Form.Item label="Código Postal" name="postal_code"
                  rules={[{ pattern: /^\d{5}$/, message: "Debe tener exactamente 5 dígitos" }]}>
                  <Input placeholder="28001" maxLength={5} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Ciudad" name="city"
                  rules={[{ max: 100, message: "Máximo 100 caracteres" }]}>
                  <Input placeholder="Madrid" maxLength={100} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Provincia" name="province">
                  <Select
                    showSearch
                    placeholder="Seleccionar provincia..."
                    optionFilterProp="label"
                    options={PROVINCIAS_ES}
                    allowClear
                    filterOption={(input, option) =>
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Notas" name="notes"
                  rules={[{ max: 500, message: "Máximo 500 caracteres" }]}>
                  <Input.TextArea rows={2} maxLength={500} showCount />
                </Form.Item>
              </Col>
            </Row>
            <Row justify="end">
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Guardar Alojamiento
              </Button>
            </Row>
          </Form>
        )}
      </Card>

      {/* Habitaciones */}
      <Card
        title={<Space><span>Habitaciones</span><Tag>{rooms.length}</Tag></Space>}
        size="small"
        loading={loading}
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={() => setAddingRoom(true)}>
            Añadir
          </Button>
        }
      >
        {/* Formulario nueva habitación */}
        {addingRoom && (
          <Card size="small" style={{ marginBottom: 16, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
            <Text strong style={{ display: "block", marginBottom: 12 }}>Nueva Habitación</Text>
            <Form 
              form={newRoomForm} 
              layout="inline" 
              onFinish={onAddRoom}
              onFinishFailed={(errorInfo) => {
                console.log("Form validation failed:", errorInfo);
              }}
            >
              <Form.Item name="number" label="Nº" rules={[{ required: true, message: "Nº requerido" }]}>
                <Input placeholder="Nº" style={{ width: 70 }} />
              </Form.Item>
              <Form.Item name="monthly_rent" label="Precio/mes">
                <InputNumber placeholder="Precio/mes" min={0} addonAfter="€" style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name="square_meters" label="m²">
                <InputNumber placeholder="m²" min={1} addonAfter="m²" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="bathroom_type" label="Baño" initialValue="shared">
                <Select style={{ width: 130 }} options={BATHROOM_OPTIONS} />
              </Form.Item>
              <Form.Item name="kitchen_type" label="Cocina" initialValue="shared">
                <Select style={{ width: 130 }} options={KITCHEN_OPTIONS} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" size="small">Añadir</Button>
                  <Button size="small" onClick={() => { setAddingRoom(false); newRoomForm.resetFields(); }}>
                    Cancelar
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* Formulario edición habitación inline */}
        {editingRoom && (
          <Card size="small" style={{ marginBottom: 16, background: "#fffbeb", border: "1px solid #fde68a" }}>
            <Text strong style={{ display: "block", marginBottom: 12 }}>
              Editando Hab. {rooms.find((r) => r.id === editingRoom)?.number}
            </Text>
            <Form form={roomForm} layout="inline"
              onFinish={(values) => onSaveRoom(editingRoom, values)}>
              <Form.Item name="number" label="Nº" rules={[{ required: true }]}>
                <Input placeholder="Nº" style={{ width: 70 }} />
              </Form.Item>
              <Form.Item name="monthly_rent" label="Precio/mes">
                <InputNumber placeholder="Precio/mes" min={0} addonAfter="€" style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name="square_meters" label="m²">
                <InputNumber placeholder="m²" min={1} addonAfter="m²" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="bathroom_type" label="Baño">
                <Select style={{ width: 130 }} options={BATHROOM_OPTIONS} />
              </Form.Item>
              <Form.Item name="kitchen_type" label="Cocina">
                <Select style={{ width: 130 }} options={KITCHEN_OPTIONS} />
              </Form.Item>
              <Form.Item name="notes" label="Notas">
                <Input placeholder="Notas" style={{ width: 140 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" size="small">Guardar</Button>
                  <Button size="small" onClick={() => setEditingRoom(null)}>Cancelar</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        <Table
          rowKey="id"
          size="small"
          columns={roomColumns}
          dataSource={rooms}
          pagination={false}
          scroll={{ x: true }}
          locale={{ emptyText: "Sin habitaciones" }}
        />
      </Card>
      </div>
    </V2Layout>
  );
}
