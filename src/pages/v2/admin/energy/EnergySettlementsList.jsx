// src/pages/v2/admin/energy/EnergySettlementsList.jsx
// Admin — Liquidaciones de Energía por Habitación/Inquilino

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert, Button, Col, Input, Row,
  Select, Space, Table, Tag, Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import EmptyState from "../../../../components/EmptyState";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listAccommodations } from "../../../../services/accommodations.service";
import { supabase } from "../../../../services/supabaseClient";

const { Title, Text } = Typography;
const { Search } = Input;

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function EnergySettlementsList() {
  const { userName, companyBranding } = useAdminLayout();

  const [all, setAll] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAccommodation, setFilterAccommodation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data, error: qErr }, accs] = await Promise.all([
        supabase
          .from("energy_settlements")
          .select(`
            *,
            lodger:lodgers(id, full_name, email),
            room:rooms(id, number),
            accommodation:accommodations(id, name),
            energy_bill:energy_bills(id, supplier, issue_date, period_start, period_end)
          `)
          .order("created_at", { ascending: false })
          .limit(300),
        listAccommodations({ status: "active" }),
      ]);
      if (qErr) throw new Error(qErr.message);
      setAll(data || []);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    let r = all;
    if (filterAccommodation) r = r.filter((s) => s.accommodation?.id === filterAccommodation);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((s) =>
        s.lodger?.full_name?.toLowerCase().includes(q) ||
        s.lodger?.email?.toLowerCase().includes(q) ||
        s.accommodation?.name?.toLowerCase().includes(q) ||
        s.energy_bill?.supplier?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [all, filterAccommodation, search]);

  const totalAmount = rows.reduce((acc, r) => acc + (r.amount_total || 0), 0);

  const columns = [
    {
      title: "Inquilino",
      key: "lodger",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.lodger?.full_name || "Sin asignar"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.lodger?.email || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Alojamiento / Hab.",
      key: "location",
      responsive: ["sm"],
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.accommodation?.name || "-"}</Text>
          {r.room?.number && <Tag style={{ fontSize: 11 }}>Hab. {r.room.number}</Tag>}
        </Space>
      ),
    },
    {
      title: "Factura",
      key: "bill",
      responsive: ["md"],
      render: (_, r) => r.energy_bill ? (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.energy_bill.supplier}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {fDate(r.energy_bill.period_start)} – {fDate(r.energy_bill.period_end)}
          </Text>
        </Space>
      ) : "-",
    },
    {
      title: "Días",
      dataIndex: "days_present",
      key: "days_present",
      width: 60,
      render: (v) => v ?? "-",
    },
    {
      title: "kWh",
      dataIndex: "kwh_assigned",
      key: "kwh_assigned",
      responsive: ["lg"],
      render: (v) => v != null ? `${Number(v).toFixed(2)}` : "-",
    },
    {
      title: "Fijo",
      dataIndex: "amount_fixed",
      key: "amount_fixed",
      responsive: ["lg"],
      render: (v) => fEur(v),
    },
    {
      title: "Variable",
      dataIndex: "amount_variable",
      key: "amount_variable",
      responsive: ["lg"],
      render: (v) => fEur(v),
    },
    {
      title: "Total",
      dataIndex: "amount_total",
      key: "amount_total",
      render: (v) => <Text strong>{fEur(v)}</Text>,
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Liquidaciones de Energía</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${rows.length} liquidación${rows.length !== 1 ? "es" : ""}`}
            {!loading && rows.length > 0 && ` · Total: ${fEur(totalAmount)}`}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search
            placeholder="Buscar por inquilino, alojamiento o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={7}>
          <Select
            style={{ width: "100%" }}
            placeholder="Filtrar por alojamiento"
            value={filterAccommodation || undefined}
            onChange={(v) => setFilterAccommodation(v || "")}
            allowClear
            options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Col>
        {(search || filterAccommodation) && (
          <Col>
            <Button onClick={() => { setSearch(""); setFilterAccommodation(""); }}>Limpiar</Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: true }}
        size="small"
        pagination={{ pageSize: 25, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: search || filterAccommodation
          ? <EmptyState icon="🔍" title="Sin resultados" description="No hay liquidaciones que coincidan con los filtros aplicados" />
          : <EmptyState icon="📑" title="No hay liquidaciones" description="Las liquidaciones se generan al procesar facturas de energía" />
        }}
      />
    </V2Layout>
  );
}
