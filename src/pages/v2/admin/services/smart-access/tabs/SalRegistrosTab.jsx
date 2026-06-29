// src/pages/v2/admin/services/smart-access/tabs/SalRegistrosTab.jsx
// Historial de eventos de acceso (lock_records) — sub-pestaña de SAL.
//
// Tabla paginada read-only. Filtros: lock, tipo de evento, rango de fechas.
// Botón "Sincronizar registros" → sal-sync-lock-records

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Col, DatePicker, Row, Select, Skeleton,
  Space, Table, Tag, Typography, message,
} from "antd";
import { ReloadOutlined, SyncOutlined } from "@ant-design/icons";
import { useAdminLayout } from "../../../../../../hooks/useAdminLayout";
import { useSalSubscription } from "../../../../../../hooks/useSalSubscription";
import { supabase } from "../../../../../../services/supabaseClient";
import { invokeWithAuth } from "../../../../../../services/supabaseInvoke.services";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Text } = Typography;
const { RangePicker } = DatePicker;

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

const EVENT_TYPE_LABEL = {
  unlock:          "Apertura",
  lock:            "Cierre",
  failed_unlock:   "Fallo apertura",
  keyboard_unlock: "Apertura teclado",
  remote_unlock:   "Apertura remota",
  low_battery:     "Batería baja",
  door_open:       "Puerta abierta",
  door_closed:     "Puerta cerrada",
};

const PAGE_SIZE = 50;

export default function SalRegistrosTab() {
  const { clientAccountId } = useAdminLayout();
  const { salActive, salLoading } = useSalSubscription();

  const [records, setRecords]   = useState([]);
  const [locks, setLocks]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);

  // Filtros
  const [filterLock, setFilterLock]         = useState(null);
  const [filterEventTypes, setFilterEventTypes] = useState([]);
  const [filterDateRange, setFilterDateRange]   = useState(null);

  // Cargar lista de locks para el selector
  useEffect(() => {
    if (!clientAccountId) return;
    supabase
      .from("locks")
      .select("id, name")
      .eq("client_account_id", clientAccountId)
      .order("name")
      .then(({ data }) => setLocks((data ?? []).map((l) => ({ value: l.id, label: l.name }))));
  }, [clientAccountId]);

  const loadRecords = useCallback(async (currentPage = 1) => {
    if (!clientAccountId) return;
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let q = supabase
        .from("lock_records")
        .select(
          "id, event_type, event_at, actor_description, provider_record_id, lock_id, locks(name)",
          { count: "exact" }
        )
        .eq("client_account_id", clientAccountId)
        .order("event_at", { ascending: false })
        .range(from, to);

      if (filterLock)              q = q.eq("lock_id", filterLock);
      if (filterEventTypes.length) q = q.in("event_type", filterEventTypes);
      if (filterDateRange?.[0])    q = q.gte("event_at", filterDateRange[0].toISOString());
      if (filterDateRange?.[1])    q = q.lte("event_at", filterDateRange[1].toISOString());

      const { data, count, error } = await q;
      if (error) throw error;
      setRecords(data ?? []);
      setTotal(count ?? 0);
    } catch (e) {
      message.error("Error al cargar registros: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [clientAccountId, filterLock, filterEventTypes, filterDateRange]);

  useEffect(() => {
    setPage(1);
    loadRecords(1);
  }, [loadRecords]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await invokeWithAuth("sal-sync-lock-records", {
        body: { client_account_id: clientAccountId },
      });
      if (result?.ok === false) {
        message.error(result.error?.message ?? "Error al sincronizar");
      } else {
        message.success(`Registros sincronizados: ${result?.data?.records_synced ?? 0}`);
        loadRecords(1);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setSyncing(false);
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
      title: "Evento",
      dataIndex: "event_type",
      key: "event_type",
      render: (v) => (
        <Tag color={EVENT_TYPE_COLOR[v] ?? "default"} style={{ fontSize: 11 }}>
          {EVENT_TYPE_LABEL[v] ?? v?.replace(/_/g, " ") ?? "—"}
        </Tag>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "event_at",
      key: "event_at",
      render: (v) => v ? (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{dayjs(v).format("DD/MM/YYYY HH:mm:ss")}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
        </Space>
      ) : "—",
    },
    {
      title: "Cerradura",
      key: "lock",
      render: (_, r) => <Text style={{ fontSize: 12 }}>{r.locks?.name ?? r.lock_id}</Text>,
    },
    {
      title: "Actor",
      dataIndex: "actor_description",
      key: "actor",
      render: (v) => <Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>,
    },
    {
      title: "ID externo",
      dataIndex: "provider_record_id",
      key: "provider_record_id",
      render: (v) => <Text code style={{ fontSize: 11 }}>{v ?? "—"}</Text>,
      responsive: ["lg"],
    },
  ];

  const eventTypeOptions = Object.entries(EVENT_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }));

  return (
    <div>
      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Filtrar por cerradura"
            options={locks}
            value={filterLock}
            onChange={setFilterLock}
            allowClear
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            mode="multiple"
            placeholder="Tipo de evento"
            options={eventTypeOptions}
            value={filterEventTypes}
            onChange={setFilterEventTypes}
            allowClear
            style={{ width: "100%" }}
            maxTagCount={2}
          />
        </Col>
        <Col xs={24} sm={24} md={8}>
          <RangePicker
            onChange={(dates) => setFilterDateRange(dates ? [dates[0].toDate(), dates[1].toDate()] : null)}
            style={{ width: "100%" }}
          />
        </Col>
      </Row>

      {/* Acciones */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {total} registro{total !== 1 ? "s" : ""}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => loadRecords(page)} />
            <Button
              icon={<SyncOutlined spin={syncing} />}
              loading={syncing}
              onClick={handleSync}
            >
              Sincronizar registros
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: (p) => { setPage(p); loadRecords(p); },
          showTotal: (t) => `${t} registros`,
        }}
        locale={{ emptyText: "No hay registros de acceso. Sincroniza los registros para verlos aquí." }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
}
