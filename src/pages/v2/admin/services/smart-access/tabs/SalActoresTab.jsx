// src/pages/v2/admin/services/smart-access/tabs/SalActoresTab.jsx
// Gestión de actores de acceso (personal externo) — sub-pestaña de SAL.
//
// CRUD sobre lock_access_actors: limpieza, mantenimiento, agentes, propietarios, etc.
// El admin puede ver concesiones activas por actor.

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Descriptions, Drawer, Form, Input,
  Modal, Popconfirm, Row, Select, Skeleton, Space, Table, Tag,
  Tabs, Typography, message,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  TeamOutlined, KeyOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const { Text } = Typography;

const ACTOR_TYPE_OPTIONS = [
  { value: "owner",           label: "Propietario" },
  { value: "manager",         label: "Gestor" },
  { value: "leasing_agent",   label: "Agente inmobiliario" },
  { value: "cleaning",        label: "Limpieza" },
  { value: "maintenance",     label: "Mantenimiento" },
  { value: "service_company", label: "Empresa de servicios" },
  { value: "custom",          label: "Otro (personalizado)" },
];

const ACTOR_TYPE_COLOR = {
  owner:           "gold",
  manager:         "blue",
  leasing_agent:   "geekblue",
  cleaning:        "cyan",
  maintenance:     "orange",
  service_company: "purple",
  custom:          "default",
};

