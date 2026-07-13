// =============================================================================
// src/pages/v2/superadmin/services/ServiceCreate.jsx
// =============================================================================
// Alta de nuevo servicio en el catálogo SaaS.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Card, Col, ConfigProvider, Form, Input,
  Menu, Row, Select, Space, Typography, message,
} from "antd";
import {
  AppstoreOutlined, ArrowLeftOutlined,
  FileTextOutlined, PlusCircleOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { createService, serviceCategories } from "../../../../mocks/services.mock";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Secciones del menú lateral ────────────────────────────────────────────────

const SECTIONS = [
  { key: "identity", label: "Identidad",     icon: <FileTextOutlined /> },
  { key: "config",   label: "Configuración", icon: <AppstoreOutlined /> },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ServiceCreate() {
  const navigate = useNavigate();
  const [section, setSection] = useState("identity");
  const [saving, setSaving]   = useState(false);
  const [form] = Form.useForm();

  // ── Auto-generar key desde el nombre ─────────────────────────────────────

  const handleLabelChange = (e) => {
    const label = e.target.value;
    const currentKey = form.getFieldValue("key") || "";
    const autoKey = label
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const prevAuto = (form.getFieldValue("label") || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    if (!currentKey || currentKey === prevAuto) {
      form.setFieldValue("key", autoKey);
    }
    form.setFieldValue("label", label);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch (info) {
      const fields = Object.keys(
        info.errorFields?.reduce((a, f) => { a[f.name[0]] = true; return a; }, {}) ?? {}
      );
      if (fields.some((f) => ["label", "key", "description"].includes(f))) setSection("identity");
      else setSection("config");
      return;
    }

    setSaving(true);
    try {
      createService(values);
      message.success("Servicio creado correctamente");
      navigate("/v2/superadmin/servicios");
    } catch (e) {
      message.error(e.message || "Error al crear el servicio");
    } finally {
      setSaving(false);
    }
  };

  // ── Breadcrumbs ───────────────────────────────────────────────────────────

  const crumbs = [
    { label: "Dashboard",             path: "/v2/superadmin" },
    { label: "Catálogo de Servicios", path: "/v2/superadmin/servicios" },
    { label: "Nuevo Servicio",        path: null },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <PlusCircleOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
              Nuevo Servicio
            </Title>
            <Text type="secondary">Configure los parámetros del nuevo servicio</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/superadmin/servicios")}>
                Cancelar
              </Button>
              <Button type="primary" loading={saving} onClick={handleSubmit}>
                Crear Servicio
              </Button>
            </Space>
          </Col>
        </Row>

        {/* ── Layout: menú lateral + formulario ─────────────────────── */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Menú lateral */}
          <div style={{ width: 168, flexShrink: 0, position: "sticky", top: 80 }}>
            <ConfigProvider theme={{ token: { colorPrimary: "#3B82F6" } }}>
              <Menu
                mode="inline"
                selectedKeys={[section]}
                onClick={({ key }) => setSection(key)}
                style={{ borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}
                items={SECTIONS.map((s) => ({ key: s.key, icon: s.icon, label: s.label }))}
              />
            </ConfigProvider>
          </div>

          {/* Formulario */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Form form={form} layout="vertical" initialValues={{ category: "operación", status: "active" }}>

              {/* ── Identidad ─────────────────────────────────────────── */}
              {section === "identity" && (
                <Card title={<span style={{ fontWeight: 700 }}>Identidad del Servicio</span>} style={{ borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="label" label="Nombre"
                        rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                        <Input placeholder="Lavandería" onChange={handleLabelChange} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="key" label="Key"
                        rules={[
                          { required: true, message: "El key es obligatorio" },
                          { pattern: /^[a-z0-9_]+$/, message: "Solo minúsculas, números y guión bajo" },
                        ]}>
                        <Input placeholder="lavanderia" style={{ fontFamily: "monospace" }} />
                      </Form.Item>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -12 }}>
                        Se genera automáticamente. Inmutable tras el alta.
                      </Text>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="Descripción">
                    <TextArea rows={3} placeholder="Descripción del servicio..." />
                  </Form.Item>
                </Card>
              )}

              {/* ── Configuración ─────────────────────────────────────── */}
              {section === "config" && (
                <Card title={<span style={{ fontWeight: 700 }}>Configuración</span>} style={{ borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="category" label="Categoría"
                        rules={[{ required: true, message: "Selecciona una categoría" }]}>
                        <Select
                          options={serviceCategories.map((c) => ({ value: c.key, label: c.label }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="status" label="Estado inicial">
                        <Select options={[
                          { value: "active",   label: "Activo" },
                          { value: "archived", label: "Archivado" },
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              )}

            </Form>
          </div>
        </div>
      </div>
    </V2Layout>
  );
}
