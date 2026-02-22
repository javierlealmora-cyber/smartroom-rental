// src/pages/v2/admin/tenants/LodgerDetail.jsx
// Detalle de inquilino: hucha energética + gráficas consumo 12 meses (MOCK)
// TODO: conectar con datos reales de energy_settlements y energy_bills

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
import V2Layout from "../../../../layouts/V2Layout";
import { useAdminLayout } from "../../../../hooks/useAdminLayout";
import { getLodger } from "../../../../services/lodgers.service";

const { Title, Text } = Typography;

// ── Mock data generators ──────────────────────────────────────────────────────
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function mockConsumptionData(base, variance, unit) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (now.getMonth() - 11 + i + 12) % 12;
    const real = +(base + (Math.random() - 0.5) * variance).toFixed(2);
    const estimated = +(base * 0.95 + (Math.random() - 0.3) * variance * 0.7).toFixed(2);
    const prevYear = +(base * 1.1 + (Math.random() - 0.5) * variance * 1.2).toFixed(2);
    return { mes: MONTHS[monthIdx], real, estimado: estimated, añoAnterior: prevYear, unit };
  });
}

const MOCK_ELECTRICITY = mockConsumptionData(120, 40, "kWh");
const MOCK_WATER = mockConsumptionData(8, 3, "m³");
const MOCK_GAS = mockConsumptionData(45, 20, "kWh");

const MOCK_HUCHA = {
  electricity: { balance: 34.5, deposited: 180, consumed: 145.5, currency: "€" },
  water: { balance: -5.2, deposited: 60, consumed: 65.2, currency: "€" },
  gas: { balance: 12.0, deposited: 90, consumed: 78.0, currency: "€" },
};

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
export default function LodgerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userName, companyBranding } = useAdminLayout();

  const [lodger, setLodger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getLodger(id);
      setLodger(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const activeAssignment = lodger?.assignments?.find((a) => !a.move_out_date);

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
            data={MOCK_HUCHA.electricity}
          />
          <div style={{ marginTop: 20 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_ELECTRICITY} unit="kWh" color="#F59E0B" />
            </div>
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FEF3C7" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ⚠️ <strong>Datos mockeados</strong> — Pendiente de conectar con liquidaciones reales de energía.
              </Text>
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
            data={MOCK_HUCHA.water}
          />
          <div style={{ marginTop: 20 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_WATER} unit="m³" color="#3B82F6" />
            </div>
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#EFF6FF", borderRadius: 8, border: "1px solid #DBEAFE" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ⚠️ <strong>Datos mockeados</strong> — Pendiente de conectar con liquidaciones reales de agua.
              </Text>
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
            data={MOCK_HUCHA.gas}
          />
          <div style={{ marginTop: 20 }}>
            <Text style={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.05em" }}>
              Consumo últimos 12 meses
            </Text>
            <div style={{ marginTop: 8 }}>
              <ConsumptionChart data={MOCK_GAS} unit="kWh" color="#EF4444" />
            </div>
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFF5F5", borderRadius: 8, border: "1px solid #FEE2E2" }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ⚠️ <strong>Datos mockeados</strong> — Pendiente de conectar con liquidaciones reales de gas.
              </Text>
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
                <Avatar size={52} style={{ backgroundColor: "#111827", fontSize: 20 }}>
                  {lodger?.full_name?.charAt(0)?.toUpperCase() || "?"}
                </Avatar>
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
                <Col>
                  <Tag color="warning" style={{ fontSize: 10 }}>MOCK</Tag>
                </Col>
              </Row>
            }
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: "16px 20px" }}
          >
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FEF3C7" }}>
              <Text style={{ fontSize: 12 }}>
                <strong>Pantalla de maqueta</strong> — Los datos mostrados son simulados. La implementación real
                conectará con las tablas <code>energy_settlements</code>, <code>energy_bills</code> y <code>energy_readings</code>.
              </Text>
            </div>

            {/* Resumen huchas */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Hucha Electricidad"
                  value={MOCK_HUCHA.electricity.balance}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: MOCK_HUCHA.electricity.balance >= 0 ? "#059669" : "#DC2626", fontSize: 18 }}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Hucha Agua"
                  value={MOCK_HUCHA.water.balance}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: MOCK_HUCHA.water.balance >= 0 ? "#059669" : "#DC2626", fontSize: 18 }}
                  prefix={<span>💧</span>}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Hucha Gas"
                  value={MOCK_HUCHA.gas.balance}
                  precision={2}
                  suffix="€"
                  valueStyle={{ color: MOCK_HUCHA.gas.balance >= 0 ? "#059669" : "#DC2626", fontSize: 18 }}
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
