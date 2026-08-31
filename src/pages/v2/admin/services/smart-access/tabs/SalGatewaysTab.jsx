// src/pages/v2/admin/services/smart-access/tabs/SalGatewaysTab.jsx
// Listado de lock_gateways TTLock registrados para el cliente.
//
// Columnas: nombre, estado (ciclo de vida), conexión, alojamiento, WiFi, cerraduras vinculadas
// Click en fila → drawer de detalle

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Col, Descriptions, Drawer, Row, Skeleton, Space,
  Table, Tag, Typography, message, Empty, Tooltip,
} from "antd";
import {
  ReloadOutlined, WifiOutlined, DisconnectOutlined,
  ExclamationCircleOutlined, StopOutlined, WarningOutlined,
  ApiOutlined, LockOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Text } = Typography;

// ── Helpers visuales ──────────────────────────────────────────────────────────
function OnlineTag({ isOnline }) {
  return isOnline ? (
    <Tag color="success" icon={<WifiOutlined />}>Online</Tag>
  ) : (
    <Tag color="default" icon={<DisconnectOutlined />}>Offline</Tag>
  );
}

const GATEWAY_STATUS_CONFIG = {
  claim_pending:  { color: "warning",  label: "Claim pendiente", icon: <WarningOutlined /> },
  active:         { color: "success",  label: "Activo",          icon: null },
  offline_error:  { color: "error",    label: "Error offline",   icon: <ExclamationCircleOutlined /> },
  offboarding:    { color: "orange",   label: "Dando de baja",   icon: <StopOutlined /> },
  offboarded:     { color: "default",  label: "Baja",            icon: null },
};

function GatewayStatusBadge({ status }) {
  const cfg = GATEWAY_STATUS_CONFIG[status] ?? { color: "default", label: status ?? "—", icon: null };
  return (
    <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11 }}>
      {cfg.label}
    </Tag>
  );
}

function relTime(iso) {
  if (!iso) return "—";
  return dayjs(iso).fromNow();
}

