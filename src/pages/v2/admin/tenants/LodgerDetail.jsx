// src/pages/v2/admin/tenants/LodgerDetail.jsx
// Detalle de inquilino: hucha energética + gráficas consumo 12 meses (datos reales)

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Badge, Button, Card, Col, Progress, Row,
  Select, Skeleton, Space, Statistic, Tabs, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, BulbOutlined, EditOutlined,
  FireOutlined, LineChartOutlined, ReloadOutlined, SwapOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";

import { supabase } from "../../../../services/supabaseClient";
import PayersList from "./components/PayersList";

const { Title, Text } = Typography;
const { Option } = Select;

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_FULL  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const EMPTY_HUCHA = { balance: 0, deposited: 0, consumed: 0 };

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COLOR = { active: "#059669", invited: "#3B82F6", pending_checkout: "#F59E0B", inactive: "#9CA3AF" };
const STATUS_LABEL = { active: "Activo", invited: "Invitado", pending_checkout: "Pendiente baja", inactive: "Inactivo" };
const STATUS_ANT = { active: "success", invited: "processing", pending_checkout: "warning", inactive: "default" };

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatCurrency(v) {
  if (v == null) return "-";
  return Number(v).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

// ── Hucha card ────────────────────────────────────────────────────────────────
function HuchaCard({ icon, label, color, data }) {
  const isPositive = data.balance >= 0;
  const pct = Math.min(100, Math.round((data.deposited / (data.deposited + Math.abs(data.balance) + 1)) * 100));
  return (
    <Card
      style={{ borderRadius: 12, border: `1.5px solid ${isPositive ? "#D1FAE5" : "#FEE2E2"}`, background: isPositive ? "#F0FDF4" : "#FFF5F5" }}
      bodyStyle={{ padding: "16px 20px" }}
    >
      <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
        <Col>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
        </Col>
        <Col flex="auto">
          <Text strong style={{ fontSize: 14 }}>{label}</Text>
          <div>
            <Tag color={isPositive ? "success" : "error"} style={{ marginTop: 2 }}>
              {isPositive ? "Saldo positivo" : "Saldo negativo"}
            </Tag>
          </div>
        </Col>
        <Col>
          <Text strong style={{ fontSize: 22, color: isPositive ? "#059669" : "#DC2626" }}>
            {isPositive ? "+" : ""}{formatCurrency(data.balance)}
          </Text>
        </Col>
      </Row>
      <Row gutter={[12, 0]} style={{ marginBottom: 10 }}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 11 }}>Ingresado</Text>
          <Text strong style={{ fontSize: 13, display: "block" }}>{formatCurrency(data.deposited)}</Text>
        </Col>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 11 }}>Consumido</Text>
          <Text strong style={{ fontSize: 13, display: "block" }}>{formatCurrency(data.consumed)}</Text>
        </Col>
      </Row>
      <Progress
        percent={pct}
        showInfo={false}
        strokeColor={isPositive ? "#059669" : "#DC2626"}
        trailColor="#E5E7EB"
        size="small"
      />
    </Card>
  );
}

// ── Consumption chart ─────────────────────────────────────────────────────────
function ConsumptionChart({ data, unit, color }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v} ${unit}`} width={55} />
        <ChartTooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
          formatter={(value, name) => [`${value} ${unit}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="real" name="Real" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="estimado" name="Estimado" stroke={color} strokeWidth={1.5} strokeDasharray="5 4" dot={false} opacity={0.7} />
        <Line type="monotone" dataKey="añoAnterior" name="Año anterior" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="3 3" dot={false} opacity={0.6} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function buildChartData(bulletins, utilityType) {
  const now = dayjs();
  const byMonth = {};
  const byMonthPrev = {};

  for (const b of bulletins) {
    if (b.energy_bill?.utility_type !== utilityType) continue;
    const d = dayjs(b.period_start);
    const key = d.format("YYYY-MM");
    const isCurrentYear = d.year() === now.year();
    const isPrevYear = d.year() === now.year() - 1;
    const monthLabel = MONTHS_SHORT[d.month()];
    if (isCurrentYear) {
      byMonth[key] = (byMonth[key] || 0) + Number(b.amount_total ?? 0);
    }
    if (isPrevYear) {
      byMonthPrev[monthLabel] = (byMonthPrev[monthLabel] || 0) + Number(b.amount_total ?? 0);
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const d = now.subtract(11 - i, "month");
    const key = d.format("YYYY-MM");
    const label = MONTHS_SHORT[d.month()];
    return {
      mes: label,
      real: +(byMonth[key] ?? 0).toFixed(2),
      estimado: 0,
      añoAnterior: +(byMonthPrev[label] ?? 0).toFixed(2),
    };
  });
}

