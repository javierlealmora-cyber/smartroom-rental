// src/pages/v2/admin/tenants/LodgerDetail.jsx
// Detalle de inquilino: hucha energética + gráficas consumo 12 meses (datos reales)

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Avatar, Badge, Button, Card, Col, Progress, Row,
  Skeleton, Space, Statistic, Tabs, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowLeftOutlined, BulbOutlined, EditOutlined,
  FireOutlined, SwapOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import dayjs from "dayjs";
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger } from "../../../../services/lodgers.service";
import { supabase } from "../../../../services/supabaseClient";
import PayersList from "./components/PayersList";

const { Title, Text } = Typography;

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const EMPTY_HUCHA = { balance: 0, deposited: 0, consumed: 0 };
const EMPTY_CHART = Array.from({ length: 12 }, (_, i) => ({
  mes: MONTHS_SHORT[(dayjs().month() - 11 + i + 12) % 12],
  real: 0, estimado: 0, añoAnterior: 0,
}));

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

export default function LodgerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding, clientAccountId } = useAdminLayout();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bulletins, setBulletins] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Consulta directa para asegurar que move_out_date se carga
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
            status,
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

      setLodger(lodgerData);
      setBulletins(bullData || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id, clientAccountId]);

  useEffect(() => { load(); }, [load]);

  // Obtener la asignación más reciente (con o sin check-out)
  const activeAssignment = lodger?.assignments?.length > 0
    ? [...lodger.assignments].sort((a, b) => {
        const dateA = a.move_in_date ? new Date(a.move_in_date) : new Date(0);
        const dateB = b.move_in_date ? new Date(b.move_in_date) : new Date(0);
        return dateB - dateA;
      })[0]
    : null;

  const elecChart  = bulletins.length > 0 ? buildChartData(bulletins, "electricity") : EMPTY_CHART;
  const waterChart = bulletins.length > 0 ? buildChartData(bulletins, "water")       : EMPTY_CHART;
  const gasChart   = bulletins.length > 0 ? buildChartData(bulletins, "gas")         : EMPTY_CHART;

  const elecHucha  = buildHuchaData(bulletins, "electricity");
  const waterHucha = buildHuchaData(bulletins, "water");
  const gasHucha   = buildHuchaData(bulletins, "gas");

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
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Importe repartido últimos 12 meses (€)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={elecChart} unit="€" color="#F59E0B" />
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
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Importe repartido últimos 12 meses (€)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={waterChart} unit="€" color="#3B82F6" />
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
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Importe repartido últimos 12 meses (€)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={gasChart} unit="€" color="#EF4444" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <V2Layout role="admin" companyBranding={companyBranding} userName={userName}>
      {/* Header */}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/v2/admin/inquilinos")}
            style={{ marginBottom: 8, paddingLeft: 0, color: "#6B7280" }}>
            Inquilinos
          </Button>
          <Title level={2} style={{ margin: 0 }}>Detalles de Consumo</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<EditOutlined />}
            onClick={() => navigate(`/v2/admin/inquilinos/${id}/editar`)}>
            Editar
          </Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Sección de datos del inquilino */}
      {!loading && lodger && (
        <Card
          size="small"
          style={{ marginBottom: 20, borderRadius: 12 }}
          bodyStyle={{ padding: 16 }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col>
              <img
                src={lodger?.gender === "female" ? "/icons/inquilina-card-model.png" : "/icons/inquilino-card-model.png"}
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
            <Col>
              <Space direction="vertical" size={8} align="end">
                {activeAssignment && (
                  <>
                    <div style={{ textAlign: "right" }}>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Alojamiento</Text>
                      <Text strong>{activeAssignment.accommodation?.name}</Text>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Habitación</Text>
                      <Tag color="geekblue">Hab. {activeAssignment.room?.number}</Tag>
                    </div>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Sección de consumos */}
      <Col xs={24}>
          <Card
            title={
              <Row align="middle" gutter={8}>
                <Col><BulbOutlined style={{ color: "#F59E0B" }} /></Col>
                <Col><Text strong>Hucha Energética y Consumos</Text></Col>
              </Row>
            }
            style={{ borderRadius: 12 }}
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
      </Col>
    </V2Layout>
  );
}
