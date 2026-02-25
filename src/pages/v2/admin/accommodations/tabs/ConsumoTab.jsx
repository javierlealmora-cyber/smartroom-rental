// src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx
// Tab Consumos Estimados: Detalle de Registros + Visor de Consumo

import { useEffect, useState, useCallback } from "react";
import {
  Alert, Button, Col, DatePicker, Form, Input, InputNumber,
  Modal, Row, Select, Skeleton, Space, Table, Tag, Typography,
} from "antd";
import { EditOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { supabase } from "../../../../../services/supabaseClient";

const { Text, Title } = Typography;
const { Option } = Select;

export default function ConsumoTab({ accId, subTab, rooms }) {
  if (subTab === "registros") return <DetalleRegistros accId={accId} rooms={rooms} />;
  if (subTab === "visor")     return <VisorConsumo accId={accId} rooms={rooms} />;
  return null;
}

// ─── Detalle de Registros ─────────────────────────────────────────────────────

function DetalleRegistros({ accId, rooms }) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let q = supabase
        .from("energy_readings")
        .select("*, room:rooms(id, number)")
        .eq("accommodation_id", accId)
        .order("reading_date", { ascending: false });

      if (filterRoom !== "all") q = q.eq("room_id", filterRoom);

      // Filtrar por año/mes
      const start = `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`;
      const end = dayjs(start).endOf("month").format("YYYY-MM-DD");
      q = q.gte("reading_date", start).lte("reading_date", end);

      const { data, error: err } = await q;
      if (err) throw new Error(err.message);
      setReadings(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId, filterRoom, filterYear, filterMonth]);

  useEffect(() => { load(); }, [load]);

  const onSaveEdit = async (values) => {
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("energy_readings")
        .update({ kwh: values.kwh })
        .eq("id", editingRow.id);
      if (err) throw new Error(err.message);
      setEditingRow(null);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const MONTHS = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

  const columns = [
    {
      title: "Fecha",
      dataIndex: "reading_date",
      key: "date",
      width: 110,
      render: (v) => dayjs(v).format("DD/MM/YYYY"),
      sorter: (a, b) => a.reading_date.localeCompare(b.reading_date),
    },
    {
      title: "Habitación",
      key: "room",
      width: 100,
      render: (_, r) => <Tag>{r.room?.number ?? "-"}</Tag>,
    },
    {
      title: "Consumo (kWh)",
      dataIndex: "kwh",
      key: "kwh",
      width: 130,
      render: (v) => <Text strong>{Number(v).toFixed(2)} kWh</Text>,
    },
    {
      title: "Fuente",
      dataIndex: "source",
      key: "source",
      width: 90,
      render: (v) => (
        <Tag color={v === "api" ? "blue" : v === "import" ? "orange" : "default"}>
          {v === "api" ? "n8n/API" : v === "import" ? "Import" : "Manual"}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 80,
      render: (_, row) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingRow(row);
            editForm.setFieldsValue({ kwh: row.kwh });
          }}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>Detalle de Registros de Consumo</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={8} md={6}>
          <Select
            style={{ width: "100%" }}
            value={filterRoom}
            onChange={setFilterRoom}
            placeholder="Habitación"
          >
            <Option value="all">Todas las habitaciones</Option>
            {rooms.map((r) => (
              <Option key={r.id} value={r.id}>Hab. {r.number}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Select style={{ width: "100%" }} value={filterMonth} onChange={setFilterMonth}>
            {MONTHS.map((m, i) => <Option key={i + 1} value={i + 1}>{m}</Option>)}
          </Select>
        </Col>
        <Col xs={12} sm={4} md={3}>
          <Select style={{ width: "100%" }} value={filterYear} onChange={setFilterYear}>
            {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
          </Select>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : readings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <Text type="secondary">No hay registros de consumo para el período seleccionado</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>Los datos son enviados automáticamente por n8n</Text>
        </div>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={readings}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="small"
          scroll={{ x: true }}
        />
      )}

      {/* Modal edición */}
      <Modal
        title={`Editar registro — ${editingRow ? dayjs(editingRow.reading_date).format("DD/MM/YYYY") : ""}`}
        open={!!editingRow}
        onCancel={() => setEditingRow(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onSaveEdit}>
          <Form.Item label="Consumo (kWh)" name="kwh" rules={[{ required: true, message: "Valor requerido" }]}>
            <InputNumber style={{ width: "100%" }} min={0} step={0.01} addonAfter="kWh" />
          </Form.Item>
          <Row justify="end">
            <Space>
              <Button onClick={() => setEditingRow(null)}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Guardar</Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Visor de Consumo ─────────────────────────────────────────────────────────

function VisorConsumo({ accId, rooms }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoom, setFilterRoom] = useState("all");

  const COLORS = ["#0071E3", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Últimos 12 meses: desde hace 11 meses hasta fin del mes actual
      const start = dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD");
      const end = dayjs().endOf("month").format("YYYY-MM-DD");

      let q = supabase
        .from("energy_readings")
        .select("reading_date, kwh, room_id, room:rooms(number)")
        .eq("accommodation_id", accId)
        .gte("reading_date", start)
        .lte("reading_date", end)
        .order("reading_date");

      if (filterRoom !== "all") q = q.eq("room_id", filterRoom);

      const { data: rows, error: err } = await q;
      if (err) throw new Error(err.message);

      // Pivot: mes (MMM YY) → { month, "Hab. 01": kWh total, ... }
      const byMonth = {};
      (rows || []).forEach((r) => {
        const monthKey = dayjs(r.reading_date).format("MMM YY");
        const monthSort = dayjs(r.reading_date).format("YYYY-MM");
        if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, _sort: monthSort };
        const label = `Hab. ${r.room?.number ?? r.room_id.slice(0, 4)}`;
        byMonth[monthKey][label] = (byMonth[monthKey][label] || 0) + Number(r.kwh);
      });

      const sorted = Object.values(byMonth).sort((a, b) => a._sort.localeCompare(b._sort));
      sorted.forEach((d) => delete d._sort);
      setData(sorted);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId, filterRoom]);

  useEffect(() => { load(); }, [load]);

  // Líneas a mostrar
  const lineKeys = data.length > 0
    ? Object.keys(data[0]).filter((k) => k !== "month")
    : [];

  return (
    <div>
      <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>Visor de Consumo — Últimos 12 meses</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col xs={24} sm={8} md={6}>
          <Select style={{ width: "100%" }} value={filterRoom} onChange={setFilterRoom}>
            <Option value="all">Todas las habitaciones</Option>
            {rooms.map((r) => <Option key={r.id} value={r.id}>Hab. {r.number}</Option>)}
          </Select>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📈</div>
          <Text type="secondary">No hay datos de consumo para los últimos 12 meses</Text>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 12px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v} kWh`} width={65} />
              <ChartTooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(value, name) => [`${Number(value).toFixed(2)} kWh`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {lineKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
