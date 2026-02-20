// src/pages/v2/admin/energy/EnergyBillsList.jsx
// Lista de Facturas de Energía — Ant Design + Supabase real

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Col, Input, Row, Select,
  Space, Table, Tag, Tooltip, Typography,
} from "antd";
import { PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined } from "@ant-design/icons";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { listEnergyBills } from "../../../../services/energy.service";
import { listAccommodations } from "../../../../services/accommodations.service";

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_COLOR = { draft: "default", processed: "processing", closed: "success" };
const STATUS_LABEL = { draft: "Borrador", processed: "Procesada", closed: "Cerrada" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function EnergyBillsList() {
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [allBills, setAllBills] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterAcc, setFilterAcc] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bills, accs] = await Promise.all([
        listEnergyBills(),
        listAccommodations({ status: "active" }),
      ]);
      setAllBills(bills);
      setAccommodations(accs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bills = useMemo(() => {
    let r = allBills;
    if (filterAcc) r = r.filter((b) => b.accommodation_id === filterAcc);
    if (filterStatus) r = r.filter((b) => b.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((b) =>
        b.supplier?.toLowerCase().includes(q) ||
        b.bill_number?.toLowerCase().includes(q) ||
        b.accommodation?.name?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [allBills, filterAcc, filterStatus, search]);

  const totalAmount = useMemo(() =>
    bills.reduce((sum, b) => sum + (Number(b.amount_total) || 0), 0),
    [bills]
  );

  const columns = [
    {
      title: "Alojamiento",
      key: "accommodation",
      render: (_, r) => <Text strong>{r.accommodation?.name || "-"}</Text>,
    },
    {
      title: "Proveedor",
      dataIndex: "supplier",
      key: "supplier",
    },
    {
      title: "Nº Factura",
      dataIndex: "bill_number",
      key: "bill_number",
      responsive: ["md"],
      render: (v) => v || <Text type="secondary">-</Text>,
    },
    {
      title: "Período",
      key: "period",
      responsive: ["sm"],
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          {fDate(r.period_start)} – {fDate(r.period_end)}
        </Text>
      ),
    },
    {
      title: "kWh",
      dataIndex: "total_kwh",
      key: "total_kwh",
      responsive: ["lg"],
      align: "right",
      render: (v) => v ? `${Number(v).toFixed(1)} kWh` : "-",
    },
    {
      title: "Importe",
      dataIndex: "amount_total",
      key: "amount_total",
      align: "right",
      render: (v) => <Text strong>{fEur(v)}</Text>,
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{STATUS_LABEL[v] || v}</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Ver detalle">
            <Button size="small" icon={<EyeOutlined />}
              onClick={() => navigate(`/v2/admin/energia/facturas/${r.id}`)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/energia/facturas/${r.id}/editar`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const hasFilters = search || filterAcc || filterStatus;

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Facturas de Energía</Title>
          <Text type="secondary">
            {loading ? "Cargando..." : `${bills.length} factura${bills.length !== 1 ? "s" : ""} · Total: ${fEur(totalAmount)}`}
          </Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate("/v2/admin/energia/facturas/nueva")}>
            Nueva Factura
          </Button>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={12} md={8}>
          <Search placeholder="Buscar por proveedor, nº factura o alojamiento..."
            value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Select style={{ width: "100%" }} placeholder="Alojamiento"
            value={filterAcc || undefined} onChange={(v) => setFilterAcc(v || "")} allowClear
            options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select style={{ width: "100%" }} placeholder="Estado"
            value={filterStatus || undefined} onChange={(v) => setFilterStatus(v || "")} allowClear
            options={[
              { value: "draft", label: "Borrador" },
              { value: "processed", label: "Procesada" },
              { value: "closed", label: "Cerrada" },
            ]}
          />
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Button icon={<ReloadOutlined />}
            disabled={!hasFilters}
            onClick={() => { setSearch(""); setFilterAcc(""); setFilterStatus(""); }}>
            Limpiar
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={load}>Reintentar</Button>}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={bills}
        loading={loading}
        scroll={{ x: true }}
        pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: hasFilters ? "Sin resultados para los filtros aplicados" : "Sube tu primera factura de energía" }}
      />
    </V2Layout>
  );
}