// ── Drawer de detalle de gateway ──────────────────────────────────────────────
function GatewayDetailDrawer({ gateway, open, onClose }) {
  const [linkedLocks, setLinkedLocks] = useState([]);
  const [loadingLocks, setLoadingLocks] = useState(false);

  const loadLinkedLocks = useCallback(async () => {
    if (!gateway?.id) return;
    setLoadingLocks(true);
    const { data } = await supabase
      .from("lock_gateway_links")
      .select(`
        id, is_active, physical_validation_status,
        lock:lock_id ( id, name, status, is_online, battery_level )
      `)
      .eq("gateway_id", gateway.id)
      .eq("is_active", true);
    setLinkedLocks(data ?? []);
    setLoadingLocks(false);
  }, [gateway]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && gateway) loadLinkedLocks();
  }, [open, gateway, loadLinkedLocks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!gateway) return null;

  const lockColumns = [
    {
      title: "Cerradura",
      key: "name",
      render: (_, r) => (
        <Space size={4}>
          <LockOutlined style={{ color: "#6B7280" }} />
          <Text style={{ fontSize: 13 }}>{r.lock?.name ?? "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      key: "status",
      render: (_, r) => (
        r.lock?.is_online
          ? <Tag color="success" icon={<WifiOutlined />} style={{ fontSize: 11 }}>Online</Tag>
          : <Tag color="default" icon={<DisconnectOutlined />} style={{ fontSize: 11 }}>Offline</Tag>
      ),
    },
    {
      title: "Validación física",
      dataIndex: "physical_validation_status",
      render: (v) => {
        const map = {
          validated:     { color: "success", label: "Validado" },
          not_validated: { color: "default", label: "Sin validar" },
          degraded:      { color: "warning", label: "Degradado" },
          failed:        { color: "error",   label: "Fallido" },
        };
        const cfg = map[v] ?? { color: "default", label: v ?? "—" };
        return <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>;
      },
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <Space>
          <ApiOutlined />
          <span>{gateway.name}</span>
          <OnlineTag isOnline={gateway.is_online} />
        </Space>
      }
      width={560}
    >
      <Descriptions column={2} size="small" bordered style={{ marginBottom: 20 }}>
        <Descriptions.Item label="Nombre" span={2}>{gateway.name}</Descriptions.Item>
        <Descriptions.Item label="ID proveedor">
          <Text code style={{ fontSize: 11 }}>{gateway.provider_gateway_id ?? "—"}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Estado ciclo de vida">
          <GatewayStatusBadge status={gateway.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Conexión">
          <OnlineTag isOnline={gateway.is_online} />
        </Descriptions.Item>
        <Descriptions.Item label="Última vez visto">
          {relTime(gateway.last_seen_at)}
        </Descriptions.Item>
        {gateway.wifi_ssid && (
          <Descriptions.Item label="Red WiFi" span={2}>
            <Tag icon={<WifiOutlined />}>{gateway.wifi_ssid}</Tag>
          </Descriptions.Item>
        )}
        {gateway.firmware_version && (
          <Descriptions.Item label="Firmware">{gateway.firmware_version}</Descriptions.Item>
        )}
        {gateway._accommodationName && (
          <Descriptions.Item label="Alojamiento" span={2}>
            {gateway._accommodationName}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Origen">
          <Tag>{gateway.pairing_source ?? "—"}</Tag>
        </Descriptions.Item>
        {gateway.paired_at && (
          <Descriptions.Item label="Emparejado">
            {dayjs(gateway.paired_at).format("DD/MM/YYYY")}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Text strong style={{ display: "block", marginBottom: 8 }}>
        Cerraduras vinculadas ({linkedLocks.length})
      </Text>
      <Table
        rowKey="id"
        columns={lockColumns}
        dataSource={linkedLocks}
        loading={loadingLocks}
        pagination={false}
        size="small"
        locale={{ emptyText: "No hay cerraduras activas vinculadas a este gateway" }}
        scroll={{ x: true }}
      />
    </Drawer>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SalGatewaysTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [gateways, setGateways]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const loadGateways = useCallback(async () => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const { data: gwData } = await supabase
        .from("lock_gateways")
        .select("id, name, provider_gateway_id, status, is_online, last_seen_at, wifi_ssid, firmware_version, pairing_source, paired_at, accommodation_id")
        .eq("client_account_id", clientAccountId)
        .order("name");

      if (!gwData) { setGateways([]); return; }

      // Cargar nombres de alojamientos
      const accIds = [...new Set(gwData.map((g) => g.accommodation_id).filter(Boolean))];
      let accMap = {};
      if (accIds.length > 0) {
        const { data: accs } = await supabase
          .from("accommodations")
          .select("id, name")
          .in("id", accIds);
        for (const a of accs ?? []) accMap[a.id] = a.name;
      }

      // Contar cerraduras vinculadas activas por gateway
      const { data: links } = await supabase
        .from("lock_gateway_links")
        .select("gateway_id")
        .eq("client_account_id", clientAccountId)
        .eq("is_active", true);

      const linkCountMap = {};
      for (const l of links ?? []) {
        linkCountMap[l.gateway_id] = (linkCountMap[l.gateway_id] ?? 0) + 1;
      }

      setGateways(gwData.map((g) => ({
        ...g,
        _accommodationName: g.accommodation_id ? (accMap[g.accommodation_id] ?? "—") : null,
        _locksCount: linkCountMap[g.id] ?? 0,
      })));
    } catch (e) {
      message.error("Error al cargar gateways: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId]);

  useEffect(() => { loadGateways(); }, [loadGateways]);

  const openDetail = (gw) => {
    setSelectedGateway(gw);
    setDrawerOpen(true);
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
      title: "Gateway",
      key: "name",
      render: (_, r) => (
        <Space>
          <ApiOutlined style={{ color: "#6B7280" }} />
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
        </Space>
      ),
    },
    {
      title: "Estado",
      key: "status",
      render: (_, r) => <GatewayStatusBadge status={r.status} />,
    },
    {
      title: "Conexión",
      key: "online",
      render: (_, r) => <OnlineTag isOnline={r.is_online} />,
    },
    {
      title: "Alojamiento",
      key: "accommodation",
      render: (_, r) => r._accommodationName
        ? <Text style={{ fontSize: 12 }}>{r._accommodationName}</Text>
        : <Tag color="default" style={{ fontSize: 11 }}>Sin asignar</Tag>,
    },
    {
      title: "Red WiFi",
      key: "wifi",
      render: (_, r) => r.wifi_ssid
        ? <Tag icon={<WifiOutlined />} style={{ fontSize: 11 }}>{r.wifi_ssid}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
      responsive: ["md"],
    },
    {
      title: "Cerraduras",
      key: "locks",
      render: (_, r) => (
        <Tooltip title="Cerraduras vinculadas activas">
          <Tag
            color={r._locksCount > 0 ? "processing" : "default"}
            icon={<LockOutlined />}
          >
            {r._locksCount}
          </Tag>
        </Tooltip>
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
            {gateways.length} gateway{gateways.length !== 1 ? "s" : ""} registrado{gateways.length !== 1 ? "s" : ""}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadGateways} loading={loading}>
            Actualizar
          </Button>
        </Col>
      </Row>

      {gateways.length > 0 && gateways.every((g) => g.status !== "active") && (
        <Alert
          type="warning"
          showIcon
          message="Ningún gateway activo detectado"
          description="Las cerraduras no podrán operar remotamente (crear PINs, unlock remoto) hasta que haya al menos un gateway activo y online."
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={gateways}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty description="No hay lock_gateways registrados. Los lock_gateways se añaden desde la app móvil SmartAccess." />
          ),
        }}
        onRow={(r) => ({ onClick: () => openDetail(r), style: { cursor: "pointer" } })}
        scroll={{ x: true }}
      />

      <GatewayDetailDrawer
        gateway={selectedGateway}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
