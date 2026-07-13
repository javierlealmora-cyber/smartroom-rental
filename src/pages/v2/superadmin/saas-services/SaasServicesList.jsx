// src/pages/v2/superadmin/saas-services/SaasServicesList.jsx
// Catálogo de servicios SaaS add-on (superadmin)
// Ruta: /v2/superadmin/saas-servicios

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge, Button, Card, Col, Form, Input, Modal, Row, Select,
  Skeleton, Space, Switch, Table, Tabs, Tag, Tooltip, Typography, message,
} from "antd";
import {
  PlusOutlined, AppstoreOutlined, UnorderedListOutlined,
  ExperimentOutlined, ExclamationCircleOutlined, FormOutlined,
  EditOutlined, EyeOutlined, AppstoreAddOutlined,
  LockOutlined, SettingOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import {
  listSaasServices,
  createSaasService,
  updateSaasService,
} from "../../../../services/saasServices.service";

const { Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const VIEW_MODE_KEY = "smartrent_saas_catalog_viewMode";

const STATUS_CONFIG = {
  draft:      { color: "default",   label: "Borrador",      bg: "#F3F4F6", tc: "#6B7280" },
  active:     { color: "success",   label: "Activo",        bg: "#DCFCE7", tc: "#15803D" },
  deprecated: { color: "warning",   label: "Deprecado",     bg: "#FEF3C7", tc: "#B45309" },
  disabled:   { color: "error",     label: "Deshabilitado", bg: "#FEE2E2", tc: "#DC2626" },
};

// ── Card SaaS — mismas dimensiones que ServiceCard en admin/catalogo ──────────
function SaasServiceCard({ service, onView, onEdit }) {
  const cfg = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.draft;

  return (
    <Card
      hoverable
      className="saas-card"
      bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "none",
        width: "100%",
      }}
    >
      {/* ── Header azul gradiente (idéntico al del admin) ── */}
      <div style={{
        background: "linear-gradient(135deg, #1A3A6B 0%, #2563EB 100%)",
        padding: "16px 16px 20px",
        position: "relative",
      }}>
        {/* Badge estado */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <span style={{
            background: cfg.bg,
            color: cfg.tc,
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 20,
            padding: "2px 10px",
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Icono */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}>
          <AppstoreAddOutlined style={{ fontSize: 20, color: "#fff" }} />
        </div>

        {/* Nombre — max 2 líneas, misma altura que admin */}
        <div style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.3,
          paddingRight: 60,
          height: 40,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {service.name}
        </div>
      </div>

      {/* ── Cuerpo blanco (idéntico al del admin) ── */}
      <div style={{ padding: "14px 16px 16px" }}>
        {/* Descripción — altura fija igual que admin */}
        <div style={{
          fontSize: 12,
          color: "#6B7280",
          marginBottom: 12,
          height: 34,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {service.description || <span style={{ color: "#D1D5DB" }}>Sin descripción</span>}
        </div>


        {/* Fila info — misma altura que "Entidad:" en admin */}
        <Text style={{ fontSize: 11, color: "#6B7280", display: "block", marginBottom: 14 }}>
          <span style={{ color: "#9CA3AF" }}>Tipo: </span>Add-on SaaS
        </Text>

        {/* Botones — misma estructura 50/50 que admin */}
        <Row gutter={8}>
          <Col span={12}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={onView}
              style={{
                width: "100%",
                background: "#2563EB",
                borderColor: "#2563EB",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Ver
            </Button>
          </Col>
          <Col span={12}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={onEdit}
              style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}
            >
              Editar
            </Button>
          </Col>
        </Row>
      </div>
    </Card>
  );
}

// ── Placeholder tab ───────────────────────────────────────────────────────────
function PlaceholderTab({ title, description }) {
  return (
    <div style={{ padding: "40px 0" }}>
      <Card style={{
        maxWidth: 520,
        margin: "0 auto",
        borderRadius: 14,
        border: "1px dashed #D1D5DB",
        background: "#FAFAFA",
        textAlign: "center",
        padding: "8px 0",
      }}>
        <Text style={{ fontSize: 15, fontWeight: 600, display: "block", marginBottom: 8 }}>{title}</Text>
        <Text type="secondary" style={{ fontSize: 14 }}>{description}</Text>
      </Card>
    </div>
  );
}

// ── Tab: Catálogo de Servicios ────────────────────────────────────────────────
function CatalogTab() {
  const navigate = useNavigate();
  const [services, setServices]      = useState([]);
  const [loading, setLoading]        = useState(true);
  const [modalOpen, setModalOpen]    = useState(false);
  const [editingService, setEditing] = useState(null);
  const [saving, setSaving]          = useState(false);
  const [viewMode, setViewMode]      = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "cards"
  );
  const [search, setSearch]          = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form] = Form.useForm();

  const changeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

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
    form.setFieldsValue({ status: "draft", visible_in_catalog: true });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    form.setFieldsValue({
      code:               svc.code,
      name:               svc.name,
      description:        svc.description,
      status:             svc.status,
      visible_in_catalog: svc.visible_in_catalog ?? false,
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

  const filtered = useMemo(() => {
    let r = services;
    if (filterStatus) r = r.filter((s) => s.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [services, search, filterStatus]);

  const hasFilters = search || filterStatus;

  const columns = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      render: (v, row) => (
        <Button type="link" style={{ padding: 0 }}
          onClick={() => navigate(`/v2/superadmin/saas-servicios/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: "Descripción",
      dataIndex: "description",
      key: "description",
      render: (v) => <Text type="secondary" style={{ fontSize: 13 }}>{v || "—"}</Text>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => {
        const cfg = STATUS_CONFIG[v] ?? { color: "default", label: v };
        return <Badge status={cfg.color} text={cfg.label} />;
      },
      filters: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 120,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/v2/superadmin/saas-servicios/${row.id}`)}>Ver</Button>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => openEdit(row)}>Editar</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* Fila 1: conteo + Actualizar + Nuevo servicio */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {loading ? "Cargando..." : `${filtered.length} servicio${filtered.length !== 1 ? "s" : ""} en catálogo`}
        </Text>
        <div style={{ flex: 1 }} />
        <Button icon={<AppstoreOutlined />} onClick={load} loading={loading}>Actualizar</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: "#0B2E6D", borderColor: "#0B2E6D" }}>
          Nuevo servicio
        </Button>
      </div>

      {/* Fila 2: búsqueda + estado | toggle derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Search
          style={{ width: 280 }}
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Select
          style={{ width: 150 }}
          placeholder="Estado"
          value={filterStatus || undefined}
          onChange={(v) => setFilterStatus(v || "")}
          allowClear
          options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        {hasFilters && (
          <Button onClick={() => { setSearch(""); setFilterStatus(""); }}>Limpiar</Button>
        )}
        <div style={{ flex: 1 }} />
        <Space size={4}>
          <Tooltip title="Vista tarjetas">
            <Button size="small" icon={<AppstoreOutlined />} type={viewMode === "cards" ? "primary" : "default"} style={viewMode === "cards" ? { background: "#2563EB", borderColor: "#2563EB" } : {}} onClick={() => changeViewMode("cards")} />
          </Tooltip>
          <Tooltip title="Vista lista">
            <Button size="small" icon={<UnorderedListOutlined />} type={viewMode === "list" ? "primary" : "default"} style={viewMode === "list" ? { background: "#2563EB", borderColor: "#2563EB" } : {}} onClick={() => changeViewMode("list")} />
          </Tooltip>
        </Space>
      </div>

      {/* Skeleton loading (solo en vista cards) */}
      {loading && viewMode === "cards" && (
        <Row gutter={[20, 20]}>
          {[1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card style={{ borderRadius: 14 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Vista tarjetas */}
      {!loading && viewMode === "cards" && (
        <Row gutter={[20, 20]}>
          {filtered.map((svc) => (
            <Col key={svc.id} xs={24} sm={12} lg={8} xl={6} style={{ display: "flex" }}>
              <SaasServiceCard
                service={svc}
                onView={() => navigate(`/v2/superadmin/saas-servicios/${svc.id}`)}
                onEdit={() => openEdit(svc)}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Vista lista */}
      {!loading && viewMode === "list" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(11,46,109,0.08)", overflow: "hidden", boxShadow: "0 1px 4px rgba(11,46,109,0.04)" }}>
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="middle"
          />
        </div>
      )}

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
            rules={[
              { required: true, message: "El código es obligatorio" },
              { pattern: /^[a-z0-9_]+$/, message: "Solo letras minúsculas, números y guión bajo" },
            ]}
          >
            <Input placeholder="smart_access_lock" disabled={!!editingService} style={{ fontFamily: "monospace" }} />
          </Form.Item>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="SmartAccessLock" />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={3} placeholder="Descripción breve del servicio" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="status" label="Estado" rules={[{ required: true }]}>
                <Select>
                  <Option value="draft">Borrador</Option>
                  <Option value="active">Activo</Option>
                  <Option value="deprecated">Deprecado</Option>
                  <Option value="disabled">Deshabilitado</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="visible_in_catalog"
                label="Visible en catálogo admin"
                valuePropName="checked"
                tooltip="Si está activo, los usuarios admin podrán ver y contratar este servicio desde su catálogo"
              >
                <Switch checkedChildren="Visible" unCheckedChildren="Oculto" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

// ── Tab: Configuración de Servicios (sub-tabs) ───────────────────────────────
function ConfiguracionTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get("subtab") || "lavanderia";

  const SUB_TABS = [
    {
      key: "lavanderia",
      label: <span><ExperimentOutlined style={{ marginRight: 6 }} />Lavandería</span>,
      children: (
        <PlaceholderTab
          title="Gestión de Lavandería"
          description="Configuración de tarifas, turnos y registro de uso de lavandería. Disponible en próximas fases."
        />
      ),
    },
    {
      key: "smart-access",
      label: <span><LockOutlined style={{ marginRight: 6 }} />Smart Access Lock</span>,
      children: (
        <PlaceholderTab
          title="Smart Access Lock"
          description="Gestión de accesos inteligentes y cerraduras electrónicas. Disponible en próximas fases."
        />
      ),
    },
    {
      key: "incidencias",
      label: <span><ExclamationCircleOutlined style={{ marginRight: 6 }} />Incidencias</span>,
      children: (
        <PlaceholderTab
          title="Gestión de Incidencias"
          description="Sistema de tickets para reportar y resolver incidencias de los alojamientos. Disponible en próximas fases."
        />
      ),
    },
    {
      key: "encuestas",
      label: <span><FormOutlined style={{ marginRight: 6 }} />Encuestas</span>,
      children: (
        <PlaceholderTab
          title="Encuestas de Satisfacción"
          description="Envía encuestas automáticas al check-in y check-out para medir la satisfacción de los inquilinos. Disponible en próximas fases."
        />
      ),
    },
  ];

  return (
    <Tabs
      className="saas-config-sub-tabs"
      activeKey={activeSubTab}
      onChange={(key) => setSearchParams({ tab: "configuracion", subtab: key }, { replace: true })}
      type="line"
      size="small"
      items={SUB_TABS}
      style={{ marginTop: 8 }}
      tabBarStyle={{ marginBottom: 16, borderBottom: "1px solid #E5E7EB" }}
    />
  );
}

// ── Tabs principales ──────────────────────────────────────────────────────────
const MAIN_TABS = [
  {
    key: "catalogo",
    label: <span><AppstoreOutlined style={{ marginRight: 6 }} />Catálogo de Servicios</span>,
    children: <CatalogTab />,
  },
  {
    key: "configuracion",
    label: <span><SettingOutlined style={{ marginRight: 6 }} />Configuración de Servicios</span>,
    children: <ConfiguracionTab />,
  },
];

// ── Componente principal ──────────────────────────────────────────────────────
export default function SaasServicesList() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "catalogo";
  const userName = profile?.full_name || user?.email || "Superadmin";

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ background: "#fff", minHeight: "100%", paddingBottom: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 4px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0, marginBottom: 4, letterSpacing: "-0.5px" }}>
              <AppstoreAddOutlined style={{ marginRight: 10, color: "#1D1D1F" }} />Catálogo de Servicios (Add-On)
            </h1>
          </div>

          <style>{`
            .saas-card {
              transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            }
            .saas-card:hover {
              transform: translateY(-3px) !important;
              box-shadow: 0 6px 18px rgba(0,0,0,0.10) !important;
            }
          `}</style>
          <CatalogTab />

        </div>
      </div>
    </V2Layout>
  );
}
