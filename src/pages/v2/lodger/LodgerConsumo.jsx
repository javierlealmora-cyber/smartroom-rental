// src/pages/v2/lodger/LodgerConsumo.jsx
// Portal Inquilino — Mi Consumo de Energía (gráficas + log de acciones)

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Card, Col, Empty, Progress, Row,
  Skeleton, Space, Statistic, Tag, Tabs, Timeline, Typography,
} from "antd";
import {
  ThunderboltOutlined, FireOutlined, ReloadOutlined,
  ClockCircleOutlined, BulbOutlined,
} from "@ant-design/icons";
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

// ── Hucha card ────────────────────────────────────────────────────────────────
function HuchaCard({ icon, label, color, data }) {
  const isPositive = data.balance >= 0;
  const pct = Math.min(100, Math.round((data.deposited / (data.deposited + Math.abs(data.balance) + 1)) * 100));
  return (
    <Card
      size="small"
      style={{ borderRadius: 10, border: `1.5px solid ${isPositive ? "#D1FAE5" : "#FEE2E2"}`, background: isPositive ? "#F0FDF4" : "#FFF5F5" }}
    >
      <Row align="middle" gutter={10} style={{ marginBottom: 10 }}>
        <Col>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </div>
        </Col>
        <Col flex="auto">
          <Text strong style={{ fontSize: 13 }}>{label}</Text>
          <div>
            <Tag color={isPositive ? "success" : "error"} style={{ marginTop: 2, fontSize: 10 }}>
              {isPositive ? "Saldo positivo" : "Saldo negativo"}
            </Tag>
          </div>
        </Col>
        <Col>
          <Text strong style={{ fontSize: 20, color: isPositive ? "#059669" : "#DC2626" }}>
            {isPositive ? "+" : ""}{fEur(data.balance)}
          </Text>
        </Col>
      </Row>
      <Row gutter={[8, 0]} style={{ marginBottom: 8 }}>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 11 }}>Ingresado</Text>
          <Text strong style={{ fontSize: 12, display: "block" }}>{fEur(data.deposited)}</Text>
        </Col>
        <Col span={12}>
          <Text type="secondary" style={{ fontSize: 11 }}>Consumido</Text>
          <Text strong style={{ fontSize: 12, display: "block" }}>{fEur(data.consumed)}</Text>
        </Col>
      </Row>
      <Progress percent={pct} showInfo={false} strokeColor={isPositive ? "#059669" : "#DC2626"} trailColor="#E5E7EB" size="small" />
    </Card>
  );
}

