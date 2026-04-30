// src/pages/v2/superadmin/sal-shards/SalShardsList.jsx
// Gestión del pool de shards TTLock (cuentas email agrupadas por SmartRoom).
//
// El superadmin puede:
//   - Ver todos los shards y su capacidad
//   - Crear un shard nuevo
//   - Editar shard (notas, max_locks, max_clients, estado)
//   - Ver qué clientes están asignados a cada shard
//   - Asignar / reasignar un cliente a un shard
//   - Bloquear un shard en caso de incidente

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Descriptions, Drawer, Form, Input,
  InputNumber, Modal, Popconfirm, Progress, Row, Select, Skeleton,
  Space, Switch, Table, Tag, Tooltip, Typography, message,
} from "antd";
import {
  ApiOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  LockOutlined, PlusOutlined, ReloadOutlined, StopOutlined,
  UserOutlined, WarningOutlined,
} from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAuth } from "../../../../providers/AuthProvider";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;
const { Option } = Select;

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHARD_STATUS_CONFIG = {
  active:      { color: "success",   label: "Activo",       icon: <CheckCircleOutlined /> },
  full:        { color: "warning",   label: "Lleno",        icon: <WarningOutlined /> },
  compromised: { color: "error",     label: "Comprometido", icon: <ExclamationCircleOutlined /> },
  retired:     { color: "default",   label: "Retirado",     icon: <StopOutlined /> },
};

function ShardStatusTag({ status, blocked }) {
  const cfg = SHARD_STATUS_CONFIG[status] ?? { color: "default", label: status ?? "—", icon: null };
  return (
    <Space size={4}>
      <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11 }}>{cfg.label}</Tag>
      {blocked && <Tag color="error" icon={<LockOutlined />} style={{ fontSize: 11 }}>Bloqueado</Tag>}
    </Space>
  );
}

function CapacityBar({ current, max, label }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const status = pct >= 90 ? "exception" : pct >= 70 ? "normal" : "success";
  return (
    <Tooltip title={`${current} / ${max} ${label}`}>
      <div style={{ minWidth: 100 }}>
        <Progress percent={pct} size="small" status={status} strokeColor={
          pct >= 90 ? "#DC2626" : pct >= 70 ? "#D97706" : "#059669"
        } />
        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{current}/{max} {label}</Text>
      </div>
    </Tooltip>
  );
}

// ── Drawer de clientes asignados a un shard ───────────────────────────────────
function ShardClientsDrawer({ shard, open, onClose, onReassign }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!shard?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("provider_account_assignments")
      .select(`
        id, status, assigned_at, notes,
        client_account:client_account_id ( id, name, last_name1 )
      `)
      .eq("pool_id", shard.id)
      .order("assigned_at", { ascending: false });
    setAssignments(data ?? []);
    setLoading(false);
  }, [shard?.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!shard) return null;

  const columns = [
    {
      title: "Cliente",
      key: "client",
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: "#6B7280" }} />
          <Text style={{ fontSize: 13 }}>
            {[r.client_account?.name, r.client_account?.last_name1].filter(Boolean).join(" ") || r.client_account?.id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => (
        <Tag color={v === "active" ? "success" : v === "migrating" ? "processing" : "default"} style={{ fontSize: 11 }}>
          {v === "active" ? "Activo" : v === "migrating" ? "Migrando" : v ?? "—"}
        </Tag>
      ),
    },
    {
      title: "Asignado",
      dataIndex: "assigned_at",
      render: (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—",
    },
    {
      title: "",
      key: "actions",
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => onReassign(r.client_account)}>
          Reasignar
        </Button>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <ApiOutlined />
          <span>{shard.shard_code}</span>
          <Text code style={{ fontSize: 11 }}>{shard.ttlock_email}</Text>
        </Space>
      }
      width={580}
    >
      <Descriptions column={2} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Estado" span={2}>
          <ShardStatusTag status={shard.status} blocked={shard.is_blocked} />
        </Descriptions.Item>
        <Descriptions.Item label="Email TTLock" span={2}>
          <Text code style={{ fontSize: 11 }}>{shard.ttlock_email}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Cerraduras">{shard.current_locks_count ?? 0} / {shard.max_locks}</Descriptions.Item>
        <Descriptions.Item label="Clientes">{shard.current_clients_count ?? 0} / {shard.max_clients}</Descriptions.Item>
        {shard.region && <Descriptions.Item label="Región">{shard.region}</Descriptions.Item>}
        {shard.notes && <Descriptions.Item label="Notas" span={2}>{shard.notes}</Descriptions.Item>}
      </Descriptions>

      <Text strong style={{ display: "block", marginBottom: 10 }}>
        Clientes asignados ({assignments.filter((a) => a.status === "active").length} activos)
      </Text>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={assignments}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: "Sin clientes asignados" }}
        scroll={{ x: true }}
      />
    </Drawer>
  );
}

