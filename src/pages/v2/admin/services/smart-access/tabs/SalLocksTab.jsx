// src/pages/v2/admin/services/smart-access/tabs/SalLocksTab.jsx
// Listado de cerraduras sincronizadas desde TTLock.
//
// Columnas: nombre, proveedor, batería, online/offline, ubicación, nº grants
// Acción: "Sincronizar" (sal-sync-locks mode=full)
// Click en fila → abre drawer de detalle de la cerradura

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Descriptions, Drawer, Modal, Form, Input,
  Row, Skeleton, Space, Table, Tag, Tabs, Tooltip, Typography, message,
  Popconfirm, Empty, DatePicker, Select,
} from "antd";
import {
  ReloadOutlined, LockOutlined, UnlockOutlined,
  ThunderboltOutlined, WifiOutlined, DisconnectOutlined,
  HistoryOutlined, KeyOutlined, ExclamationCircleOutlined,
  WarningOutlined, StopOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ── Helpers visuales ──────────────────────────────────────────────────────────
function BatteryTag({ level }) {
  if (level == null) return <Tag color="default">—</Tag>;
  const color = level > 50 ? "success" : level > 20 ? "warning" : "error";
  return (
    <Tag color={color} icon={<ThunderboltOutlined />}>
      {level}%
    </Tag>
  );
}

function OnlineTag({ isOnline }) {
  return isOnline ? (
    <Tag color="success" icon={<WifiOutlined />}>Online</Tag>
  ) : (
    <Tag color="default" icon={<DisconnectOutlined />}>Offline</Tag>
  );
}

const LOCK_STATUS_CONFIG = {
  discovered:           { color: "default",    label: "Detectada",       icon: null },
  quarantine:           { color: "error",      label: "En cuarentena",   icon: <ExclamationCircleOutlined /> },
  claim_pending:        { color: "warning",    label: "Claim pendiente", icon: <WarningOutlined /> },
  ready_for_activation: { color: "processing", label: "Sin gateway",     icon: null },
  active:               { color: "success",    label: "Activa",          icon: null },
  offboarding:          { color: "orange",     label: "Dando de baja",   icon: <StopOutlined /> },
  offboarded:           { color: "default",    label: "Baja",            icon: null },
  error:                { color: "error",      label: "Error técnico",   icon: <ExclamationCircleOutlined /> },
};

function LockStatusBadge({ status }) {
  const cfg = LOCK_STATUS_CONFIG[status] ?? { color: "default", label: status ?? "—", icon: null };
  return (
    <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11 }}>
      {cfg.label}
    </Tag>
  );
}

const PURPOSE_LABEL = {
  entry_door:  "Entrada",
  room_door:   "Habitación",
  common_area: "Zona común",
  safe:        "Caja fuerte",
  other:       "Otro",
};

const EVENT_TYPE_COLOR = {
  unlock:            "success",
  lock:              "blue",
  failed_unlock:     "error",
  keyboard_unlock:   "green",
  remote_unlock:     "purple",
  low_battery:       "warning",
  door_open:         "cyan",
  door_closed:       "default",
};

function relTime(iso) {
  if (!iso) return "—";
  return dayjs(iso).fromNow();
}

