// src/pages/v2/admin/services/smart-access/tabs/SalCredencialesTab.jsx
// Gestión de credenciales de acceso (lock_credentials) — sub-pestaña de SAL.
//
// NUNCA se muestra el PIN completo — siempre "••••••".
// Columnas: cerradura, beneficiario, tipo, estado, estado sync, expira.
// Acciones: Renovar (sal-renew-credential), Revocar (sal-revoke-access).

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, Popconfirm, Row, Select,
  Skeleton, Space, Table, Tag, Tooltip, Typography, message,
} from "antd";
import {
  ReloadOutlined, KeyOutlined, StopOutlined, SyncOutlined,
} from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const { Text } = Typography;

const PAGE_SIZE = 30;

const CREDENTIAL_TYPE_LABEL = { pin: "PIN", app_key: "App", card: "Tarjeta" };
const CREDENTIAL_TYPE_COLOR = { pin: "green", app_key: "blue", card: "orange" };

const SYNC_STATUS_CONFIG = {
  synced:  { color: "success",    label: "Sincronizado" },
  pending: { color: "processing", label: "Pendiente" },
  error:   { color: "error",      label: "Error sync" },
};

const CRED_STATUS_CONFIG = {
  active:  { badge: "success", label: "Activa" },
  revoked: { badge: "default", label: "Revocada" },
  expired: { badge: "warning", label: "Expirada" },
};

function getBeneficiaryName(grant) {
  if (!grant) return "—";
  if (grant.grant_type === "lodger")
    return grant.lodger?.full_name ?? grant.lodger?.email ?? "Inquilino";
  return grant.lock_access_actor?.full_name ?? "Actor";
}

