// =============================================================================
// src/pages/v2/superadmin/services/ServiceDetail.jsx
// =============================================================================
// Detalle y edición de un servicio del catálogo SaaS.
// Detecta /editar en la URL para el modo formulario.
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Badge, Button, Card, Col, ConfigProvider, Descriptions,
  Form, Input, Menu, Modal, Row, Select, Skeleton,
  Space, Tag, Typography, message,
} from "antd";
import {
  AppstoreOutlined, ArrowLeftOutlined, EditOutlined,
  FileTextOutlined, OrderedListOutlined, StopOutlined, SyncOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import {
  getServiceById, updateService, archiveService,
  reactivateService, serviceCategories,
} from "../../../../mocks/services.mock";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:   { color: "#10B981", label: "Activo",    badge: "success" },
  archived: { color: "#EF4444", label: "Archivado", badge: "error"   },
};

// ── Secciones del menú lateral ─────────────────────────────────────────────

const SECTIONS = [
  { key: "identity", label: "Identidad",  icon: <FileTextOutlined /> },
  { key: "config",   label: "Configuración", icon: <AppstoreOutlined /> },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ServiceDetail() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const location   = useLocation();
  const isEdit     = location.pathname.endsWith("/editar");

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [section, setSection] = useState("identity");

  const [form] = Form.useForm();

  // ── Carga ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const found = getServiceById(id);
    if (!found) {
      message.error("Servicio no encontrado");
      navigate("/v2/superadmin/servicios");
      return;
    }
    setService(found);
    form.setFieldsValue({
      key:         found.key,
      label:       found.label,
      description: found.description,
      category:    found.category,
      status:      found.status,
    });
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Guardar ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setSaving(true);
    try {
      updateService(id, values);
      setService((prev) => ({ ...prev, ...values }));
      message.success("Servicio actualizado correctamente");
      navigate(`/v2/superadmin/servicios/${id}`);
    } catch (e) {
      message.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Archivar / Reactivar ──────────────────────────────────────────────────

  const handleArchive = () => {
    Modal.confirm({
      title:      "Archivar servicio",
      content:    `¿Archivar el servicio "${service?.label}"? No estará disponible para nuevas asignaciones.`,
      okText:     "Archivar",
      okType:     "danger",
      cancelText: "Cancelar",
      onOk: () => {
        try {
          archiveService(id);
          message.success("Servicio archivado");
          navigate("/v2/superadmin/servicios");
        } catch (e) {
          message.error(e.message || "Error al archivar");
        }
      },
    });
  };

  const handleReactivate = () => {
    Modal.confirm({
      title:      "Reactivar servicio",
      content:    `¿Reactivar el servicio "${service?.label}"?`,
      okText:     "Reactivar",
      cancelText: "Cancelar",
      onOk: () => {
        try {
          reactivateService(id);
          message.success("Servicio reactivado");
          navigate("/v2/superadmin/servicios");
        } catch (e) {
          message.error(e.message || "Error al reactivar");
        }
      },
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading || !service) {
    return (
      <V2Layout role="superadmin" userName="Administrador">
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </V2Layout>
    );
  }

  const statusCfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.archived;
  const isArchived = service.status === "archived";

  // ── Breadcrumbs ────────────────────────────────────────────────────────────

  const crumbs = [
    { label: "Dashboard",            path: "/v2/superadmin" },
    { label: "Catálogo de Servicios", path: "/v2/superadmin/servicios" },
    { label: service.label,          path: `/v2/superadmin/servicios/${id}` },
    ...(isEdit ? [{ label: "Editar", path: null }] : []),
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA DETALLE
  // ══════════════════════════════════════════════════════════════════════════

  if (!isEdit) {
    return (
      <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
            <Col>
              <Space align="center" size={10}>
                <Title level={2} style={{ margin: 0 }}>
                  <FileTextOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
                  {service.label}
                </Title>
                <Tag style={{
                  background: `${statusCfg.color}18`, color: statusCfg.color,
                  border: `1px solid ${statusCfg.color}40`, fontWeight: 600,
                  borderRadius: 6, fontSize: 12,
                }}>
                  {statusCfg.label}
                </Tag>
              </Space>
              <Text type="secondary" style={{ display: "block", marginTop: 2 }}>
                Key: <code style={{ fontSize: 12 }}>{service.key}</code>
              </Text>
            </Col>
            <Col>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/superadmin/servicios")}>
                  Volver
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/v2/superadmin/servicios/${id}/editar`)}
                >
                  Editar Servicio
                </Button>
              </Space>
            </Col>
          </Row>

          {/* ── Cards ──────────────────────────────────────────────────── */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>IDENTIDAD</span>}
                style={{ borderLeft: "3px solid #3B82F6", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 160 }}>
                  <Descriptions.Item label="Nombre">{service.label}</Descriptions.Item>
                  <Descriptions.Item label="Key">
                    <code style={{ background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>{service.key}</code>
                  </Descriptions.Item>
                  <Descriptions.Item label="Descripción">{service.description || "—"}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={<span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6B7280" }}>CONFIGURACIÓN</span>}
                style={{ borderLeft: "3px solid #8B5CF6", borderRadius: 10 }}
              >
                <Descriptions column={1} size="small" labelStyle={{ color: "#6B7280", width: 160 }}>
                  <Descriptions.Item label="Categoría">
                    <Tag color="blue">{service.category}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    <Badge status={statusCfg.badge} text={statusCfg.label} />
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </div>
      </V2Layout>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA EDICIÓN
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <V2Layout role="superadmin" userName="Administrador" customBreadcrumbs={crumbs}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <OrderedListOutlined style={{ marginRight: 10, color: "#3B82F6" }} />
              Editar Servicio: {service.label}
            </Title>
            <Text type="secondary">Modifique los parámetros del servicio</Text>
          </Col>
          <Col>
            <Space>
              {isArchived ? (
                <Button icon={<SyncOutlined />} onClick={handleReactivate}>
                  Reactivar
                </Button>
              ) : (
                <Button danger icon={<StopOutlined />} onClick={handleArchive}>
                  Archivar
                </Button>
              )}
              <Button onClick={() => navigate(`/v2/superadmin/servicios/${id}`)}>
                Cancelar
              </Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                Guardar Cambios
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
            <Form form={form} layout="vertical">

              {/* ── Identidad ─────────────────────────────────────────── */}
              {section === "identity" && (
                <Card title={<span style={{ fontWeight: 700 }}>Identidad del Servicio</span>} style={{ borderRadius: 10 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="label" label="Nombre"
                        rules={[{ required: true, message: "El nombre es obligatorio" }]}>
                        <Input placeholder="Lavandería" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="key" label="Key">
                        <Input disabled style={{ fontFamily: "monospace", background: "#F9FAFB", color: "#9CA3AF" }} />
                      </Form.Item>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -12 }}>
                        El key no se puede modificar
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
                      <Form.Item name="status" label="Estado"
                        rules={[{ required: true }]}>
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