// ── Drawer de detalle de cerradura ────────────────────────────────────────────
function LockDetailDrawer({ lock, open, onClose, clientAccountId }) {
  const [grants, setGrants]   = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingG, setLoadingG] = useState(false);
  const [loadingR, setLoadingR] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  const loadGrants = useCallback(async () => {
    if (!lock?.id) return;
    setLoadingG(true);
    const { data } = await supabase
      .from("lock_access_grants")
      .select(`
        id, grant_type, status, valid_from, valid_to, source_type,
        lodger:lodger_id ( id, full_name, email ),
        lock_access_actor:lock_access_actor_id ( id, full_name )
      `)
      .eq("lock_id", lock.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setGrants(data ?? []);
    setLoadingG(false);
  }, [lock?.id]);

  const loadRecords = useCallback(async () => {
    if (!lock?.id) return;
    setLoadingR(true);
    let q = supabase
      .from("lock_records")
      .select("id, event_type, event_at, actor_description, provider_record_id")
      .eq("lock_id", lock.id)
      .order("event_at", { ascending: false })
      .limit(50);

    if (dateRange?.[0] && dateRange?.[1]) {
      q = q
        .gte("event_at", dateRange[0].toISOString())
        .lte("event_at", dateRange[1].toISOString());
    }
    const { data } = await q;
    setRecords(data ?? []);
    setLoadingR(false);
  }, [lock?.id, dateRange]);

  useEffect(() => {
    if (!open || !lock) return;
    if (activeTab === "grants")  loadGrants();
    if (activeTab === "records") loadRecords();
  }, [open, lock, activeTab, loadGrants, loadRecords]);

  const handleRemoteUnlock = async () => {
    if (!lock) return;
    setUnlocking(true);
    try {
      const result = await invokeWithAuth("sal-remote-unlock", {
        body: { client_account_id: clientAccountId, lock_id: lock.id },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al enviar comando de apertura");
      } else {
        message.success("Comando de apertura enviado a la cerradura");
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setUnlocking(false);
    }
  };

  if (!lock) return null;

  const grantsColumns = [
    {
      title: "Beneficiario",
      key: "beneficiary",
      render: (_, r) => {
        const name = r.lodger?.full_name ?? r.lock_access_actor?.full_name ?? "—";
        const type = r.grant_type === "lodger" ? "Inquilino" : "Actor";
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13 }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{type}</Text>
          </Space>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => {
        const colors = { active: "success", pending: "processing", revoked: "default", expired: "default" };
        const labels = { active: "Activo", pending: "Pendiente", revoked: "Revocado", expired: "Expirado" };
        return <Badge status={colors[v] ?? "default"} text={labels[v] ?? v} />;
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
        return <Tag>{labels[v] ?? v}</Tag>;
      },
    },
  ];

  const recordsColumns = [
    {
      title: "Evento",
      dataIndex: "event_type",
      render: (v) => (
        <Tag color={EVENT_TYPE_COLOR[v] ?? "default"}>{v?.replace(/_/g, " ") ?? "—"}</Tag>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "event_at",
      render: (v) => v ? dayjs(v).format("DD/MM/YYYY HH:mm:ss") : "—",
    },
    {
      title: "Actor",
      dataIndex: "actor_description",
      render: (v) => <Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>,
    },
    {
      title: "ID externo",
      dataIndex: "provider_record_id",
      render: (v) => <Text code style={{ fontSize: 11 }}>{v ?? "—"}</Text>,
      responsive: ["lg"],
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <LockOutlined />
          <span>{lock.name}</span>
          <OnlineTag isOnline={lock.is_online} />
        </Space>
      }
      width={680}
      extra={
        <Popconfirm
          title="¿Enviar comando de apertura remota?"
          description="Se enviará un comando de unlock a esta cerradura. Requiere que esté online con gateway."
          onConfirm={handleRemoteUnlock}
          okText="Abrir"
          okType="primary"
          disabled={!lock.is_online}
        >
          <Button
            icon={<UnlockOutlined />}
            loading={unlocking}
            disabled={!lock.is_online}
            title={!lock.is_online ? "La cerradura no está online" : "Abrir remotamente"}
          >
            Unlock remoto
          </Button>
        </Popconfirm>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={[
          {
            key: "info",
            label: "Información",
            children: (
              <Descriptions column={2} size="small" bordered style={{ marginTop: 8 }}>
                <Descriptions.Item label="Nombre" span={2}>{lock.name}</Descriptions.Item>
                <Descriptions.Item label="ID proveedor">
                  <Text code style={{ fontSize: 11 }}>{lock.provider_lock_id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Batería">
                  <BatteryTag level={lock.battery_level} />
                </Descriptions.Item>
                <Descriptions.Item label="Conexión">
                  <OnlineTag isOnline={lock.is_online} />
                </Descriptions.Item>
                <Descriptions.Item label="Ciclo de vida">
                  <LockStatusBadge status={lock.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Última vez visto">
                  {relTime(lock.last_seen_at)}
                </Descriptions.Item>
                {lock.quarantine_reason && (
                  <Descriptions.Item label="Cuarentena" span={2}>
                    <Alert
                      type="warning"
                      showIcon
                      message={lock.quarantine_reason}
                      style={{ padding: "4px 10px" }}
                    />
                  </Descriptions.Item>
                )}
                {lock.model_name && (
                  <Descriptions.Item label="Modelo" span={2}>{lock.model_name}</Descriptions.Item>
                )}
                {lock.firmware_version && (
                  <Descriptions.Item label="Firmware">{lock.firmware_version}</Descriptions.Item>
                )}
                <Descriptions.Item label="Ubicación" span={2}>
                  {lock._placement ? (
                    <Space>
                      <Tag color={lock._placement.placement_type === "room" ? "green" : "blue"}>
                        {PURPOSE_LABEL[lock._placement.lock_purpose] ?? lock._placement.lock_purpose}
                      </Tag>
                      <Text>{lock._placement.display_name}</Text>
                    </Space>
                  ) : (
                    <Tag color="default">Sin ubicar</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: "grants",
            label: `Concesiones${grants.length ? ` (${grants.length})` : ""}`,
            children: (
              <div style={{ marginTop: 8 }}>
                <Table
                  rowKey="id"
                  columns={grantsColumns}
                  dataSource={grants}
                  loading={loadingG}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  size="small"
                  locale={{ emptyText: "No hay concesiones para esta cerradura" }}
                  scroll={{ x: true }}
                />
              </div>
            ),
          },
          {
            key: "records",
            label: "Registros",
            children: (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 12 }}>
                  <RangePicker
                    size="small"
                    onChange={(dates) => setDateRange(dates ? [dates[0].toDate(), dates[1].toDate()] : null)}
                    style={{ width: "100%" }}
                  />
                </div>
                <Table
                  rowKey="id"
                  columns={recordsColumns}
                  dataSource={records}
                  loading={loadingR}
                  pagination={{ pageSize: 20, hideOnSinglePage: true }}
                  size="small"
                  locale={{ emptyText: "No hay registros para esta cerradura" }}
                  scroll={{ x: true }}
                />
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalLocksTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [locks, setLocks]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [selectedLock, setSelectedLock]     = useState(null);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [claimLock, setClaimLock]           = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimLoading, setClaimLoading]     = useState(false);

  const loadLocks = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      // Cargar cerraduras con su placement activo
      const { data: locksData } = await supabase
        .from("locks")
        .select("id, name, provider_lock_id, battery_level, is_online, last_seen_at, firmware_version, status, quarantine_reason")
        .eq("client_account_id", clientAccountId)
        .order("name");

      if (!locksData) { setLocks([]); return; }

      // Cargar placements activos
      const { data: placements } = await supabase
        .from("lock_placements")
        .select("lock_id, placement_type, lock_purpose, display_name")
        .eq("client_account_id", clientAccountId)
        .eq("is_active", true);

      const placementMap = {};
      for (const p of placements ?? []) placementMap[p.lock_id] = p;

      // Contar grants activos por lock
      const { data: grantCounts } = await supabase
        .from("lock_access_grants")
        .select("lock_id")
        .eq("client_account_id", clientAccountId)
        .eq("status", "active");

      const countMap = {};
      for (const g of grantCounts ?? []) {
        countMap[g.lock_id] = (countMap[g.lock_id] ?? 0) + 1;
      }

      setLocks(locksData.map((l) => ({
        ...l,
        _placement:    placementMap[l.id] ?? null,
        _grantsCount:  countMap[l.id] ?? 0,
      })));
    } catch (e) {
      message.error("Error al cargar cerraduras: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { loadLocks(); }, [loadLocks]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await invokeWithAuth("sal-sync-locks", {
        body: { client_account_id: clientAccountId, mode: "full" },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al sincronizar");
      } else {
        message.success(`Cerraduras sincronizadas: ${result?.data?.synced ?? 0}`);
        await loadLocks();
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = (lock) => {
    setSelectedLock(lock);
    setDrawerOpen(true);
  };

  const handleInitClaim = async () => {
    if (!claimLock) return;
    setClaimLoading(true);
    try {
      const result = await invokeWithAuth("sal-open-claim-session", {
        body: {
          client_account_id: clientAccountId,
          session_type: "lock",
          provider_id: claimLock.provider_lock_id,
          claim_type: "transfer_import",
        },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al iniciar claim");
      } else {
        message.success("Sesión de claim abierta. Confirma la cerradura para activarla.");
        setClaimModalOpen(false);
        await loadLocks();
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setClaimLoading(false);
    }
  };

  if (salLoading) return <Skeleton active paragraph={{ rows: 6 }} style={{ maxWidth: 800 }} />;
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
      title: "Cerradura",
      key: "name",
      render: (_, r) => (
        <Space>
          <LockOutlined style={{ color: "#6B7280" }} />
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
        </Space>
      ),
    },
    {
      title: "Ciclo de vida",
      key: "status",
      render: (_, r) => (
        <Space size={4}>
          <LockStatusBadge status={r.status} />
          {r.status === "quarantine" && (
            <Button
              size="small"
              type="link"
              style={{ padding: 0, fontSize: 11 }}
              onClick={(e) => {
                e.stopPropagation();
                setClaimLock(r);
                setClaimModalOpen(true);
              }}
            >
              Iniciar claim
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: "Conexión",
      key: "online",
      render: (_, r) => <OnlineTag isOnline={r.is_online} />,
    },
    {
      title: "Batería",
      key: "battery",
      render: (_, r) => <BatteryTag level={r.battery_level} />,
    },
    {
      title: "Ubicación",
      key: "placement",
      render: (_, r) => r._placement ? (
        <Space size={4}>
          <Tag color={r._placement.placement_type === "room" ? "green" : "blue"} style={{ fontSize: 11 }}>
            {PURPOSE_LABEL[r._placement.lock_purpose] ?? r._placement.lock_purpose}
          </Tag>
          <Text style={{ fontSize: 12 }}>{r._placement.display_name}</Text>
        </Space>
      ) : (
        <Tag color="default" style={{ fontSize: 11 }}>Sin ubicar</Tag>
      ),
    },
    {
      title: "Accesos activos",
      key: "grants",
      render: (_, r) => (
        <Tag color={r._grantsCount > 0 ? "processing" : "default"} icon={<KeyOutlined />}>
          {r._grantsCount}
        </Tag>
      ),
      responsive: ["md"],
    },
    {
      title: "Última conexión",
      key: "last_seen",
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{relTime(r.last_seen_at)}</Text>
      ),
      responsive: ["lg"],
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {locks.length} cerradura{locks.length !== 1 ? "s" : ""} sincronizada{locks.length !== 1 ? "s" : ""}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadLocks} />
            <Button
              type="primary"
              icon={<ReloadOutlined spin={syncing} />}
              loading={syncing}
              onClick={handleSync}
            >
              Sincronizar cerraduras
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={locks}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty description="No hay cerraduras sincronizadas. Conecta TTLock en la pestaña Configuración y sincroniza." /> }}
        onRow={(r) => ({ onClick: () => openDetail(r), style: { cursor: "pointer" } })}
        scroll={{ x: true }}
        rowClassName={() => "sal-lock-row"}
      />

      <Modal
        open={claimModalOpen}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            <span>Iniciar claim de cerradura</span>
          </Space>
        }
        onCancel={() => setClaimModalOpen(false)}
        onOk={handleInitClaim}
        okText="Iniciar claim"
        cancelText="Cancelar"
        confirmLoading={claimLoading}
      >
        <p style={{ marginBottom: 8 }}>
          ¿Iniciar sesión de claim para <strong>{claimLock?.name}</strong>?
        </p>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
          Se abrirá una sesión de tipo <strong>transfer_import</strong>. El admin deberá
          confirmar que esta cerradura pertenece a su cuenta para activarla.
        </p>
        {claimLock?.quarantine_reason && (
          <Alert
            type="warning"
            showIcon
            message={`Motivo de cuarentena: ${claimLock.quarantine_reason}`}
          />
        )}
      </Modal>

      <LockDetailDrawer
        lock={selectedLock}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        clientAccountId={clientAccountId}
      />
    </div>
  );
}
