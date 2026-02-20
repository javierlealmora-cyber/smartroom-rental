// src/pages/v2/lodger/LodgerBoletines.jsx
// Portal Inquilino — Boletines / Comunicados

import { useState, useEffect, useCallback } from "react";
import { Alert, Badge, Card, Col, Row, Skeleton, Space, Tag, Typography } from "antd";
import { BellOutlined } from "@ant-design/icons";
import V2Layout from "../../../layouts/V2Layout";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenant } from "../../../providers/TenantProvider";
import { supabase } from "../../../services/supabaseClient";

const { Title, Text } = Typography;

const TYPE_COLOR = { info: "processing", warning: "warning", urgent: "error", general: "default" };
const TYPE_LABEL = { info: "Info", warning: "Aviso", urgent: "Urgente", general: "General" };

function fDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function LodgerBoletines() {
  const { user } = useAuth();
  const { branding: tenantBranding } = useTenant();

  const [bulletins, setBulletins] = useState([]);
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
      const { data: lodger } = await supabase
        .from("lodgers")
        .select("id, lodger_room_assignments(accommodation_id)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!lodger) { setBulletins([]); return; }

      const accommodationIds = (lodger.lodger_room_assignments || [])
        .map((a) => a.accommodation_id)
        .filter(Boolean);

      let q = supabase
        .from("bulletins")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

      if (accommodationIds.length > 0) {
        q = q.or(`accommodation_id.in.(${accommodationIds.join(",")}),accommodation_id.is.null`);
      }

      const { data, error: bErr } = await q;
      if (bErr) throw new Error(bErr.message);
      setBulletins(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const unread = bulletins.filter((b) => !b.read_at).length;

  return (
    <V2Layout role="lodger" companyBranding={companyBranding} userName={user?.email || "Inquilino"}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              <BellOutlined style={{ marginRight: 8 }} />Boletines
            </Title>
            {unread > 0 && <Badge count={unread} style={{ backgroundColor: "#DC2626" }} />}
          </Space>
          <Text type="secondary">Comunicados y avisos de tu alojamiento</Text>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : bulletins.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "32px 0" }}>
          <Text type="secondary">No hay boletines publicados actualmente</Text>
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          {bulletins.map((b) => (
            <Card
              key={b.id}
              size="small"
              style={{
                borderLeft: `4px solid ${
                  b.type === "urgent" ? "#DC2626" :
                  b.type === "warning" ? "#F59E0B" :
                  b.type === "info" ? "#3B82F6" : "#9CA3AF"
                }`,
              }}
            >
              <Row justify="space-between" align="top" gutter={[8, 4]}>
                <Col flex="auto">
                  <Space style={{ marginBottom: 4 }}>
                    <Tag color={TYPE_COLOR[b.type] || "default"} style={{ margin: 0 }}>
                      {TYPE_LABEL[b.type] || b.type || "General"}
                    </Tag>
                    <Text strong style={{ fontSize: 14 }}>{b.title}</Text>
                  </Space>
                  {b.body && (
                    <Text style={{ display: "block", fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                      {b.body}
                    </Text>
                  )}
                </Col>
                <Col>
                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {fDate(b.published_at || b.created_at)}
                  </Text>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </V2Layout>
  );
}