function buildHuchaData(bulletins, utilityType) {
  const relevant = bulletins.filter((b) => b.energy_bill?.utility_type === utilityType);
  const consumed = relevant.reduce((s, b) => s + Number(b.amount_total ?? 0), 0);
  return { balance: 0, deposited: 0, consumed: +consumed.toFixed(2) };
}

function pivotByPeriod(items, getDate, getValue, filterMode, filterYear, filterMonth) {
  const byKey = {};
  for (const item of items) {
    const d = dayjs(getDate(item));
    if (!d.isValid()) continue;
    if (filterMode === "year"  && d.year() !== filterYear) continue;
    if (filterMode === "month" && (d.year() !== filterYear || d.month() + 1 !== filterMonth)) continue;
    const key = filterMode === "month" ? d.format("DD") : d.format("YYYY-MM");
    byKey[key] = (byKey[key] || 0) + Number(getValue(item) ?? 0);
  }

  if (filterMode === "month") {
    const daysInMonth = dayjs(`${filterYear}-${String(filterMonth).padStart(2,"0")}-01`).daysInMonth();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return { mes: day, real: +(byKey[day] ?? 0).toFixed(2), estimado: 0, añoAnterior: 0 };
    });
  }

  if (filterMode === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${filterYear}-${String(i + 1).padStart(2, "0")}`;
      return { mes: MONTHS_SHORT[i], real: +(byKey[key] ?? 0).toFixed(2), estimado: 0, añoAnterior: 0 };
    });
  }

  // last12
  const now = dayjs();
  return Array.from({ length: 12 }, (_, i) => {
    const d = now.subtract(11 - i, "month");
    const key = d.format("YYYY-MM");
    return { mes: `${MONTHS_SHORT[d.month()]} ${d.format("YY")}`, real: +(byKey[key] ?? 0).toFixed(2), estimado: 0, añoAnterior: 0 };
  });
}

function buildKwhChartData(readings, utilityType, filterMode, filterYear, filterMonth) {
  const relevant = readings.filter((r) => r.utility_type === utilityType);
  return pivotByPeriod(relevant, (r) => r.reading_date, (r) => r.kwh, filterMode, filterYear, filterMonth);
}

function buildBulletinChartData(bulletins, utilityType, filterMode, filterYear, filterMonth) {
  const relevant = bulletins.filter((b) => b.energy_bill?.utility_type === utilityType);
  return pivotByPeriod(relevant, (b) => b.period_start, (b) => b.amount_total, filterMode, filterYear, filterMonth);
}

export default function LodgerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bulletins, setBulletins] = useState([]);
  const [readings, setReadings] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [loadingReadings, setLoadingReadings] = useState(false);

  // Filtro de período
  const [filterMode, setFilterMode] = useState("last12");
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);

  // Carga de lecturas — reactiva al filtro y al roomId
  const loadReadings = useCallback(async (rId) => {
    if (!rId) { setReadings([]); return; }
    setLoadingReadings(true);
    let start, end;
    if (filterMode === "last12") {
      start = dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD");
      end   = dayjs().endOf("month").format("YYYY-MM-DD");
    } else if (filterMode === "year") {
      start = `${filterYear}-01-01`;
      end   = `${filterYear}-12-31`;
    } else {
      const base = dayjs(`${filterYear}-${String(filterMonth).padStart(2,"0")}-01`);
      start = base.startOf("month").format("YYYY-MM-DD");
      end   = base.endOf("month").format("YYYY-MM-DD");
    }
    try {
      const { data } = await supabase
        .from("energy_readings")
        .select("reading_date, kwh, utility_type, source")
        .eq("room_id", rId)
        .gte("reading_date", start)
        .lte("reading_date", end)
        .order("reading_date");
      setReadings(data || []);
    } catch { setReadings([]); }
    finally { setLoadingReadings(false); }
  }, [filterMode, filterYear, filterMonth]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: lodgerData, error: lodgerError } = await supabase
        .from("profiles")
        .select(`
          *,
          assignments:lodger_room_assignments(
            id,
            move_in_date,
            move_out_date,
            billing_start_date,
            monthly_rent,
            deposit_amount,
            room:rooms(id, number),
            accommodation:accommodations(id, name)
          )
        `)
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .maybeSingle();

      if (lodgerError) throw new Error(lodgerError.message);
      if (!lodgerData) throw new Error("Inquilino no encontrado");

      const { data: bullData } = await supabase
        .from("bulletins")
        .select("*, energy_bill:energy_bills(utility_type, bill_number, period_start, period_end, amount_total)")
        .eq("lodger_id", id)
        .order("period_start", { ascending: false });

      const sortedAss = [...(lodgerData.assignments || [])].sort(
        (a, b) => new Date(b.move_in_date) - new Date(a.move_in_date)
      );
      const rId = sortedAss[0]?.room?.id || null;

      setLodger(lodgerData);
      setBulletins(bullData || []);
      setRoomId(rId);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id, clientAccountId]);

  useEffect(() => { loadReadings(roomId); }, [loadReadings, roomId]);

  useEffect(() => { load(); }, [load]);

  // Obtener la asignación más reciente (con o sin check-out)
  const activeAssignment = lodger?.assignments?.length > 0
    ? [...lodger.assignments].sort((a, b) => {
        const dateA = a.move_in_date ? new Date(a.move_in_date) : new Date(0);
        const dateB = b.move_in_date ? new Date(b.move_in_date) : new Date(0);
        return dateB - dateA;
      })[0]
    : null;

  const elecHucha  = buildHuchaData(bulletins, "electricity");
  const waterHucha = buildHuchaData(bulletins, "water");
  const gasHucha   = buildHuchaData(bulletins, "gas");

  const hasData = (data) => data.some((d) => d.real > 0 || d.estimado > 0);

  // Por suministro: preferir lecturas kWh; si no hay, usar importes de facturas (€)
  function resolveChart(utilityType, kwhUnit) {
    const kwhData  = buildKwhChartData(readings, utilityType, filterMode, filterYear, filterMonth);
    if (hasData(kwhData)) return { data: kwhData, unit: kwhUnit, source: "readings" };
    const billData = buildBulletinChartData(bulletins, utilityType, filterMode, filterYear, filterMonth);
    if (hasData(billData)) return { data: billData, unit: "€", source: "bills" };
    return { data: kwhData, unit: kwhUnit, source: "empty" };
  }

  const elecChart  = resolveChart("electricity", "kWh");
  const waterChart = resolveChart("water", "m³");
  const gasChart   = resolveChart("gas", "kWh");

  const chartTitle = (_ut) => {
    const base =
      filterMode === "last12" ? "Últimos 12 meses" :
      filterMode === "year"   ? `Año ${filterYear}` :
                                `${MONTHS_FULL[filterMonth - 1]} ${filterYear}`;
    return base;
  };

  const emptyLabel =
    filterMode === "last12" ? "los últimos 12 meses" :
    filterMode === "year"   ? `el año ${filterYear}` :
                              `${MONTHS_FULL[filterMonth - 1]} ${filterYear}`;

  // UI compartida del filtro de período
  const PeriodFilter = (
    <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 16 }}>
      <Col xs={24} sm={8} md={7}>
        <Select style={{ width: "100%" }} value={filterMode} onChange={(v) => setFilterMode(v)}>
          <Option value="last12">Últimos 12 meses</Option>
          <Option value="year">Año completo</Option>
          <Option value="month">Mes específico</Option>
        </Select>
      </Col>
      {filterMode !== "last12" && (
        <Col xs={12} sm={5} md={4}>
          <Select style={{ width: "100%" }} value={filterYear} onChange={setFilterYear}>
            {Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map((y) => (
              <Option key={y} value={y}>{y}</Option>
            ))}
          </Select>
        </Col>
      )}
      {filterMode === "month" && (
        <Col xs={12} sm={6} md={5}>
          <Select style={{ width: "100%" }} value={filterMonth} onChange={setFilterMonth}>
            {MONTHS_FULL.map((m, i) => <Option key={i + 1} value={i + 1}>{m}</Option>)}
          </Select>
        </Col>
      )}
      <Col>
        <Button icon={<ReloadOutlined />} onClick={() => loadReadings(roomId)} loading={loadingReadings}>
          Actualizar
        </Button>
      </Col>
    </Row>
  );

  const tabItems = [
    {
      key: "electricity",
      label: (
        <Space size={4}>
          <ThunderboltOutlined style={{ color: "#F59E0B" }} />
          Electricidad
        </Space>
      ),
      children: (
        <div>
          <HuchaCard
            icon={<ThunderboltOutlined style={{ fontSize: 18, color: "#F59E0B" }} />}
            label="Hucha Electricidad"
            color="#F59E0B"
            data={elecHucha}
          />
          <div style={{ marginTop: 20 }}>
            {PeriodFilter}
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              {chartTitle()} ({elecChart.unit})
              {elecChart.source === "bills" && (
                <Text type="secondary" style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, textTransform: "none" }}>
                  · sin lecturas de contador — mostrando importe repartido
                </Text>
              )}
            </Text>
            <div style={{ marginTop: 8 }}>
              {elecChart.source !== "empty"
                ? <ConsumptionChart data={elecChart.data} unit={elecChart.unit} color="#F59E0B" />
                : <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
                    <Text type="secondary">No hay datos de consumo en {emptyLabel}</Text>
                  </div>
              }
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "water",
      label: (
        <Space size={4}>
          <span style={{ fontSize: 14 }}>💧</span>
          Agua
        </Space>
      ),
      children: (
        <div>
          <HuchaCard
            icon={<span style={{ fontSize: 18 }}>💧</span>}
            label="Hucha Agua"
            color="#3B82F6"
            data={waterHucha}
          />
          <div style={{ marginTop: 20 }}>
            {PeriodFilter}
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              {chartTitle()} ({waterChart.unit})
              {waterChart.source === "bills" && (
                <Text type="secondary" style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, textTransform: "none" }}>
                  · sin lecturas de contador — mostrando importe repartido
                </Text>
              )}
            </Text>
            <div style={{ marginTop: 8 }}>
              {waterChart.source !== "empty"
                ? <ConsumptionChart data={waterChart.data} unit={waterChart.unit} color="#3B82F6" />
                : <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
                    <Text type="secondary">No hay datos de consumo en {emptyLabel}</Text>
                  </div>
              }
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "gas",
      label: (
        <Space size={4}>
          <FireOutlined style={{ color: "#EF4444" }} />
          Gas
        </Space>
      ),
      children: (
        <div>
          <HuchaCard
            icon={<FireOutlined style={{ fontSize: 18, color: "#EF4444" }} />}
            label="Hucha Gas"
            color="#EF4444"
            data={gasHucha}
          />
          <div style={{ marginTop: 20 }}>
            {PeriodFilter}
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              {chartTitle()} ({gasChart.unit})
              {gasChart.source === "bills" && (
                <Text type="secondary" style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, textTransform: "none" }}>
                  · sin lecturas de contador — mostrando importe repartido
                </Text>
              )}
            </Text>
            <div style={{ marginTop: 8 }}>
              {gasChart.source !== "empty"
                ? <ConsumptionChart data={gasChart.data} unit={gasChart.unit} color="#EF4444" />
                : <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
                    <Text type="secondary">No hay datos de consumo en {emptyLabel}</Text>
                  </div>
              }
            </div>
          </div>
        </div>
      ),
    },
  ];

  const cardTitleStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderLeft: "3px solid #0071E3",
    paddingLeft: 8,
  };

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <LineChartOutlined style={{ marginRight: 10 }} />
              Detalles de Consumo
            </Title>
            <Text type="secondary">
              {lodger ? `${lodger.first_name} ${lodger.last_name1} ${lodger.last_name2 || ""}` : "Cargando inquilino..."}
            </Text>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<EditOutlined />}
                onClick={() => navigate(`/v2/admin/inquilinos/${id}/detalle-inquilino`)}>
                Editar
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}>
                Volver
              </Button>
            </Space>
          </Col>
        </Row>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        {/* Sección de datos del inquilino */}
        {!loading && lodger && (
          <Card
            size="small"
            title={<span style={cardTitleStyle}>Información del inquilino</span>}
            extra={
              activeAssignment && (
                <Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>Alojamiento:</Text>
                  <Text strong style={{ fontSize: 13 }}>{activeAssignment.accommodation?.name}</Text>
                  <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                </Space>
              )
            }
            style={{ marginBottom: 20, borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            bodyStyle={{ padding: 16 }}
          >
            <Row gutter={[24, 16]} align="middle">
              <Col>
                <img
                  src={lodger?.gender === "female" ? "/images/inquilina-card-model.webp" : "/images/inquilino-card-model.webp"}
                  alt="Inquilino"
                  style={{ width: 64, height: 64, objectFit: "contain" }}
                />
              </Col>
              <Col flex="auto">
                <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                  {lodger.first_name} {lodger.last_name1} {lodger.last_name2 || ""}
                </Title>
                <Space direction="vertical" size={2}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {lodger.email}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {lodger.phone || "Sin teléfono"}
                  </Text>
                  {activeAssignment?.move_in_date && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Check-in: {formatDate(activeAssignment.move_in_date)}
                    </Text>
                  )}
                  {activeAssignment?.move_out_date && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Check-Out: {formatDate(activeAssignment.move_out_date)}
                    </Text>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        )}

        {/* Sección de consumos */}
        <Card
          size="small"
          title={<span style={cardTitleStyle}>Hucha Energética y Consumos</span>}
          extra={
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load}>Actualizar</Button>
          }
          style={{ borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          bodyStyle={{ padding: "16px 20px" }}
        >
            {/* Resumen consumo total por tipo */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Electricidad repartida"
                  value={elecHucha.consumed}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: "#F59E0B", fontSize: 18 }}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Agua repartida"
                  value={waterHucha.consumed}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: "#3B82F6", fontSize: 18 }}
                  prefix={<span>💧</span>}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Gas repartido"
                  value={gasHucha.consumed}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: "#EF4444", fontSize: 18 }}
                  prefix={<FireOutlined />}
                />
              </Col>
            </Row>

            {/* Tabs por servicio */}
            <Tabs items={tabItems} defaultActiveKey="electricity" size="small" />
          </Card>
      </div>
    </V2Layout>
  );
}
