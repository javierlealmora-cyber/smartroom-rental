// src/pages/v2/superadmin/saas-services/SaasServicesList.jsx
// Catálogo de servicios SaaS add-on (superadmin)
// Ruta: /v2/superadmin/saas-servicios

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Badge, Button, Form, Input, Modal, Select,
  Space, Switch, Table, Tag, Typography, message,
} from "antd";
import { PlusOutlined, AppstoreOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import {
  listSaasServices,
  createSaasService,
  updateSaasService,
} from "../../../../services/saasServices.service";

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_CONFIG = {
  draft:      { color: "default",   label: "Borrador" },
  active:     { color: "success",   label: "Activo" },
  deprecated: { color: "warning",   label: "Deprecado" },
  disabled:   { color: "error",     label: "Deshabilitado" },
};

export default function SaasServicesList() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [services, setServices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingService, setEditing]  = useState(null);
  const [saving, setSaving]           = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSaasServices();
      setServices(data);
    } catch (e) {
      message.error("Error cargando servicios: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: "draft", visible_in_catalog: false, requires_manual_activation: true });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    form.setFieldsValue({
      code:                       svc.code,
      name:                       svc.name,
      description:                svc.description,
      status:                     svc.status,
      visible_in_catalog:         svc.visible_in_catalog,
      requires_manual_activation: svc.requires_manual_activation,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setSaving(true);
    try {
      if (editingService) {
        await updateSaasService(editingService.id, values);
        message.success("Servicio actualizado");
      } else {
        await createSaasService(values);
        message.success("Servicio creado");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // KPI row
  const total    = services.length;
  const active   = services.filter((s) => s.status === "active").length;
  const archived = services.filter((s) => ["deprecated", "disabled"].includes(s.status)).length;

  const columns = [
    {
      title: "Código",
      dataIndex: "code",
      key: "code",
      render: (v) => (
        <Tag style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</Tag>
      ),
    },
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      render: (v, row) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/v2/superadmin/saas-servicios/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => {
        const cfg = STATUS_CONFIG[v] ?? { color: "default", label: v };
        return <Badge status={cfg.color} text={cfg.label} />;
      },
      filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "En catálogo",
      dataIndex: "visible_in_catalog",
      key: "visible_in_catalog",
      render: (v) => <Tag color={v ? "blue" : "default"}>{v ? "Visible" : "Oculto"}</Tag>,
    },
    {
      title: "Activación",
      dataIndex: "requires_manual_activation",
      key: "requires_manual_activation",
      render: (v) => <Text type={v ? "warning" : "success"}>{v ? "Manual" : "Autoservicio"}</Text>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/v2/superadmin/saas-servicios/${row.id}`)}>Ver</Button>
          <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
        </Space>
      ),
    },
  ];

  const userName = profile?.full_name || user?.email || "Superadmin";

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <AppstoreOutlined style={{ marginRight: 8 }} />
              Catálogo SaaS Add-ons
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Servicios adicionales disponibles en la plataforma
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo servicio
          </Button>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total",      value: total,    color: "#1F2937" },
            { label: "Activos",    value: active,   color: "#059669" },
            { label: "Archivados", value: archived, color: "#9CA3AF" },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
              padding: "14px 24px", minWidth: 110,
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <Table
            columns={columns}
            dataSource={services}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="middle"
            onRow={(row) => ({ style: { cursor: "pointer" } })}
          />
        </div>
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        title={editingService ? "Editar servicio SaaS" : "Nuevo servicio SaaS"}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editingService ? "Guardar cambios" : "Crear servicio"}
        confirmLoading={saving}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Código interno"
            rules={[{ required: true, message: "El código es obligatorio" },
                    { pattern: /^[a-z0-9_]+$/, message: "Solo letras minúsculas, números y guión bajo" }]}
          >
            <Input
              placeholder="smart_access_lock"
              disabled={!!editingService}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="SmartAccessLock" />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={3} placeholder="Descripción breve del servicio" />
          </Form.Item>

          <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
            <Select>
              <Option value="draft">Borrador</Option>
              <Option value="active">Activo</Option>
              <Option value="deprecated">Deprecado</Option>
              <Option value="disabled">Deshabilitado</Option>
            </Select>
          </Form.Item>

          <Form.Item name="visible_in_catalog" label="Visible en catálogo" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="requires_manual_activation" label="Requiere activación manual" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </V2Layout>
  );
}
