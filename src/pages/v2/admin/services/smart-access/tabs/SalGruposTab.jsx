// src/pages/v2/admin/services/smart-access/tabs/SalGruposTab.jsx
// Gestión de grupos de acceso — sub-pestaña de SAL.
//
// CRUD sobre lock_access_groups.
// Drawer de detalle con 3 sub-tabs:
//   - Configuración (editar nombre, group_type, etc.)
//   - Miembros (lock_access_group_members)
//   - Ámbitos (lock_access_group_scopes)
//
// Tras cambios en miembros o scopes → sal-process-group-change

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Drawer, Form, Input, Modal,
  Popconfirm, Row, Select, Skeleton, Space, Table, Tabs,
  Tag, Typography, message,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  UserAddOutlined, MinusCircleOutlined, SyncOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";

const { Text } = Typography;

const GROUP_TYPE_OPTIONS = [
  { value: "leasing_agent",   label: "Agente inmobiliario" },
  { value: "cleaning",        label: "Limpieza" },
  { value: "maintenance",     label: "Mantenimiento" },
  { value: "service_company", label: "Empresa de servicios" },
  { value: "owner",           label: "Propietario" },
  { value: "custom",          label: "Personalizado" },
];

const GROUP_TYPE_COLOR = {
  leasing_agent:   "geekblue",
  cleaning:        "cyan",
  maintenance:     "orange",
  service_company: "purple",
  owner:           "gold",
  custom:          "default",
};

const CREDENTIAL_TYPE_OPTIONS = [
  { value: "pin",     label: "PIN numérico" },
  { value: "app_key", label: "Llave digital (app)" },
  { value: "card",    label: "Tarjeta NFC" },
];

const SCOPE_TYPE_OPTIONS = [
  { value: "all_accommodations", label: "Todos los alojamientos" },
  { value: "accommodation",      label: "Alojamiento específico" },
  { value: "room",               label: "Habitación específica" },
  { value: "common_area",        label: "Zona común específica" },
  { value: "lock",               label: "Cerradura específica" },
];