// ── Drawer de detalle de actor ────────────────────────────────────────────────
function ActorDetailDrawer({ actor, open, onClose }) {
  const [grants, setGrants]     = useState([]);
  const [loadingG, setLoadingG] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !actor?.id) return;
    setLoadingG(true);
    supabase
      .from("lock_access_grants")
      .select(`
        id, status, valid_from, valid_to, source_type,
        locks(name)
      `)
      .eq("lock_access_actor_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setGrants(data ?? []);
        setLoadingG(false);
      });
  }, [open, actor?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!actor) return null;

  const grantsColumns = [
    {
      title: "Cerradura",
      key: "lock",
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.locks?.name ?? "—"}</Text>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => {
        const cfg = {
          active: { status: "success", label: "Activo" },
          pending: { status: "processing", label: "Pendiente" },
          revoked: { status: "default", label: "Revocado" },
        };
        const c = cfg[v] ?? { status: "default", label: v };
        return <Badge status={c.status} text={c.label} />;
      },
    },
    {
      title: "Válido desde",
      dataIndex: "valid_from",
      render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "—",
    },
    {
      title: "Válido hasta",
      dataIndex: "valid_to",
      render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "Indefinido",
    },
    {
      title: "Origen",
      dataIndex: "source_type",
      render: (v) => {
        const labels = { room_assignment: "Habitación", group: "Grupo", manual: "Manual" };
        return <Tag style={{ fontSize: 11 }}>{labels[v] ?? v}</Tag>;
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <TeamOutlined />
          <span>{actor.full_name}</span>
          <Tag color={ACTOR_TYPE_COLOR[actor.actor_type] ?? "default"} style={{ fontSize: 11 }}>
            {ACTOR_TYPE_OPTIONS.find((o) => o.value === actor.actor_type)?.label ?? actor.actor_type}
          </Tag>
        </Space>
      }
      width={620}
    >
      <Tabs
        size="small"
        items={[
          {
            key: "info",
            label: "Datos",
            children: (
              <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                <Descriptions.Item label="Nombre">{actor.full_name}</Descriptions.Item>
                <Descriptions.Item label="Tipo">
                  {ACTOR_TYPE_OPTIONS.find((o) => o.value === actor.actor_type)?.label ?? actor.actor_type}
                </Descriptions.Item>
                {actor.email && (
                  <Descriptions.Item label="Email">{actor.email}</Descriptions.Item>
                )}
                {actor.phone && (
                  <Descriptions.Item label="Teléfono">{actor.phone}</Descriptions.Item>
                )}
                {actor.notes && (
                  <Descriptions.Item label="Notas">{actor.notes}</Descriptions.Item>
                )}
                <Descriptions.Item label="Creado">
                  {dayjs(actor.created_at).format("DD/MM/YYYY")}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: "grants",
            label: `Concesiones${grants.length ? ` (${grants.length})` : ""}`,
            children: (
              <Table
                rowKey="id"
                columns={grantsColumns}
                dataSource={grants}
                loading={loadingG}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                size="small"
                style={{ marginTop: 8 }}
                locale={{ emptyText: "Sin concesiones activas" }}
                scroll={{ x: true }}
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalActoresTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [actors, setActors]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [form] = Form.useForm();

  const loadActors = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lock_access_actors")
        .select("id, full_name, actor_type, email, phone, notes, created_at")
        .eq("client_account_id", clientAccountId)
        .order("full_name");
      if (error) throw error;
      setActors(data ?? []);
    } catch (e) {
      message.error("Error al cargar actores: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { loadActors(); }, [loadActors]);

  const openCreate = () => {
    setEditingActor(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (actor) => {
    setEditingActor(actor);
    form.setFieldsValue({
      full_name:  actor.full_name,
      actor_type: actor.actor_type,
      email:      actor.email ?? "",
      phone:      actor.phone ?? "",
      notes:      actor.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (editingActor) {
        const { error } = await supabase
          .from("lock_access_actors")
          .update({
            full_name:  values.full_name,
            actor_type: values.actor_type,
            email:      values.email || null,
            phone:      values.phone || null,
            notes:      values.notes || null,
          })
          .eq("id", editingActor.id);
        if (error) throw error;
        message.success("Actor actualizado");
      } else {
        const { error } = await supabase
          .from("lock_access_actors")
          .insert({
            client_account_id: clientAccountId,
            full_name:         values.full_name,
            actor_type:        values.actor_type,
            email:             values.email || null,
            phone:             values.phone || null,
            notes:             values.notes || null,
          });
        if (error) throw error;
        message.success("Actor creado");
      }
      setModalOpen(false);
      await loadActors();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (actor) => {
    const { error } = await supabase
      .from("lock_access_actors")
      .delete()
      .eq("id", actor.id);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Actor eliminado");
      setActors((prev) => prev.filter((a) => a.id !== actor.id));
    }
  };

  if (salLoading) return <Skeleton active paragraph={{ rows: 5 }} style={{ maxWidth: 700 }} />;
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
      dataIndex: "full_name",
      key: "full_name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "actor_type",
      key: "actor_type",
      render: (v) => (
        <Tag color={ACTOR_TYPE_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {ACTOR_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v ?? "—"}</Text>,
      responsive: ["md"],
    },
    {
      title: "Teléfono",
      dataIndex: "phone",
      key: "phone",
      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v ?? "—"}</Text>,
      responsive: ["lg"],
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={(e) => { e.stopPropagation(); setSelectedActor(r); setDrawerOpen(true); }}
            title="Ver concesiones"
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          />
          <Popconfirm
            title="¿Eliminar este actor?"
            description="Se perderán todos los datos del actor. Las concesiones activas deberían revocarse primero."
            onConfirm={() => handleDelete(r)}
            okText="Eliminar" okType="danger"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {actors.length} actor{actors.length !== 1 ? "es" : ""}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadActors} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo actor
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={actors}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No hay actores registrados" }}
        onRow={(r) => ({
          onClick: () => { setSelectedActor(r); setDrawerOpen(true); },
          style: { cursor: "pointer" },
        })}
        scroll={{ x: true }}
      />

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        title={editingActor ? "Editar actor" : "Nuevo actor de acceso"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingActor ? "Guardar" : "Crear"}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                label="Nombre completo"
                name="full_name"
                rules={[{ required: true, message: "Introduce el nombre" }]}
              >
                <Input placeholder="Ej: Juan García" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                label="Tipo"
                name="actor_type"
                rules={[{ required: true, message: "Selecciona el tipo" }]}
              >
                <Select options={ACTOR_TYPE_OPTIONS} placeholder="Selecciona tipo" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ type: "email", message: "Email inválido" }]}
              >
                <Input placeholder="correo@ejemplo.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Teléfono" name="phone">
                <Input placeholder="+34 600 000 000" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Notas" name="notes">
                <Input.TextArea rows={2} placeholder="Observaciones opcionales" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Drawer de detalle */}
      <ActorDetailDrawer
        actor={selectedActor}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
