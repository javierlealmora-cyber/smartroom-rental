// src/pages/v2/lodger/LodgerBoletines.jsx
// Portal Inquilino — Boletines de Liquidación de Energía

import { useState, useEffect, useCallback } from "react";
import { Alert, Badge, Button, Card, Col, Descriptions, Row, Skeleton, Space, Tag, Typography } from "antd";
import EmptyState from "../../../components/EmptyState";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
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

export default function LodgerBoletines() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ackLoading, setAckLoading] = useState(null);

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
      const { data: lodger } = await supabase
        .from("lodgers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!lodger) { setBulletins([]); return; }

      const { data, error: bErr } = await supabase
        .from("bulletins")
        .select(`
          *,
          accommodation:accommodations(id, name),
          room:rooms(id, number),
          energy_bill:energy_bills(id, supplier, issue_date)
        `)
        .eq("lodger_id", lodger.id)
        .in("status", ["published", "acknowledged"])
        .order("published_at", { ascending: false })
        .limit(50);

      if (bErr) throw new Error(bErr.message);
      setBulletins(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onAcknowledge = async (bulletinId) => {
    setAckLoading(bulletinId);
    try {
      const { error: upErr } = await supabase
        .from("bulletins")
        .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
        .eq("id", bulletinId);
      if (upErr) throw new Error(upErr.message);
      setBulletins((prev) =>
        prev.map((b) => b.id === bulletinId
          ? { ...b, status: "acknowledged", acknowledged_at: new Date().toISOString() }
          : b
        )
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setAckLoading(null);
    }
  };

  const pending = bulletins.filter((b) => b.status === "published").length;

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={user?.email || "Inquilino"}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              <BellOutlined style={{ marginRight: 8 }} />Boletines
            </Title>
            {pending > 0 && <Badge count={pending} style={{ backgroundColor: "#DC2626" }} />}
          </Space>
          <Text type="secondary">Liquidaciones de energía y consumo de tu habitación</Text>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : bulletins.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Sin boletines"
          description="No hay boletines publicados actualmente para tu habitación"
        />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {bulletins.map((b) => (
            <Card
              key={b.id}
              size="small"
              title={
                <Space>
                  <Tag color={STATUS_COLOR[b.status] || "default"}>{STATUS_LABEL[b.status] || b.status}</Tag>
                  <Text strong>
                    {b.accommodation?.name || "Alojamiento"} · Hab. {b.room?.number || "-"}
                  </Text>
                </Space>
              }
              extra={
                <Space>
                  <Text strong style={{ fontSize: 15, color: "#111827" }}>{fEur(b.amount_total)}</Text>
                  {b.status === "published" && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={ackLoading === b.id}
                      onClick={() => onAcknowledge(b.id)}
                    >
                      Confirmar
                    </Button>
                  )}
                </Space>
              }
              style={{
                borderLeft: `4px solid ${b.status === "acknowledged" ? "#059669" : "#3B82F6"}`,
              }}
            >
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 110 }}>
                    <Descriptions.Item label="Período">
                      {fDate(b.period_start)} – {fDate(b.period_end)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Días presentes">{b.days_present ?? "-"}</Descriptions.Item>
                    <Descriptions.Item label="kWh consumidos">
                      {b.kwh_consumed != null ? `${Number(b.kwh_consumed).toFixed(2)} kWh` : "-"}
                    </Descriptions.Item>
                    {b.energy_bill && (
                      <Descriptions.Item label="Factura">
                        {b.energy_bill.supplier} · {fDate(b.energy_bill.issue_date)}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Col>
                <Col xs={24} sm={12}>
                  <Descriptions column={1} size="small" labelStyle={{ color: "#6b7280", width: 130 }}>
                    <Descriptions.Item label="Importe fijo">{fEur(b.amount_fixed)}</Descriptions.Item>
                    <Descriptions.Item label="Importe variable">{fEur(b.amount_variable)}</Descriptions.Item>
                    <Descriptions.Item label="Servicios">{fEur(b.amount_services)}</Descriptions.Item>
                    <Descriptions.Item label="Total">
                      <Text strong style={{ color: "#059669" }}>{fEur(b.amount_total)}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>
              {b.notes && (
                <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                  {b.notes}
                </Text>
              )}
              {b.acknowledged_at && (
                <Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 11 }}>
                  Confirmado el {fDate(b.acknowledged_at)}
                </Text>
              )}
            </Card>
          ))}
        </Space>
      )}
    </V2Layout>
  );
}
