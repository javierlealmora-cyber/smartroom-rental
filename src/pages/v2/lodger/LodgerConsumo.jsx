// src/pages/v2/lodger/LodgerConsumo.jsx
// Portal Inquilino — Mi Consumo de Energía

import { useState, useEffect, useCallback } from "react";
import { Alert, Card, Col, Descriptions, Row, Skeleton, Space, Tag, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

const STATUS_COLOR = { draft: "default", published: "processing", acknowledged: "success" };
const STATUS_LABEL = { draft: "Borrador", published: "Publicado", acknowledged: "Confirmado" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
function fEur(n) {
  if (n == null) return "-";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export default function LodgerConsumo() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const companyBranding = {
    name: tenantBranding?.name || "SmartRoom",
    logoText: (tenantBranding?.name || "S").charAt(0),
    logoUrl: tenantBranding?.logo_url || null,
    primaryColor: tenantBranding?.primary_color || "#111827",
    secondaryColor: tenantBranding?.secondary_color || "#3B82F6",
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: lodger, error: lErr } = await supabase
        .from("lodgers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lErr || !lodger) { setSettlements([]); return; }

      const { data, error: sErr } = await supabase
        .from("energy_settlements")
        .select(`
          *,
          energy_bill:energy_bills(id, supplier, issue_date, period_start, period_end, total_kwh),
          room:rooms(id, number),
          accommodation:accommodations(id, name)
        `)
        .eq("lodger_id", lodger.id)
        .order("created_at", { ascending: false })
        .limit(24);

      if (sErr) throw new Error(sErr.message);
      setSettlements(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalPending = settlements
    .filter((s) => !s.acknowledged_at)
    .reduce((acc, s) => acc + (s.amount_total || 0), 0);

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={user?.email || "Inquilino"}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: "#F59E0B" }} />Mi Consumo
          </Title>
          <Text type="secondary">Liquidaciones de energía de tu habitación</Text>
        </Col>
        {totalPending > 0 && (
          <Col>
            <Tag color="warning" style={{ fontSize: 13, padding: "4px 12px" }}>
              Pendiente: {fEur(totalPending)}
            </Tag>
          </Col>
        )}
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : settlements.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "32px 0" }}>
          <Text type="secondary">No hay liquidaciones de energía disponibles aún</Text>
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {settlements.map((s) => (
            <Card
              key={s.id}
              size="small"
              title={
                <Space>
                  <Text strong>
                    {s.energy_bill?.supplier || "Factura de energía"}
                  </Text>
                  <Tag color={STATUS_COLOR[s.status] || "default"}>
                    {STATUS_LABEL[s.status] || s.status}
                  </Tag>
                </Space>
              }
              extra={
                <Text strong style={{ color: "#111827", fontSize: 15 }}>
                  {fEur(s.amount_total)}
                </Text>
              }
            >
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 120 }}>
                    <Descriptions.Item label="Alojamiento">
                      {s.accommodation?.name || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Habitación">
                      {s.room?.number ? `Hab. ${s.room.number}` : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Período">
                      {fDate(s.energy_bill?.period_start)} – {fDate(s.energy_bill?.period_end)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Días presentes">
                      {s.days_present ?? "-"}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col xs={24} sm={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 130 }}>
                    <Descriptions.Item label="kWh asignados">
                      {s.kwh_assigned != null ? `${Number(s.kwh_assigned).toFixed(2)} kWh` : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Importe fijo">
                      {fEur(s.amount_fixed)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Importe variable">
                      {fEur(s.amount_variable)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total">
                      <Text strong style={{ color: "#059669" }}>{fEur(s.amount_total)}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </V2Layout>
  );
}
