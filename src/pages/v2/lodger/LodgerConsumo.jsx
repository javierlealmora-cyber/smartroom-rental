// src/pages/v2/lodger/LodgerConsumo.jsx
// Portal Inquilino — Mi Consumo de Energía (gráficas + log de acciones)

import { useState, useEffect, useCallback } from "react";
import {
  Alert, Button, Card, Col, Descriptions, Empty, Progress, Row,
  Skeleton, Space, Statistic, Tag, Tabs, Timeline, Typography,
} from "antd";
import {
  ThunderboltOutlined, FireOutlined, ReloadOutlined,
  ClockCircleOutlined, BulbOutlined, HomeOutlined,
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

// ── Mock data (igual que LodgerDetail admin) ──────────────────────────────────
function mockConsumptionData(base, variance) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (now.getMonth() - 11 + i + 12) % 12;
    const real        = +(base + (Math.random() - 0.5) * variance).toFixed(1);
    const estimado    = +(base * 0.95 + (Math.random() - 0.3) * variance * 0.7).toFixed(1);
    const añoAnterior = +(base * 1.1 + (Math.random() - 0.5) * variance * 1.2).toFixed(1);
    return { mes: MONTHS[monthIdx], real, estimado, añoAnterior };
  });
}

const MOCK_ELECTRICITY = mockConsumptionData(120, 40);
const MOCK_WATER       = mockConsumptionData(8, 3);
const MOCK_GAS         = mockConsumptionData(45, 20);

const MOCK_HUCHA = {
  electricity: { balance: 34.5, deposited: 180, consumed: 145.5 },
  water:       { balance: -5.2, deposited: 60,  consumed: 65.2  },
  gas:         { balance: 12.0, deposited: 90,  consumed: 78.0  },
};

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
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

  const [lodger, setLodger]           = useState(null);
  const [assignment, setAssignment]   = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [auditLog, setAuditLog]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const companyBranding = tenantBranding
    ? { name: tenantBranding.name, logoUrl: tenantBranding.logo_url, primaryColor: tenantBranding.primary_color }
    : null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodgerData, error: lErr } = await supabase
        .from("profiles")
        .select("id, full_name, client_account_id")
        .eq("email", user.email)
        .eq("role", "lodger")
        .maybeSingle();
      if (lErr) throw new Error(lErr.message);
      setLodger(lodgerData || null);
      if (!lodgerData) return;

      const [{ data: assignData }, { data: sData, error: sErr }, { data: logData }] = await Promise.all([
        supabase
          .from("lodger_room_assignments")
          .select(`id, move_in_date, billing_start_date, monthly_rent,
            room:rooms(id, number, square_meters, bathroom_type, kitchen_type),
            accommodation:accommodations(id, name, address_line1, city)`)
          .eq("lodger_id", lodgerData.id)
          .is("move_out_date", null)
          .maybeSingle(),
        supabase
          .from("energy_settlements")
          .select(`id, days_present, kwh_assigned, amount_fixed, amount_variable, amount_total, created_at,
            energy_bill:energy_bills(id, supplier, period_start, period_end, total_kwh),
            room:rooms(id, number)`)
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
      setAssignment(assignData || null);
      setSettlements(sData || []);
      setAuditLog(logData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalConsumed = settlements.reduce((a, s) => a + (s.amount_total || 0), 0);
  const totalKwh      = settlements.reduce((a, s) => a + (s.kwh_assigned || 0), 0);

  const tabItems = [
    {
      key: "electricity",
      label: <Space size={4}><ThunderboltOutlined style={{ color: "#F59E0B" }} />Electricidad</Space>,
      children: (
        <div>
          <HuchaCard icon={<ThunderboltOutlined style={{ fontSize: 16, color: "#F59E0B" }} />}
            label="Hucha Electricidad" color="#F59E0B" data={MOCK_HUCHA.electricity} />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses (kWh)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_ELECTRICITY} unit="kWh" color="#F59E0B" />
            </div>
            <div style={{ marginTop: 6, padding: "6px 10px", background: "#FFFBEB", borderRadius: 6, border: "1px solid #FEF3C7" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>⚠️ <strong>Datos simulados</strong> — Pendiente de conectar con liquidaciones reales.</Text>
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
          <HuchaCard icon={<span style={{ fontSize: 16 }}>💧</span>}
            label="Hucha Agua" color="#3B82F6" data={MOCK_HUCHA.water} />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses (m³)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_WATER} unit="m³" color="#3B82F6" />
            </div>
            <div style={{ marginTop: 6, padding: "6px 10px", background: "#EFF6FF", borderRadius: 6, border: "1px solid #DBEAFE" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>⚠️ <strong>Datos simulados</strong> — Pendiente de conectar con datos reales de agua.</Text>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "gas",
      label: <Space size={4}><FireOutlined style={{ color: "#EF4444" }} />Gas</Space>,
      children: (
        <div>
          <HuchaCard icon={<FireOutlined style={{ fontSize: 16, color: "#EF4444" }} />}
            label="Hucha Gas" color="#EF4444" data={MOCK_HUCHA.gas} />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses (kWh)
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_GAS} unit="kWh" color="#EF4444" />
            </div>
            <div style={{ marginTop: 6, padding: "6px 10px", background: "#FFF5F5", borderRadius: 6, border: "1px solid #FEE2E2" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>⚠️ <strong>Datos simulados</strong> — Pendiente de conectar con datos reales de gas.</Text>
            </div>
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
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

      {/* Tarjeta habitación activa */}
      {assignment ? (
        <Card
          size="small"
          style={{ marginBottom: 16, borderRadius: 10, borderLeft: "3px solid #059669" }}
          title={<Space><HomeOutlined style={{ color: "#059669" }} /><Text strong>Mi Habitación Actual</Text></Space>}
        >
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={12}>
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 120 }}>
                <Descriptions.Item label="Alojamiento">
                  <Text strong>{assignment.accommodation?.name || "-"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Dirección">
                  {assignment.accommodation?.address || "-"}{assignment.accommodation?.city ? `, ${assignment.accommodation.city}` : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Habitación">
                  <Tag color="geekblue">Hab. {assignment.room?.number}</Tag>
                  {assignment.room?.type && <Tag style={{ marginLeft: 4 }}>{assignment.room.type}</Tag>}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} sm={12}>
              <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 120 }}>
                {assignment.room?.floor != null && (
                  <Descriptions.Item label="Planta">{assignment.room.floor}</Descriptions.Item>
                )}
                {assignment.room?.area_m2 && (
                  <Descriptions.Item label="Superficie">{assignment.room.area_m2} m²</Descriptions.Item>
                )}
                <Descriptions.Item label="Entrada">{fDate(assignment.move_in_date)}</Descriptions.Item>
                {assignment.monthly_rent != null && (
                  <Descriptions.Item label="Renta">
                    <Text strong style={{ color: "#059669" }}>{fEur(assignment.monthly_rent)}/mes</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Col>
          </Row>
        </Card>
      ) : null}

      {/* Resumen estadísticas */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
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
