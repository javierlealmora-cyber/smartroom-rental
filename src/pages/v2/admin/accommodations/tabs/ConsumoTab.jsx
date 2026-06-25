// src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx
// Tab Consumos Estimados: Detalle de Registros + Visor de Consumo

import { useEffect, useState, useCallback } from "react";
import {
  Alert, Button, Col, DatePicker, Form, Input, InputNumber,
  Modal, Row, Select, Skeleton, Space, Table, Tag, Typography,
} from "antd";
import { CloudOutlined, EditOutlined, FireOutlined, ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { supabase } from "../../../../../services/supabaseClient";

const { Text, Title } = Typography;
const { Option } = Select;

const UTILITY_LABELS = { electricity: "Electricidad", water: "Agua", gas: "Gas" };
const UTILITY_COLORS = { electricity: "gold", water: "blue", gas: "orange" };
const UTILITY_ICONS  = { electricity: <ThunderboltOutlined />, water: <CloudOutlined />, gas: <FireOutlined /> };
const TYPES = ["electricity", "water", "gas"];

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
  const [activeType, setActiveType] = useState("electricity");

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

  // energy_readings no tiene utility_type — todos los registros son de electricidad
  const displayReadings = activeType === "electricity" ? readings : [];

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
      {/* Sub-tabs de suministro */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 16 }}>
        {TYPES.map((type) => {
          const count = type === "electricity" ? readings.length : 0;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                marginBottom: -2,
                color: isActive ? "#0071E3" : "#6B7280",
                fontWeight: isActive ? 700 : 500, fontSize: 14,
              }}
            >
              {UTILITY_ICONS[type]}
              {UTILITY_LABELS[type]}
              <Tag color={isActive ? UTILITY_COLORS[type] : "default"} style={{ fontSize: 11, marginLeft: 2 }}>
                {count}
              </Tag>
            </button>
          );
        })}
      </div>

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
      ) : displayReadings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <Text type="secondary">
            {activeType === "electricity"
              ? "No hay registros de consumo para el período seleccionado"
              : `No hay registros de ${UTILITY_LABELS[activeType]} — los datos de contador solo están disponibles para Electricidad`}
          </Text>
          {activeType === "electricity" && (
            <><br /><Text type="secondary" style={{ fontSize: 12 }}>Los datos son enviados automáticamente por n8n</Text></>
          )}
        </div>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayReadings}
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
        destroyOnHidden
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

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_SHORT_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function VisorConsumo({ accId, rooms }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRoom, setFilterRoom]   = useState("all");
  const [filterMode, setFilterMode]   = useState("last12"); // "last12" | "year" | "month"
  const [filterYear, setFilterYear]   = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [dataSource, setDataSource]   = useState("readings"); // "readings" | "bills"
  const [activeType, setActiveType]   = useState("electricity");

  const COLORS  = ["#0071E3", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
  const DASHES  = ["0", "6 3", "3 3", "8 4 2 4", "2 2", "10 2", "4 1", "8 2 2 2"];
  const years  = Array.from({ length: 5 }, (_, i) => dayjs().year() - i);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // ── Calcular rango y tipo de agrupación ───────────────────────────────
      let start, end, groupBy;
      if (filterMode === "last12") {
        start   = dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD");
        end     = dayjs().endOf("month").format("YYYY-MM-DD");
        groupBy = "month_labeled";
      } else if (filterMode === "year") {
        start   = `${filterYear}-01-01`;
        end     = `${filterYear}-12-31`;
        groupBy = "month_short";
      } else {
        const base = dayjs(`${filterYear}-${String(filterMonth).padStart(2, "0")}-01`);
        start   = base.startOf("month").format("YYYY-MM-DD");
        end     = base.endOf("month").format("YYYY-MM-DD");
        groupBy = "day";
      }

      const pivotKey = (dateStr) => {
        const d = dayjs(dateStr);
        if (groupBy === "day") return { key: d.format("DD"), sort: d.format("YYYY-MM-DD") };
        return { key: `${MONTHS_SHORT_ES[d.month()]} ${d.format("YY")}`, sort: d.format("YYYY-MM") };
      };

      const pivotRows = (rows, getLabel, getAmount, dateField) => {
        const byKey = {};
        (rows || []).forEach((r) => {
          const { key, sort } = pivotKey(r[dateField]);
          if (!byKey[key]) byKey[key] = { month: key, _sort: sort };
          const label = getLabel(r);
          byKey[key][label] = (byKey[key][label] || 0) + Number(getAmount(r));
        });
        const sorted = Object.values(byKey).sort((a, b) => a._sort.localeCompare(b._sort));
        sorted.forEach((d) => delete d._sort);
        return sorted;
      };

      // ── Electricidad: intentar lecturas de contador ───────────────────────
      let hasReadings = false;
      if (activeType === "electricity") {
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

        if ((rows || []).length > 0) {
          const sorted = pivotRows(rows,
            (r) => `Hab. ${r.room?.number ?? r.room_id.slice(0, 4)}`,
            (r) => r.kwh,
            "reading_date"
          );
          setDataSource("readings");
          setData(sorted);
          hasReadings = true;
        }
      }

      // ── Fallback: coste de facturas del suministro activo ─────────────────
      // energy_bills es a nivel de alojamiento (no de habitación).
      if (!hasReadings) {
        if (filterRoom !== "all") {
          setDataSource("readings");
          setData([]);
        } else {
          const { data: bills, error: billErr } = await supabase
            .from("energy_bills")
            .select("period_end, amount_total, utility_type")
            .eq("accommodation_id", accId)
            .eq("status", "settled")
            .eq("utility_type", activeType)
            .gte("period_end", start)
            .lte("period_end", end)
            .order("period_end");
          if (billErr) throw new Error(billErr.message);

          const sorted = pivotRows(bills,
            (b) => UTILITY_LABELS[b.utility_type] || b.utility_type,
            (b) => b.amount_total,
            "period_end"
          );
          setDataSource("bills");
          setData(sorted);
        }
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accId, filterRoom, filterMode, filterYear, filterMonth, activeType]);

  useEffect(() => { load(); }, [load]);

  const lineKeys = data.length > 0
    ? [...new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "month")))]
    : [];

  const utilLabel = UTILITY_LABELS[activeType];

  // eslint-disable-next-line no-unused-vars
  const title =
    filterMode === "last12" ? `Visor de Consumo — ${utilLabel} — Últimos 12 meses` :
    filterMode === "year"   ? `Visor de Consumo — ${utilLabel} — ${filterYear}` :
                              `Visor de Consumo — ${utilLabel} — ${MONTHS_ES[filterMonth - 1]} ${filterYear}`;

  const emptyMsg =
    filterMode === "last12" ? `No hay datos de ${utilLabel} para los últimos 12 meses` :
    filterMode === "year"   ? `No hay datos de ${utilLabel} en ${filterYear}` :
                              `No hay datos de ${utilLabel} en ${MONTHS_ES[filterMonth - 1]} ${filterYear}`;

  return (
    <div>
      {/* Sub-tabs de suministro */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E5E7EB", marginBottom: 16 }}>
        {TYPES.map((type) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                marginBottom: -2,
                color: isActive ? "#0071E3" : "#6B7280",
                fontWeight: isActive ? 700 : 500, fontSize: 14,
              }}
            >
              {UTILITY_ICONS[type]}
              {UTILITY_LABELS[type]}
            </button>
          );
        })}
      </div>

      {dataSource === "bills" && data.length > 0 && (
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
          Sin lecturas de contador — mostrando coste de facturas (€)
        </Text>
      )}

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      {/* Filtros */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        {/* Habitación */}
        <Col xs={24} sm={8} md={6}>
          <Select style={{ width: "100%" }} value={filterRoom} onChange={setFilterRoom}>
            <Option value="all">Todas las habitaciones</Option>
            {rooms.map((r) => <Option key={r.id} value={r.id}>Hab. {r.number}</Option>)}
          </Select>
        </Col>

        {/* Modo de período */}
        <Col xs={24} sm={7} md={5}>
          <Select style={{ width: "100%" }} value={filterMode} onChange={setFilterMode}>
            <Option value="last12">Últimos 12 meses</Option>
            <Option value="year">Año completo</Option>
            <Option value="month">Mes específico</Option>
          </Select>
        </Col>

        {/* Año (visible si no es last12) */}
        {filterMode !== "last12" && (
          <Col xs={12} sm={4} md={3}>
            <Select style={{ width: "100%" }} value={filterYear} onChange={setFilterYear}>
              {years.map((y) => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </Col>
        )}

        {/* Mes (visible solo en modo month) */}
        {filterMode === "month" && (
          <Col xs={12} sm={5} md={4}>
            <Select style={{ width: "100%" }} value={filterMonth} onChange={setFilterMonth}>
              {MONTHS_ES.map((m, i) => <Option key={i + 1} value={i + 1}>{m}</Option>)}
            </Select>
          </Col>
        )}

        <Col>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📈</div>
          <Text type="secondary">{emptyMsg}</Text>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: "20px 12px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => dataSource === "bills" ? `${v} €` : `${v} kWh`} width={70} />
              <ChartTooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(value, name) => [
                  dataSource === "bills"
                    ? `${Number(value).toFixed(2)} €`
                    : `${Number(value).toFixed(2)} kWh`,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {lineKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  strokeDasharray={DASHES[i % DASHES.length]}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
