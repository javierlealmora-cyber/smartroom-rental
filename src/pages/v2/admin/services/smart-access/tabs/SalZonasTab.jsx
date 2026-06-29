// src/pages/v2/admin/services/smart-access/tabs/SalZonasTab.jsx
// Gestión de Zonas Comunes — sub-pestaña de SAL.
//
// CRUD completo sobre common_areas del client_account.
// area_type: laundry | bicycle_room | luggage_room | storage |
//            gym | terrace | parking | kitchen | common_room | custom

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Form, Input, Modal, Popconfirm, Row,
  Select, Skeleton, Space, Table, Tag, Typography, message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";

const { Title, Text } = Typography;

const AREA_TYPE_OPTIONS = [
  { value: "laundry",      label: "Lavandería" },
  { value: "bicycle_room", label: "Sala de bicicletas" },
  { value: "luggage_room", label: "Consigna de equipaje" },
  { value: "storage",      label: "Trastero" },
  { value: "gym",          label: "Gimnasio" },
  { value: "terrace",      label: "Terraza" },
  { value: "parking",      label: "Aparcamiento" },
  { value: "kitchen",      label: "Cocina común" },
  { value: "common_room",  label: "Sala común" },
  { value: "custom",       label: "Otra (personalizado)" },
];

const AREA_TYPE_COLOR = {
  laundry:      "blue",
  bicycle_room: "green",
  luggage_room: "orange",
  storage:      "default",
  gym:          "purple",
  terrace:      "cyan",
  parking:      "gold",
  kitchen:      "volcano",
  common_room:  "geekblue",
  custom:       "default",
};

// ── Seleccionar alojamiento ───────────────────────────────────────────────────
function AccommodationSelector({ clientAccountId, value, onChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientAccountId) return;
    supabase
      .from("accommodations")
      .select("id, name")
      .eq("client_account_id", clientAccountId)
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setOptions((data ?? []).map((a) => ({ value: a.id, label: a.name })));
        // Seleccionar el primero por defecto si no hay valor
        if (!value && data?.length) onChange(data[0].id);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientAccountId]);

  return (
    <Select
      loading={loading}
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Selecciona un alojamiento"
      style={{ width: "100%", maxWidth: 340 }}
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalZonasTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [accommodationId, setAccommodationId] = useState(null);
  const [areas, setAreas]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null); // null = crear
  const [saving, setSaving]     = useState(false);
  const [form] = Form.useForm();

  const loadAreas = useCallback(async () => {
    if (!accommodationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("common_areas")
      .select("id, name, area_type, description, created_at")
      .eq("accommodation_id", accommodationId)
      .order("name");
    if (!error) setAreas(data ?? []);
    setLoading(false);
  }, [accommodationId]);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  const openCreate = () => {
    setEditingArea(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (area) => {
    setEditingArea(area);
    form.setFieldsValue({
      name:        area.name,
      area_type:   area.area_type,
      description: area.description ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (editingArea) {
        const { error } = await supabase
          .from("common_areas")
          .update({ name: values.name, area_type: values.area_type, description: values.description || null })
          .eq("id", editingArea.id);
        if (error) throw new Error(error.message);
        message.success("Zona actualizada");
      } else {
        const { error } = await supabase
          .from("common_areas")
          .insert({
            client_account_id: clientAccountId,
            accommodation_id:  accommodationId,
            name:              values.name,
            area_type:         values.area_type,
            description:       values.description || null,
          });
        if (error) throw new Error(error.message);
        message.success("Zona creada");
      }
      setModalOpen(false);
      await loadAreas();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("common_areas").delete().eq("id", id);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Zona eliminada");
      setAreas((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (salLoading) return <Skeleton active paragraph={{ rows: 4 }} style={{ maxWidth: 600 }} />;

  if (!salActive) {
    return (
      <Alert
        type="warning" showIcon
        message="SmartAccessLock no está activo para esta cuenta"
        style={{ maxWidth: 560 }}
      />
    );
  }

  const columns = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "area_type",
      key: "area_type",
      render: (v) => (
        <Tag color={AREA_TYPE_COLOR[v] ?? "default"}>
          {AREA_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "description",
      key: "description",
      render: (v) => <Text type="secondary">{v ?? "—"}</Text>,
      responsive: ["md"],
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="¿Eliminar esta zona común?"
            description="Se eliminarán también los scopes de grupo asociados."
            onConfirm={() => handleDelete(r.id)}
            okText="Eliminar" okType="danger"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Selector de alojamiento */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Text strong>Alojamiento:</Text>
            <AccommodationSelector
              clientAccountId={clientAccountId}
              value={accommodationId}
              onChange={setAccommodationId}
            />
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadAreas} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              disabled={!accommodationId}
            >
              Nueva zona común
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={areas}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No hay zonas comunes para este alojamiento" }}
        scroll={{ x: true }}
      />

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        title={editingArea ? "Editar zona común" : "Nueva zona común"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingArea ? "Guardar" : "Crear"}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Nombre"
            name="name"
            rules={[{ required: true, message: "Introduce un nombre" }]}
          >
            <Input placeholder="Ej: Lavandería Planta 1" />
          </Form.Item>
          <Form.Item
            label="Tipo de zona"
            name="area_type"
            rules={[{ required: true, message: "Selecciona un tipo" }]}
          >
            <Select options={AREA_TYPE_OPTIONS} placeholder="Selecciona el tipo" />
          </Form.Item>
          <Form.Item label="Descripción" name="description">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
