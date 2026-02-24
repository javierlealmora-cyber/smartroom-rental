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
  const { userName, companyBranding } = useAdminLayout();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bulletins, setBulletins] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lodgerData, { data: bullData }] = await Promise.all([
        getLodger(id),
        supabase.from("bulletins")
          .select("*, energy_bill:energy_bills(utility_type, bill_number, period_start, period_end, amount_total)")
          .eq("lodger_id", id)
          .order("period_start", { ascending: false }),
      ]);
      setLodger(lodgerData);
      setBulletins(bullData || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);

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
          {loading ? <Skeleton active title={{ width: 200 }} paragraph={false} /> : (
            <Row align="middle" gutter={14}>
              <Col>
                <img
                  src={lodger?.gender === "female" ? "/icons/inquilina-card-model.png" : "/icons/inquilino-card-model.png"}
                  alt="Inquilino"
                  style={{ width: 52, height: 52, objectFit: "contain" }}
                />
              </Col>
              <Col>
                <Title level={2} style={{ margin: 0 }}>{lodger?.full_name}</Title>
                <Space size={6}>
                  <Badge status={STATUS_ANT[lodger?.status] || "default"} />
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {STATUS_LABEL[lodger?.status] || lodger?.status}
                    {lodger?.email ? ` · ${lodger.email}` : ""}
                  </Text>
                </Space>
              </Col>
            </Row>
          )}
        </Col>
        <Col>
          <Space>
            {lodger?.status === "active" && (
              <Button icon={<SwapOutlined />}
                onClick={() => navigate(`/v2/admin/inquilinos/${id}/editar?action=reassign`)}>
                Cambiar habitación
              </Button>
            )}
            <Button type="primary" icon={<EditOutlined />}
              onClick={() => navigate(`/v2/admin/inquilinos/${id}/editar`)}>
              Editar
            </Button>
          </Space>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[20, 20]}>
        {/* Columna izquierda: datos del inquilino */}
        <Col xs={24} lg={8}>
          <Card title="Datos del inquilino" size="small" loading={loading} style={{ borderRadius: 12, marginBottom: 16 }}>
            {lodger && (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {[
                  { label: "Email", value: lodger.email },
                  { label: "Teléfono", value: lodger.phone || "-" },
                  { label: "Documento", value: lodger.document_id || "-" },
                  { label: "Alta", value: formatDate(lodger.created_at) },
                ].map((item) => (
                  <div key={item.label}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.label}</Text>
                    <Text style={{ display: "block", fontSize: 13 }}>{item.value}</Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          {/* Habitación actual */}
          <Card title="Habitación actual" size="small" loading={loading} style={{ borderRadius: 12, marginBottom: 16 }}>
            {activeAssignment ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Alojamiento</Text>
                  <Text strong style={{ display: "block" }}>{activeAssignment.accommodation?.name}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Habitación</Text>
                  <Tag color="geekblue" style={{ marginTop: 2 }}>Hab. {activeAssignment.room?.number}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Entrada</Text>
                  <Text style={{ display: "block" }}>{formatDate(activeAssignment.move_in_date)}</Text>
                </div>
                {activeAssignment.monthly_rent != null && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Renta mensual</Text>
                    <Text strong style={{ display: "block", color: "#059669", fontSize: 16 }}>
                      {formatCurrency(activeAssignment.monthly_rent)}/mes
                    </Text>
                  </div>
                )}
              </Space>
            ) : (
              <Text type="secondary">Sin habitación asignada</Text>
            )}
          </Card>

          {/* Historial */}
          {!loading && lodger?.assignments?.length > 1 && (
            <Card title="Historial" size="small" style={{ borderRadius: 12 }}>
              <Space direction="vertical" style={{ width: "100%" }} size={6}>
                {lodger.assignments.map((a) => (
                  <div key={a.id} style={{
                    padding: "8px 10px", background: "#F9FAFB", borderRadius: 6,
                    borderLeft: `3px solid ${a.move_out_date ? "#D1D5DB" : "#059669"}`,
                  }}>
                    <Text strong style={{ fontSize: 11 }}>
                      {a.accommodation?.name} · Hab. {a.room?.number}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {formatDate(a.move_in_date)} → {a.move_out_date ? formatDate(a.move_out_date) : "Actual"}
                    </Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </Col>

        {/* Columna derecha: energía */}
        <Col xs={24} lg={16}>
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
      </Row>
    </V2Layout>
  );
}
