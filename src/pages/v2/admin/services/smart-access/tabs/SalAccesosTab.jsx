// src/pages/v2/admin/services/smart-access/tabs/SalAccesosTab.jsx
// Vista global de concesiones de acceso (lock_access_grants) — sub-pestaña de SAL.
//
// Tabla con filtros: cerradura, tipo beneficiario, estado, rango de fechas.
// credential_type se obtiene por join a lock_credentials WHERE status='active'.
// Solo admin puede revocar y otorgar acceso manual.

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Badge, Button, Col, DatePicker, Popconfirm, Row,
  Select, Skeleton, Space, Table, Tag, Typography, message,
} from "antd";
import { ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PAGE_SIZE = 30;

const STATUS_CONFIG = {
  active:   { badge: "success",    label: "Activo" },
  pending:  { badge: "processing", label: "Pendiente" },
  revoked:  { badge: "default",    label: "Revocado" },
  expired:  { badge: "warning",    label: "Expirado" },
};

const SOURCE_LABEL = {
  room_assignment: "Habitación",
  group:           "Grupo",
  manual:          "Manual",
};

function getBeneficiary(grant) {
  if (grant.grant_type === "lodger") {
    return {
      name: grant.lodger?.full_name ?? grant.lodger?.email ?? "Inquilino",
      type: "Inquilino",
    };
  }
  return {
    name: grant.lock_access_actor?.full_name ?? "Actor",
    type: "Actor externo",
  };
}

export default function SalAccesosTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [grants, setGrants]   = useState([]);
  const [locks, setLocks]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [revoking, setRevoking] = useState(null); // grant id being revoked

  // Filtros
  const [filterLock, setFilterLock]         = useState(null);
  const [filterType, setFilterType]         = useState(null);  // lodger | actor
  const [filterStatus, setFilterStatus]     = useState("active");
  const [filterDateRange, setFilterDateRange] = useState(null);

  // Cargar locks para el selector
  useEffect(() => {
    if (!clientAccountId) return;
    supabase
      .from("locks")
      .select("id, name")
      .eq("client_account_id", clientAccountId)
      .order("name")
      .then(({ data }) => setLocks((data ?? []).map((l) => ({ value: l.id, label: l.name }))));
  }, [clientAccountId]);

  const loadGrants = useCallback(async (currentPage = 1) => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let q = supabase
        .from("lock_access_grants")
        .select(
          `
            id, grant_type, status, valid_from, valid_to, source_type, created_at,
            locks(id, name),
            lodger:lodger_id(id, full_name, email),
            lock_access_actor:lock_access_actor_id(id, full_name),
            lock_credentials(credential_type, status)
          `,
          { count: "exact" }
        )
        .eq("client_account_id", clientAccountId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filterLock)               q = q.eq("lock_id", filterLock);
      if (filterType === "lodger")  q = q.eq("grant_type", "lodger");
      if (filterType === "actor")   q = q.eq("grant_type", "actor");
      if (filterStatus)             q = q.eq("status", filterStatus);
      if (filterDateRange?.[0])     q = q.gte("valid_from", filterDateRange[0].toISOString());
      if (filterDateRange?.[1])     q = q.lte("valid_from", filterDateRange[1].toISOString());

      const { data, count, error } = await q;
      if (error) throw error;
      setGrants(data ?? []);
      setTotal(count ?? 0);
    } catch (e) {
      message.error("Error al cargar accesos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId, filterLock, filterType, filterStatus, filterDateRange]);

  useEffect(() => {
    setPage(1);
    loadGrants(1);
  }, [loadGrants]);

  const handleRevoke = async (grantId) => {
    setRevoking(grantId);
    try {
      const result = await invokeWithAuth("sal-revoke-access", {
        body: {
          client_account_id: clientAccountId,
          grant_id:          grantId,
          revoke_reason:     "manual_admin",
        },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al revocar acceso");
      } else {
        message.success("Acceso revocado");
        await loadGrants(page);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setRevoking(null);
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
      title: "Beneficiario",
      key: "beneficiary",
      render: (_, r) => {
        const { name, type } = getBeneficiary(r);
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13 }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{type}</Text>
          </Space>
        );
      },
    },
    {
      title: "Cerradura",
      key: "lock",
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.locks?.name ?? "—"}</Text>,
    },
    {
      title: "Credencial",
      key: "credential_type",
      render: (_, r) => {
        const activeCred = r.lock_credentials?.find((c) => c.status === "active");
        if (!activeCred) return <Tag style={{ fontSize: 11 }}>Sin credencial</Tag>;
        const labels = { pin: "PIN", app_key: "App", card: "Tarjeta" };
        return (
          <Tag color="blue" style={{ fontSize: 11 }}>
            {labels[activeCred.credential_type] ?? activeCred.credential_type}
          </Tag>
        );
      },
      responsive: ["md"],
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => {
        const cfg = STATUS_CONFIG[v] ?? { badge: "default", label: v };
        return <Badge status={cfg.badge} text={cfg.label} />;
      },
    },
    {
      title: "Válido desde",
      dataIndex: "valid_from",
      render: (v) => v ? dayjs(v).format("DD/MM/YY") : "—",
      responsive: ["md"],
    },
    {
      title: "Válido hasta",
      dataIndex: "valid_to",
      render: (v) => v ? dayjs(v).format("DD/MM/YY") : "Indefinido",
      responsive: ["md"],
    },
    {
      title: "Origen",
      dataIndex: "source_type",
      render: (v) => (
        <Tag style={{ fontSize: 11 }}>{SOURCE_LABEL[v] ?? v}</Tag>
      ),
      responsive: ["lg"],
    },
    {
      title: "",
      key: "actions",
      render: (_, r) => r.status === "active" ? (
        <Popconfirm
          title="¿Revocar este acceso?"
          description="Se eliminará la credencial del proveedor y el acceso quedará bloqueado."
          onConfirm={() => handleRevoke(r.id)}
          okText="Revocar" okType="danger"
        >
          <Button
            size="small"
            danger
            icon={<StopOutlined />}
            loading={revoking === r.id}
          >
            Revocar
          </Button>
        </Popconfirm>
      ) : null,
    },
  ];

  const statusOptions = [
    { value: "active",  label: "Activos" },
    { value: "pending", label: "Pendientes" },
    { value: "revoked", label: "Revocados" },
    { value: "expired", label: "Expirados" },
    { value: null,      label: "Todos" },
  ];

  const typeOptions = [
    { value: null,      label: "Todos los tipos" },
    { value: "lodger",  label: "Inquilinos" },
    { value: "actor",   label: "Actores externos" },
  ];

  return (
    <div style={{ maxWidth: 1060 }}>
      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Cerradura"
            options={locks}
            value={filterLock}
            onChange={setFilterLock}
            allowClear
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            options={typeOptions}
            value={filterType}
            onChange={setFilterType}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            options={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={10}>
          <RangePicker
            placeholder={["Válido desde", "Hasta"]}
            onChange={(dates) => setFilterDateRange(dates ? [dates[0].toDate(), dates[1].toDate()] : null)}
            style={{ width: "100%" }}
          />
        </Col>
      </Row>

      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {total} concesion{total !== 1 ? "es" : ""}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => loadGrants(page)} />
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={grants}
        loading={loading}
        pagination={{
          current:         page,
          pageSize:        PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange:        (p) => { setPage(p); loadGrants(p); },
          showTotal:       (t) => `${t} concesiones`,
        }}
        locale={{ emptyText: "No hay concesiones con los filtros aplicados" }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
}