// ── Modal de crear/editar shard ───────────────────────────────────────────────
function ShardFormModal({ open, onClose, shard, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = !!shard;

  useEffect(() => {
    if (open) {
      if (shard) {
        form.setFieldsValue({
          shard_code:  shard.shard_code,
          ttlock_email: shard.ttlock_email,
          provider_client_id: shard.provider_client_id ?? "",
          max_locks:   shard.max_locks,
          max_clients: shard.max_clients,
          region:      shard.region ?? "",
          notes:       shard.notes ?? "",
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ max_locks: 500, max_clients: 50 });
      }
    }
  }, [open, shard, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        shard_code:         values.shard_code,
        provider:           "ttlock",
        ttlock_email:       values.ttlock_email,
        provider_client_id: values.provider_client_id || "PENDING",
        max_locks:          values.max_locks,
        max_clients:        values.max_clients,
        region:             values.region || null,
        notes:              values.notes || null,
        status:             isEdit ? shard.status : "active",
      };

      if (isEdit) {
        const { error } = await supabase
          .from("provider_account_pools")
          .update(payload)
          .eq("id", shard.id);
        if (error) throw error;
        message.success("Shard actualizado");
      } else {
        const { error } = await supabase
          .from("provider_account_pools")
          .insert(payload);
        if (error) throw error;
        message.success("Shard creado. Recuerda configurar las credenciales en Vault.");
      }
      onSaved();
      onClose();
    } catch (e) {
      message.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Editar shard" : "Nuevo shard TTLock"}
      onOk={handleSave}
      confirmLoading={saving}
      okText={isEdit ? "Guardar" : "Crear shard"}
      width={520}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, fontSize: 12 }}
        message="Las credenciales TTLock (client_secret, password_md5, access_token) se configuran directamente en Vault. Este formulario solo gestiona los metadatos del shard."
      />
      <Form form={form} layout="vertical" size="middle">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="shard_code" label="Código del shard" rules={[{ required: true, message: "Requerido" }]}>
              <Input placeholder="shard-eu-001" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="region" label="Región (opcional)">
              <Select allowClear placeholder="Global">
                <Option value="eu">EU</Option>
                <Option value="intl">Internacional</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="ttlock_email"
          label="Email de la cuenta TTLock"
          rules={[{ required: true, type: "email", message: "Email válido requerido" }]}
        >
          <Input placeholder="sal-shard-001@smartroomrental.com" />
        </Form.Item>
        <Form.Item
          name="provider_client_id"
          label="TTLock Client ID (App)"
          tooltip="El clientId de la app registrada en el portal de desarrolladores TTLock"
        >
          <Input placeholder="Opcional — se puede completar después" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="max_locks" label="Máx. cerraduras" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={1} max={5000} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="max_clients" label="Máx. clientes" rules={[{ required: true }]}>
              <InputNumber style={{ width: "100%" }} min={1} max={1000} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notas internas">
          <Input.TextArea rows={2} placeholder="Ej: shard dedicado para cliente enterprise X..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Modal de asignación de cliente a shard ────────────────────────────────────
function AssignClientModal({ open, onClose, preselectedClient, shards, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (preselectedClient) {
        form.setFieldValue("client_name", [preselectedClient.name, preselectedClient.last_name1].filter(Boolean).join(" "));
        form.setFieldValue("client_account_id", preselectedClient.id);
      }
    }
  }, [open, preselectedClient, form]);

  const handleSearch = async (value) => {
    if (!value || value.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("client_accounts")
      .select("id, name, last_name1")
      .or(`name.ilike.%${value}%,last_name1.ilike.%${value}%`)
      .limit(10);
    setSearchResults(data ?? []);
    setSearching(false);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      // Desactivar asignación activa previa (si existe)
      await supabase
        .from("provider_account_assignments")
        .update({ status: "migrated" })
        .eq("client_account_id", values.client_account_id)
        .eq("provider", "ttlock")
        .eq("status", "active");

      // Crear nueva asignación
      const { error } = await supabase
        .from("provider_account_assignments")
        .insert({
          client_account_id: values.client_account_id,
          pool_id:           values.pool_id,
          provider:          "ttlock",
          status:            "active",
          notes:             values.notes || null,
        });
      if (error) throw error;
      message.success("Cliente asignado al shard correctamente");
      onSaved();
      onClose();
    } catch (e) {
      message.error("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Asignar cliente a shard"
      onOk={handleSave}
      confirmLoading={saving}
      okText="Asignar"
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {preselectedClient ? (
          <Form.Item label="Cliente">
            <Input
              value={[preselectedClient.name, preselectedClient.last_name1].filter(Boolean).join(" ")}
              disabled
            />
            <Form.Item name="client_account_id" noStyle>
              <Input type="hidden" />
            </Form.Item>
          </Form.Item>
        ) : (
          <Form.Item name="client_account_id" label="Cliente" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Buscar cliente por nombre..."
              filterOption={false}
              onSearch={handleSearch}
              loading={searching}
            >
              {searchResults.map((c) => (
                <Option key={c.id} value={c.id}>
                  {[c.name, c.last_name1].filter(Boolean).join(" ")}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <Form.Item name="pool_id" label="Shard TTLock" rules={[{ required: true }]}>
          <Select placeholder="Seleccionar shard...">
            {shards
              .filter((s) => s.status === "active" && !s.is_blocked)
              .map((s) => (
                <Option key={s.id} value={s.id}>
                  <Space>
                    <Text code style={{ fontSize: 11 }}>{s.shard_code}</Text>
                    <Text style={{ fontSize: 12 }}>{s.ttlock_email}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({s.current_clients_count ?? 0}/{s.max_clients} clientes)
                    </Text>
                  </Space>
                </Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item name="notes" label="Notas internas">
          <Input.TextArea rows={2} placeholder="Ej: cliente enterprise, shard dedicado..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalShardsList() {
  const { user, profile } = useAuth();
  const userName = profile?.full_name || user?.email || "Superadmin";

  const [shards, setShards]                   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [selectedShard, setSelectedShard]     = useState(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [formModal, setFormModal]             = useState(false);
  const [editingShard, setEditingShard]       = useState(null);
  const [assignModal, setAssignModal]         = useState(false);
  const [preselectedClient, setPreselectedClient] = useState(null);
  const [togglingBlock, setTogglingBlock]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("provider_account_pools")
        .select("*")
        .order("shard_code");
      if (error) throw error;
      setShards(data ?? []);
    } catch (e) {
      message.error("Error al cargar shards: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleBlock = async (shard) => {
    setTogglingBlock(shard.id);
    try {
      const { error } = await supabase
        .from("provider_account_pools")
        .update({ is_blocked: !shard.is_blocked })
        .eq("id", shard.id);
      if (error) throw error;
      message.success(shard.is_blocked ? "Shard desbloqueado" : "Shard bloqueado — nuevas operaciones rechazadas");
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setTogglingBlock(null);
    }
  };

  const openDetail = (shard) => {
    setSelectedShard(shard);
    setDrawerOpen(true);
  };

  const handleEdit = (e, shard) => {
    e.stopPropagation();
    setEditingShard(shard);
    setFormModal(true);
  };

  const handleReassign = (client) => {
    setDrawerOpen(false);
    setPreselectedClient(client);
    setAssignModal(true);
  };

  const totalLocks   = shards.reduce((s, sh) => s + (sh.current_locks_count  ?? 0), 0);
  const totalClients = shards.reduce((s, sh) => s + (sh.current_clients_count ?? 0), 0);
  const activeShards = shards.filter((s) => s.status === "active" && !s.is_blocked).length;

  const columns = [
    {
      title: "Shard",
      key: "shard",
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Space>
            <ApiOutlined style={{ color: "#6B7280" }} />
            <Text strong style={{ fontSize: 13 }}>{r.shard_code}</Text>
            {r.region && <Tag style={{ fontSize: 10 }}>{r.region.toUpperCase()}</Tag>}
          </Space>
          <Text code style={{ fontSize: 11, color: "#9CA3AF" }}>{r.ttlock_email}</Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      key: "status",
      width: 160,
      render: (_, r) => <ShardStatusTag status={r.status} blocked={r.is_blocked} />,
    },
    {
      title: "Cerraduras",
      key: "locks",
      width: 140,
      render: (_, r) => (
        <CapacityBar current={r.current_locks_count ?? 0} max={r.max_locks} label="locks" />
      ),
      responsive: ["md"],
    },
    {
      title: "Clientes",
      key: "clients",
      width: 130,
      render: (_, r) => (
        <CapacityBar current={r.current_clients_count ?? 0} max={r.max_clients} label="clientes" />
      ),
      responsive: ["md"],
    },
    {
      title: "Último token",
      key: "token",
      width: 130,
      render: (_, r) => {
        if (!r.last_token_refresh_at) return <Text type="secondary" style={{ fontSize: 12 }}>Sin token</Text>;
        const days = Math.floor((Date.now() - new Date(r.last_token_refresh_at)) / 86400000);
        return (
          <Tag color={days > 80 ? "error" : days > 60 ? "warning" : "success"} style={{ fontSize: 11 }}>
            {days === 0 ? "Hoy" : `Hace ${days}d`}
          </Tag>
        );
      },
      responsive: ["lg"],
    },
    {
      title: "Acciones",
      key: "actions",
      width: 160,
      render: (_, r) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Button size="small" onClick={(e) => handleEdit(e, r)}>Editar</Button>
          <Popconfirm
            title={r.is_blocked ? "¿Desbloquear este shard?" : "¿Bloquear este shard?"}
            description={r.is_blocked
              ? "Se reanudarán las operaciones sobre este shard."
              : "Todas las nuevas operaciones (crear PINs, unlock remoto, sync) serán rechazadas."}
            onConfirm={() => handleToggleBlock(r)}
            okText={r.is_blocked ? "Desbloquear" : "Bloquear"}
            okType={r.is_blocked ? "primary" : "danger"}
          >
            <Button
              size="small"
              danger={!r.is_blocked}
              loading={togglingBlock === r.id}
              icon={r.is_blocked ? <CheckCircleOutlined /> : <LockOutlined />}
            >
              {r.is_blocked ? "Desbloquear" : "Bloquear"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <V2Layout role="superadmin" userName={userName}>
      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Pool de shards TTLock</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Cuentas email TTLock propias de SmartRoom — cada shard agrupa varios clientes
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingShard(null); setFormModal(true); }}
            >
              Nuevo shard
            </Button>
            <Button
              icon={<UserOutlined />}
              onClick={() => { setPreselectedClient(null); setAssignModal(true); }}
            >
              Asignar cliente
            </Button>
          </Space>
        </div>

        {/* KPIs */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {[
            { label: "Shards activos",    value: activeShards,   color: "#059669" },
            { label: "Shards totales",    value: shards.length,  color: "#1D4ED8" },
            { label: "Cerraduras totales", value: totalLocks,    color: "#7C3AED" },
            { label: "Clientes en SAL",   value: totalClients,   color: "#D97706" },
          ].map((kpi) => (
            <Col key={kpi.label} xs={12} md={6}>
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", padding: "14px 18px" }}>
                <Text style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                  {kpi.label}
                </Text>
                <Text style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</Text>
              </div>
            </Col>
          ))}
        </Row>

        {/* Alerta si hay shards bloqueados */}
        {shards.some((s) => s.is_blocked) && (
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={`${shards.filter((s) => s.is_blocked).length} shard(s) bloqueado(s) — operaciones rechazadas`}
            description="Revisar el motivo del bloqueo y desbloquear cuando el incidente esté resuelto."
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Alerta si shards al 70%+ */}
        {shards.some((s) => s.max_locks > 0 && (s.current_locks_count ?? 0) / s.max_locks >= 0.7) && (
          <Alert
            type="warning"
            showIcon
            message="Uno o más shards al 70% o más de capacidad — considera crear un nuevo shard"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB" }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={shards}
            loading={loading}
            pagination={false}
            size="middle"
            locale={{ emptyText: "No hay shards configurados. Crea el primero." }}
            onRow={(r) => ({ onClick: () => openDetail(r), style: { cursor: "pointer" } })}
            scroll={{ x: true }}
          />
        </div>

        {/* Nota Vault */}
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 20 }}
          message="Las credenciales TTLock (client_secret, password_md5, access_token, refresh_token) se almacenan en Supabase Vault — no son visibles aquí por seguridad. Para configurar o rotar un token, accede directamente a Vault con service_role."
        />
      </div>

      {/* Drawer de clientes del shard */}
      <ShardClientsDrawer
        shard={selectedShard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onReassign={handleReassign}
      />

      {/* Modal crear/editar shard */}
      <ShardFormModal
        open={formModal}
        onClose={() => setFormModal(false)}
        shard={editingShard}
        onSaved={load}
      />

      {/* Modal asignar cliente a shard */}
      <AssignClientModal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        preselectedClient={preselectedClient}
        shards={shards}
        onSaved={load}
      />
    </V2Layout>
  );
}