export default function SalCredencialesTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [creds, setCreds]     = useState([]);
  const [locks, setLocks]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [actionId, setActionId] = useState(null); // id being acted on

  // Filtros
  const [filterLock, setFilterLock]       = useState(null);
  const [filterStatus, setFilterStatus]   = useState("active");
  const [filterSyncStatus, setFilterSyncStatus] = useState(null);

  // Cargar locks para selector
  useEffect(() => {
    if (!clientAccountId) return;
    supabase
      .from("locks")
      .select("id, name")
      .eq("client_account_id", clientAccountId)
      .order("name")
      .then(({ data }) => setLocks((data ?? []).map((l) => ({ value: l.id, label: l.name }))));
  }, [clientAccountId]);

  const loadCreds = useCallback(async (currentPage = 1) => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let q = supabase
        .from("lock_credentials")
        .select(
          `
            id, credential_type, status, provider_sync_status,
            expires_at, auto_renew, created_at,
            locks(id, name),
            lock_access_grants(
              id, grant_type,
              lodger:lodger_id(id, full_name, email),
              lock_access_actor:lock_access_actor_id(id, full_name)
            )
          `,
          { count: "exact" }
        )
        .eq("client_account_id", clientAccountId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filterLock)       q = q.eq("lock_id", filterLock);
      if (filterStatus)     q = q.eq("status", filterStatus);
      if (filterSyncStatus) q = q.eq("provider_sync_status", filterSyncStatus);

      const { data, count, error } = await q;
      if (error) throw error;
      setCreds(data ?? []);
      setTotal(count ?? 0);
    } catch (e) {
      message.error("Error al cargar credenciales: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId, filterLock, filterStatus, filterSyncStatus]);

  useEffect(() => {
    setPage(1);
    loadCreds(1);
  }, [loadCreds]);

  const handleRenew = async (cred) => {
    setActionId(cred.id);
    try {
      const result = await invokeWithAuth("sal-renew-credential", {
        body: {
          client_account_id: clientAccountId,
          credential_id:     cred.id,
          extend_days:       30,
        },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al renovar credencial");
      } else {
        message.success("Credencial renovada");
        await loadCreds(page);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setActionId(null);
    }
  };

  const handleRevoke = async (cred) => {
    if (!cred.lock_access_grants?.id) {
      message.warning("No se encontró la concesión asociada a esta credencial");
      return;
    }
    setActionId(cred.id);
    try {
      const result = await invokeWithAuth("sal-revoke-access", {
        body: {
          client_account_id: clientAccountId,
          grant_id:          cred.lock_access_grants.id,
          revoke_reason:     "manual_admin",
        },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al revocar");
      } else {
        message.success("Acceso y credencial revocados");
        await loadCreds(page);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setActionId(null);
    }
  };

  if (salLoading) return <Skeleton active paragraph={{ rows: 6 }} style={{ maxWidth: 900 }} />;
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
      key: "lock",
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.locks?.name ?? "—"}</Text>,
    },
    {
      title: "Beneficiario",
      key: "beneficiary",
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>{getBeneficiaryName(r.lock_access_grants)}</Text>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "credential_type",
      render: (v) => (
        <Tag color={CREDENTIAL_TYPE_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {CREDENTIAL_TYPE_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: "Valor",
      key: "value",
      render: () => (
        <Text type="secondary" style={{ letterSpacing: 2, fontSize: 13 }}>••••••</Text>
      ),
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => {
        const cfg = CRED_STATUS_CONFIG[v] ?? { badge: "default", label: v };
        return <Badge status={cfg.badge} text={cfg.label} />;
      },
    },
    {
      title: "Sync",
      dataIndex: "provider_sync_status",
      render: (v) => {
        const cfg = SYNC_STATUS_CONFIG[v] ?? { color: "default", label: v };
        return <Tag color={cfg.color} style={{ fontSize: 10 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: "Expira",
      dataIndex: "expires_at",
      render: (v, r) => {
        if (!v) return <Text type="secondary" style={{ fontSize: 12 }}>Indefinido</Text>;
        const expiresIn = dayjs(v).diff(dayjs(), "day");
        const color = expiresIn < 0 ? "error" : expiresIn < 3 ? "warning" : "default";
        return (
          <Tooltip title={dayjs(v).format("DD/MM/YYYY HH:mm")}>
            <Tag color={color} style={{ fontSize: 11 }}>
              {expiresIn < 0
                ? "Expirada"
                : expiresIn === 0
                ? "Hoy"
                : `En ${expiresIn}d`}
            </Tag>
          </Tooltip>
        );
      },
      responsive: ["md"],
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          {r.status === "active" && (
            <Button
              size="small"
              icon={<KeyOutlined />}
              loading={actionId === r.id}
              onClick={() => handleRenew(r)}
              title="Renovar credencial"
            >
              Renovar
            </Button>
          )}
          {r.status === "active" && (
            <Popconfirm
              title="¿Revocar esta credencial?"
              description="Se eliminará del proveedor y el acceso quedará bloqueado."
              onConfirm={() => handleRevoke(r)}
              okText="Revocar" okType="danger"
            >
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                loading={actionId === r.id}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const statusOptions = [
    { value: "active",  label: "Activas" },
    { value: "revoked", label: "Revocadas" },
    { value: "expired", label: "Expiradas" },
    { value: null,      label: "Todas" },
  ];

  const syncOptions = [
    { value: null,      label: "Cualquier sync" },
    { value: "synced",  label: "Sincronizadas" },
    { value: "pending", label: "Pendientes" },
    { value: "error",   label: "Con error" },
  ];

  return (
    <div style={{ maxWidth: 1060 }}>
      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Cerradura"
            options={locks}
            value={filterLock}
            onChange={setFilterLock}
            allowClear
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={6} md={4}>
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={6} md={4}>
          <Select
            options={syncOptions}
            value={filterSyncStatus}
            onChange={setFilterSyncStatus}
            style={{ width: "100%" }}
          />
        </Col>
      </Row>

      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {total} credencial{total !== 1 ? "es" : ""}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => loadCreds(page)} />
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={creds}
        loading={loading}
        pagination={{
          current:         page,
          pageSize:        PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange:        (p) => { setPage(p); loadCreds(p); },
          showTotal:       (t) => `${t} credenciales`,
        }}
        locale={{ emptyText: "No hay credenciales con los filtros aplicados" }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
}