// ── Sub-componente: Miembros del grupo ────────────────────────────────────────
function MembersPanel({ groupId, clientAccountId, onChanged }) {
  const [members, setMembers]   = useState([]);
  const [actors, setActors]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [adding, setAdding]     = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lock_access_group_members")
      .select("id, lock_access_actor_id, lock_access_actors(full_name, actor_type)")
      .eq("lock_access_group_id", groupId)
      .order("created_at");
    setMembers(data ?? []);
    setLoading(false);
  }, [groupId]);

  // Cargar actores disponibles
  useEffect(() => {
    if (!clientAccountId) return;
    supabase
      .from("lock_access_actors")
      .select("id, full_name, actor_type")
      .eq("client_account_id", clientAccountId)
      .order("full_name")
      .then(({ data }) => setActors(data ?? []));
  }, [clientAccountId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAdd = async () => {
    if (!selectedActor) return;
    setAdding(true);
    const { error } = await supabase
      .from("lock_access_group_members")
      .insert({ lock_access_group_id: groupId, lock_access_actor_id: selectedActor });
    if (error) {
      message.error(error.message);
    } else {
      message.success("Miembro añadido");
      setSelectedActor(null);
      await loadMembers();
      onChanged?.();
    }
    setAdding(false);
  };

  const handleRemove = async (memberId) => {
    const { error } = await supabase
      .from("lock_access_group_members")
      .delete()
      .eq("id", memberId);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Miembro eliminado");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onChanged?.();
    }
  };

  // Actores que aún no son miembros
  const memberActorIds = new Set(members.map((m) => m.lock_access_actor_id));
  const actorOptions = actors
    .filter((a) => !memberActorIds.has(a.id))
    .map((a) => ({ value: a.id, label: a.full_name }));

  const columns = [
    {
      title: "Actor",
      key: "actor",
      render: (_, r) => (
        <Space>
          <Text strong style={{ fontSize: 13 }}>
            {r.lock_access_actors?.full_name ?? "—"}
          </Text>
          <Tag color={GROUP_TYPE_COLOR[r.lock_access_actors?.actor_type] ?? "default"} style={{ fontSize: 11 }}>
            {GROUP_TYPE_OPTIONS.find((o) => o.value === r.lock_access_actors?.actor_type)?.label ?? r.lock_access_actors?.actor_type}
          </Tag>
        </Space>
      ),
    },
    {
      title: "",
      key: "remove",
      width: 40,
      render: (_, r) => (
        <Popconfirm
          title="¿Quitar este miembro del grupo?"
          onConfirm={() => handleRemove(r.id)}
          okText="Quitar" okType="danger"
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<MinusCircleOutlined />}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Select
          placeholder="Seleccionar actor"
          options={actorOptions}
          value={selectedActor}
          onChange={setSelectedActor}
          style={{ flex: 1 }}
          showSearch
          filterOption={(input, opt) =>
            (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
        />
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          disabled={!selectedActor}
          loading={adding}
          onClick={handleAdd}
        >
          Añadir
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={members}
        loading={loading}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        size="small"
        locale={{ emptyText: "Sin miembros en este grupo" }}
      />
    </div>
  );
}

// ── Sub-componente: Ámbitos del grupo ─────────────────────────────────────────
function ScopesPanel({ groupId, clientAccountId, onChanged }) {
  const [scopes, setScopes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [scopeForm] = Form.useForm();

  // Opciones de entidades según scope_type seleccionado
  const [scopeType, setScopeType] = useState(null);
  const [entityOptions, setEntityOptions] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const loadScopes = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lock_access_group_scopes")
      .select("id, scope_type, accommodation_id, room_id, common_area_id, lock_id")
      .eq("lock_access_group_id", groupId);
    setScopes(data ?? []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { loadScopes(); }, [loadScopes]);

  // Cargar entidades según tipo de scope
  useEffect(() => {
    if (!scopeType || !clientAccountId) return;
    if (scopeType === "all_accommodations") { setEntityOptions([]); return; }

    setLoadingEntities(true);
    const tableMap = {
      accommodation: { table: "accommodations",  col: "name" },
      room:          { table: "rooms",           col: "number" },
      common_area:   { table: "common_areas",    col: "name" },
      lock:          { table: "locks",           col: "name" },
    };
    const cfg = tableMap[scopeType];
    if (!cfg) { setEntityOptions([]); setLoadingEntities(false); return; }

    supabase
      .from(cfg.table)
      .select(`id, ${cfg.col}`)
      .eq("client_account_id", clientAccountId)
      .order(cfg.col)
      .then(({ data }) => {
        setEntityOptions((data ?? []).map((r) => ({
          value: r.id,
          label: scopeType === "room" ? `Hab. ${r[cfg.col]}` : (r[cfg.col] ?? r.id),
        })));
        setLoadingEntities(false);
      });
  }, [scopeType, clientAccountId]);

  const handleAddScope = async () => {
    let values;
    try { values = await scopeForm.validateFields(); } catch { return; }
    setSavingScope(true);
    try {
      const payload = {
        lock_access_group_id: groupId,
        scope_type:           values.scope_type,
        accommodation_id:     values.scope_type === "accommodation" ? values.entity_id : null,
        room_id:              values.scope_type === "room"          ? values.entity_id : null,
        common_area_id:       values.scope_type === "common_area"   ? values.entity_id : null,
        lock_id:              values.scope_type === "lock"          ? values.entity_id : null,
      };
      const { error } = await supabase
        .from("lock_access_group_scopes")
        .insert(payload);
      if (error) throw error;
      message.success("Ámbito añadido");
      setModalOpen(false);
      scopeForm.resetFields();
      setScopeType(null);
      await loadScopes();
      onChanged?.();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingScope(false);
    }
  };

  const handleRemoveScope = async (id) => {
    const { error } = await supabase
      .from("lock_access_group_scopes")
      .delete()
      .eq("id", id);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Ámbito eliminado");
      setScopes((prev) => prev.filter((s) => s.id !== id));
      onChanged?.();
    }
  };

  const scopeColumns = [
    {
      title: "Tipo de ámbito",
      dataIndex: "scope_type",
      render: (v) => (
        <Tag style={{ fontSize: 11 }}>
          {SCOPE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: "Entidad",
      key: "entity",
      render: (_, r) => {
        const id = r.accommodation_id ?? r.room_id ?? r.common_area_id ?? r.lock_id;
        if (!id) return <Text type="secondary" style={{ fontSize: 12 }}>Todos</Text>;
        return <Text code style={{ fontSize: 11 }}>{id}</Text>;
      },
    },
    {
      title: "",
      key: "remove",
      width: 40,
      render: (_, r) => (
        <Popconfirm
          title="¿Eliminar este ámbito?"
          onConfirm={() => handleRemoveScope(r.id)}
          okText="Eliminar" okType="danger"
        >
          <Button type="text" size="small" danger icon={<MinusCircleOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => { scopeForm.resetFields(); setScopeType(null); setModalOpen(true); }}
        >
          Añadir ámbito
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={scopeColumns}
        dataSource={scopes}
        loading={loading}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        size="small"
        locale={{ emptyText: "Sin ámbitos definidos — este grupo no tiene acceso a ninguna cerradura" }}
      />

      <Modal
        open={modalOpen}
        title="Añadir ámbito de acceso"
        onCancel={() => setModalOpen(false)}
        onOk={handleAddScope}
        okText="Añadir"
        confirmLoading={savingScope}
        destroyOnClose
      >
        <Form form={scopeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tipo de ámbito"
            name="scope_type"
            rules={[{ required: true, message: "Selecciona el tipo" }]}
          >
            <Select
              options={SCOPE_TYPE_OPTIONS}
              onChange={(v) => { setScopeType(v); scopeForm.setFieldValue("entity_id", undefined); }}
              placeholder="Selecciona tipo"
            />
          </Form.Item>
          {scopeType && scopeType !== "all_accommodations" && (
            <Form.Item
              label="Entidad"
              name="entity_id"
              rules={[{ required: true, message: "Selecciona una entidad" }]}
            >
              <Select
                options={entityOptions}
                loading={loadingEntities}
                placeholder="Selecciona la entidad"
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalGruposTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [form] = Form.useForm();

  const loadGroups = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lock_access_groups")
        .select("id, name, group_type, description, credential_type, validity_days, auto_renew, is_active, created_at")
        .eq("client_account_id", clientAccountId)
        .order("name");
      if (error) throw error;
      setGroups(data ?? []);
    } catch (e) {
      message.error("Error al cargar grupos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const openCreate = () => {
    setEditingGroup(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (group) => {
    setEditingGroup(group);
    form.setFieldsValue({
      name:           group.name,
      group_type:     group.group_type,
      description:    group.description ?? "",
      credential_type: group.credential_type ?? "pin",
      validity_days:  group.validity_days ?? 30,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("lock_access_groups")
          .update({
            name:            values.name,
            group_type:      values.group_type,
            description:     values.description || null,
            credential_type: values.credential_type,
            validity_days:   values.validity_days,
          })
          .eq("id", editingGroup.id);
        if (error) throw error;
        message.success("Grupo actualizado");
      } else {
        const { error } = await supabase
          .from("lock_access_groups")
          .insert({
            client_account_id: clientAccountId,
            name:              values.name,
            group_type:        values.group_type,
            description:       values.description || null,
            credential_type:   values.credential_type ?? "pin",
            validity_days:     values.validity_days ?? 30,
          });
        if (error) throw error;
        message.success("Grupo creado");
      }
      setModalOpen(false);
      await loadGroups();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group) => {
    const { error } = await supabase
      .from("lock_access_groups")
      .delete()
      .eq("id", group.id);
    if (error) {
      message.error(error.message);
    } else {
      message.success("Grupo eliminado");
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    }
  };

  // Recalcular grants del grupo tras cambio en miembros/scopes
  const handleGroupChanged = useCallback(async () => {
    if (!selectedGroup) return;
    setRecalculating(true);
    try {
      await invokeWithAuth("sal-process-group-change", {
        body: { client_account_id: clientAccountId, group_id: selectedGroup.id },
      });
    } catch {
      // Silencioso — la reconciliación de n8n lo reintentará
    } finally {
      setRecalculating(false);
    }
  }, [clientAccountId, selectedGroup]);

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
      dataIndex: "name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Tipo",
      dataIndex: "group_type",
      render: (v) => (
        <Tag color={GROUP_TYPE_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {GROUP_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
        </Tag>
      ),
    },
    {
      title: "Credencial",
      dataIndex: "credential_type",
      render: (v) => (
        <Tag style={{ fontSize: 11 }}>
          {CREDENTIAL_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "—"}
        </Tag>
      ),
      responsive: ["md"],
    },
    {
      title: "Vigencia (días)",
      dataIndex: "validity_days",
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
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          />
          <Popconfirm
            title="¿Eliminar este grupo?"
            description="Se perderán todas las configuraciones del grupo. Los accesos deben revocarse manualmente."
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
            {groups.length} grupo{groups.length !== 1 ? "s" : ""}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadGroups} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo grupo
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={groups}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No hay grupos de acceso definidos" }}
        onRow={(r) => ({
          onClick: () => { setSelectedGroup(r); setDrawerOpen(true); },
          style: { cursor: "pointer" },
        })}
        scroll={{ x: true }}
      />

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        title={editingGroup ? "Editar grupo" : "Nuevo grupo de acceso"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingGroup ? "Guardar" : "Crear"}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                label="Nombre del grupo"
                name="name"
                rules={[{ required: true, message: "Introduce el nombre" }]}
              >
                <Input placeholder="Ej: Equipo limpieza" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                label="Tipo"
                name="group_type"
                rules={[{ required: true, message: "Selecciona el tipo" }]}
              >
                <Select options={GROUP_TYPE_OPTIONS} placeholder="Tipo" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Descripción" name="description">
                <Input placeholder="Descripción opcional" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Tipo de credencial"
                name="credential_type"
                initialValue="pin"
              >
                <Select options={CREDENTIAL_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Vigencia (días)"
                name="validity_days"
                initialValue={30}
              >
                <Input type="number" min={1} max={365} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Drawer de detalle */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedGroup?.name ?? "Grupo"}
        width={680}
        extra={
          recalculating ? (
            <Tag icon={<SyncOutlined spin />} color="processing">Recalculando acceso…</Tag>
          ) : null
        }
      >
        {selectedGroup && (
          <Tabs
            size="small"
            items={[
              {
                key: "members",
                label: "Miembros",
                children: (
                  <MembersPanel
                    groupId={selectedGroup.id}
                    clientAccountId={clientAccountId}
                    onChanged={handleGroupChanged}
                  />
                ),
              },
              {
                key: "scopes",
                label: "Ámbitos de acceso",
                children: (
                  <ScopesPanel
                    groupId={selectedGroup.id}
                    clientAccountId={clientAccountId}
                    onChanged={handleGroupChanged}
                  />
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