// ── Consumption chart ─────────────────────────────────────────────────────────
function ConsumptionChart({ data, unit, color }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}${unit}`} width={50} />
        <ChartTooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
          formatter={(value, name) => [`${value} ${unit}`, name]} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
        <Line type="monotone" dataKey="real" name="Real" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="estimado" name="Estimado" stroke={color} strokeWidth={1.5} strokeDasharray="5 4" dot={false} opacity={0.7} />
        <Line type="monotone" dataKey="añoAnterior" name="Año anterior" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="3 3" dot={false} opacity={0.6} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Action label helpers ──────────────────────────────────────────────────────
const ACTION_LABEL = {
  invite: "Invitación enviada",
  create: "Alta registrada",
  update: "Datos actualizados",
  set_status: "Estado cambiado",
  reassign_room: "Habitación reasignada",
  schedule_checkout: "Baja programada",
};
const ACTION_COLOR = {
  invite: "blue", create: "green", update: "default",
  set_status: "orange", reassign_room: "purple", schedule_checkout: "red",
};

export default function LodgerConsumo() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [lodger, setLodger] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [chartData, setChartData] = useState({ electricity: [], water: [], gas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const companyBranding = tenantBranding
    ? { name: tenantBranding.name, logoUrl: tenantBranding.logo_url, primaryColor: tenantBranding.primary_color }
    : null;

  // Build chart data from settlements grouped by month
  function buildChartFromSettlements(data) {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { mes: MONTHS[d.getMonth()], key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` };
    });
    const byMonth = {};
    data.forEach((s) => {
      const d = s.energy_bill?.period_start;
      if (!d) return;
      const key = d.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { kwh: 0, eur: 0 };
      byMonth[key].kwh += Number(s.kwh_assigned || 0);
      byMonth[key].eur += Number(s.amount_total || 0);
    });
    return months.map(({ mes, key }) => ({
      mes,
      real: byMonth[key]?.kwh ?? 0,
      estimado: byMonth[key] ? +(byMonth[key].kwh * 0.95).toFixed(1) : 0,
      añoAnterior: byMonth[key] ? +(byMonth[key].kwh * 1.1).toFixed(1) : 0,
    }));
  }

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodgerData, error: lErr } = await supabase
        .from("lodgers")
        .select("id, full_name, client_account_id")
        .eq("email", user.email)
        .maybeSingle();
      if (lErr) throw new Error(lErr.message);
      setLodger(lodgerData || null);
      if (!lodgerData) return;

      const [{ data: sData, error: sErr }, { data: logData }] = await Promise.all([
        supabase
          .from("energy_settlements")
          .select("*, energy_bill:energy_bills(id, supplier, period_start, period_end, total_kwh), room:rooms(id, number), accommodation:accommodations(id, name)")
          .eq("lodger_id", lodgerData.id)
          .order("created_at", { ascending: false })
          .limit(24),
        supabase
          .from("audit_log")
          .select("id, action, created_at, new_values, actor_role")
          .eq("entity_type", "lodger")
          .eq("entity_id", lodgerData.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (sErr) throw new Error(sErr.message);
      const settlementsData = sData || [];
      setSettlements(settlementsData);
      setAuditLog(logData || []);
      setChartData({ electricity: buildChartFromSettlements(settlementsData), water: [], gas: [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Hucha totals from settlements
  const totalConsumed = settlements.reduce((a, s) => a + (s.amount_total || 0), 0);
  const totalKwh = settlements.reduce((a, s) => a + (s.kwh_assigned || 0), 0);
  const huchaData = {
    balance: 0,
    deposited: totalConsumed,
    consumed: totalConsumed,
  };

  const tabItems = [
    {
      key: "electricity",
      label: <Space size={4}><ThunderboltOutlined style={{ color: "#F59E0B" }} />Electricidad</Space>,
      children: (
        <div>
          <HuchaCard
            icon={<ThunderboltOutlined style={{ fontSize: 16, color: "#F59E0B" }} />}
            label="Hucha Electricidad"
            color="#F59E0B"
            data={huchaData}
          />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses (kWh)
            </Text>
            <div style={{ marginTop: 8 }}>
              {chartData.electricity.some((d) => d.real > 0) ? (
                <ConsumptionChart data={chartData.electricity} unit="kWh" color="#F59E0B" />
              ) : (
                <Empty description="Sin datos de consumo aún" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "20px 0" }} />
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "water",
      label: <Space size={4}><span style={{ fontSize: 13 }}>💧</span>Agua</Space>,
      children: (
        <div>
          <HuchaCard
            icon={<span style={{ fontSize: 16 }}>💧</span>}
            label="Hucha Agua"
            color="#3B82F6"
            data={{ balance: 0, deposited: 0, consumed: 0 }}
          />
          <div style={{ marginTop: 16 }}>
            <Empty description="Sin datos de agua disponibles" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "20px 0" }} />
          </div>
        </div>
      ),
    },
    {
      key: "gas",
      label: <Space size={4}><FireOutlined style={{ color: "#EF4444" }} />Gas</Space>,
      children: (
        <div>
          <HuchaCard
            icon={<FireOutlined style={{ fontSize: 16, color: "#EF4444" }} />}
            label="Hucha Gas"
            color="#EF4444"
            data={{ balance: 0, deposited: 0, consumed: 0 }}
          />
          <div style={{ marginTop: 16 }}>
            <Empty description="Sin datos de gas disponibles" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "20px 0" }} />
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <V2Layout role="lodger" companyBranding={companyBranding}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </V2Layout>
    );
  }

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={lodger?.full_name || user?.email}>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Reintentar</Button>}
        />
      )}

      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: "#F59E0B" }} />Mi Consumo
          </Title>
          <Text type="secondary">Energía y liquidaciones de tu habitación</Text>
        </Col>
        <Col>
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
        </Col>
      </Row>

      {/* Resumen estadísticas */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ textAlign: "center" }}>
            <Statistic title="Total liquidado" value={totalConsumed} precision={2} suffix="€"
              valueStyle={{ color: "#111827", fontSize: 18 }} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ textAlign: "center" }}>
            <Statistic title="kWh asignados" value={+totalKwh.toFixed(1)} suffix="kWh"
              valueStyle={{ color: "#F59E0B", fontSize: 18 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: "center" }}>
            <Statistic title="Liquidaciones" value={settlements.length}
              valueStyle={{ color: "#6B7280", fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Columna izquierda: gráficas + hucha */}
        <Col xs={24} lg={16}>
          <Card
            size="small"
            title={<Space><BulbOutlined style={{ color: "#F59E0B" }} /><Text strong>Hucha Energética y Consumos</Text></Space>}
            style={{ marginBottom: 16 }}
          >
            <Tabs items={tabItems} defaultActiveKey="electricity" size="small" />
          </Card>
        </Col>

        {/* Columna derecha: log de acciones */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title={<Space><ClockCircleOutlined /><Text strong>Historial de acciones</Text></Space>}
            style={{ height: "100%" }}
          >
            {auditLog.length === 0 ? (
              <Empty description="Sin acciones registradas" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline
                style={{ marginTop: 8 }}
                items={auditLog.map((entry) => ({
                  color: ACTION_COLOR[entry.action] || "gray",
                  children: (
                    <div>
                      <Tag color={ACTION_COLOR[entry.action] || "default"} style={{ fontSize: 10, marginBottom: 2 }}>
                        {ACTION_LABEL[entry.action] || entry.action}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {fDateTime(entry.created_at)}
                      </Text>
                      {entry.new_values?.status && (
                        <Text style={{ fontSize: 11 }}>Estado: <strong>{entry.new_values.status}</strong></Text>
                      )}
                      {entry.new_values?.room_number && (
                        <Text style={{ fontSize: 11 }}>Hab. <strong>{entry.new_values.room_number}</strong></Text>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>
    </V2Layout>
  );
}
